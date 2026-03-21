# Quick Start

The fastest way to get set up. One prerequisite, one step.

## Prerequisite

Install [Claude Code](https://docs.anthropic.com/en/docs/claude-code) if you don't have it:

```bash
npm install -g @anthropic-ai/claude-code
claude   # run once to authenticate
```

## Setup (30 seconds)

Start Claude anywhere and say:

> "Clone https://github.com/qwertzuiop151/claude-toolkit and read SETUP.md — set me up"

That's it. Claude clones the repo, detects your system, asks a few questions, installs everything.

## What Happens

The wizard walks you through:

1. **Core setup** -- CLAUDE.md (global rules), settings.json (permissions + hooks), auto-memory + statusline hooks
2. **Personalization** -- Adapts rules to your experience level and domain
3. **Optional components** -- AgentHub (multi-terminal app), Hotkey Manager (voice control), Orchestrator project

You pick what you want. The wizard handles the rest.

## After Setup

Restart Claude Code for hooks to activate:

```bash
/exit
claude
```

Your new statusline should appear, and Claude will start reminding you to update MEMORY.md.

## Manual Setup

If you prefer to install manually without the wizard:

1. Copy `templates/claude-md-global.md` to `~/.claude/CLAUDE.md`
2. Copy `templates/settings.json` to `~/.claude/settings.json`
3. Copy `hooks/auto-memory.mjs` to `~/.claude/hooks/auto-memory.mjs`
4. Copy `hooks/statusline.mjs` to `~/.claude/hooks/statusline.mjs`
5. Restart Claude Code

For AgentHub (optional, Windows only):
```bash
cd claude-toolkit
npm install --ignore-scripts
npx electron-rebuild -f -w node-pty
npm run build
npx electron .
```

## Need Help?

- Run `claude` and say: "Read TROUBLESHOOT.md and fix my setup"
- Or read [TROUBLESHOOT.md](TROUBLESHOOT.md) yourself
