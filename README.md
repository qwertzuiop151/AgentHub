# AgentHub

Desktop app for running multiple [Claude Code](https://docs.anthropic.com/en/docs/claude-code) agents side-by-side in a single window.

Built with Electron, React, xterm.js, and node-pty.

![Windows](https://img.shields.io/badge/platform-Windows-blue)

## What it does

AgentHub gives you a tiled terminal grid where each panel runs its own Claude Code session. Instead of juggling multiple terminal windows, you get:

- **Parallel agents** — run 2–10+ Claude sessions at once, each in its own resizable panel
- **Status detection** — color-coded dots show if an agent is working (yellow), waiting for input (blue), or inactive (gray)
- **Attention glow** — panels pulse when an agent finishes and needs your input, with an optional notification sound
- **Session persistence** — your layout, open projects, and settings survive restarts
- **Focus mode** — toggle between grid view (all panels) and focus view (one panel full-screen, rest in a taskbar)
- **Drag-to-swap** — rearrange panels by dragging headers
- **Memory viewer** — quick-access buttons to view Claude’s memory files and CLAUDE.md per project
- **Plans viewer** — browse plan documents across all your projects
- **Keyboard shortcuts** — Ctrl+1–9 to switch panels, Ctrl+Tab to cycle

## Architecture

```
┌─────────────────────────────────────────────┐
│ Electron Renderer (React)                   │
│  App.tsx → ResizableGrid → TerminalPanel    │
│                            └→ xterm.js       │
└─────────────────────┬───────────────────────┘
                     │ IPC (preload.ts)
┌─────────────────────┴───────────────────────┐
│ Electron Main (index.ts)                    │
│  PtyManager → stdin/stdout JSON              │
└─────────────────────┬───────────────────────┘
                     │ child_process.spawn
┌─────────────────────┴───────────────────────┐
│ pty-host.ts (separate Node.js process)       │
│  node-pty → spawns Git Bash → runs claude   │
└─────────────────────────────────────────────┘
```

**Why the separate process?** On Windows, node-pty’s ConPTY mode conflicts with Electron’s console handling. Running PTY instances in a standalone Node.js child process avoids this entirely.

## Quick Start

> See [QUICKSTART.md](QUICKSTART.md) for the full step-by-step guide.

```bash
# Prerequisites: Node.js 18+, Git for Windows, C++ build tools, Claude Code CLI

git clone https://github.com/YOUR_USERNAME/AgentHub.git
cd AgentHub
npm install --ignore-scripts
npx electron-rebuild -f -w node-pty
npm run build
npx electron .
```

## Configuration

### Projects directory

AgentHub auto-detects your projects folder from Claude Code’s config (`~/.claude/projects/`). If auto-detection fails or you want to override it, set:

```
set AGENTHUB_PROJECTS_DIR=C:\Users\You\Projects
```

### Desktop shortcut

Run `start.bat` to build and launch. Create a shortcut to it on your desktop for one-click access.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop framework | Electron 33 |
| UI | React 18 |
| Terminal emulation | xterm.js 5 + WebGL renderer |
| PTY management | node-pty (winpty mode on Windows) |
| Build | TypeScript, Vite, tsc |

## Project Structure

```
src/
  main/
    index.ts          # Electron main process, IPC handlers
    preload.ts        # Context bridge (renderer ↔ main)
    pty-manager.ts    # Manages the pty-host child process
    pty-host.ts       # Standalone Node.js process hosting PTY instances
    session-store.ts  # Persists layout to %APPDATA%/agenthub/session.json
    diagnostics.ts    # Freeze detection watchdog, crash logging
  renderer/
    src/
      App.tsx                    # Root component, panel state, focus mode
      components/
        Toolbar.tsx              # Top bar with action buttons
        ResizableGrid.tsx        # CSS Grid layout with draggable dividers
        TerminalPanel.tsx        # xterm.js wrapper, status detection, glow
        StartupDialog.tsx        # Project picker at launch
        DiagnosticsViewer.tsx    # Ctrl+Shift+D freeze log viewer
        FileViewer.tsx           # Modal for viewing memory/plan files
        ErrorBoundary.tsx        # React error boundary
  shared/
    types.ts          # Shared TypeScript interfaces
```

## Known Limitations

- **Windows only** — relies on Git Bash and winpty. macOS/Linux support would require shell detection changes.
- **Claude Code required** — agents spawn `claude` CLI sessions; without it, only plain terminal mode works.
- **Native compilation** — node-pty requires C++ build tools, which can be tricky to set up.

## License

MIT
