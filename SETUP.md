# AgentHub — Automated Setup with Claude Code

> **Usage:** Open a terminal in the AgentHub folder, run `claude`, and say:
>
> *"Read SETUP.md and set up AgentHub on my machine."*
>
> Claude will walk you through everything automatically.

---

## Step 1: Check what's already installed

**Important: Check first, install only what's missing.** Do NOT blindly install everything — the user may already have some or all prerequisites.

Run these checks and report the results:

```bash
node --version          # Need v18+
git --version           # Need Git for Windows (includes Git Bash)
claude --version        # Need Claude Code CLI
npm config get msvs_version   # C++ build tools (should return a year like 2022)
```

For each check, report one of:
- **Installed** (version X) — no action needed
- **Missing** — needs to be installed

Only ask the user to install what's actually missing:
- Node.js: https://nodejs.org (LTS recommended)
- Git for Windows: https://gitforwindows.org (default install path)
- Claude Code CLI: `npm install -g @anthropic-ai/claude-code`, then run `claude` once to authenticate
- C++ Build Tools: Download [VS Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/), install the "Desktop development with C++" workload

**Do not continue until all prerequisites are confirmed.** If something was just installed, re-run the checks to verify.

## Step 2: Install dependencies

```bash
npm install --ignore-scripts
```

The `--ignore-scripts` flag prevents premature native module compilation. If this fails, check for network issues or permission errors.

## Step 3: Build native modules

```bash
npx electron-rebuild -f -w node-pty
```

This compiles node-pty against Electron's Node.js version. If it fails:
1. Verify C++ build tools are installed (step 1)
2. Try the manual fallback:
   ```bash
   node node_modules/node-pty/scripts/prebuild.js
   node node_modules/electron/install.js
   ```
3. If it still fails, search the error message and help the user resolve it

## Step 4: Configure projects directory

AgentHub needs to know where the user keeps their project folders. **Ask the user:**

> "Where do you keep the project folders you want to use with Claude Code?
> For example: `C:\Users\You\Projects` or `D:\Dev\MyProjects`
>
> AgentHub will list all subfolders in that directory as available projects."

**How it works:**
- Each subfolder in the projects directory becomes a selectable project in AgentHub
- When the user starts an agent, Claude Code opens in that project's folder
- The user can organize their projects however they like — one folder per project

**Setting the projects directory:**

Check if Claude Code projects already exist:
```bash
ls ~/.claude/projects/ 2>/dev/null || echo "No Claude projects directory found"
```

- **If entries exist AND the user is happy with auto-detection:** No action needed. AgentHub reads Claude Code's config to find the projects root automatically.
- **If the user wants a custom path (or auto-detection won't work):** Add this line to `start.bat`, right before the `npm run build` line:
  ```bat
  set AGENTHUB_PROJECTS_DIR=C:\Users\You\Projects
  ```
  Replace the path with whatever the user tells you.

- **The user can change this later** at any time by editing `start.bat`.

**Important:** The directory must already exist and contain at least one subfolder (project). If it's empty, AgentHub will show no projects in the startup dialog.

## Step 5: Build the app

```bash
npm run build
```

Both `tsc` (TypeScript) and `vite build` (React) must succeed. Check for errors in the output.

## Step 6: Test launch

Tell the user you will now open AgentHub to verify everything works:

```bash
npx electron .
```

Tell them what to expect:
- A startup dialog with their project list should appear
- They can pick a project, choose model/effort, and click Start
- A terminal panel will open with Claude running

Common issues:
- **Blank window** — build failed in step 5, run `npm run build` again and check output
- **No projects listed** — run `claude` in at least one project folder first
- **"Prozess beendet" immediately** — Claude CLI not installed or not authenticated

After verifying, ask the user to close the app for the shortcut step.

## Step 7: Create desktop shortcut

Verify `start.bat` exists, then create a Windows shortcut with the AgentHub icon:

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

This uses the Electron icon from `assets/icon.ico` as the shortcut icon.

## Step 8: Done!

Print this summary:

```
====================================
   AgentHub Setup Complete!
====================================

Launch:      Double-click "AgentHub" on your desktop
             or run start.bat in this folder

Shortcuts:   Ctrl+1-9       Switch to panel N
             Ctrl+Tab       Next panel
             Ctrl+Shift+D   Open diagnostics

Projects:    <detected or configured path>

Happy multi-agent coding!
====================================
```
