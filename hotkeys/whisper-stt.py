"""
Claude Voice Plugin
===================
Zwei Modi — eine Datei:

  [Service]  python whisper-stt.py
      F5 halten = sprechen → Live-Text ins aktive Fenster, Enter beim Loslassen
      F8        = TTS an/aus togglen
      F7        = Vorlesen stoppen
      ESC       = beenden

  [Hook]     wird automatisch von Claude Code aufgerufen (nicht manuell starten)
             Liest stdin JSON, spricht last_assistant_message satzweise vor.
"""

import io
import json
import os
import re
import signal
import sys
import time
import threading
import numpy as np

# ── Konfiguration ─────────────────────────────────────────────────────────────
MIC_DEVICE        = 20           # Fallback-Index wenn Name nicht gefunden
MIC_NAME_CONTAINS = 'Microphone'  # UPDATE THIS: run `python -c "import sounddevice; print(sounddevice.query_devices())"` to find your mic name
SAMPLE_RATE  = 48_000      # Nativer Geräterate
WHISPER_RATE = 16_000      # Whisper erwartet 16 kHz
LANGUAGE     = 'de'
MODEL_PATH   = os.path.join(os.path.dirname(__file__), 'models', 'ggml-large-v3-q5_0.bin')
INITIAL_PROMPT = (
    'Claude, Agent, Repository, Commit, Pull Request, Refactoring'  # Add your domain-specific vocabulary here
)
HOTKEY       = 'f9'
LANG_TOGGLE  = 'f4'
TTS_TOGGLE   = 'f8'
TTS_STOP     = 'f7'
QUIT_KEY     = 'f12'
TTS_VOICE_DE = 'de-DE-ConradNeural'
TTS_VOICE_EN = 'en-US-GuyNeural'
TTS_SPEED    = '+20%'
STATE_FILE   = os.path.expanduser('~/.tts_enabled')
PID_FILE     = os.path.expanduser('~/.tts_pid')
LOCK_FILE    = os.path.expanduser('~/.whisper_stt.lock')

# Mindest-Audio-Länge (Sekunden) bevor Whisper aufgerufen wird
MIN_AUDIO_SEC = 1.0
# ─────────────────────────────────────────────────────────────────────────────


# ══════════════════════════════════════════════════════════════════════════════
# GEMEINSAME HILFSFUNKTIONEN
# ══════════════════════════════════════════════════════════════════════════════

