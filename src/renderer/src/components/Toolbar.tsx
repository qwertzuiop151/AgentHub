import { useState, useEffect } from 'react'
import type { AgentConfig, AgentDefaults, ModelChoice, EffortChoice, PlanEntry } from '../../../shared/types'
import { getProjectIcon } from '../../../shared/project-icons'
import FileViewer from './FileViewer'

const PRIORITY_PROJECTS = ['Metaplaner']

interface ToolbarProps {
  onAddAgent: (config: AgentConfig) => void
  onStopAll: () => void
  onResetLayout: () => void
  onShowDiagnostics: () => void
  focusMode: boolean
  onToggleFocusMode: () => void
  generateId: () => string
  defaults: AgentDefaults
  onDefaultsChange: (defaults: AgentDefaults) => void
}

export default function Toolbar({ onAddAgent, onStopAll, onResetLayout, onShowDiagnostics, focusMode, onToggleFocusMode, generateId, defaults, onDefaultsChange }: ToolbarProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [viewerFile, setViewerFile] = useState<{ title: string; content: string } | null>(null)
  const [showPlans, setShowPlans] = useState(false)
  const [plans, setPlans] = useState<PlanEntry[]>([])
  const [projects, setProjects] = useState<string[]>([])
  const [selectedProject, setSelectedProject] = useState('')
  const [optContinue, setOptContinue] = useState(defaults.continue)
  const [optSkipPerms, setOptSkipPerms] = useState(defaults.dangerouslySkipPermissions)
  const [optTerminalOnly, setOptTerminalOnly] = useState(defaults.terminalOnly)
  const [model, setModel] = useState<ModelChoice | ''>(defaults.model || '')
  const [effort, setEffort] = useState<EffortChoice | ''>(defaults.effort || '')

  // Sync local state when defaults change externally
  useEffect(() => {
    setOptContinue(defaults.continue)
    setOptSkipPerms(defaults.dangerouslySkipPermissions)
    setOptTerminalOnly(defaults.terminalOnly)
    setModel(defaults.model || '')
    setEffort(defaults.effort || '')
  }, [defaults])

  useEffect(() => {
    if (showDialog) {
      window.electronAPI.projects.list().then((list) => {
        const priority = PRIORITY_PROJECTS.filter((p) => list.includes(p))
        const rest = list.filter((p) => !PRIORITY_PROJECTS.includes(p))
        const sorted = [...priority, ...rest]
        setProjects(sorted)
        if (sorted.length > 0 && !selectedProject) {
          setSelectedProject(sorted[0])
        }
      })
    }
  }, [showDialog])

  const handleCreate = () => {
    if (!selectedProject) return

    // Save current options as new defaults
    const newDefaults: AgentDefaults = {
      continue: optContinue,
      dangerouslySkipPermissions: optSkipPerms,
      terminalOnly: optTerminalOnly,
      model: model || undefined,
      effort: effort || undefined,
    }
    onDefaultsChange(newDefaults)

    const config: AgentConfig = {
      id: generateId(),
      cwd: `F:\\CLAUDECODE\\Projects\\${selectedProject}`,
      projectName: selectedProject,
      continue: optContinue,
      dangerouslySkipPermissions: optSkipPerms,
      terminalOnly: optTerminalOnly,
      model: model || undefined,
      effort: effort || undefined,
    }
    onAddAgent(config)
    setShowDialog(false)
  }

  return (
    <>
      <div className="toolbar">
        <span className="toolbar-title">AgentHub</span>
        <button onClick={() => setShowDialog(true)}>+ Agent</button>
        <button onClick={onToggleFocusMode} title={focusMode ? 'Grid-Modus' : 'Focus-Modus'}>
          {focusMode ? 'Grid' : 'Focus'}
        </button>
        <button onClick={onResetLayout} title="Layout zuruecksetzen">Reset</button>
        <button onClick={() => window.electronAPI.shell.openClaude()} title="Claude in externem Terminal oeffnen">
          Claude
        </button>
        <div className="spacer" />
        <button
          onClick={async () => {
            const content = await window.electronAPI.memory.readGlobal()
            setViewerFile({ title: 'Global CLAUDE.md', content })
          }}
          title="Globale CLAUDE.md"
        >
          CLAUDE.md
        </button>
        <button
          onClick={async () => {
            const list = await window.electronAPI.plans.list()
            setPlans(list)
            setShowPlans(true)
          }}
          title="Alle Plaene anzeigen"
        >
          Plans
        </button>
        <button onClick={onShowDiagnostics} title="Ctrl+Shift+D">Diagnostics</button>
        <button onClick={onStopAll}>Alle Stoppen</button>
      </div>

      {viewerFile && (
        <FileViewer
          title={viewerFile.title}
          content={viewerFile.content}
          onClose={() => setViewerFile(null)}
        />
      )}

      {showPlans && (
        <div className="dialog-overlay" onClick={() => setShowPlans(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Plans</h3>
            <div className="plans-list">
              {plans.length === 0 ? (
                <div style={{ opacity: 0.5 }}>Keine Plaene gefunden</div>
              ) : (
                plans.map((plan) => (
                  <button
                    key={`${plan.project}/${plan.filename}`}
                    className="plan-entry"
                    onClick={async () => {
                      const content = await window.electronAPI.plans.read(plan.project, plan.filename)
                      setShowPlans(false)
                      setViewerFile({ title: `${plan.project} / ${plan.summary}`, content })
                    }}
                  >
                    <span className="plan-project">{getProjectIcon(plan.project)}</span>
                    <span className="plan-summary">{plan.summary}</span>
                  </button>
                ))
              )}
            </div>
            <div className="dialog-actions">
              <button className="btn-secondary" onClick={() => setShowPlans(false)}>Schliessen</button>
            </div>
          </div>
        </div>
      )}

      {showDialog && (
        <div className="dialog-overlay" onClick={() => setShowDialog(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Neuen Agent starten</h3>
            <label>
              Projekt:
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
              >
                {projects.map((p) => (
                  <option key={p} value={p}>{getProjectIcon(p)}  {p}</option>
                ))}
              </select>
            </label>
            <div className="dialog-row">
              <label>
                Modell:
                <select value={model} onChange={(e) => setModel(e.target.value as ModelChoice | '')}>
                  <option value="">Default (Opus)</option>
                  <option value="opus">Opus</option>
                  <option value="sonnet">Sonnet</option>
                  <option value="haiku">Haiku</option>
                </select>
              </label>
              <label>
                Effort:
                <select value={effort} onChange={(e) => setEffort(e.target.value as EffortChoice | '')}>
                  <option value="">Default (High)</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </label>
            </div>
            <div className="checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={optContinue}
                  onChange={(e) => setOptContinue(e.target.checked)}
                />
                --continue
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={optSkipPerms}
                  onChange={(e) => setOptSkipPerms(e.target.checked)}
                />
                --dangerously-skip-permissions
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={optTerminalOnly}
                  onChange={(e) => setOptTerminalOnly(e.target.checked)}
                />
                Nur Terminal (kein Claude)
              </label>
            </div>
            <div className="dialog-actions">
              <button className="btn-secondary" onClick={() => setShowDialog(false)}>
                Abbrechen
              </button>
              <button className="btn-primary" onClick={handleCreate}>
                Starten
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
