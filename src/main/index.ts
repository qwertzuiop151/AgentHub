import { app, BrowserWindow, ipcMain, shell, Menu } from 'electron'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { PtyManager } from './pty-manager'
import { SessionStore } from './session-store'
import { diagnostics } from './diagnostics'

const isDev = !app.isPackaged

let mainWindow: BrowserWindow | null = null
const ptyManager = new PtyManager()
const sessionStore = new SessionStore()
const memoryWatchers = new Map<string, fs.FSWatcher>()
const memoryDebounceTimers = new Map<string, ReturnType<typeof setTimeout>>()

// Portable path helpers
const HOME = os.homedir()
const CLAUDE_DIR = path.join(HOME, '.claude')
const CLAUDE_PROJECTS_DIR = path.join(CLAUDE_DIR, 'projects')

/**
 * Resolve the projects root directory.
 * Override with the AGENTHUB_PROJECTS_DIR env var.
 * Otherwise auto-detects from Claude's encoded project directories.
 */
function getProjectsDir(): string {
  if (process.env.AGENTHUB_PROJECTS_DIR) {
    return process.env.AGENTHUB_PROJECTS_DIR
  }
  try {
    const entries = fs.readdirSync(CLAUDE_PROJECTS_DIR)
    for (const entry of entries) {
      const dashDashIdx = entry.indexOf('--')
      if (dashDashIdx > 0) {
        const drive = entry.substring(0, dashDashIdx)
        const rest = entry.substring(dashDashIdx + 2)
        const lastDash = rest.lastIndexOf('-')
        if (lastDash > 0) {
          const pathPart = rest.substring(0, lastDash)
          const decoded = drive + ':\\' + pathPart.replace(/-/g, '\\')
          if (fs.existsSync(decoded)) {
            return decoded
          }
        }
      }
    }
  } catch { /* fall through */ }
  return path.join(HOME, 'Projects')
}

/**
 * Resolve the Claude memory directory for a given project name.
 */
function getMemoryDir(projectName: string): string | null {
  try {
    const entries = fs.readdirSync(CLAUDE_PROJECTS_DIR)
    const match = entries.find(e => e.endsWith('-' + projectName))
    if (match) {
      return path.join(CLAUDE_PROJECTS_DIR, match, 'memory')
    }
  } catch {}
  return null
}

function createWindow() {
  Menu.setApplicationMenu(null)
  mainWindow = new BrowserWindow({
    minWidth: 800,
    minHeight: 600,
    title: 'AgentHub',
    backgroundColor: '#1a1a2e',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.maximize()
  mainWindow.show()

  const distFile = path.join(__dirname, '../../renderer/index.html')
  if (isDev && !fs.existsSync(distFile)) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(distFile)
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    diagnostics.reportCrash('renderer', `Render process gone: ${details.reason}`, `exitCode: ${details.exitCode}`)
  })

  mainWindow.on('unresponsive', () => {
    diagnostics.reportCrash('renderer', 'Window became unresponsive')
  })
}

