# Memory System

Claude Code sessions are stateless by default -- when a session ends, everything Claude learned during that session is gone. The memory system fixes this by giving Claude a persistent file it reads at the start of every session and updates as you work.

## How It Works

`MEMORY.md` is a plain Markdown file that lives in your project directory (or in `~/.claude/` for global memory). Claude reads it automatically at session start and writes to it whenever something worth remembering comes up.

The [auto-memory hook](../hooks/auto-memory.mjs) reinforces this behavior: every time you send a message, it reminds Claude to check whether the response involves a fix, decision, pattern, or insight -- and if so, to update MEMORY.md before responding.

## Section Conventions

The [starter template](../templates/memory-starter.md) includes four sections. You can rename or restructure these however you like, but this is a solid starting point:

| Section | What goes here |
|---------|---------------|
| **User** | Your preferences, domain, experience level. Helps Claude calibrate responses. |
| **Feedback** | Corrections and style preferences ("use tabs not spaces", "prefer concise answers"). |
| **Project** | Current status, active tasks, architecture decisions worth preserving. |
| **Tools** | MCP servers, hooks, CLI tools available in your environment. |

## When to Update

Update MEMORY.md when you encounter:

- **Decisions** -- "We chose SQLite over Postgres because X"
- **Fixes** -- "The build error was caused by missing `--legacy-peer-deps`"
- **Patterns** -- "Always run `npm run lint` before committing in this project"
- **Insights** -- "The API rate-limits after 100 requests/minute"
- **User corrections** -- "I prefer British English" or "Don't auto-commit"

The auto-memory hook handles most of this automatically. Claude will write to MEMORY.md during the conversation when it recognizes something worth saving.

## Tips

- **Keep entries concise.** One line per fact. MEMORY.md is read every session -- bloated files waste context window tokens.
- **Prune regularly.** Remove entries that are no longer relevant. Outdated memory is worse than no memory.
- **Use global vs project memory intentionally.** Preferences that apply everywhere (language, style) go in `~/.claude/MEMORY.md`. Project-specific facts stay in the project's MEMORY.md.
- **Don't store secrets.** MEMORY.md may be committed or shared. Keep credentials out of it.

## Global vs Project Memory

| Location | Scope | Example |
|----------|-------|---------|
| `~/.claude/MEMORY.md` | All projects | "User prefers dark mode", "Always use TypeScript" |
| `./MEMORY.md` | This project only | "Database schema was migrated on 2026-03-15" |

Claude reads both. Project memory takes precedence when there's a conflict.
