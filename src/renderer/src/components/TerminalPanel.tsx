import { useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
// WebglAddon loaded dynamically to avoid breaking if WebGL unavailable
import type { AgentConfig, AgentStatus } from '../../../shared/types'
import { getProjectIcon, getProjectColor } from '../../../shared/project-icons'
import FileViewer from './FileViewer'
import '@xterm/xterm/css/xterm.css'

interface TerminalPanelProps {
  config: AgentConfig
  onClose: () => void
  onStatusChange?: (id: string, status: AgentStatus) => void
  needsAttention?: boolean
  onInteract?: () => void
  status?: AgentStatus
}

export default function TerminalPanel({ config, onClose, onStatusChange, needsAttention, onInteract, status }: TerminalPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const [memoryFiles, setMemoryFiles] = useState<string[]>([])
  const [viewerFile, setViewerFile] = useState<{ title: string; content: string } | null>(null)
  const onStatusChangeRef = useRef(onStatusChange)
  onStatusChangeRef.current = onStatusChange

  // Load memory file list + watch for changes
  useEffect(() => {
    const projectName = config.projectName
    window.electronAPI.memory.list(projectName).then(setMemoryFiles)
    window.electronAPI.memory.watch(projectName)

    const removeListener = window.electronAPI.memory.onChanged((changedProject) => {
      if (changedProject === projectName) {
        window.electronAPI.memory.list(projectName).then(setMemoryFiles)
      }
    })

    return () => {
      window.electronAPI.memory.unwatch(projectName)
      removeListener()
    }
  }, [config.projectName])

  const openFile = async (filename: string) => {
    const content = await window.electronAPI.memory.read(config.projectName, filename)
    setViewerFile({ title: `${config.projectName} / ${filename}`, content })
  }

  useEffect(() => {
    if (!containerRef.current) return

    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 18,
      fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace",
      scrollback: 10000,
      theme: {
        background: '#0a0a1a',
        foreground: '#e0e0e0',
        cursor: '#e94560',
        selectionBackground: '#0f3460',
      },
      allowProposedApi: true,
    })

    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)

    terminal.open(containerRef.current)
    terminalRef.current = terminal
    fitAddonRef.current = fitAddon

    // WebGL renderer for better performance with many terminals
    import('@xterm/addon-webgl').then(({ WebglAddon }) => {
      if (disposed) return
      try {
        const webgl = new WebglAddon()
        webgl.onContextLoss(() => webgl.dispose())
        terminal.loadAddon(webgl)
      } catch { /* fallback to canvas renderer */ }
    }).catch(() => { /* addon not available */ })

    // Fit after a small delay to ensure container is sized
    requestAnimationFrame(() => {
      fitAddon.fit()
      terminal.focus()
    })

    // Focus terminal when panel becomes visible (e.g. focus-mode tab switch)
    const handleFocusPanel = (e: Event) => {
      if ((e as CustomEvent).detail === config.id) {
        dbg(`FOCUS-PANEL event → ignoreStatusUntil = now + 4s, statusTimer cleared`)
        ignoreStatusUntil = Date.now() + 4000
        if (statusTimer) { clearTimeout(statusTimer); statusTimer = null }
        requestAnimationFrame(() => {
          const dims = fitAddonRef.current?.proposeDimensions()
          if (dims && (dims.cols !== terminal.cols || dims.rows !== terminal.rows)) {
            fitAddon.fit()
          }
          terminal.focus()
        })
      }
    }
    window.addEventListener('focus-panel', handleFocusPanel)

    // Create PTY
    window.electronAPI.pty.create({
      id: config.id,
      cwd: config.cwd,
      continue: config.continue,
      dangerouslySkipPermissions: config.dangerouslySkipPermissions,
      terminalOnly: config.terminalOnly,
      model: config.model,
      effort: config.effort,
    })

    // Double-RAF batched write — waits 2 frames so split PTY chunks
    // (e.g. screen-clear in frame 1 + content in frame 2) get merged
    let writeBuffer = ''
    let writeScheduled = false
    let disposed = false
    const flushWrite = () => {
      if (disposed || !writeBuffer) {
        writeScheduled = false
        return
      }
      const data = writeBuffer
      writeBuffer = ''
      writeScheduled = false
      try {
        terminal.write(data)
      } catch {
        // terminal disposed
      }
    }
    const scheduleFlush = () => {
      if (writeScheduled) return
      writeScheduled = true
      requestAnimationFrame(() => requestAnimationFrame(flushWrite))
    }

    // Status detection: timeout-based
    let statusTimer: ReturnType<typeof setTimeout> | null = null
    let currentStatus: AgentStatus = 'working'
    let ignoreStatusUntil = 0

    const DEBUG_GLOW = true
    const dbg = (msg: string) => {
      if (DEBUG_GLOW) console.log(`[GLOW ${config.id.slice(0,6)}] ${Date.now() % 100000} | ${msg}`)
    }

    const updateStatus = (s: AgentStatus) => {
      if (s !== currentStatus) {
        dbg(`STATUS: ${currentStatus} → ${s}`)
        if (currentStatus === 'working' && s === 'waiting') {
          dbg(`  ^^^ ATTENTION-GLOW TRIGGER (working→waiting)`)
        }
        currentStatus = s
        onStatusChangeRef.current?.(config.id, s)
      }
    }

    // Receive data from PTY
    const removeDataListener = window.electronAPI.pty.onData((id, data) => {
      if (id === config.id && !disposed) {
        writeBuffer += data
        scheduleFlush()
        // Status: data arriving = working (ignore resize-triggered data)
        if (Date.now() > ignoreStatusUntil) {
          dbg(`DATA → updateStatus('working')  [${data.length} bytes]`)
          updateStatus('working')
          if (statusTimer) clearTimeout(statusTimer)
          statusTimer = setTimeout(() => {
            dbg(`TIMEOUT 3s → updateStatus('waiting')`)
            if (!disposed) updateStatus('waiting')
          }, 3000)
        } else {
          dbg(`DATA IGNORED (ignoreStatusUntil in ${ignoreStatusUntil - Date.now()}ms)  [${data.length} bytes]`)
        }
      }
    })

    // Handle PTY exit — show message and allow restart with Enter
    let exited = false
    const removeExitListener = window.electronAPI.pty.onExit((id, _code) => {
      if (id === config.id) {
        exited = true
        if (statusTimer) clearTimeout(statusTimer)
        updateStatus('inactive')
        terminal.write('\r\n\x1b[90m--- Process ended. Press Enter to restart ---\x1b[0m\r\n')
      }
    })

    // Send input to PTY (or restart on Enter after exit)
    terminal.onData((data) => {
      if (exited && data.includes('\r')) {
        exited = false
        updateStatus('working')
        terminal.clear()
        terminal.write('\x1b[90mRestarting...\x1b[0m\r\n')
        window.electronAPI.pty.create({
          id: config.id,
          cwd: config.cwd,
          continue: config.continue,
          dangerouslySkipPermissions: config.dangerouslySkipPermissions,
          terminalOnly: config.terminalOnly,
          model: config.model,
          effort: config.effort,
        })
      } else if (!exited) {
        window.electronAPI.pty.write(config.id, data)
      }
    })

    // Handle paste via Ctrl+V and right-click
    terminal.attachCustomKeyEventHandler((event) => {
      // Ctrl+V or Ctrl+Shift+V → paste from clipboard
      if (event.type === 'keydown' && event.ctrlKey && (event.key === 'v' || event.key === 'V')) {
        event.preventDefault()
        navigator.clipboard.readText().then((text) => {
          if (text) {
            window.electronAPI.pty.write(config.id, text)
          }
        })
        return false // prevent default xterm handling
      }
      // Ctrl+C with selection → copy, without selection → SIGINT
      if (event.type === 'keydown' && event.ctrlKey && (event.key === 'c' || event.key === 'C')) {
        const selection = terminal.getSelection()
        if (selection) {
          navigator.clipboard.writeText(selection)
          terminal.clearSelection()
          return false
        }
        return true
      }
      return true
    })

    // Right-click paste
    const container = containerRef.current
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      navigator.clipboard.readText().then((text) => {
        if (text) {
          window.electronAPI.pty.write(config.id, text)
        }
      })
    }
    container.addEventListener('contextmenu', handleContextMenu)

    // Resize handling (debounced to avoid scroll flash during drag)
    let resizeTimer: ReturnType<typeof setTimeout> | null = null
    const resizeObserver = new ResizeObserver(() => {
      if (resizeTimer) clearTimeout(resizeTimer)
      const prev = ignoreStatusUntil
      ignoreStatusUntil = Math.max(ignoreStatusUntil, Date.now() + 4000)
      if (statusTimer) { clearTimeout(statusTimer); statusTimer = null }
      dbg(`RESIZE-OBSERVER fired → ignoreStatusUntil = now + 4s, statusTimer cleared (was ${prev > Date.now() ? `+${prev - Date.now()}ms` : 'expired'})`)
      resizeTimer = setTimeout(() => {
        requestAnimationFrame(() => {
          if (fitAddonRef.current && terminalRef.current) {
            const dims = fitAddonRef.current.proposeDimensions()
            if (dims && (dims.cols !== terminalRef.current.cols || dims.rows !== terminalRef.current.rows)) {
              dbg(`RESIZE: fit() ${terminalRef.current.cols}x${terminalRef.current.rows} → ${dims.cols}x${dims.rows}`)
              fitAddonRef.current.fit()
              // No scrollToBottom() — xterm preserves scroll position after fit()
              // scrollToBottom() caused visible flash on focus-mode toggle
              window.electronAPI.pty.resize(config.id, dims.cols, dims.rows)
              // Suppress status changes from PTY resize responses
              ignoreStatusUntil = Date.now() + 4000
              if (statusTimer) { clearTimeout(statusTimer); statusTimer = null }
              dbg(`RESIZE: ignoreStatusUntil = now + 4s, statusTimer cleared`)
            } else {
              dbg(`RESIZE: skipped (same dims ${terminalRef.current.cols}x${terminalRef.current.rows})`)
            }
          }
        })
      }, 100)
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      disposed = true
      writeBuffer = ''
      if (statusTimer) clearTimeout(statusTimer)
      removeDataListener()
      removeExitListener()
      if (resizeTimer) clearTimeout(resizeTimer)
      resizeObserver.disconnect()
      container.removeEventListener('contextmenu', handleContextMenu)
      window.removeEventListener('focus-panel', handleFocusPanel)
      terminal.dispose()
    }
  }, [config.id])

  // Build model/effort badge (only show if non-default)
  const modelLabels: Record<string, string> = { opus: 'Opus', sonnet: 'Sonnet', haiku: 'Haiku' }
  const effortLabels: Record<string, string> = { low: 'low', medium: 'med', high: 'high' }
  const showModel = config.model && config.model !== 'opus'
  const showEffort = config.effort && config.effort !== 'high'
  let badge = ''
  if (showModel || showEffort) {
    const parts: string[] = []
    if (showModel) parts.push(modelLabels[config.model!])
    if (showEffort) parts.push(effortLabels[config.effort!])
    badge = parts.join(' \u00B7 ')
  }

  return (
    <div className={`terminal-panel${needsAttention ? ' attention-glow' : ''}`} onMouseDown={() => onInteract?.()}>
      <div
        className="panel-header"
        style={{ background: getProjectColor(config.projectName) }}
        draggable
      >
        <span className="project-icon">{getProjectIcon(config.projectName)}</span>
        <span className={`status-dot status-${status || 'inactive'}`} />
        <span className="project-name">{config.projectName}</span>
        {badge && <span className="model-badge">{badge}</span>}
        <span className="header-spacer" />
        <button
          className="memory-btn memory-btn-folder"
          onClick={(e) => { e.stopPropagation(); window.electronAPI.shell.openPath(config.cwd) }}
          title="Open folder"
        >
          &#128193;
        </button>
        <button
          className="memory-btn memory-btn-context"
          onClick={() => window.electronAPI.pty.write(config.id, 'Briefly summarize: (1) How full is your context window (estimated %)? (2) Which files have you read? (3) What was discussed and what is the current status?\r')}
          title="Ask Claude about current context"
        >
          Context?
        </button>
        <span className="memory-buttons">
          <button className="memory-btn memory-btn-claude" onClick={() => openFile('CLAUDE.md')} title="CLAUDE.md">CLAUDE</button>
          {memoryFiles.map((f) => (
            <button
              key={f}
              className={`memory-btn ${f === 'MEMORY.md' ? 'memory-btn-memory' : 'memory-btn-other'}`}
              onClick={() => openFile(f)}
              title={f}
            >
              {f.replace('.md', '')}
            </button>
          ))}
        </span>
        <button className="close-btn" onClick={onClose}>
          &times;
        </button>
      </div>
      <div className="terminal-container" ref={containerRef} />
      {viewerFile && (
        <FileViewer
          title={viewerFile.title}
          content={viewerFile.content}
          onClose={() => setViewerFile(null)}
        />
      )}
    </div>
  )
}
