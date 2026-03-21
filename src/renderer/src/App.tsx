import { useState, useEffect, useCallback, useRef } from 'react'
import type { AgentConfig, AgentDefaults, AgentStatus, PanelState, SessionState, ModelChoice, EffortChoice } from '../../shared/types'
import Toolbar from './components/Toolbar'
import TerminalPanel from './components/TerminalPanel'
import ResizableGrid from './components/ResizableGrid'
import { getProjectIcon, getProjectColor } from '../../shared/project-icons'
import StartupDialog from './components/StartupDialog'
import DiagnosticsViewer from './components/DiagnosticsViewer'
import { startRendererWatchdog } from './diagnostics'

const DEFAULT_AGENT_DEFAULTS: AgentDefaults = {
  continue: true,
  dangerouslySkipPermissions: true,
  terminalOnly: false,
}

function generateId() {
  return Math.random().toString(36).substring(2, 10)
}

function createAgentConfig(projectName: string, defaults: AgentDefaults, projectsDir: string): AgentConfig {
  return {
    id: generateId(),
    cwd: `${projectsDir}\\${projectName}`,
    projectName,
    continue: defaults.continue,
    dangerouslySkipPermissions: defaults.dangerouslySkipPermissions,
    terminalOnly: defaults.terminalOnly,
    model: defaults.model,
    effort: defaults.effort,
  }
}

function playAttentionSound() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 660
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.08, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.15)
  } catch { /* audio not available */ }
}

