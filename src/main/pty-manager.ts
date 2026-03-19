import { spawn, ChildProcess, execSync } from 'child_process'
import path from 'path'
import fs from 'fs'
import { createInterface } from 'readline'

interface PtyCallbacks {
  dataCallbacks: ((data: string) => void)[]
  exitCallbacks: ((code: number) => void)[]
}

/**
 * Find Git Bash on Windows.
 * Priority: GIT_BASH_PATH env var > common locations > 'where git' fallback.
 */
function findGitBash(): string {
  // User-specified path takes priority
  if (process.env.GIT_BASH_PATH && fs.existsSync(process.env.GIT_BASH_PATH)) {
    return process.env.GIT_BASH_PATH
  }

  const candidates = [
    'C:\\Program Files\\Git\\bin\\bash.exe',
    'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
  ]
  for (const p of candidates) {
    try { if (fs.existsSync(p)) return p } catch {}
  }
  try {
    const gitPath = execSync('where git', { encoding: 'utf-8' }).trim().split('\n')[0].trim()
    const bashPath = path.join(path.dirname(path.dirname(gitPath)), 'bin', 'bash.exe')
    if (fs.existsSync(bashPath)) return bashPath
  } catch {}
  return 'C:\\Program Files\\Git\\bin\\bash.exe'
}

export class PtyManager {
  private host: ChildProcess | null = null
  private callbacks = new Map<string, PtyCallbacks>()
  private ready = false
  private pendingMessages: Record<string, unknown>[] = []

  start() {
    const hostScript = path.join(__dirname, 'pty-host.js')
    const nodePath = process.env.NODE_SYSTEM_PATH || 'node'
    this.host = spawn(nodePath, [hostScript], {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    })

    if (!this.host.stdout || !this.host.stderr) return

    this.host.stderr.on('data', (data: Buffer) => {
      console.error('[pty-host stderr]', data.toString())
    })

    const rl = createInterface({ input: this.host.stdout })
    rl.on('line', (line) => {
      try {
        const msg = JSON.parse(line)
        this.handleMessage(msg)
      } catch {}
    })

    this.host.on('error', (err) => {
      console.error('[PtyManager] host error:', err)
    })

    this.host.on('exit', (code) => {
      this.host = null
      this.ready = false
      if (code !== 0 && code !== null) {
        console.warn('[PtyManager] Host crashed (exit code', code, '), restarting...')
        setTimeout(() => this.start(), 1000)
      }
    })
  }

  private handleMessage(msg: Record<string, unknown>) {
    switch (msg.type) {
      case 'ready':
        this.ready = true
        for (const m of this.pendingMessages) {
          this.send(m)
        }
        this.pendingMessages = []
        break

      case 'data': {
        const cbs = this.callbacks.get(msg.id as string)
        if (cbs) {
          for (const cb of cbs.dataCallbacks) {
            try { cb(msg.data as string) } catch (err) { console.error('[PtyManager] data callback error:', err) }
          }
        }
        break
      }

      case 'exit': {
        const cbs = this.callbacks.get(msg.id as string)
        if (cbs) {
          for (const cb of cbs.exitCallbacks) {
            try { cb(msg.exitCode as number) } catch (err) { console.error('[PtyManager] exit callback error:', err) }
          }
        }
        this.callbacks.delete(msg.id as string)
        break
      }
    }
  }

  private send(msg: Record<string, unknown>) {
    if (!this.ready || !this.host?.stdin) {
      this.pendingMessages.push(msg)
      return
    }
    this.host.stdin.write(JSON.stringify(msg) + '\n')
  }

  create(id: string, cwd: string, command: string, args: string[]) {
    this.callbacks.set(id, { dataCallbacks: [], exitCallbacks: [] })

    let spawnCommand: string
    let spawnArgs: string[]

    if (process.platform === 'win32') {
      const gitBash = findGitBash()
      if (command === 'bash') {
        spawnCommand = gitBash
        spawnArgs = ['--login']
      } else {
        spawnCommand = gitBash
        spawnArgs = ['--login', '-c', [command, ...args].join(' ')]
      }
    } else {
      spawnCommand = command
      spawnArgs = args
    }

    const env = { ...process.env }
    delete env.CLAUDECODE

    this.send({
      type: 'create',
      id,
      cwd,
      command: spawnCommand,
      args: spawnArgs,
      env,
    })
  }

  write(id: string, data: string) {
    this.send({ type: 'write', id, data })
  }

  resize(id: string, cols: number, rows: number) {
    this.send({ type: 'resize', id, cols, rows })
  }

  kill(id: string) {
    this.send({ type: 'kill', id })
    this.callbacks.delete(id)
  }

  killAll() {
    this.send({ type: 'killAll' })
    this.callbacks.clear()
    if (this.host) {
      this.host.kill()
      this.host = null
    }
  }

  onData(id: string, callback: (data: string) => void) {
    let cbs = this.callbacks.get(id)
    if (!cbs) {
      cbs = { dataCallbacks: [], exitCallbacks: [] }
      this.callbacks.set(id, cbs)
    }
    cbs.dataCallbacks.push(callback)
  }

  onExit(id: string, callback: (code: number) => void) {
    let cbs = this.callbacks.get(id)
    if (!cbs) {
      cbs = { dataCallbacks: [], exitCallbacks: [] }
      this.callbacks.set(id, cbs)
    }
    cbs.exitCallbacks.push(callback)
  }
}
