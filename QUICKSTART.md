# Quick Start Guide

## Prerequisites

You need these installed before setting up AgentHub:

### 1. Node.js (v18 or newer)
- Download: https://nodejs.org (LTS recommended)
- Verify: `node --version`

### 2. Git for Windows
- Download: https://gitforwindows.org
- Use default install path (`C:\Program Files\Git`)
- Verify: `git --version`

### 3. C++ Build Tools (required to compile node-pty)

**Option A** — Visual Studio Build Tools (recommended):
1. Download [VS Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
2. Install the **"Desktop development with C++"** workload

**Option B** — From an admin command prompt:
```
npm install -g windows-build-tools
```

### 4. Claude Code CLI
```bash
npm install -g @anthropic-ai/claude-code
claude  # Run once to authenticate
```

## Installation

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/AgentHub.git
cd AgentHub

# 2. Install dependencies (skip native build scripts initially)
npm install --ignore-scripts

# 3. Build node-pty for Electron
npx electron-rebuild -f -w node-pty

# 4. Build the app
npm run build

# 5. Launch
npx electron .
```

## Create a Desktop Shortcut

The included `start.bat` builds and launches the app:

```
@echo off
cd /d %~dp0
set CLAUDECODE=
echo Building...
call npm run build >nul 2>&1
echo Starting AgentHub...
npx electron .
```

Right-click `start.bat` → **Create shortcut** → move to Desktop.

## First Launch

1. The **startup dialog** shows your Claude Code projects
2. Pick a project, choose model/effort settings
3. Click **Start** — a terminal panel opens with Claude running
4. Click **+ Agent** in the toolbar to add more panels
5. Use **Ctrl+1–9** to switch between panels

## Configuration

### Custom projects directory

By default, AgentHub finds your projects by reading Claude Code’s config at `~/.claude/projects/`. To override:

```bash
set AGENTHUB_PROJECTS_DIR=D:\MyProjects
```

Add this to your `start.bat` before the `npm run build` line.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| **`node-pty` build fails** | Install C++ build tools (see Prerequisites step 3) |
| **Blank/white window** | Run `npm run build` again — `dist/renderer/index.html` is missing |
| **"Prozess beendet" immediately** | Claude CLI not installed or not authenticated (`claude` in a terminal) |
| **No projects listed** | Run `claude` at least once in a project so `~/.claude/projects/` exists |
| **`electron-rebuild` fails** | Try: `node node_modules/node-pty/scripts/prebuild.js` then `node node_modules/electron/install.js` |
| **Git Bash not found** | Install Git to default path, or set `GIT_BASH_PATH` env var |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+1–9 | Switch to panel N |
| Ctrl+Tab | Next panel |
| Ctrl+Shift+Tab | Previous panel |
| Ctrl+Shift+D | Open diagnostics viewer |
