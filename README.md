# Claude Toolkit

> Zero-friction power-user setup for Claude Code. Your friend sends you this link, you tell Claude "set me up", done.

## Get Started in 30 Seconds

1. Install [Claude Code](https://docs.anthropic.com/en/docs/claude-code) if you don't have it: `npm install -g @anthropic-ai/claude-code`
2. Clone this repo:
   ```bash
   git clone https://github.com/qwertzuiop151/claude-toolkit
   cd claude-toolkit
   claude
   ```
3. Tell Claude: **"Read SETUP.md and set me up"**

That's it. Claude handles the rest -- detects your system, asks a few questions, installs everything.

## What You Get

- **Global `CLAUDE.md`** -- rules that apply to every project (memory system, git hygiene, naming conventions)
- **`settings.json`** -- pre-configured permissions and hook wiring
- **Auto-memory hook** -- reminds Claude to save decisions, fixes, and patterns to MEMORY.md automatically
- **Status line** -- shows current model, directory, and context window usage in your terminal
- **`MEMORY.md` starter** -- a template for persistent context that survives across sessions

Everything is customizable. The installer sets up sane defaults; you tweak from there.

## What's in This Repo

### Core: Claude Code Setup

The main event. Templates and hooks that turn a vanilla Claude Code install into a structured, memory-aware power-user environment. The [installer](SETUP.md) is a Claude-readable document -- Claude itself runs the setup interactively.

- [`templates/`](templates/) -- CLAUDE.md, settings.json, memory starter
- [`hooks/`](hooks/) -- auto-memory reminder, terminal status line
- [`SETUP.md`](SETUP.md) -- Claude-readable installer wizard

### Blueprint: Multi-Agent Architecture

A [549-line guide](BLUEPRINT.md) to building a self-improving multi-agent system with Claude Code. Covers architecture, directory structure, memory, hooks, skills, MCP servers, and advanced patterns. Start here if you want to scale from one project to a coordinated multi-agent ecosystem.

### AgentHub: Desktop Terminal Manager

A desktop app ([`src/`](src/)) for running multiple Claude Code sessions side-by-side in a tiled grid. Built with Electron + React + xterm.js. Features parallel agents, status detection, attention glow, and session persistence. Windows only for now.

- [Quick start guide](QUICKSTART.md) | [Troubleshooting](TROUBLESHOOT.md)

### Hotkeys: Voice Control & Utilities

[Python scripts](hotkeys/) that bind keyboard shortcuts to Claude Code actions: F4 to continue generation, Whisper-based voice input, text-to-speech, notification toggles. Requires Python and a few dependencies.

## Guides

- [Memory System](docs/memory-system.md) -- how persistent memory works
- [Hooks Guide](docs/hooks-guide.md) -- what the included hooks do and how to add your own
- [Customization](docs/customization.md) -- tailoring CLAUDE.md, settings, and project configs

## License

MIT
