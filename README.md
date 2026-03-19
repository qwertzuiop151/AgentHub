# AgentHub

> [!TIP]
> **You don't need to install anything manually.** Clone the repo, open Claude Code, paste one prompt. Claude Code detects your hardware, asks what you want, and sets up everything for you.

## Get started in 60 seconds

**Prerequisites:** [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed. Don't have it? Run `npm install -g @anthropic-ai/claude-code` (requires Node.js 18+).

### Step 1 — Clone and open

```bash
git clone https://github.com/qwertzuiop151/AgentHub.git
cd AgentHub
claude
```

### Step 2 — Paste this prompt

> [!IMPORTANT]
> **Copy this entire block and paste it into Claude Code. It will do the rest.**
>
> `Read the README.md in this repo. It has three components: (1) AgentHub — a desktop app for running multiple Claude Code agents side-by-side, (2) A Multi-Agent Blueprint — an architecture for organizing your agents, (3) Hotkey Manager + Voice Control — push-to-talk with Whisper + TTS. Ask me which of these I want to set up. Explain what each one does and let me pick. Then walk me through the setup step by step — install dependencies, detect my GPU and microphone, download models, configure everything. Adapt it all to my system and preferences.`

### Step 3 — There is no step 3.

Claude Code handles the rest: installing dependencies, detecting your GPU, finding your microphone, downloading models, writing config files. You just answer its questions.

> **Everything in this repo is a starting point, not a finished product.** The whole point is to customize it to your own needs. Change hotkeys, swap models, rewrite rules, remove what you don't need, add what's missing. The repo gives you escape velocity — you steer.

---

## What's in this repo?

**Three things:**

1. **AgentHub** — Desktop app for running multiple [Claude Code](https://docs.anthropic.com/en/docs/claude-code) agents side-by-side in a single window
2. **[Multi-Agent Blueprint](BLUEPRINT.md)** — A battle-tested architecture for organizing multiple Claude Code agents into a self-improving system
3. **[Hotkey Manager + Voice Control](hotkeys/)** — Push-to-talk Whisper STT, text-to-speech, and utility hotkeys for Claude Code

Built with Electron, React, xterm.js, and node-pty. ![Windows](https://img.shields.io/badge/platform-Windows-blue)

---

## 1. The App

AgentHub gives you a tiled terminal grid where each panel runs its own Claude Code session. Instead of juggling multiple terminal windows, you get:

- **Parallel agents** — run 2-10+ Claude sessions at once, each in its own resizable panel
- **Status detection** — color-coded dots show if an agent is working (yellow), waiting for input (blue), or inactive (gray)
- **Attention glow** — panels pulse when an agent finishes and needs your input, with an optional notification sound
- **Session persistence** — your layout, open projects, and settings survive restarts
- **Focus mode** — toggle between grid view (all panels) and focus view (one panel full-screen, rest in a taskbar)
- **Drag-to-swap** — rearrange panels by dragging headers
- **Memory viewer** — quick-access buttons to view Claude's memory files and CLAUDE.md per project
- **Plans viewer** — browse plan documents across all your projects
- **Keyboard shortcuts** — Ctrl+1-9 to switch panels, Ctrl+Tab to cycle

> For detailed app setup instructions, see [SETUP.md](SETUP.md).

## 2. The Blueprint

The app is just the terminal manager. The real power comes from **how you organize** your agents. The [BLUEPRINT.md](BLUEPRINT.md) documents a complete multi-agent architecture:

- **One folder = one agent** — each project has its own CLAUDE.md (rules), PROJECT.md (architecture), and memory
- **Hub-and-spoke coordination** — a central orchestrator agent coordinates all others through shared files
- **Persistent memory** — hooks auto-remind agents to save knowledge across sessions
- **Self-improvement loop** — built-in audit system detects config drift, stale knowledge, and optimization opportunities
- **14 sections** covering directory structure, hooks, skills, MCP integration, advanced patterns, and honest limitations

## 3. Hotkey Manager + Voice Control

Push-to-talk voice input (local Whisper STT) + text-to-speech output (Edge TTS) + utility hotkeys. See [hotkeys/README.md](hotkeys/README.md) for details.

| Hotkey | Function |
|--------|----------|
| **F9** | Push-to-talk — hold to speak, release to transcribe |
| **F8** | Toggle text-to-speech |
| **F7** | Stop current TTS playback |
| **F6** | Toggle notifications |
| **F12** | Start/stop all hotkey scripts |

Supports GPU acceleration on **NVIDIA** (CUDA), **AMD** (Vulkan), and **Intel** (SYCL/oneAPI) for near-instant transcription.

---

## App Architecture

```
+---------------------------------------------+
| Electron Renderer (React)                   |
|  App.tsx -> ResizableGrid -> TerminalPanel   |
|                              +-> xterm.js    |
+---------------------+-----------------------+
                      | IPC (preload.ts)
+---------------------+-----------------------+
| Electron Main (index.ts)                    |
|  PtyManager -> stdin/stdout JSON             |
+---------------------+-----------------------+
                      | child_process.spawn
+---------------------+-----------------------+
| pty-host.ts (separate Node.js process)       |
|  node-pty -> spawns Git Bash -> runs claude  |
+---------------------------------------------+
```

**Why the separate process?** On Windows, node-pty's ConPTY mode conflicts with Electron's console handling. Running PTY instances in a standalone Node.js child process avoids this entirely.

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
    preload.ts        # Context bridge (renderer <-> main)
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
