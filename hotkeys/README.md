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

> "Read the hotkeys/README.md in this repo. Set up the hotkey system for me:
> 1. Install the Python dependencies
> 2. List my audio devices and ask which microphone I want to use
> 3. Check which GPU I have (run: wmic path win32_VideoController get Name)
>    and tell me whether I should use CPU or GPU for Whisper.
>    If I have an NVIDIA GPU, explain the CUDA setup.
>    If I have an AMD GPU, explain the Vulkan setup.
>    If I only have Intel, use CPU.
>    Tell me: CPU works fine (~2-4s latency), but GPU is much faster (~0.3-0.5s).
> 4. Download the Whisper model
> 5. Configure everything (mic name, GPU/CPU, hotkeys)
> 6. Test that it works"

Claude Code will:
1. Install Python dependencies
2. List your audio devices and ask which microphone to use
3. Detect your GPU and recommend CPU vs GPU setup with specific instructions for your hardware
4. Download the Whisper model (~600MB for the quantized large-v3)
5. Create a config file with your settings
6. Test the setup and troubleshoot if needed

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

| | CPU | NVIDIA (CUDA) | AMD (Vulkan) | Intel (SYCL/oneAPI) |
|---|---|---|---|---|
| **Setup** | Works out of the box | CUDA toolkit + cuBLAS | Vulkan SDK + whisper.cpp Vulkan build | Intel oneAPI toolkit + SYCL build |
| **Speed** | ~2-4s for a 5s clip | ~0.3-0.5s | ~0.5-1s | ~0.5-1s (up to 12x vs CPU) |
| **RAM** | ~1.5GB system RAM | ~1.5GB VRAM | ~1.5GB VRAM | ~1.5GB VRAM |
| **Quality** | Same | Same | Same | Same |
| **Works on** | Everything | NVIDIA only | AMD + NVIDIA | Intel Arc / iGPU (incl. Iris Xe) |

**CPU is the default and works great.** GPU only matters if you're doing very frequent, long dictations and want near-instant transcription. For occasional push-to-talk (a few sentences at a time), CPU is fast enough.

### GPU setup by vendor

**NVIDIA (CUDA):** Install CUDA toolkit, then `pywhispercpp` with CUDA support. See [pywhispercpp docs](https://github.com/abdeladim-s/pywhispercpp#nvidia-gpu-support).

**AMD (Vulkan):** Works on Windows and Linux. Requires Vulkan SDK and building whisper.cpp with Vulkan backend (`-DGGML_VULKAN=ON`). Then point `pywhispercpp` to the Vulkan-enabled library. Tested and working on RX 7900 XT.

**Intel (SYCL/oneAPI):** Supported since whisper.cpp 1.8.3 with significant speedup vs CPU. Works on Intel Arc dGPUs and integrated GPUs including Iris Xe (Tiger Lake/Alder Lake) and newer. Even an Iris Xe with 4GB shared VRAM easily fits the quantized large-v3 model (~600MB) and should deliver ~2-4x speedup over CPU thanks to parallel matrix operations on the GPU cores. Requires [Intel oneAPI Base Toolkit](https://www.intel.com/content/www/us/en/developer/tools/oneapi/base-toolkit.html) and building whisper.cpp with `-DGGML_SYCL=ON`. See the [whisper.cpp SYCL guide](https://github.com/ggml-org/whisper.cpp/blob/master/README_sycl.md). Setup is more involved than CUDA/Vulkan, but the speed gain is worth it — GPU acceleration makes push-to-talk feel near-instant vs the noticeable 2-4s delay on CPU.

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
