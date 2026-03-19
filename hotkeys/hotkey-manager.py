"""
Hotkey-Manager — laeuft dauerhaft im Hintergrund.
  F12 = Toggle: alle Hotkey-Scripts starten / stoppen
"""
import subprocess
import os
import sys
import threading
from pynput import keyboard as kb

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from toast import show_toast

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
SCRIPTS = ["whisper-stt.py", "notify-toggle.py"]
PYTHON = sys.executable  # Uses whatever Python is running this script

processes = []

def start_all():
    global processes
    # Kill any lingering processes first
    stop_all()
    processes = []
    for s in SCRIPTS:
        script_path = os.path.join(SCRIPTS_DIR, s)
        if os.path.exists(script_path):
            # whisper-stt needs a window for tkinter audio visualizer
            flags = 0 if s == "whisper-stt.py" else subprocess.CREATE_NO_WINDOW
            si = None
            if s == "whisper-stt.py":
                si = subprocess.STARTUPINFO()
                si.dwFlags |= subprocess.STARTF_USESHOWWINDOW
                si.wShowWindow = 0  # SW_HIDE — console hidden, but GUI allowed
            p = subprocess.Popen(
                [PYTHON, script_path],
                cwd=SCRIPTS_DIR,
                creationflags=flags,
                startupinfo=si
            )
            processes.append((s, p))
            print(f"  Gestartet: {s} (PID {p.pid})")
    print(f"Alle {len(processes)} Scripts laufen. F12 = stoppen, F11 = neu starten.\n")
    show_toast("Hotkeys: gestartet", 2000)

def stop_all():
    global processes
    for name, p in processes:
        try:
            p.terminate()
            p.wait(timeout=3)
        except Exception:
            try:
                p.kill()
            except Exception:
                pass
    if processes:
        print("Alle Scripts gestoppt.")
        show_toast("Hotkeys: gestoppt", 2000)
    processes = []

def toggle_all():
    if processes:
        print("\n[F12] Stoppe alle Scripts...")
        stop_all()
    else:
        print("\n[F12] Starte alle Scripts...")
        start_all()

def on_press(key):
    if key == kb.Key.f12:
        threading.Thread(target=toggle_all, daemon=True).start()

# Auto-start all scripts on launch
print("=== Hotkey-Manager ===")
print("F12 = Scripts an/aus toggle\n")
start_all()

with kb.Listener(on_press=on_press) as listener:
    listener.join()
