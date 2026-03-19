/**
 * Separate Node.js process that hosts PTY instances.
 * Runs outside Electron to avoid ConPTY/Console issues.
 * Communicates with the Electron main process via IPC (stdin/stdout JSON messages).
 */
import * as pty from 'node-pty'

interface PtyInstance {
  process: pty.IPty
}

const instances = new Map<string, PtyInstance>()

function send(msg: Record<string, unknown>) {
  process.stdout.write(JSON.stringify(msg) + '\n')
}

function handleMessage(msg: Record<string, unknown>) {
  switch (msg.type) {
    case 'create': {
      const { id, cwd, command, args, env } = msg as {
        id: string; cwd: string; command: string; args: string[]; env: Record<string, string>
      }

      // Kill existing
      const existing = instances.get(id)
      if (existing) {
        try { existing.process.kill() } catch {}
        instances.delete(id)
      }

      const proc = pty.spawn(command, args, {
        name: 'xterm-256color',
        cols: 120,
        rows: 30,
        cwd,
        env,
        useConpty: false,
      } as pty.IPtyForkOptions & { useConpty: boolean })

      instances.set(id, { process: proc })

      proc.onData((data) => {
        send({ type: 'data', id, data })
      })

      proc.onExit(({ exitCode }) => {
        send({ type: 'exit', id, exitCode })
        instances.delete(id)
      })
      break
    }

    case 'write': {
      const { id, data } = msg as { id: string; data: string }
      instances.get(id)?.process.write(data)
      break
    }

    case 'resize': {
      const { id, cols, rows } = msg as { id: string; cols: number; rows: number }
      try {
        instances.get(id)?.process.resize(cols, rows)
      } catch {}
      break
    }

    case 'kill': {
      const { id } = msg as { id: string }
      const inst = instances.get(id)
      if (inst) {
        try { inst.process.kill() } catch {}
        instances.delete(id)
      }
      break
    }

    case 'killAll': {
      for (const [id, inst] of instances) {
        try { inst.process.kill() } catch {}
      }
      instances.clear()
      break
    }
  }
}

// Read JSON messages from stdin, one per line
let buffer = ''
process.stdin.setEncoding('utf-8')
process.stdin.on('data', (chunk: string) => {
  buffer += chunk
  const lines = buffer.split('\n')
  buffer = lines.pop() || ''
  for (const line of lines) {
    if (line.trim()) {
      try {
        handleMessage(JSON.parse(line))
      } catch (err) {
        send({ type: 'error', message: String(err) })
      }
    }
  }
})

process.stdin.on('end', () => {
  for (const [, inst] of instances) {
    try { inst.process.kill() } catch {}
  }
  process.exit(0)
})

send({ type: 'ready' })
