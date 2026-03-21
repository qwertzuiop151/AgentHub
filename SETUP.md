# Claude Toolkit -- Setup Wizard

> **Usage:** Clone this repo, run `claude`, say: "Read SETUP.md and set me up"
>
> This document is written FOR Claude. It contains step-by-step instructions
> that a Claude Code instance reads and executes to install the toolkit.

---

## Overview

The Claude Toolkit installs a power-user harness for Claude Code:

| Component | File | Purpose |
|-----------|------|---------|
| Global Rules | `~/.claude/CLAUDE.md` | Self-sufficiency, memory, git hygiene, hard rules |
| Settings | `~/.claude/settings.json` | Permissions, hooks, statusline |
| Auto-Memory Hook | `~/.claude/hooks/auto-memory.mjs` | Reminds you to update MEMORY.md on decisions/fixes |
| Statusline Hook | `~/.claude/hooks/statusline.mjs` | Shows model, CWD, context window usage |
| Memory Starter | Project `MEMORY.md` | Template for per-project memory |

Source templates live in `templates/` and `hooks/` relative to this repo root.

---

## Install

### Step 1 of 11: Welcome + Install Mode

Print the following welcome message to the user:

```
============================================
  Claude Toolkit -- Setup Wizard
============================================

This wizard will install:
  - Global CLAUDE.md (rules for all projects)
  - settings.json (permissions + hooks)
  - Auto-memory hook (MEMORY.md reminders)
  - Statusline hook (model + context bar)
  - Memory starter template

All files go into ~/.claude/
```

Then ask:

> "Would you like **Quick Install** (sensible defaults, 3-5 questions) or **Custom Install** (per-component control)?"

Store the user's choice. IF the user says anything resembling "quick", "fast", "default", or "just do it", treat it as Quick Install.

---

### Step 2 of 11: Environment Detection

Detect the current environment and report findings. Run these checks:

1. **OS Detection:** Check `process.platform` from a Node one-liner, or infer from path separators. Report: Windows / macOS / Linux.
2. **~/.claude/ directory:** Check if `~/.claude/` exists. On Windows this is typically `C:\Users\<username>\.claude\`.
3. **Existing CLAUDE.md:** Check if `~/.claude/CLAUDE.md` exists. If yes, note its size (line count).
4. **Existing settings.json:** Check if `~/.claude/settings.json` exists. If yes, verify it is valid JSON.
5. **Existing hooks/:** Check if `~/.claude/hooks/` directory exists. If yes, list files inside.
6. **Node.js:** Run `node --version` to confirm Node is available (required for hooks).

Print a detection summary like:

```
Environment Detection:
  OS:             Windows 11
  ~/.claude/      EXISTS
  CLAUDE.md       EXISTS (47 lines)
  settings.json   EXISTS (valid JSON)
  hooks/          EXISTS (2 files: auto-memory.mjs, statusline.mjs)
  Node.js         v22.x