export default function App() {
  const [panels, setPanels] = useState<PanelState[]>([])
  const [showStartup, setShowStartup] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [gridResetKey, setGridResetKey] = useState(0)
  const [showDiagnostics, setShowDiagnostics] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [focusedPanelId, setFocusedPanelId] = useState<string | null>(null)
  const [defaults, setDefaults] = useState<AgentDefaults>(DEFAULT_AGENT_DEFAULTS)
  const [projectsDir, setProjectsDir] = useState<string>('')
  const defaultsRef = useRef(defaults)
  defaultsRef.current = defaults
  const [statusMap, setStatusMap] = useState<Record<string, AgentStatus>>({})
  const [attentionSet, setAttentionSet] = useState<Set<string>>(new Set())
  const prevStatusRef = useRef<Record<string, AgentStatus>>({})
  const lastActivePanelRef = useRef<string | null>(null)

  // Start renderer watchdog
  useEffect(() => {
    startRendererWatchdog()
  }, [])

  // Ctrl+Shift+D for diagnostics
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        setShowDiagnostics((v) => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // On mount: load projects dir and check for saved session
  useEffect(() => {
    window.electronAPI.projects.getDir().then((dir) => setProjectsDir(dir))
    window.electronAPI.session.load().then((session) => {
      if (session?.defaults) {
        setDefaults(session.defaults)
      }
      if (session?.panels?.length) {
        setPanels(session.panels)
      } else {
        setShowStartup(true)
      }
      setInitialized(true)
    })
  }, [])

  // Save session when panels or defaults change
  useEffect(() => {
    if (initialized) {
      const state: SessionState = { panels, defaults }
      window.electronAPI.session.save(state)
    }
  }, [panels, defaults, initialized])

  const updateDefaults = useCallback((newDefaults: AgentDefaults) => {
    setDefaults(newDefaults)
  }, [])

  const handleStatusChange = useCallback((id: string, status: AgentStatus) => {
    const prev = prevStatusRef.current[id]
    prevStatusRef.current[id] = status
    setStatusMap(s => ({ ...s, [id]: status }))
    console.log(`[GLOW ${id.slice(0,6)}] ${Date.now() % 100000} | APP: status ${prev} → ${status}${prev === 'working' && status === 'waiting' ? '  *** ATTENTION-GLOW + SOUND ***' : ''}`)
    if (prev === 'working' && status === 'waiting') {
      setAttentionSet(s => new Set(s).add(id))
      playAttentionSound()
    }
  }, [])

  const clearAttention = useCallback((id: string) => {
    lastActivePanelRef.current = id
    setAttentionSet(s => {
      if (!s.has(id)) return s
      const next = new Set(s)
      next.delete(id)
      return next
    })
  }, [])

  // Keyboard shortcuts: Ctrl+1-9 for panel switch, Ctrl+Tab for next/prev
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key >= '1' && e.key <= '9') {
        const index = parseInt(e.key) - 1
        if (index < panels.length) {
          e.preventDefault()
          const id = panels[index].id
          if (focusMode) setFocusedPanelId(id)
          clearAttention(id)
          setTimeout(() => window.dispatchEvent(new CustomEvent('focus-panel', { detail: id })), 50)
        }
      }
      if (e.key === 'Tab' && !e.altKey && panels.length > 1) {
        e.preventDefault()
        const currentIndex = panels.findIndex(p => p.id === focusedPanelId)
        const idx = currentIndex === -1 ? 0 : currentIndex
        const nextIndex = e.shiftKey
          ? (idx - 1 + panels.length) % panels.length
          : (idx + 1) % panels.length
        const id = panels[nextIndex].id
        if (focusMode) setFocusedPanelId(id)
        clearAttention(id)
        setTimeout(() => window.dispatchEvent(new CustomEvent('focus-panel', { detail: id })), 50)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [panels, focusMode, focusedPanelId, clearAttention])

  const handleStartupSelect = useCallback((result: { projects: string[]; model?: ModelChoice; effort?: EffortChoice }) => {
    setShowStartup(false)
    if (result.model || result.effort) {
      setDefaults((prev) => ({ ...prev, model: result.model, effort: result.effort }))
    }
    if (result.projects.length > 0) {
      const d = { ...defaultsRef.current, model: result.model, effort: result.effort }
      const newPanels = result.projects.map((name) => {
        const config = createAgentConfig(name, d, projectsDir)
        return { id: config.id, config }
      })
      setPanels(newPanels)
    }
  }, [])

  const handleAddAgent = useCallback((config: AgentConfig) => {
    const panel: PanelState = { id: config.id, config }
    setPanels((prev) => [...prev, panel])
  }, [])

  const handleClosePanel = useCallback((id: string) => {
    window.electronAPI.pty.kill(id)
    setPanels((prev) => prev.filter((p) => p.id !== id))
    setStatusMap(s => { const n = { ...s }; delete n[id]; return n })
    setAttentionSet(s => { const n = new Set(s); n.delete(id); return n })
    delete prevStatusRef.current[id]
  }, [])

  const handleStopAll = useCallback(() => {
    panels.forEach((p) => window.electronAPI.pty.kill(p.id))
    setPanels([])
    setStatusMap({})
    setAttentionSet(new Set())
    prevStatusRef.current = {}
  }, [panels])

  const handleSwapPanels = useCallback((fromIndex: number, toIndex: number) => {
    setPanels((prev) => {
      const next = [...prev]
      const temp = next[fromIndex]
      next[fromIndex] = next[toIndex]
      next[toIndex] = temp
      return next
    })
  }, [])

  return (
    <div className="app">
      <Toolbar
        onAddAgent={handleAddAgent}
        onStopAll={handleStopAll}
        onResetLayout={() => setGridResetKey((k) => k + 1)}
        onShowDiagnostics={() => setShowDiagnostics(true)}
        focusMode={focusMode}
        projectsDir={projectsDir}
        onToggleFocusMode={() => {
          setFocusMode((v) => !v)
          if (!focusMode && panels.length > 0) {
            const activeId = lastActivePanelRef.current && panels.some(p => p.id === lastActivePanelRef.current)
              ? lastActivePanelRef.current
              : panels[0].id
            setFocusedPanelId(activeId)
          }
        }}
        generateId={generateId}
        defaults={defaults}
        onDefaultsChange={updateDefaults}
      />
      {showStartup && <StartupDialog onStart={handleStartupSelect} defaults={defaults} />}
      {showDiagnostics && <DiagnosticsViewer onClose={() => setShowDiagnostics(false)} />}
      {panels.length === 0 && !showStartup ? (
        <div className="panel-grid">
          <div className="empty-state">
            <div className="empty-state-text">
              Click <strong>+ Agent</strong> to start a Claude Code agent
            </div>
          </div>
        </div>
      ) : panels.length > 0 ? (
        <>
          {focusMode && (
            <div className="focus-taskbar">
              {panels.map((panel) => (
                <button
                  key={panel.id}
                  className={`focus-tab ${panel.id === focusedPanelId ? 'focus-tab-active' : ''}${attentionSet.has(panel.id) ? ' focus-tab-attention' : ''}`}
                  style={{ borderBottomColor: getProjectColor(panel.config.projectName) }}
                  onClick={() => {
                    setFocusedPanelId(panel.id)
                    clearAttention(panel.id)
                    setTimeout(() => window.dispatchEvent(new CustomEvent('focus-panel', { detail: panel.id })), 50)
                  }}
                >
                  <span className={`status-dot status-${statusMap[panel.id] || 'inactive'}`} />
                  <span className="focus-tab-icon">{getProjectIcon(panel.config.projectName)}</span>
                  <span className="focus-tab-name">{panel.config.projectName}</span>
                </button>
              ))}
            </div>
          )}
          <ResizableGrid resetKey={gridResetKey} onSwapPanels={handleSwapPanels} focusMode={focusMode} focusedPanelId={focusedPanelId}>
            {panels.map((panel) => (
              <TerminalPanel
                key={panel.id}
                config={panel.config}
                onClose={() => handleClosePanel(panel.id)}
                onStatusChange={handleStatusChange}
                needsAttention={attentionSet.has(panel.id)}
                onInteract={() => { lastActivePanelRef.current = panel.id; clearAttention(panel.id) }}
                status={statusMap[panel.id]}
              />
            ))}
          </ResizableGrid>
        </>
      ) : null}
    </div>
  )
}
