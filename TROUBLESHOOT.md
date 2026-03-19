# AgentHub — Automated Troubleshooting

> **Something not working?** Open a terminal in the AgentHub folder, run `claude`, and say:
>
> *"Read TROUBLESHOOT.md and fix my AgentHub."*
>
> Claude will diagnose and fix the problem automatically.

---

You are diagnosing problems with AgentHub. Run each diagnostic section, report findings, and fix what you can. **Always check before acting — don't reinstall things that already work.**

## Phase 1: System Health Check

Run all of these and report the results as a table:

```bash
echo "=== Node ===" && node --version
echo "=== npm ===" && npm --version
echo "=== Git ===" && git --version
echo "=== Claude CLI ===" && claude --version 2>/dev/null || echo "NOT FOUND"
echo "=== Git Bash ===" && ls -la "C:/Program Files/Git/bin/bash.exe" 2>/dev/null || echo "NOT AT DEFAULT PATH"
echo "=== C++ Build Tools ===" && npm config get msvs_version 2>/dev/null || echo "NOT SET"
```

If Git Bash is not at the default path, find it:
```bash
where git 2>/dev/null
```
Then check if bash.exe exists relative to that (go up one dir, then into bin/).

Report a summary like:
| Check | Status | Version/Path |
|-------|--------|-------------|
| Node.js | OK/MISSING | v22.x |
| Git | OK/MISSING | 2.x |
| Git Bash | OK/WRONG PATH/MISSING | path |
| Claude CLI | OK/MISSING | x.x |
| C++ Build Tools | OK/MISSING | 2022 |

**Fix anything that's missing before continuing.**

## Phase 2: Build Health Check

```bash
echo "=== node-pty native module ==="
ls node_modules/node-pty/build/Release/*.node 2>/dev/null || echo "NOT BUILT"

echo "=== Electron binary ==="
ls node_modules/electron/dist/electron.exe 2>/dev/null || echo "NOT INSTALLED"

echo "=== TypeScript build ==="
ls dist/main/main/index.js 2>/dev/null || echo "NOT BUILT"

echo "=== Renderer build ==="
ls dist/renderer/index.html 2>/dev/null || echo "NOT BUILT"
```

**Fixes:**
- node-pty not built → `npx electron-rebuild -f -w node-pty`
  - If that fails → `node node_modules/node-pty/scripts/prebuild.js`
- Electron not installed → `node node_modules/electron/install.js`
- TypeScript not built → `npm run build:main`
- Renderer not built → `npm run build:renderer`

After fixing, run `npm run build` to rebuild everything.

## Phase 3: Common Symptoms

### Empty terminal / blinking cursor, can't type

**Cause:** Git Bash not found or pty-host not starting.

1. Check if Git Bash exists:
   ```bash
   ls "C:/Program Files/Git/bin/bash.exe" 2>/dev/null && echo "FOUND" || echo "NOT FOUND"
   ```

2. If not found, search for it:
   ```bash
   where git 2>/dev/null
   # Also check common alternative paths:
   ls "C:/Program Files (x86)/Git/bin/bash.exe" 2>/dev/null
   ls "$LOCALAPPDATA/Programs/Git/bin/bash.exe" 2>/dev/null
   ls "$HOME/scoop/apps/git/current/bin/bash.exe" 2>/dev/null
   ```

3. If Git Bash is at a non-standard path, add this to `start.bat` before the build line:
   ```bat
   set GIT_BASH_PATH=<actual path to bash.exe>
   ```

4. Check if pty-host can start:
   ```bash
   node dist/main/main/pty-host.js
   ```
   You should see `{"type":"ready"}`. If you get an error about node-pty, rebuild it (Phase 2).
   Press Ctrl+C to exit.