function setupIPC() {
  ipcMain.on('pty:create', (_event, args) => {
    const { id, cwd, continue: cont, dangerouslySkipPermissions, terminalOnly, model, effort } = args

    let command: string
    let cmdArgs: string[]

    if (terminalOnly) {
      command = 'bash'
      cmdArgs = []
    } else {
      command = 'claude'
      cmdArgs = []
      if (cont) cmdArgs.push('--continue')
      if (dangerouslySkipPermissions) cmdArgs.push('--dangerously-skip-permissions')
      if (model) cmdArgs.push('--model', model)
      if (effort) cmdArgs.push('--effort', effort)
    }

    ptyManager.create(id, cwd, command, cmdArgs)

    ptyManager.onData(id, (data) => {
      mainWindow?.webContents.send('pty:data', id, data)
    })

    ptyManager.onExit(id, (code) => {
      mainWindow?.webContents.send('pty:exit', id, code)
    })
  })

  ipcMain.on('pty:write', (_event, id: string, data: string) => {
    ptyManager.write(id, data)
  })

  ipcMain.on('pty:resize', (_event, id: string, cols: number, rows: number) => {
    ptyManager.resize(id, cols, rows)
  })

  ipcMain.on('pty:kill', (_event, id: string) => {
    ptyManager.kill(id)
  })

  const projectsDir = getProjectsDir()

  ipcMain.handle('projects:list', async () => {
    try {
      const entries = await fs.promises.readdir(projectsDir, { withFileTypes: true })
      const dirs = entries.filter((e) => e.isDirectory())
      const projects = await Promise.all(
        dirs.map(async (e) => {
          const stat = await fs.promises.stat(path.join(projectsDir, e.name))
          return { name: e.name, createdAt: stat.birthtimeMs }
        })
      )
      projects.sort((a, b) => a.createdAt - b.createdAt)
      return projects.map((p) => p.name)
    } catch {
      return []
    }
  })

  ipcMain.handle('session:save', async (_event, state) => {
    sessionStore.save(state)
  })

  ipcMain.handle('session:load', async () => {
    return sessionStore.load()
  })

  ipcMain.handle('memory:list', async (_event, projectName: string) => {
    const memoryDir = getMemoryDir(projectName)
    if (!memoryDir) return []
    try {
      const entries = await fs.promises.readdir(memoryDir)
      return entries.filter((e) => e.endsWith('.md'))
    } catch {
      return []
    }
  })

  ipcMain.handle('memory:read', async (_event, projectName: string, filename: string) => {
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) return ''

    if (filename === 'CLAUDE.md') {
      const claudePath = path.join(projectsDir, projectName, 'CLAUDE.md')
      try {
        return await fs.promises.readFile(claudePath, 'utf-8')
      } catch {
        return ''
      }
    }

    const memoryDir = getMemoryDir(projectName)
    if (!memoryDir) return ''
    const filePath = path.join(memoryDir, filename)
    try {
      return await fs.promises.readFile(filePath, 'utf-8')
    } catch {
      return ''
    }
  })

  ipcMain.on('memory:watch', (_event, projectName: string) => {
    if (memoryWatchers.has(projectName)) return
    const memoryDir = getMemoryDir(projectName)
    if (!memoryDir) return
    try {
      const watcher = fs.watch(memoryDir, () => {
        const existing = memoryDebounceTimers.get(projectName)
        if (existing) clearTimeout(existing)
        memoryDebounceTimers.set(projectName, setTimeout(() => {
          memoryDebounceTimers.delete(projectName)
          mainWindow?.webContents.send('memory:changed', projectName)
        }, 500))
      })
      memoryWatchers.set(projectName, watcher)
    } catch {}
  })

  ipcMain.on('memory:unwatch', (_event, projectName: string) => {
    const watcher = memoryWatchers.get(projectName)
    if (watcher) {
      watcher.close()
      memoryWatchers.delete(projectName)
    }
    const timer = memoryDebounceTimers.get(projectName)
    if (timer) {
      clearTimeout(timer)
      memoryDebounceTimers.delete(projectName)
    }
  })

  ipcMain.handle('memory:readGlobal', async () => {
    try {
      return await fs.promises.readFile(path.join(CLAUDE_DIR, 'CLAUDE.md'), 'utf-8')
    } catch {
      return ''
    }
  })

  ipcMain.handle('plans:list', async () => {
    try {
      const projects = await fs.promises.readdir(projectsDir)
      const results: { project: string; filename: string; summary: string }[] = []
      for (const project of projects) {
        const plansDir = path.join(projectsDir, project, 'docs', 'plans')
        try {
          const files = await fs.promises.readdir(plansDir)
          for (const file of files.filter((f) => f.endsWith('.md'))) {
            let summary = file.replace('.md', '')
            try {
              const content = await fs.promises.readFile(path.join(plansDir, file), 'utf-8')
              const firstLine = content.split('\n').find((l) => l.trim().length > 0) || ''
              summary = firstLine.replace(/^#+ /, '').replace(/^Plan:\\s*/i, '').trim() || summary
            } catch {}
            results.push({ project, filename: file, summary })
          }
        } catch {}
      }
      return results
    } catch {
      return []
    }
  })

  ipcMain.handle('plans:read', async (_event, project: string, filename: string) => {
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) return ''
    if (project.includes('..') || project.includes('/') || project.includes('\\')) return ''
    try {
      return await fs.promises.readFile(path.join(projectsDir, project, 'docs', 'plans', filename), 'utf-8')
    } catch {
      return ''
    }
  })

  ipcMain.handle('shell:openPath', async (_event, dirPath: string) => {
    return shell.openPath(dirPath)
  })

  ipcMain.handle('shell:openClaude', async () => {
    const { spawn } = await import('child_process')
    const cwd = process.cwd()
    if (process.platform === 'win32') {
      spawn('cmd', ['/c', 'start', 'cmd', '/k', `set CLAUDECODE=& cd /d ${cwd} & claude --continue --dangerously-skip-permissions`], {
        detached: true,
        stdio: 'ignore',
      })
    } else {
      spawn('bash', ['-c', `cd "${cwd}" && claude --continue --dangerously-skip-permissions`], {
        detached: true,
        stdio: 'ignore',
      })
    }
  })

  ipcMain.handle('diagnostics:getEvents', async () => {
    return diagnostics.getEvents()
  })

  ipcMain.on('diagnostics:rendererFreeze', (_event, duration: number) => {
    diagnostics.reportRendererFreeze(duration)
  })

  ipcMain.on('diagnostics:error', (_event, message: string) => {
    diagnostics.reportError(message)
  })
}

process.on('uncaughtException', (err) => {
  diagnostics.reportCrash('main', err.message, err.stack)
})

process.on('unhandledRejection', (reason) => {
  const msg = reason instanceof Error ? reason.message : String(reason)
  const stack = reason instanceof Error ? reason.stack : undefined
  diagnostics.reportCrash('main', `Unhandled rejection: ${msg}`, stack)
})

app.whenReady().then(async () => {
  delete process.env.CLAUDECODE

  const { execSync } = await import('child_process')
  try {
    const whichCmd = process.platform === 'win32' ? 'where node' : 'which node'
    const nodePath = execSync(whichCmd, { encoding: 'utf-8' }).trim().split('\n')[0].trim()
    process.env.NODE_SYSTEM_PATH = nodePath
  } catch {
    process.env.NODE_SYSTEM_PATH = 'node'
  }

  ptyManager.start()
  diagnostics.start()
  setupIPC()
  createWindow()
})

app.on('window-all-closed', () => {
  ptyManager.killAll()
  for (const watcher of memoryWatchers.values()) watcher.close()
  memoryWatchers.clear()
  app.quit()
})

app.on('before-quit', () => {
  ptyManager.killAll()
})