```

IF `~/.claude/` does not exist, create it and note that in the output. Continue to Step 3 only if existing files were detected. IF no existing files found, skip to Step 4.

---

### Step 3 of 11: Existing File Handling

This step runs ONLY IF Step 2 detected existing files (`~/.claude/CLAUDE.md`, `~/.claude/settings.json`, or `~/.claude/hooks/*`).

Ask the user:

> "I found existing configuration files. How should I handle them?"
>
> 1. **Merge** -- Keep your existing files, add toolkit components alongside them
> 2. **Fresh Install** -- Back up existing files, then install clean copies
> 3. **Abort** -- Stop the wizard, change nothing

Store the choice as the install strategy.

IF the user chose **Abort**, print "Setup cancelled. No files were changed." and stop.

IF the user chose **Quick Install** in Step 1, default to **Merge** and tell the user: "Using Merge strategy (your existing config will be preserved). Say 'fresh' if you want a clean install instead."

---

### Step 4 of 11: Configuration + Personalization

**4a: Core Configuration**

**IF Quick Install:**

Ask only these questions:
1. "Is `~/.claude/` the correct location for your config?" (confirm or provide alternative)
2. "Do you want to add any extra permission rules to settings.json? (e.g., `Bash(pip *)`, `Bash(cargo *)`) Or press enter to skip."
3. "Should I create a MEMORY.md starter in the current project directory?" (yes/no)

**IF Custom Install:**

Ask per-component:
1. "Install global CLAUDE.md?" (yes / no / merge with existing)
2. "Install settings.json?" (yes / no / merge with existing)
3. "Install auto-memory hook?" (yes / no)
4. "Install statusline hook?" (yes / no)
5. "Create MEMORY.md starter in current project?" (yes / no)
6. "Any extra permission rules to add?" (freeform or skip)

**4b: Personalization (both Quick and Custom)**

Ask these personalization questions. They are used in Step 9 to adapt the installed files.

**Question 1 -- Experience Level:**

> "How experienced are you with Claude Code?"
>
> 1. **Beginner** -- Just started, want clear guidance and safe defaults
> 2. **Intermediate** -- Comfortable with basics, ready for power features
> 3. **Power User** -- Deep experience, want maximum control and minimal hand-holding

Store as `experience_level`. IF Quick Install and user seems impatient, default to Intermediate.

**Question 2 -- Domain:**

> "What's your primary field? This helps me suggest relevant tools and seed your memory."
>
> Examples: web development, data science, bioinformatics, DevOps, mobile development, research/academia, creative writing, general software engineering
>
> (Or type your own)

Store as `domain`. Accept freeform input.

**Question 3 -- Personalization Depth:**

> "How much should I customize your setup?"
>
> 1. **Light** -- Just install the templates as-is. I'll customize later.
> 2. **Medium** -- Adapt CLAUDE.md rules to my domain and add relevant tool suggestions.
> 3. **Full** -- Deep customization: domain-specific rules, MCP recommendations, memory seeding, custom permissions.

Store as `personalization_depth`. IF Quick Install, default to Medium.

Store all choices and continue to Step 5.

---

### Step 5 of 11: Dry-Run Summary

Build a file action list based on all choices so far. Display it using action icons:

```
Planned actions:
  + CREATE   ~/.claude/CLAUDE.md
  ~ MERGE    ~/.claude/settings.json
  B BACKUP   ~/.claude/settings.json -> settings.json.bak.20260321-143022
  + CREATE   ~/.claude/hooks/auto-memory.mjs
  + CREATE   ~/.claude/hooks/statusline.mjs
  + CREATE   ./MEMORY.md
  - SKIP     ~/.claude/CLAUDE.md (user deselected)
```

Use these action labels:
- `+ CREATE` -- file will be written fresh
- `~ MERGE` -- file will be deep-merged with existing
- `B BACKUP` -- existing file will be backed up before overwrite
- `- SKIP` -- component was deselected

Tell the user:

> "Here is what I will do. You can deselect any item by number, or say 'proceed' to continue."

IF the user deselects items, update the action list and re-display. Wait for explicit confirmation ("proceed", "go", "yes", "do it", or similar) before continuing.

---

### Step 6 of 11: Backup

This step runs ONLY IF the install strategy is **Fresh Install** or **Merge** and existing files will be overwritten.

For each file that will be overwritten or merged:

1. Generate a timestamp suffix: `.bak.YYYYMMDD-HHMMSS` (use current date/time).
2. Copy the existing file to the same directory with the backup suffix.
   Example: `~/.claude/settings.json` -> `~/.claude/settings.json.bak.20260321-143022`
3. Record the backup in a manifest file at `~/.claude/toolkit-backup-manifest.json`:

```json
{
  "backups": [
    {
      "original": "~/.claude/settings.json",
      "backup": "~/.claude/settings.json.bak.20260321-143022",
      "timestamp": "2026-03-21T14:30:22Z",
      "reason": "claude-toolkit install"
    }
  ]
}
```

IF a manifest already exists, read it, append new entries, and write it back.

Report each backup:
```
Backups created:
  ~/.claude/settings.json -> settings.json.bak.20260321-143022
  ~/.claude/CLAUDE.md -> CLAUDE.md.bak.20260321-143022
```

---

### Step 7 of 11: Installation

Execute the planned actions. The source files are relative to this repo's root directory.

**7a: Create ~/.claude/hooks/ directory**

IF it does not exist, create it:
```bash
mkdir -p ~/.claude/hooks
```

**7b: Install hooks**

Copy hook files from the repo to the user's hooks directory:

- Source: `hooks/auto-memory.mjs` -> Target: `~/.claude/hooks/auto-memory.mjs`
- Source: `hooks/statusline.mjs` -> Target: `~/.claude/hooks/statusline.mjs`

Read the source file content and write it to the target path. IF target already exists and strategy is Merge, compare content. IF identical, skip with message "auto-memory.mjs already up to date". IF different, back up existing and overwrite.

**7c: Install CLAUDE.md**

- **Fresh Install:** Read `templates/claude-md-global.md` and write it to `~/.claude/CLAUDE.md`.
- **Merge:** Do NOT auto-merge CLAUDE.md. It is too personal to merge automatically. Instead, print:

  > "Your existing ~/.claude/CLAUDE.md was preserved. The toolkit template is at `templates/claude-md-global.md` in this repo. I recommend reviewing it manually and copying any sections you find useful."

  Then show a diff-style summary of sections present in the template but missing from the user's file.

**7d: Install settings.json**

- **Fresh Install:** Read `templates/settings.json` and write it to `~/.claude/settings.json`.
- **Merge:** Perform a deep merge using this algorithm:

  1. Read existing `~/.claude/settings.json` and parse as JSON.
  2. Read `templates/settings.json` and parse as JSON.
  3. **$schema:** Keep existing if present, otherwise use template value.
  4. **permissions.allow:** Combine both arrays. Remove exact duplicates (case-sensitive string match). Preserve order: existing entries first, then new entries.
  5. **permissions.deny:** Same as allow -- combine, deduplicate.
  6. **hooks:** For each event name (e.g., `UserPromptSubmit`):
     - IF event exists in both: combine the hook entries. Deduplicate by comparing the `command` string inside each hook object. Existing entries take precedence.
     - IF event exists only in template: add it.
     - IF event exists only in existing: keep it.
  7. **statusLine:** Keep existing statusLine if present. Only use template value if no statusLine is configured.
  8. **All other keys:** Keep existing values. Add template keys that do not exist in existing.

  Write the merged result to `~/.claude/settings.json` with 2-space indentation.

  IF the user specified extra permission rules in Step 4, append them to `permissions.allow` (with deduplication).

**7e: Install Memory Starter**

IF the user opted for a MEMORY.md starter:

- Check if `MEMORY.md` exists in the current working directory.
- IF it does NOT exist: Read `templates/memory-starter.md` and write it to `./MEMORY.md`.
- IF it DOES exist: Print "MEMORY.md already exists in this project. Skipping." Do not overwrite.

---

### Step 8 of 11: Smoke Test

Validate that all installed files are correct:

1. **CLAUDE.md existence:** Check `~/.claude/CLAUDE.md` exists and is non-empty.
2. **settings.json validity:** Read `~/.claude/settings.json`, run `JSON.parse()` on its content. Must not throw.
3. **Hook syntax check:** Run `node -c ~/.claude/hooks/auto-memory.mjs` and `node -c ~/.claude/hooks/statusline.mjs`. Both must exit 0.
4. **Hook file existence:** Verify both hook files exist at expected paths.
5. **Settings hook references:** Verify that every hook command path in settings.json points to a file that actually exists.

Report results:

```
Smoke Test Results:
  CLAUDE.md exists        PASS
  settings.json valid     PASS
  auto-memory.mjs syntax  PASS
  statusline.mjs syntax   PASS
  Hook files exist        PASS
  Hook paths resolve      PASS

All checks passed!
```

IF any check fails:
- Print the failure reason.
- Attempt an automatic fix (e.g., re-copy the file, fix JSON syntax).
- Re-run the failed check.
- IF still failing after one retry, print the error and suggest the user check the Troubleshooting section.

---

### Step 9 of 11: Personalization

This step adapts the installed files using the personalization choices from Step 4b. IF `personalization_depth` is **Light**, skip this step entirely.

**9a: Adapt CLAUDE.md by Experience Level**

Read the installed `~/.claude/CLAUDE.md`. Modify it based on `experience_level`:

**Beginner:**
- Add a `## Getting Started` section at the top with these tips:
  ```
  ## Getting Started
  - Ask Claude to explain what it's doing before making changes
  - Use "show me first, then do it" for unfamiliar operations
  - Say "undo that" if something goes wrong -- Claude can revert
  - Start each session by telling Claude what you want to accomplish
  ```
- Add to Hard Rules: "Explain each step before executing when the user is learning"
- Add to Hard Rules: "Always offer to undo after making changes"

**Intermediate:** (no changes needed -- the template defaults are designed for intermediate users)

**Power User:**
- Remove the `<!-- Customize: -->` HTML comments (they already know)
- Add to Hard Rules: "Prefer terse responses. Skip explanations unless asked."
- Add a `## Model Selection` section:
  ```
  ## Model Selection
  - Opus: Architecture, multi-file refactoring, complex debugging, brainstorming
  - Sonnet: Isolated bugfixes, features with clear specs, single-file code review
  - Haiku: Renaming, formatting, batch edits, summaries
  - Suggest cheaper models when appropriate: "This is a Haiku task -- switch?"
  ```

Write the modified CLAUDE.md back.

**9b: Adapt CLAUDE.md by Domain**

Based on `domain`, add domain-specific rules and suggestions to the `## Hard Rules` section of `~/.claude/CLAUDE.md`. Use your knowledge of the domain to add 2-4 genuinely useful rules.

Examples (adapt based on actual user input):

**Web Development:**
```
- Run `npm test` or equivalent after every code change
- Check accessibility (WCAG AA) when modifying UI components
- Prefer existing project conventions over personal preferences
```

**Data Science / ML:**
```
- Always read source data fully before analysis -- never trust summaries alone
- Include data shape, dtypes, and sample rows when exploring datasets
- Pin package versions in requirements.txt for reproducibility
```

**Bioinformatics:**
```
- Verify sequence data integrity (check FASTA headers, lengths) before analysis
- Cross-reference GenBank accession numbers when citing sequences
- Use BioPython for sequence I/O -- check `pip show biopython` before installing
```

**DevOps / SRE:**
```
- Never run destructive commands (rm -rf, DROP TABLE) without explicit confirmation
- Always check current context (kubectl config current-context, terraform workspace show) before operations
- Prefer dry-run flags (--dry-run, terraform plan) before apply
```

**Research / Academia:**
```
- Always read original papers/data fully before paraphrasing
- Tag evidence levels: [HYPOTHESIS], [CORRELATION], [ESTABLISHED], [UNCLEAR]
- When data is insufficient, say so -- do not fill gaps with speculation
```

**General Software Engineering:**
```
- Run tests after every change: adapt to project's test framework
- Check existing code patterns before introducing new ones
- Prefer editing existing files over creating new ones
```

For domains not listed above, use your knowledge to generate 2-4 relevant rules. Ask the user: "I've added these domain-specific rules to your CLAUDE.md. Want to adjust any?" Show the added rules.

**9c: Domain-Specific Permissions**

Based on `domain`, add relevant permission rules to `~/.claude/settings.json` (append to `permissions.allow`, deduplicate):

| Domain | Suggested Permissions |
|--------|----------------------|
| Web Dev | `Bash(npm *)`, `Bash(npx *)`, `Bash(yarn *)` |
| Data Science | `Bash(pip *)`, `Bash(python *)`, `Bash(jupyter *)` |
| Bioinformatics | `Bash(pip *)`, `Bash(python *)`, `Bash(blast*)` |
| DevOps | `Bash(docker *)`, `Bash(kubectl *)`, `Bash(terraform *)` |
| Rust | `Bash(cargo *)`, `Bash(rustc *)` |
| Go | `Bash(go *)` |
| General | `Bash(npm *)`, `Bash(pip *)` |

Ask the user before adding: "I'd like to add these permission rules for your domain. OK?" IF the user declines, skip.

**9d: Seed MEMORY.md**

IF a MEMORY.md was created in Step 7e, update it with the user's profile:

Replace the placeholder sections with actual values:
```markdown
## User
- Domain: {domain from Step 4b}
- Experience level: {experience_level from Step 4b}
- [Ask: "Anything else I should remember about how you work?"]

## Tools
- Hooks: auto-memory (UserPromptSubmit), statusline (active)
- Installed via: Claude Toolkit (date)
```

**9e: MCP Recommendations (Full personalization only)**

IF `personalization_depth` is **Full**, suggest relevant MCP servers based on `domain`:

| Domain | Recommended MCPs |
|--------|-----------------|
| Any code project | **jCodeMunch** -- code exploration (symbols, outlines, search). Install: `npm install -g jcodemunch-mcp-server`, then add to `~/.claude.json` |
| Research / Academia | **paper-search** -- PubMed, bioRxiv, arXiv, Google Scholar search |
| Bioinformatics | **paper-search** + **PubMed** (Anthropic connector, free) |
| General productivity | **Google Drive** (Anthropic connector) -- read docs and spreadsheets |
| Web Dev | **Playwright** -- browser automation and testing |

Present recommendations as a list:

> "Based on your domain, these MCP servers could be useful:"
>
> 1. **jCodeMunch** -- Explore code without reading entire files. Saves tokens.
>    Install: `npm install -g jcodemunch-mcp-server`
> 2. **paper-search** -- Search academic papers from Claude Code.
>    Install: `npm install -g paper-search-mcp`
>
> "Want me to help install any of these? (Say the number, 'all', or 'skip')"

IF the user wants to install an MCP:
1. Run the install command
2. Add the MCP config to `~/.claude.json` (create file if needed, merge if exists)
3. Verify it was added correctly

---

### Step 10 of 11: Optional Components

After the core setup is complete, offer optional components from this repo. Present each with a brief description and let the user pick.

> "Your core Claude Code environment is ready. This repo also includes optional components:"
>
> 1. **AgentHub** -- Desktop app for running multiple Claude Code sessions side-by-side (Electron, Windows only)
> 2. **Hotkey Manager** -- Keyboard shortcuts + Whisper voice-to-text for Claude Code (Python, Windows only)
> 3. **Multi-Agent Blueprint** -- Architecture guide for scaling to multiple coordinated agents (just a document, no install needed)
> 4. **GSD (Get Shit Done)** -- Structured project planning and execution framework for Claude Code
>
> "Type the numbers you want (e.g., '1,2'), 'all', or 'skip'."

IF the user skips, go to Step 11.

**10a: AgentHub Installation (OPTL-01)**

IF the user selected AgentHub:

1. **Check prerequisites:**
   ```bash
   node --version    # Need v18+
   git --version     # Need Git for Windows (includes Git Bash)
   npm config get msvs_version   # Need C++ build tools
   ```
   Report what's missing. IF prerequisites are missing, tell the user what to install and offer to continue without AgentHub.

2. **Build the app** (the source is already in this repo):
   ```bash
   cd {repo_root}
   npm install --ignore-scripts
   npx electron-rebuild -f -w node-pty
   npm run build
   ```
   IF any step fails, show the error and suggest reading `TROUBLESHOOT.md`.

3. **Configure projects directory:**
   Ask: "Where do you keep your project folders? (e.g., `C:\Users\You\Projects`)"

   Check if Claude Code projects already exist:
   ```bash
   ls ~/.claude/projects/ 2>/dev/null
   ```
   - IF entries exist: "AgentHub can auto-detect your projects. Use auto-detection or set a custom path?"
   - IF custom path: Add `set AGENTHUB_PROJECTS_DIR={path}` to `start.bat`

4. **Create desktop shortcut:**
   ```bash
   cat > create-shortcut.vbs << 'VBS'
   Set oWS = WScript.CreateObject("WScript.Shell")
   sLinkFile = oWS.SpecialFolders("Desktop") & "\AgentHub.lnk"
   Set oLink = oWS.CreateShortcut(sLinkFile)
   oLink.TargetPath = oWS.CurrentDirectory & "\start.bat"
   oLink.WorkingDirectory = oWS.CurrentDirectory
   oLink.Description = "Launch AgentHub"
   oLink.IconLocation = oWS.CurrentDirectory & "\assets\icon.ico"
   oLink.WindowStyle = 7
   oLink.Save
   VBS
   cscript //nologo create-shortcut.vbs
   del create-shortcut.vbs
   ```

5. **Create AgentHub project agent:**
   Create a project CLAUDE.md for the AgentHub folder so Claude knows this project's context:

   Write to `{repo_root}/CLAUDE.md` (only IF it does not already exist):
   ```markdown
   # AgentHub

   ## Scope
   Multi-agent terminal manager for Claude Code. Electron + React + xterm.js + node-pty.

   ## Hard Rules
   1. Windows-only -- all PTY code uses Git Bash via node-pty
   2. Build before testing: `npm run build` then `npx electron .`
   3. Native modules: after any node-pty change run `npx electron-rebuild -f -w node-pty`
   ```

6. **Test launch:**
   ```bash
   npx electron .
   ```
   Tell the user to verify: startup dialog appears, projects are listed. Then close.

Report: "AgentHub installed. Launch from desktop shortcut or `start.bat`."

**10b: Hotkey Manager Installation (OPTL-02)**

IF the user selected Hotkey Manager:

1. **Check prerequisites:**
   ```bash
   python --version    # Need Python 3.8+
   pip --version
   ```
   IF Python is missing, tell the user to install it and offer to continue without Hotkeys.

2. **Install dependencies:**
   ```bash
   cd {repo_root}/hotkeys
   pip install -r requirements.txt
   ```

3. **Configure microphone (for Whisper voice control):**
   ```bash
   python -c "import sounddevice; print(sounddevice.query_devices())"
   ```
   Show the device list and ask: "Which microphone do you use? (Enter the name or number)"

   Update `MIC_NAME_CONTAINS` in `hotkeys/whisper-stt.py` with a unique substring of the selected device name.

4. **Download Whisper model (optional):**
   Ask: "Download the Whisper speech model for offline voice control? (~500MB)"

   IF yes:
   ```bash
   mkdir -p hotkeys/models
   curl -L -o hotkeys/models/ggml-large-v3-q5_0.bin https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-q5_0.bin
   ```

5. **Create config file:**
   IF `hotkeys/config.json` does not exist, copy from example:
   ```bash
   cp hotkeys/config.example.json hotkeys/config.json
   ```

6. **Create Hotkeys project agent:**
   Write a CLAUDE.md for the hotkeys context (only IF it does not already exist):

   Write to `{repo_root}/hotkeys/CLAUDE.md`:
   ```markdown
   # Hotkey Manager

   ## Scope
   System-wide keyboard shortcuts and Whisper voice-to-text for Claude Code. Python scripts.

   ## Hard Rules
   1. All scripts must work without admin privileges
   2. Microphone config via MIC_NAME_CONTAINS in whisper-stt.py
   3. Test changes with: `python hotkey-manager.py`
   ```

7. **Test:**
   ```bash
   python hotkeys/hotkey-manager.py &
   ```
   Tell user to press F7 to test voice recording (if mic configured), then Ctrl+C to stop.

Report: "Hotkey Manager installed. Start with `python hotkeys/hotkey-manager.py`."

**10c: Multi-Agent Blueprint (OPTL-03)**

IF the user selected Blueprint:

No installation needed. Simply tell the user:

> "The Multi-Agent Blueprint is at `BLUEPRINT.md` in this repo. It's a 550-line guide to building a self-improving multi-agent system. Read it when you're ready to scale beyond a single project."
>
> "Quick start: Copy the prompt from the top of BLUEPRINT.md into a new Claude Code session."

**10d: Central Orchestrator Project (Metaplaner)**

IF the user selected Blueprint OR `personalization_depth` is Full OR the user has 3+ existing projects in `~/.claude/projects/`:

> "The Blueprint recommends a central orchestrator project -- a 'Metaplaner' that coordinates all your other projects. It's a planning-only folder with a METAPLAN.md that tracks status, TODOs, and bugs across everything."
>
> "Want me to create one? (yes / no)"

IF yes:

1. Ask: "Where should I create it? (default: `{projects_dir}/Metaplaner`)"
2. Create the directory and files:

   Write `{path}/CLAUDE.md`:
   ```markdown
   # Metaplaner

   Meta-planning session only. No implementation here -- all building happens in the per-project folders.

   ## Scope
   - Brainstorming new ideas
   - Prioritization discussions
   - Cross-project decisions

   ## Hard Rules
   1. Planning and discussion only -- implementation happens in project folders
   2. Keep METAPLAN.md updated with status of all projects
   ```

   Write `{path}/METAPLAN.md`:
   ```markdown
   # METAPLAN -- Central Project Tracker

   ## Projects

   | Project | Status | Description |
   |---------|--------|-------------|
   | {auto-detect from ~/.claude/projects/ and list them} |

   ## TODOs

   - [ ] (add your tasks here)

   ## Bugs

   (none yet)
   ```

   Auto-detect existing projects from `~/.claude/projects/` directory names and populate the table.

3. Write `{path}/MEMORY.md` using the memory starter template.

Report: "Orchestrator project created at `{path}`. Open Claude Code there to coordinate all your projects."

**10e: GSD Recommendation (OPTL-05)**

IF the user selected GSD OR if `experience_level` is Power User:

> "**GSD (Get Shit Done)** is a structured planning and execution framework for Claude Code. It breaks large projects into phases with plans, tracks progress, and runs parallel execution agents."
>
> "Install: `claude /install-skill https://github.com/gsd-framework/gsd`"
>
> "GSD is powerful but opinionated -- best for projects with 5+ tasks. For smaller work, just use Claude Code directly."

---

### Step 11 of 11: Complete

Print this completion message:

```
============================================
  Setup Complete!
============================================

Your Claude Code environment is now configured with:
  - Global rules (CLAUDE.md) -- tailored to {domain}
  - Smart permissions (settings.json) -- {experience_level} profile
  - Auto-memory reminders (hook)
  - Context-aware statusline (hook)
  {IF personalization != Light: - Domain-specific rules and permissions}
  {IF MCPs installed: - MCP servers: {list}}
  {IF AgentHub installed: - AgentHub desktop app (launch from desktop shortcut)}
  {IF Hotkeys installed: - Hotkey Manager (start with: python hotkeys/hotkey-manager.py)}
  {IF Metaplaner created: - Orchestrator project at {path}}

IMPORTANT: Restart Claude Code for changes to take effect.
  Exit this session (type /exit) and start a new one.

To uninstall or restore previous config, say:
  "Read SETUP.md, go to the Restore section"
============================================
```

---

## Restore

When the user asks to restore a previous configuration:

1. Read `~/.claude/toolkit-backup-manifest.json`. IF it does not exist, print "No backup manifest found. Cannot restore." and stop.

2. Parse the manifest and list all backup entries:

```
Available backups:
  [1] settings.json.bak.20260321-143022 (2026-03-21 14:30:22)
  [2] CLAUDE.md.bak.20260321-143022 (2026-03-21 14:30:22)
  [3] settings.json.bak.20260315-091500 (2026-03-15 09:15:00)
```

3. Ask the user which backup(s) to restore. Accept individual numbers, ranges ("1-3"), or "all".

4. For each selected backup:
   - Copy the backup file back to its original path (overwriting the current version).
   - Remove the backup entry from the manifest.
   - Print confirmation: "Restored settings.json from backup 20260321-143022"

5. IF all entries are restored, delete the manifest file.

6. Remind the user to restart Claude Code.

---

## Uninstall

To completely remove toolkit components:

1. Delete `~/.claude/hooks/auto-memory.mjs` and `~/.claude/hooks/statusline.mjs`.
2. Remove hook and statusLine entries from `~/.claude/settings.json` (parse, delete keys, re-write).
3. Do NOT delete `~/.claude/CLAUDE.md` -- it may contain user customizations. Warn the user to review it manually.
4. Do NOT delete `~/.claude/settings.json` entirely -- only remove toolkit-added entries.
5. Delete `~/.claude/toolkit-backup-manifest.json` if it exists.
6. Print summary of what was removed and remind user to restart Claude Code.

---

## Troubleshooting

### 1. "node: command not found" when hooks run
Node.js is not in PATH. Install Node.js (v18+) from https://nodejs.org and restart your terminal.

### 2. Hooks do not fire after install
Restart Claude Code. Hooks are loaded at session start, not dynamically. Exit with `/exit` and start a new session.

### 3. settings.json parse error after merge
The merge produced invalid JSON. Run `node -e "JSON.parse(require('fs').readFileSync(require('os').homedir()+'/.claude/settings.json','utf8'))"` to see the error. Fix manually or restore from backup (see Restore section).

### 4. "Permission denied" writing to ~/.claude/
On Unix: check directory ownership with `ls -la ~/`. On Windows: close any other Claude Code instances that may lock the files.

### 5. Statusline shows nothing
The statusline hook reads JSON from stdin. Ensure `~/.claude/settings.json` has a `statusLine` entry with `"type": "command"` and `"command": "node ~/.claude/hooks/statusline.mjs"`.

### 6. Auto-memory hook slows down responses
The hook runs on every prompt submit. If it takes >3 seconds, it times out automatically. Check that `~/.claude/hooks/auto-memory.mjs` is not corrupted -- re-copy from `hooks/auto-memory.mjs` in this repo.

### 7. Backup manifest is corrupted
Delete `~/.claude/toolkit-backup-manifest.json` and check if `.bak.*` files still exist in `~/.claude/`. You can manually rename them back.

### 8. Merge added duplicate permissions
Open `~/.claude/settings.json`, find the `permissions.allow` array, and remove duplicate entries manually. The merge algorithm deduplicates, but edge cases (trailing spaces, different quoting) can cause near-duplicates.

### 9. CLAUDE.md merge was not attempted
This is by design. CLAUDE.md is too personal to auto-merge. Review `templates/claude-md-global.md` and manually copy sections you want.

### 10. Hooks work but statusline does not appear
The `statusLine` config key is separate from `hooks`. Verify your `~/.claude/settings.json` has both the `hooks` object AND the `statusLine` object at the top level. They are siblings, not nested.