5. Check if the system Node.js works (not Electron's bundled one):
   ```bash
   where node
   ```
   The first result should be your system Node.js, NOT something inside node_modules.

### Blank/white window on launch

**Cause:** Renderer not built.

```bash
ls dist/renderer/index.html 2>/dev/null || echo "MISSING - need to build"
npm run build:renderer
```

### "Prozess beendet" / terminal exits immediately

**Cause:** Claude CLI not installed, not authenticated, or not in PATH.

```bash
claude --version 2>/dev/null || echo "Claude CLI not found"
which claude 2>/dev/null || where claude 2>/dev/null || echo "Not in PATH"
```

Fix: `npm install -g @anthropic-ai/claude-code` then run `claude` once to authenticate.

If using terminal-only mode (no Claude), this is expected when the shell exits.

### No projects listed in startup dialog

**Cause:** Projects directory not found or empty.

```bash
echo "=== Checking AGENTHUB_PROJECTS_DIR ==="
echo "$AGENTHUB_PROJECTS_DIR"

echo "=== Checking Claude projects dir ==="
ls ~/.claude/projects/ 2>/dev/null || echo "No Claude projects dir"

echo "=== Checking start.bat for AGENTHUB_PROJECTS_DIR ==="
grep -i "AGENTHUB_PROJECTS_DIR" start.bat 2>/dev/null || echo "Not set in start.bat"
```

Fix: Ask the user where their project folders are, then add to `start.bat`:
```bat
set AGENTHUB_PROJECTS_DIR=C:\Users\You\Projects
```

### electron-rebuild fails

**Cause:** Missing C++ build tools.

```bash
npm config get msvs_version
```

If empty/undefined: Install [VS Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with "Desktop development with C++".

After installing, retry:
```bash
npx electron-rebuild -f -w node-pty
npm run build
```

### App crashes or freezes

Check the diagnostics log:
```bash
cat "$APPDATA/agenthub/diagnostics.log" 2>/dev/null | tail -20 || echo "No log file"
```

Report what you find to the user.


## Phase 3b: Hotkeys + Voice Control Issues

### Whisper not transcribing / no output after speaking

**Cause:** Wrong microphone selected or model not downloaded.

1. Check available microphones:
   ```bash
   python -c "import sounddevice; print(sounddevice.query_devices())"
   ```

2. Check if the configured mic name matches:
   ```bash
   grep "MIC_NAME_CONTAINS" hotkeys/whisper-stt.py
   ```
   The value must be a substring of your actual device name from step 1.

3. Check if the Whisper model exists:
   ```bash
   ls hotkeys/models/*.bin 2>/dev/null || echo "NO MODEL FOUND"
   ```
   If missing, download it:
   ```bash
   mkdir -p hotkeys/models
   curl -L -o hotkeys/models/ggml-large-v3-q5_0.bin https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-q5_0.bin
   ```

### Microphone not found / wrong device

List all input devices with their indices:
```bash
python -c "import sounddevice as sd; [print(f'{i}: {d[chr(110)+chr(97)+chr(109)+chr(101)]}') for i, d in enumerate(sd.query_devices()) if d['max_input_channels'] > 0]"
```

Ask the user which one is their microphone, then update MIC_NAME_CONTAINS in hotkeys/whisper-stt.py with a unique part of that device name.

### TTS not speaking / edge-tts errors

**Cause:** No internet connection (Edge TTS is cloud-based) or package not installed.

```bash
pip show edge-tts 2>/dev/null || echo "NOT INSTALLED"
edge-tts --text "hello world" --write-media /tmp/test.mp3 && echo "TTS WORKS" || echo "TTS FAILED -- check internet"
```

### GPU acceleration not working for Whisper

1. Check which GPU you have:
   ```bash
   wmic path win32_VideoController get Name 2>/dev/null || echo "Could not detect GPU"
   ```

2. Based on vendor:
   - **NVIDIA:** Check CUDA: `nvidia-smi 2>/dev/null || echo "No CUDA"`
   - **AMD:** Check Vulkan: `vulkaninfo --summary 2>/dev/null || echo "No Vulkan SDK"`
   - **Intel:** Check oneAPI: `sycl-ls 2>/dev/null || echo "No oneAPI"`

3. If GPU tools are missing, Whisper falls back to CPU automatically. See hotkeys/README.md for GPU setup per vendor.

### Hotkey-manager won't start / Python errors

```bash
python hotkeys/hotkey-manager.py 2>&1 | head -20
```

Common fixes:
- ModuleNotFoundError: `pip install -r hotkeys/requirements.txt`
- Permission denied: run as Administrator
- Lock file exists: delete ~/.whisper_stt.lock if stale

## Phase 3c: General Windows Issues

### npm install fails behind corporate proxy/VPN

```bash
npm config get proxy
npm config get https-proxy
```

If behind a proxy, set it:
```bash
npm config set proxy http://your-proxy:port
npm config set https-proxy http://your-proxy:port
```

### Windows Defender / Antivirus blocking builds

Symptoms: electron-rebuild fails with access denied, or compiled files disappear.

Fix: Add the AgentHub folder to Defender exclusions:
```powershell
Add-MpPreference -ExclusionPath "C:\path	o\AgentHub"
```

### Permission errors during install or build

Run the terminal as **Administrator**. If that fixes it, move the project to a user-owned directory instead of a system-protected one.

## Phase 4: Full Reset (nuclear option)

If nothing else works, do a clean reinstall:

```bash
rm -rf node_modules dist
npm install --ignore-scripts
npx electron-rebuild -f -w node-pty
npm run build
npx electron .
```

## Phase 5: Report

After diagnostics, print a summary:

```
====================================
   AgentHub Diagnostics Report
====================================

Issues found:    <number>
Issues fixed:    <number>
Status:          WORKING / NEEDS MANUAL ACTION

<list what was wrong and what was done>

Next step:       <what to do>
====================================
```

If you fixed things, test by running `npx electron .` and confirm the app starts correctly.
If issues remain that you can't fix automatically, explain clearly what the user needs to do.
