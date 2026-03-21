# Hooks Guide

Hooks are scripts that run automatically at specific points in the Claude Code lifecycle. They let you inject behavior -- reminders, status displays, validations -- without manually triggering anything.

## Included Hooks

### Auto-Memory (`hooks/auto-memory.mjs`)

**Event:** `UserPromptSubmit` (runs every time you send a message)

Injects a reminder into Claude's context: "Check if your response involves a fix, decision, pattern, or insight. If yes, update MEMORY.md before responding."

This is the backbone of the [memory system](memory-system.md). Without it, Claude will sometimes forget to persist important context.

### Status Line (`hooks/statusline.mjs`)

**Event:** `statusLine` (runs continuously, updates the terminal footer)

Displays a compact status bar at the bottom of your terminal:

```
[Opus 4.6] my-project ▓▓▓▓░░░░░░ 40%
```

Shows: current model, working directory (shortened), and context window usage as a visual bar + percentage. Useful for knowing when you're approaching context limits.

## How Hooks Are Wired

Hooks are configured in `~/.claude/settings.json`. The installer sets this up for you, but here's what it looks like:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"~/.claude/hooks/auto-memory.mjs\""
          }
        ]
      }
    ]
  },
  "statusLine": {
    "type": "command",
    "command": "node ~/.claude/hooks/statusline.mjs"
  }
}
```

## Available Hook Events

Claude Code supports these lifecycle events:

| Event | When it fires |
|-------|--------------|
| `UserPromptSubmit` | Every time the user sends a message |
| `Stop` | When Claude finishes responding |
| `SessionStart` | When a new session begins |
| `PostToolUse` | After Claude uses a tool (Read, Bash, etc.) |

## Adding Your Own Hooks

1. Create a `.mjs` or `.js` file in `~/.claude/hooks/`
2. Read JSON from stdin (Claude pipes context data to your script)
3. Write JSON to stdout (to inject context back into Claude)
4. Add the hook to `settings.json` under the appropriate event

**Example: A hook that reminds Claude about coding standards**

```javascript
#!/usr/bin/env node
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => (input += chunk));
process.stdin.on('end', () => {
  const output = {
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: 'Reminder: always use single quotes and 2-space indentation.',
    },
  };
  process.stdout.write(JSON.stringify(output));
});
```

Then add it to `settings.json`:

```json
"UserPromptSubmit": [
  {
    "hooks": [
      { "type": "command", "command": "node ~/.claude/hooks/auto-memory.mjs" },
      { "type": "command", "command": "node ~/.claude/hooks/coding-standards.mjs" }
    ]
  }
]
```

## Troubleshooting

**Hook doesn't seem to run:**
- Check that the path in `settings.json` is correct and uses forward slashes
- Verify the script is executable: `node ~/.claude/hooks/your-hook.mjs` should run without errors
- Check for JSON parse errors in the script -- malformed output is silently ignored

**Hook runs but has no effect:**
- Ensure `hookEventName` matches the event key in `settings.json`
- The `additionalContext` string is what Claude actually sees -- make sure it contains a clear instruction

**Status line not showing:**
- The `statusLine` config is a top-level key in `settings.json`, not inside `hooks`
- Make sure the script outputs a single line of text to stdout

**Script hangs:**
- Both included hooks have a 3-second timeout. If your custom hook does network requests or file I/O, add a similar timeout to prevent blocking Claude.
