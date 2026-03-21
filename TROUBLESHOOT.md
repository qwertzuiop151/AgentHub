# Claude Toolkit -- Troubleshooting

> **Quick fix:** Run `claude` in the toolkit folder and say:
>
> *"Read TROUBLESHOOT.md and fix my setup"*
>
> Claude will diagnose and fix problems automatically.

---

You are diagnosing problems with the Claude Toolkit. Run each relevant section, report findings, and fix what you can. **Always check before acting -- do not reinstall things that already work.**

## Phase 1: Core Setup Health

Check that the base toolkit is installed correctly:

```bash
echo "=== CLAUDE.md ===" && test -f ~/.claude/CLAUDE.md && wc -l ~/.claude/CLAUDE.md || echo "MISSING"
echo "=== settings.json ===" && node -e "JSON.parse(require('fs').readFileSync(require('os').homedir()+'/.claude/settings.json','utf8')); console.log('VALID')" 2>/dev/null || echo "MISSING OR INVALID"
echo "=== auto-memory hook ===" && test -f ~/.claude/hooks/auto-memory.mjs && node -c ~/.claude/hooks/auto-memory.mjs 2>/dev/null && echo "OK" || echo "MISSING OR INVALID"
echo "=== statusline hook ===" && test -f ~/.claude/hooks/statusline.mjs && node -c ~/.claude/hooks/statusline.mjs 2>/dev/null && echo "OK" || echo "MISSING OR INVALID"
echo "=== Node.js ===" && node --version || echo "NOT FOUND"
```

Report a summary:

| Check | Status |
|-------|--------|
| CLAUDE.md | OK / MISSING |
| settings.json | VALID / MISSING / INVALID |
| auto-memory hook | OK / MISSING |
| statusline hook | OK / MISSING |
| Node.js | vXX / NOT FOUND |

**Fixes:**
- CLAUDE.md missing: Copy from `templates/claude-md-global.md` in the toolkit repo
- settings.json missing or invalid: Copy from `templates/settings.json`, or restore from backup (check `~/.claude/toolkit-backup-manifest.json`)
- Hook missing: Copy from `hooks/` in the toolkit repo to `~/.claude/hooks/`
- Node.js missing: Install from https://nodejs.org (v18+)

## Phase 2: Hook Issues

### Hooks do not fire

1. Restart Claude Code (`/exit` then `claude`). Hooks load at session start.
2. Check settings.json has correct hook wiring:
   ```bash
   node -e "const s=JSON.parse(require('fs').readFileSync(require('os').homedir()+'/.claude/settings.json','utf8')); console.log(JSON.stringify(s.hooks, null, 2))"
   ```
   Should show `UserPromptSubmit` with `auto-memory.mjs` command.
3. Verify hook paths point to existing files.

### Hooks cause errors or slow responses

The auto-memory hook has a 3-second timeout. If it hangs:
```bash
echo '{}' | node ~/.claude/hooks/auto-memory.mjs
```
Should output JSON. If it errors, re-copy from `hooks/auto-memory.mjs` in this repo.

### Statusline shows nothing

Check that `~/.claude/settings.json` has a `statusLine` object at the top level (sibling of `hooks`, not nested inside it):
```json
{
  "hooks": { ... },
  "statusLine": {
    "type": "command",
    "command": "node ~/.claude/hooks/statusline.mjs"
  }
}
```

### Duplicate hooks after re-install

The installer's merge algorithm deduplicates, but edge cases can occur. Open `~/.claude/settings.json` and manually remove duplicate entries from the hook arrays.

## Phase 3: AgentHub Issues

Skip this section if AgentHub is not installed.

### System health check

```bash
echo "=== Node ===" && node --version
echo "=== Git ===" && git --version
echo "=== Git Bash ===" && ls -la "C:/Program Files/Git/bin/bash.exe" 2>/dev/null || echo "NOT AT DEFAULT PATH"
echo "=== C++ Build Tools ===" && npm config get msvs_version 2>/dev/null || echo "NOT SET"
```

### Build health check

```bash
echo "=== node-pty ===" && ls node_modules/node-pty/build/Release/*.node 2>/dev/null || echo "NOT BUILT"
echo "=== Electron ===" && ls node_modules/electron/dist/electron.exe 2>/dev/null || echo "NOT INSTALLED"
echo "=== TypeScript ===" && ls dist/main/main/index.js 2>/dev/null || echo "NOT BUILT"
echo "=== Renderer ===" && ls dist/renderer/index.html 2>/dev/null || echo "NOT BUILT"
```

**Fixes:**
- node-pty not built: `npx electron-rebuild -f -w node-pty`
- Electron missing: `node node_modules/electron/install.js`
- Not built: `npm run build`

### Empty terminal / can't type

Git Bash not found or pty-host not starting:
```bash
ls "C:/Program Files/Git/bin/bash.exe" 2>/dev/null && echo "FOUND" || echo "NOT FOUND"
```
If not at default path, set `GIT_BASH_PATH` env var in `start.bat`.

### Blank window on launch

Renderer not built:
```bash
npm run build:renderer
```

### "Prozess beendet" / terminal exits immediately

Claude CLI not installed or not authenticated:
```bash
claude --version 2>/dev/null || echo "Not found"
```
Fix: `npm install -g @anthropic-ai/claude-code` then `claude` to authenticate.

### No projects listed

```bash
echo $AGENTHUB_PROJECTS_DIR
ls ~/.claude/projects/ 2>/dev/null || echo "No Claude projects"
```
Set `AGENTHUB_PROJECTS_DIR` in `start.bat` or run `claude` in at least one project first.

### Full reset (nuclear option)

```bash
rm -rf node_modules dist
npm install --ignore-scripts
npx electron-rebuild -f -w node-pty
npm run build
npx electron .
```

## Phase 4: Hotkey Manager Issues

Skip this section if Hotkey Manager is not installed.

### Python errors on start

```bash
python hotkeys/hotkey-manager.py 2>&1 | head -20
```
Common fixes:
- ModuleNotFoundError: `pip install -r hotkeys/requirements.txt`
- Permission denied: run as Administrator

### Whisper not transcribing

1. Check microphone:
   ```bash
   python -c "import sounddevice; print(sounddevice.query_devices())"
   ```
2. Check config matches:
   ```bash
   grep "MIC_NAME_CONTAINS" hotkeys/whisper-stt.py
   ```
   Value must be a substring of your actual device name.

3. Check model exists:
   ```bash
   ls hotkeys/models/*.bin 2>/dev/null || echo "NO MODEL"
   ```

### TTS not speaking

Edge TTS requires internet:
```bash
pip show edge-tts 2>/dev/null || echo "NOT INSTALLED"
```

## Phase 5: Report

After diagnostics, print a summary:

```
============================================
  Toolkit Diagnostics Report
============================================

Core Setup:     OK / ISSUES FOUND
AgentHub:       OK / NOT INSTALLED / ISSUES FOUND
Hotkey Manager: OK / NOT INSTALLED / ISSUES FOUND

Issues found:    {number}
Issues fixed:    {number}

{list what was wrong and what was done}

Next step:       {what to do}
============================================
```