def strip_to_prose(text: str) -> str:
    """Entfernt Code-Blöcke, Inline-Code und Markdown-Formatierung."""
    text = re.sub(r'```[\s\S]*?```', '', text)
    text = re.sub(r'`[^`]+`', '', text)
    text = re.sub(r'^#{1,6}\s+', '', text, flags=re.MULTILINE)
    text = re.sub(r'^\s*[-*•]\s+', '', text, flags=re.MULTILINE)
    text = re.sub(r'^\s*\d+\.\s+', '', text, flags=re.MULTILINE)
    text = re.sub(r'\*{1,2}([^*]+)\*{1,2}', r'\1', text)
    text = re.sub(r'https?://\S+', '', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def split_sentences(text: str) -> list:
    """Splittet Text an Satzgrenzen (.!?) in eine Liste nicht-leerer Sätze."""
    parts = re.split(r'(?<=[.!?])\s+', text)
    return [p.strip() for p in parts if p.strip()]


def resample(audio: np.ndarray, from_rate: int, to_rate: int) -> np.ndarray:
    """Downsampling mit Anti-Aliasing via scipy (verhindert Artefakte bei 48k→16k)."""
    if from_rate == to_rate:
        return audio
    try:
        from scipy.signal import resample_poly
        from math import gcd
        g = gcd(from_rate, to_rate)
        return resample_poly(audio, to_rate // g, from_rate // g).astype(np.float32)
    except ImportError:
        # Fallback: Mittelwert-Decimation (besser als einfaches Slicing)
        ratio = from_rate // to_rate
        n = len(audio) - (len(audio) % ratio)
        return audio[:n].reshape(-1, ratio).mean(axis=1).astype(np.float32)


# ══════════════════════════════════════════════════════════════════════════════
# HOOK-MODUS  (TTS-Pipeline, aufgerufen von Claude Code nach jeder Antwort)
# ══════════════════════════════════════════════════════════════════════════════

def run_hook():
    """
    Liest JSON von stdin, spricht last_assistant_message satzweise vor.
    Satz N wird generiert während Satz N-1 abgespielt (Pipeline).
    """
    if not os.path.exists(STATE_FILE):
        return

    try:
        raw = sys.stdin.buffer.read().decode('utf-8')
        data = json.loads(raw)
    except Exception:
        return

    text = strip_to_prose(data.get('last_assistant_message', ''))
    if not text:
        return

    sentences = split_sentences(text)
    if not sentences:
        return

    # PID speichern damit F7 diesen Prozess per SIGTERM stoppen kann
    with open(PID_FILE, 'w') as f:
        f.write(str(os.getpid()))

    try:
        import asyncio
        asyncio.run(_tts_pipeline(sentences))
    except Exception as e:
        sys.stderr.write(f'TTS-Fehler: {e}\n')
    finally:
        try:
            os.remove(PID_FILE)
        except OSError:
            pass


async def _tts_pipeline(sentences: list):
    """
    Generiert und spielt Sätze überlappend:
    Satz[n+1] wird generiert während Satz[n] abgespielt.
    """
    import asyncio
    import tempfile
    import pygame
    import edge_tts

    try:
        from langdetect import detect, LangDetectException
        _have_langdetect = True
    except ImportError:
        _have_langdetect = False

    def pick_voice(sentence: str) -> str:
        if _have_langdetect:
            try:
                lang = detect(sentence)
                return TTS_VOICE_EN if lang == 'en' else TTS_VOICE_DE
            except Exception:
                pass
        return TTS_VOICE_DE

    async def generate(sentence: str) -> bytes:
        voice = pick_voice(sentence)
        communicate = edge_tts.Communicate(sentence, voice, rate=TTS_SPEED)
        audio = b''
        async for chunk in communicate.stream():
            if chunk['type'] == 'audio':
                audio += chunk['data']
        return audio

    def play_blocking(audio_bytes: bytes):
        """Schreibt Audio in temp-Datei und spielt sie synchron ab."""
        import tempfile
        with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as f:
            f.write(audio_bytes)
            tmp = f.name
        try:
            pygame.mixer.music.load(tmp)
            pygame.mixer.music.play()
            while pygame.mixer.music.get_busy():
                time.sleep(0.03)
        finally:
            try:
                os.unlink(tmp)
            except OSError:
                pass

    pygame.mixer.init()
    try:
        loop = asyncio.get_event_loop()

        # Ersten Satz sofort generieren
        next_audio = await generate(sentences[0])

        for i, sentence in enumerate(sentences):
            current_audio = next_audio

            # Nächsten Satz parallel generieren (wenn vorhanden)
            if i + 1 < len(sentences):
                generate_task = asyncio.create_task(generate(sentences[i + 1]))
            else:
                generate_task = None

            # Aktuellen Satz im Thread-Pool abspielen (blockiert nicht den Event-Loop)
            await loop.run_in_executor(None, play_blocking, current_audio)

            if generate_task is not None:
                next_audio = await generate_task
    finally:
        pygame.mixer.quit()


# ══════════════════════════════════════════════════════════════════════════════
# SERVICE-MODUS  (läuft im Hintergrund, verwaltet STT + Hotkeys)
# ══════════════════════════════════════════════════════════════════════════════

def run_service():
    import pyperclip
    import sounddevice as sd
    from pywhispercpp.model import Model as WhisperCppModel
    from pynput import keyboard as pynput_kb

    # ── Einzelinstanz-Sperre (PID-Lock) ─────────────────────────────────────
    if os.path.exists(LOCK_FILE):
        try:
            with open(LOCK_FILE) as f:
                old_pid = int(f.read().strip())
            # Windows: prüfe ob PID existiert via tasklist (os.kill ist unzuverlässig)
            import subprocess as _sp
            r = _sp.run(
                ['tasklist', '/FI', f'PID eq {old_pid}', '/NH', '/FO', 'CSV'],
                capture_output=True, text=True, encoding='utf-8', errors='replace',
            )
            if r.stdout and str(old_pid) in r.stdout:
                print(f'Whisper-STT läuft bereits (PID {old_pid}). Abbruch.', flush=True)
                sys.exit(0)
        except (ValueError, OSError):
            pass                          # PID-File veraltet → überschreiben

    with open(LOCK_FILE, 'w') as f:
        f.write(str(os.getpid()))

    import atexit
    def _cleanup_pid():
        try:
            os.remove(LOCK_FILE)
        except OSError:
            pass
    atexit.register(_cleanup_pid)

    # ── Shared State ──────────────────────────────────────────────────────────
    frames = []
    frames_lock = threading.Lock()
    is_recording = threading.Event()
    indicator_show = threading.Event()
    target_hwnd = [0]  # Fenster das beim F5-Drücken aktiv war
    transcribe_lock = threading.Lock()  # Verhindert doppelte Transkription

    # ── Device-Suche per Name ─────────────────────────────────────────────────
    def find_device() -> int:
        """Sucht Mikrofon per MIC_NAME_CONTAINS. Bevorzugt WASAPI, fällt auf andere APIs zurück.
        Wartet in Schleife bis ein passendes Gerät verfügbar ist."""
        while True:
            hostapis = sd.query_hostapis()
            wasapi_idx = next((i for i, h in enumerate(hostapis) if 'WASAPI' in h['name']), None)
            matches = []
            for idx, dev in enumerate(sd.query_devices()):
                if (MIC_NAME_CONTAINS.lower() in dev['name'].lower()
                        and dev['max_input_channels'] > 0):
                    is_wasapi = (wasapi_idx is not None and dev['hostapi'] == wasapi_idx)
                    matches.append((idx, dev, is_wasapi))
            # Versuche WASAPI zuerst, dann beliebige andere API
            for idx, dev, is_wasapi in sorted(matches, key=lambda m: (not m[2], m[0])):
                try:
                    test = sd.InputStream(samplerate=SAMPLE_RATE, channels=1, device=idx, dtype='float32')
                    test.start()
                    test.read(SAMPLE_RATE // 10)  # 100ms Probe-Aufnahme
                    test.stop()
                    test.close()
                    return idx
                except Exception:
                    try:
                        test.close()
                    except Exception:
                        pass
                    continue
            devs = sd.query_devices()
            if MIC_DEVICE < len(devs) and devs[MIC_DEVICE]['max_input_channels'] > 0:
                return MIC_DEVICE
            print(f'[STT] Warte auf Mikrofon "{MIC_NAME_CONTAINS}" ...', flush=True)
            time.sleep(3)

    # ── Audio-Callback ────────────────────────────────────────────────────────
    stream_error = threading.Event()

    def audio_callback(indata, frame_count, time_info, status):
        if status:
            print(f'\n[audio-status: {status}]', flush=True)
            if status.input_overflow or status.input_underflow:
                stream_error.set()
        if is_recording.is_set():
            with frames_lock:
                frames.append(indata.copy())

    # ── Whisper laden ─────────────────────────────────────────────────────────
    print('Lade Whisper-Modell (whisper.cpp + Vulkan)...', flush=True)
    model = WhisperCppModel(MODEL_PATH, n_threads=4)
    print('Modell bereit (large-v3 auf GPU).\n', flush=True)

    # ── Stream-Factory ────────────────────────────────────────────────────────
    def open_stream() -> sd.InputStream:
        dev = find_device()
        print(f'[STT] Mikrofon: {sd.query_devices(dev)["name"]} (idx={dev})', flush=True)
        s = sd.InputStream(
            samplerate=SAMPLE_RATE,
            channels=1,
            dtype='float32',
            device=dev,
            callback=audio_callback,
            blocksize=1024,
        )
        s.start()
        return s

    stream = open_stream()

    # ── Watchdog: Stream-Reconnect bei Headset-Trennung ───────────────────────
    last_callback_time = [time.time()]

    def stream_watchdog(stream_ref: list, stop_event: threading.Event):
        """Prüft alle 2 s ob der Stream noch aktiv ist; startet ihn neu wenn nicht."""
        while not stop_event.is_set():
            time.sleep(2)
            s = stream_ref[0]
            # Erkennung: Stream meldet inaktiv, Fehler-Flag, oder Device verschwunden
            device_gone = False
            try:
                devs = sd.query_devices()
                dev_info = devs[s.device] if s.device < len(devs) else None
                if dev_info is None or dev_info['max_input_channels'] <= 0:
                    device_gone = True
            except Exception:
                device_gone = True
            if stream_error.is_set() or not s.active or device_gone:
                print('\n[STT] Stream unterbrochen – versuche Reconnect...', flush=True)
                try:
                    s.stop()
                    s.close()
                except Exception:
                    pass
                stream_error.clear()
                # PortAudio komplett neu initialisieren – löst AUDCLNT_E_DEVICE_INVALIDATED,
                # weil sounddevice interne WASAPI-Handles cached die nach Trennung ungültig sind.
                try:
                    sd._terminate()
                except Exception:
                    pass
                # Unbegrenzt warten bis Gerät wieder verfügbar
                while not stop_event.is_set():
                    time.sleep(2)
                    try:
                        sd._initialize()
                        stream_ref[0] = open_stream()
                        print('[STT] Reconnect erfolgreich.\n', flush=True)
                        break
                    except Exception as e:
                        print(f'[STT] Warte auf Gerät... ({e})', flush=True)
                        try:
                            sd._terminate()
                        except Exception:
                            pass

    stop_watchdog = threading.Event()
    stream_ref = [stream]
    threading.Thread(target=stream_watchdog, args=(stream_ref, stop_watchdog), daemon=True).start()

    # ── Aufnahme-Indikator (tkinter-Overlay, Bottom-Center) ──────────────────
    def run_indicator_thread():
        import tkinter as tk

        N_BARS = 48
        W, H = 340, 44

        root = tk.Tk()
        root.overrideredirect(True)
        root.attributes('-topmost', True)
        root.attributes('-alpha', 0.90)
        root.configure(bg='#111111')
        root.withdraw()

        # WS_EX_NOACTIVATE: Fenster bekommt niemals Fokus beim Anzeigen
        import ctypes as _ctypes
        GWL_EXSTYLE   = -20
        WS_EX_NOACTIVATE = 0x08000000
        WS_EX_TOOLWINDOW = 0x00000080
        _hwnd = root.winfo_id()
        _style = _ctypes.windll.user32.GetWindowLongW(_hwnd, GWL_EXSTYLE)
        _ctypes.windll.user32.SetWindowLongW(_hwnd, GWL_EXSTYLE,
            _style | WS_EX_NOACTIVATE | WS_EX_TOOLWINDOW)

        sw = root.winfo_screenwidth()
        sh = root.winfo_screenheight()
        root.geometry(f'{W}x{H}+{(sw - W) // 2}+{sh - H - 48}')

        canvas = tk.Canvas(root, width=W, height=H, bg='#111111', highlightthickness=0)
        canvas.pack()

        rms_history = [0.0] * N_BARS
        visible = [False]

        def update():
            should_show = indicator_show.is_set()
            if should_show and not visible[0]:
                root.deiconify()
                visible[0] = True
            elif not should_show and visible[0]:
                root.withdraw()
                visible[0] = False
                for i in range(N_BARS):
                    rms_history[i] = 0.0

            if visible[0]:
                rms = 0.0
                with frames_lock:
                    if frames:
                        last = frames[-1].flatten()
                        rms = float(np.sqrt(np.mean(last ** 2)))

                rms_history.pop(0)
                rms_history.append(min(rms * 10, 1.0))

                canvas.delete('all')
                canvas.create_rectangle(0, 0, W, H, fill='#111111', outline='')

                # Roter Rec-Punkt
                r = 7
                cx, cy = 16, H // 2
                canvas.create_oval(cx - r, cy - r, cx + r, cy + r, fill='#ff3333', outline='')

                # Scrollende Lautstärkebalken
                x0 = 32
                bar_w = (W - x0 - 8) / N_BARS
                for i, v in enumerate(rms_history):
                    bh = max(2, int(v * (H - 10)))
                    bx0 = x0 + i * bar_w + 0.5
                    bx1 = bx0 + bar_w - 1.5
                    by0 = (H - bh) // 2
                    by1 = by0 + bh
                    color = '#33cc66' if v < 0.5 else ('#ffcc00' if v < 0.8 else '#ff4444')
                    canvas.create_rectangle(bx0, by0, bx1, by1, fill=color, outline='')

            root.after(80, update)

        root.after(80, update)
        root.mainloop()

    threading.Thread(target=run_indicator_thread, daemon=True).start()

    # ── Paste-Hilfsfunktion ────────────────────────────────────────────────────
    def _foreground_is_cursor() -> bool:
        try:
            import ctypes, psutil
            hwnd = ctypes.windll.user32.GetForegroundWindow()
            pid = ctypes.c_ulong()
            ctypes.windll.user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
            return 'cursor' in psutil.Process(pid.value).name().lower()
        except Exception:
            return False

    def _paste():
        kb = pynput_kb.Controller()
        if _foreground_is_cursor():
            # Cursor-Terminal: Ctrl+Shift+V (VS Code Standard-Paste)
            with kb.pressed(pynput_kb.Key.ctrl):
                with kb.pressed(pynput_kb.Key.shift):
                    kb.press('v'); kb.release('v')
        else:
            with kb.pressed(pynput_kb.Key.ctrl):
                kb.press('v'); kb.release('v')
        time.sleep(0.05)

    # ── Transkription nach F5-Loslassen ──────────────────────────────────────
    def transcribe_final():
        if not transcribe_lock.acquire(blocking=False):
            return  # Bereits eine Transkription aktiv
        try:
            _transcribe_inner()
        finally:
            transcribe_lock.release()

    def _transcribe_inner():
        with frames_lock:
            if not frames:
                print('\n(kein Audio)', flush=True)
                return
            audio_data = np.concatenate(frames, axis=0).flatten()

        if len(audio_data) / SAMPLE_RATE < MIN_AUDIO_SEC:
            print('\n(zu kurz)', flush=True)
            return

        audio_16k = resample(audio_data, SAMPLE_RATE, WHISPER_RATE)

        try:
            segments = model.transcribe(
                audio_16k,
                language=current_lang[0],
                initial_prompt=INITIAL_PROMPT,
            )
            text = ' '.join(s.text for s in segments).strip()
        except Exception as e:
            print(f'\n(Fehler: {e})', flush=True)
            return

        if text:
            print(f'\n"{text}"', flush=True)
            pyperclip.copy(text)
            time.sleep(0.05)
            _paste()
            time.sleep(0.3)
            ctrl = pynput_kb.Controller()
            ctrl.press(pynput_kb.Key.enter)
            ctrl.release(pynput_kb.Key.enter)
        else:
            print('\n(kein Text erkannt)', flush=True)

    # ── Toast (shared module) ────────────────────────────────────────────────
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from toast import show_toast

    # ── TTS-Steuerung ─────────────────────────────────────────────────────────
    def toggle_tts():
        if os.path.exists(STATE_FILE):
            os.remove(STATE_FILE)
            print('\nTTS aus', flush=True)
            show_toast('Sprachausgabe: AUS')
        else:
            open(STATE_FILE, 'w').close()
            print('\nTTS an', flush=True)
            show_toast('Sprachausgabe: AN')

    def stop_tts():
        if not os.path.exists(PID_FILE):
            return
        try:
            with open(PID_FILE) as f:
                pid = int(f.read().strip())
            os.kill(pid, signal.SIGTERM)
            print('\nVorlesen gestoppt.', flush=True)
            show_toast('Vorlesen gestoppt', 2000)
        except Exception:
            pass

    # ── Status-Ausgabe ────────────────────────────────────────────────────────
    tts_status = 'AN' if os.path.exists(STATE_FILE) else 'AUS'
    print('Claude Voice Plugin bereit')
    lang_label = 'Deutsch' if LANGUAGE == 'de' else 'English'
    print(f'  {HOTKEY.upper()} halten  = sprechen  ->  Live-Text + Enter')
    print(f'  {LANG_TOGGLE.upper()}        = Sprache wechseln  (aktuell: {lang_label})')
    print(f'  {TTS_TOGGLE.upper()}        = TTS an/aus  (aktuell: {tts_status})')
    print(f'  {TTS_STOP.upper()}        = Vorlesen stoppen')
    print(f'  {QUIT_KEY.upper()}       = beenden\n')

    # ── pynput Hotkey-Listener (kein Admin nötig) ────────────────────────────
    KEY_MAP = {
        HOTKEY:      pynput_kb.Key.f9,
        LANG_TOGGLE: pynput_kb.Key.f4,
        TTS_TOGGLE:  pynput_kb.Key.f8,
        TTS_STOP:    pynput_kb.Key.f7,
        QUIT_KEY:    pynput_kb.Key.f12,
    }
    current_lang = [LANGUAGE]  # mutable container for closure access
    stop_event = threading.Event()

    def on_press(key):
        if key == KEY_MAP[HOTKEY]:
            if not is_recording.is_set():
                try:
                    import ctypes
                    target_hwnd[0] = ctypes.windll.user32.GetForegroundWindow()
                except Exception:
                    target_hwnd[0] = 0
                with frames_lock:
                    frames.clear()
                is_recording.set()
                indicator_show.set()
                print('\n🎙️ ', end='', flush=True)
        elif key == KEY_MAP[LANG_TOGGLE]:
            current_lang[0] = 'en' if current_lang[0] == 'de' else 'de'
            label = 'Deutsch' if current_lang[0] == 'de' else 'English'
            print(f'\n[Sprache: {label}]', flush=True)
            show_toast(f'Sprache: {label}', 2000)
        elif key == KEY_MAP[TTS_TOGGLE]:
            toggle_tts()
        elif key == KEY_MAP[TTS_STOP]:
            stop_tts()
        elif key == KEY_MAP[QUIT_KEY]:
            stop_event.set()
            return False  # Listener beenden

    def on_release(key):
        if key == KEY_MAP[HOTKEY] and is_recording.is_set():
            is_recording.clear()
            indicator_show.clear()
            threading.Thread(target=transcribe_final, daemon=True).start()

    try:
        with pynput_kb.Listener(on_press=on_press, on_release=on_release) as listener:
            stop_event.wait()
    except KeyboardInterrupt:
        pass

    # ── Aufräumen ─────────────────────────────────────────────────────────────
    stop_watchdog.set()
    stream_ref[0].stop()
    stream_ref[0].close()
    print('\nBeendet.')  # PID-File wird via atexit entfernt


# ══════════════════════════════════════════════════════════════════════════════

def _ensure_admin():
    """Windows: Admin-Rechte nötig für globale Hotkeys (keyboard-Bibliothek)."""
    import ctypes
    if not ctypes.windll.shell32.IsUserAnAdmin():
        print('Admin-Rechte erforderlich – starte UAC-Dialog...', flush=True)
        params = ' '.join(f'"{a}"' for a in sys.argv)
        ret = ctypes.windll.shell32.ShellExecuteW(None, 'runas', sys.executable, params, None, 1)
        sys.exit(0 if ret > 32 else 1)


def run_install():
    """Richtet automatischen Start per Startup-BAT ein."""
    script = os.path.abspath(__file__)
    exe = sys.executable

    startup_dir = os.path.expanduser(
        r'~\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup'
    )
    bat_path = os.path.join(startup_dir, 'whisper-stt.bat')
    bat_content = f'''@echo off
start "" "{exe}" "{script}"
'''
    try:
        with open(bat_path, 'w', encoding='utf-8') as f:
            f.write(bat_content)
        print(f'OK: Startup-BAT erstellt: {bat_path}')
    except OSError as e:
        print(f'Fehler beim Erstellen der Startup-BAT: {e}')

    # Alten Task Scheduler-Eintrag entfernen (falls vorhanden)
    import subprocess
    subprocess.run(
        ['schtasks', '/Delete', '/TN', 'ClaudeWhisperSTT', '/F'],
        capture_output=True, text=True,
    )



def run_uninstall():
    """Entfernt den automatischen Start (Startup-BAT + ggf. alter Task)."""
    bat_path = os.path.join(
        os.path.expanduser(r'~\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup'),
        'whisper-stt.bat',
    )
    try:
        os.remove(bat_path)
        print(f'OK: Startup-BAT entfernt: {bat_path}')
    except FileNotFoundError:
        print('Startup-BAT war nicht vorhanden.')
    except OSError as e:
        print(f'Fehler: {e}')

    # Alten Task Scheduler-Eintrag entfernen (falls vorhanden)
    import subprocess
    subprocess.run(
        ['schtasks', '/Delete', '/TN', 'ClaudeWhisperSTT', '/F'],
        capture_output=True, text=True,
    )



if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
    if '--hook' in sys.argv:
        run_hook()
    elif '--install' in sys.argv:
        run_install()
    elif '--uninstall' in sys.argv:
        run_uninstall()
    else:
        run_service()
