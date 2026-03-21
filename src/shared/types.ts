export type ModelChoice = 'opus' | 'sonnet' | 'haiku'
export type EffortChoice = 'low' | 'medium' | 'high'

export interface AgentConfig {
  id: string
  cwd: string
  projectName: string
  continue: boolean
  dangerouslySkipPermissions: boolean
  terminalOnly: boolean
  model?: ModelChoice
  effort?: EffortChoice
}

export interface PanelState {
  id: string
  config: AgentConfig
}

export interface AgentDefaults {
  continue: boolean
  dangerouslySkipPermissions: boolean
  terminalOnly: boolean
  model?: ModelChoice
  effort?: EffortChoice
}

export interface SessionState {
  panels: PanelState[]
  defaults?: AgentDefaults
}

export type AgentStatus = 'waiting' | 'working' | 'inactive'

export interface PtyCreateArgs {
  id: string
  cwd: string
  continue: boolean
  dangerouslySkipPermissions: boolean
  terminalOnly: boolean
  model?: ModelChoice
  effort?: EffortChoice
}

export interface PlanEntry {
  project: string
  filename: string
  summary: string
}

export interface FreezeEvent {
  timestamp: string
  duration: number
  source: 'main' | 'renderer'
  details?: string
}

export interface ElectronAPI {
  pty: {
    create: (args: PtyCreateArgs) => void
    write: (id: string, data: string) => void
    resize: (id: string, cols: number, rows: number) => void
    kill: (id: string) => void
    onData: (callback: (id: string, data: string) => void) => () => void
    onExit: (callback: (id: string, code: number) => void) => () => void
  }
  projects: {
    list: () => Promise<string[]>
    getDir: () => Promise<string>
  }
  session: {
    save: (state: SessionState) => Promise<void>
    load: () => Promise<SessionState | null>
  }
  memory: {
    list: (projectName: string) => Promise<string[]>
    read: (projectName: string, filename: string) => Promise<string>
    readGlobal: () => Promise<string>
    watch: (projectName: string) => void
    unwatch: (projectName: string) => void
    onChanged: (callback: (projectName: string) => void) => () => void
  }
  plans: {
    list: () => Promise<PlanEntry[]>
    read: (project: string, filename: string) => Promise<string>
  }
  shell: {
    openPath: (dirPath: string) => Promise<string>
    openClaude: () => Promise<void>
  }
  diagnostics: {
    getEvents: () => Promise<FreezeEvent[]>
    reportRendererFreeze: (duration: number) => void
    reportError: (message: string) => void
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
