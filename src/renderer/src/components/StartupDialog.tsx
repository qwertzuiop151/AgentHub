import { useState, useEffect } from 'react'
import { getProjectIcon } from '../../../shared/project-icons'
import type { AgentDefaults, ModelChoice, EffortChoice } from '../../../shared/types'

const DEFAULT_CHECKED = ['Metaplaner']

interface StartupResult {
  projects: string[]
  model?: ModelChoice
  effort?: EffortChoice
}

interface StartupDialogProps {
  onStart: (result: StartupResult) => void
  defaults: AgentDefaults
}

export default function StartupDialog({ onStart, defaults }: StartupDialogProps) {
  const [projects, setProjects] = useState<string[]>([])
  const [checked, setChecked] = useState<Set<string>>(new Set(DEFAULT_CHECKED))
  const [loading, setLoading] = useState(true)
  const [model, setModel] = useState<ModelChoice | ''>(defaults.model || '')
  const [effort, setEffort] = useState<EffortChoice | ''>(defaults.effort || '')

  useEffect(() => {
    window.electronAPI.projects.list().then((list) => {
      setProjects(list)
      setLoading(false)
    })
  }, [])

  const toggle = (name: string) => {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const selectAll = () => setChecked(new Set(projects))
  const selectNone = () => setChecked(new Set())

  const handleStart = () => {
    const selected = projects.filter((p) => checked.has(p))
    onStart({
      projects: selected,
      model: model || undefined,
      effort: effort || undefined,
    })
  }

  if (loading) return null

  return (
    <div className="dialog-overlay">
      <div className="dialog startup-dialog">
        <h3>Projekte starten</h3>
        <div className="dialog-row startup-defaults">
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
        <div className="startup-actions-top">
          <button className="btn-link" onClick={selectAll}>Alle</button>
          <button className="btn-link" onClick={selectNone}>Keine</button>
        </div>
        <div className="startup-project-list">
          {projects.map((p) => (
            <label key={p} className="startup-project-item" onClick={() => toggle(p)}>
              <span className="startup-check">{checked.has(p) ? '\u2611' : '\u2610'}</span>
              <span className="startup-icon">{getProjectIcon(p)}</span>
              <span className="startup-name">{p}</span>
            </label>
          ))}
        </div>
        <div className="dialog-actions">
          <button className="btn-secondary" onClick={() => onStart({ projects: [] })}>
            Leer starten
          </button>
          <button
            className="btn-primary"
            onClick={handleStart}
            disabled={checked.size === 0}
          >
            {checked.size} Projekt{checked.size !== 1 ? 'e' : ''} starten
          </button>
        </div>
      </div>
    </div>
  )
}
