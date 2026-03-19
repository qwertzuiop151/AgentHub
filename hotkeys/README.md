# Hotkey Manager + Voice Control for Claude Code

Push-to-talk voice input (Whisper) + text-to-speech output (Edge TTS) + utility hotkeys for Claude Code.

## What you get

| Hotkey | Function |
|--------|----------|
| **F9** | Push-to-talk — hold to speak, release to transcribe and paste into active window |
| **F4** | Language toggle (DE/EN) for voice input |
| **F8** | Toggle text-to-speech (Claude reads responses aloud) |
| **F7** | Stop current TTS playback |
| **F6** | Toggle Claude notifications on/off |
| **F12** | Start/stop all hotkey scripts |

## Setup (let Claude Code do it)

Copy this into Claude Code:

> "Read the hotkeys/README.md in this repo. Set up the hotkey system for me. Ask me which microphone I want to use, detect available devices, and configure everything. Download the Whisper model and install dependencies."

Claude Code will:
1. Install Python dependencies
2. List your audio devices and ask which microphone to use
3. Download the Whisper model (~600MB for the quantized large-v3)
4. Create a config file with your settings
5. Set up Windows autostart (optional)

## Manual Setup

### 1. Install dependencies

```bash
pip install -r hotkeys/requirements.txt
```

### 2. Download Whisper model

```bash
# Create models directory
mkdir hotkeys/models

# Download quantized large-v3 (~600MB, best quality/speed ratio)
curl -L -o hotkeys/models/ggml-large-v3-q5_0.bin https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-q5_0.bin
```

Or use a smaller model for faster startup:
```bash
# Medium (~500MB, faster but less accurate)
curl -L -o hotkeys/models/ggml-medium.bin https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin
```

### 3. Find your microphone

Run this to list all audio devices:
```bash
python -c "import sounddevice; print(sounddevice.query_devices())"
```

Find your microphone in the list and note either:
- The **device index** (number on the left)
- A **unique part of the device name** (e.g., "Headset Microphone")

### 4. Configure

Edit `hotkeys/config.json` (created on first run, or copy from `config.example.json`):

```json
{
  "mic_name": "Headset Microphone",
  "mic_device_index": 1,
  "sample_rate": 48000,
  "language": "de",
  "model_path": "models/ggml-large-v3-q5_0.bin",
  "tts_voice_de": "de-DE-ConradNeural",
  "tts_voice_en": "en-US-GuyNeural",
  "tts_speed": "+20%",
  "initial_prompt": "Your domain-specific vocabulary here",
  "hotkey_stt": "f9",
  "hotkey_lang_toggle": "f4",
  "hotkey_tts_toggle": "f8",
  "hotkey_tts_stop": "f7"
}
```

### 5. Run

```bash
# Start the hotkey manager (starts all scripts)
python hotkeys/hotkey-manager.py
```

### 6. Autostart (optional, Windows)

Create a shortcut to `hotkey-manager.py` in:
```
%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
```

Or use a VBS wrapper to run it hidden:
```vbs
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "pythonw hotkeys\hotkey-manager.py", 0, False
```

## CPU vs GPU

Whisper can run on CPU or GPU. The setup prompt will ask which you prefer.

| | CPU | GPU (NVIDIA CUDA) |
|---|---|---|
| **Setup** | Works out of the box | Needs CUDA toolkit + cuBLAS |
| **Speed** | ~2-4s for a 5s clip (large-v3) | ~0.3-0.5s for a 5s clip |
| **RAM** | ~1.5GB system RAM | ~1.5GB VRAM |
| **Quality** | Same (same model) | Same (same model) |
| **Recommended for** | Most users, AMD GPUs | Heavy voice users with NVIDIA GPU |

**CPU is the default and works great.** GPU only matters if you're doing very frequent, long dictations and want near-instant transcription. For occasional push-to-talk (a few sentences at a time), CPU is fast enough.

**AMD GPUs (ROCm):** Not supported by whisper.cpp on Windows. Use CPU, or wait for Linux + ROCm support.

**To enable GPU:** Install `pywhispercpp` with CUDA support — see [pywhispercpp docs](https://github.com/abdeladim-s/pywhispercpp#nvidia-gpu-support).

---

## How it works

```
hotkey-manager.py          Orchestrator — F12 toggles all scripts
  +-- whisper-stt.py       Voice: push-to-talk STT + TTS pipeline
  +-- notify-toggle.py     F6: notification flag toggle
```

**Voice input:** Hold F9 to record, release to transcribe with Whisper (runs locally, no cloud). Text is pasted into the currently active window via clipboard.

**Voice output:** When TTS is enabled (F8), Claude Code's Stop hook calls whisper-stt.py in hook mode, which reads the response and speaks it sentence-by-sentence using Edge TTS (free, cloud-based, high quality).

## Requirements

- Windows 10/11
- Python 3.10+
- A microphone
- ~600MB disk space for the Whisper model

## Troubleshooting

**"No microphone found"** — Check `python -c "import sounddevice; print(sounddevice.query_devices())"` and update `mic_name` in config.json.

**Whisper crashes on startup** — Make sure you have the correct model file in `models/`. The quantized q5_0 model needs ~1.5GB RAM.

**TTS not working** — Edge TTS requires internet. Check `pip show edge-tts` and test with `edge-tts --text "hello" --write-media test.mp3`.

**Hotkeys don't trigger** — Some apps block global hotkeys. Try running as administrator.
