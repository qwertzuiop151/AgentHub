# Customization

The installer sets up sensible defaults. Everything it creates is meant to be edited.

## Customizing CLAUDE.md

Your global `~/.claude/CLAUDE.md` is the single most impactful file in the system. Every rule you add here applies to every Claude Code session across all projects.

**Adding rules:**

Open `~/.claude/CLAUDE.md` and add lines under the relevant section. Be specific and imperative:

```markdown
## Hard Rules

- Always use TypeScript, never plain JavaScript.
- Run `npm run test` before suggesting a commit.
- Prefer functional components over class components in React.
```

**Removing rules:**

Delete lines you don't need. The template is a starting point, not gospel. If you don't care about clipboard encoding safety or file naming conventions, remove those sections.

**Adjusting tone:**

Claude follows the tone of your CLAUDE.md. Terse rules produce terse behavior. If you want more explanation, say so:

```markdown
- Always explain WHY you chose a particular approach, not just what you did.
```

## Project-Level CLAUDE.md

Each project can have its own `CLAUDE.md` in the project root. Project rules override global rules when they conflict.

```
~/.claude/CLAUDE.md        # "Never auto-commit"
./my-project/CLAUDE.md     # "Auto-commit after every successful test run"
                           # -> Project rule wins for this project
```

**What goes where:**

| Global `~/.claude/CLAUDE.md` | Project `./CLAUDE.md` |
|------------------------------|----------------------|
| Coding style preferences | Framework-specific rules |
| Git conventions | Build/deploy commands |
| Memory system rules | API keys location |
| Tool preferences | Testing conventions |

## Customizing settings.json

`~/.claude/settings.json` controls permissions and hooks. The installer creates a conservative set of allowed commands.

**Adding permissions:**

```json
"permissions": {
  "allow": [
    "Bash(docker *)",
    "Bash(python *)",
    "Bash(cargo *)"
  ]
}
```

**Removing permissions:**

Delete entries from the `allow` list to restrict what Claude can run without asking.

**Adding deny rules:**

```json
"deny": [
  "Read(./.env)",
  "Read(./.env.*)",
  "Read(./secrets/**)",
  "Bash(rm -rf *)"
]
```

Deny rules always win over allow rules.

## Re-Running the Installer

The installer is designed to be idempotent. Running it again will:

- Detect existing files and ask before overwriting
- Preserve your customizations if you choose to keep existing files
- Add any new components that weren't installed previously

To re-run: open Claude Code in the `claude-toolkit` directory and say **"Read SETUP.md and set me up"**.

## Common Customizations

**For web developers:**
```markdown
## Stack
- Use Tailwind CSS for styling, never inline styles.
- Use pnpm, not npm or yarn.
- All API routes go in src/api/.
```

**For data scientists:**
```markdown
## Data Rules
- Always show dataframe shape after loading.
- Use plotly for visualizations, not matplotlib.
- Save intermediate results to data/processed/.
```

**For researchers:**
```markdown
## Writing
- Use academic tone in all documentation.
- Cite sources with author-year format.
- Keep methods sections reproducible -- include exact commands.
```
