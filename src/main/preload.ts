import { contextBridge, ipcRenderer } from 'electron'
import type { PtyCreateArgs, SessionState, FreezeEvent, PlanEntry } from '../shared/types'

const api = {
  pty: {
    create: (args: PtyCreateArgs) => ipcRenderer.send('pty:create', args),
    write: (id: string, data: string) => ipcRenderer.send('pty:write', id, data),
    resize: (id: string, cols: number, rows: number) => ipcRenderer.send('pty:resize', id, cols, rows),
    kill: (id: string) => ipcRenderer.send('pty:kill', id),
    onData: (callback: (id: string, data: string) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, id: string, data: string) => callback(id, data)
      ipcRenderer.on('pty:data', handler)
      return () => ipcRenderer.removeListener('pty:data', handler)
    },
    onExit: (callback: (id: string, code: number) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, id: string, code: number) => callback(id, code)
      ipcRenderer.on('pty:exit', handler)
      return () => ipcRenderer.removeListener('pty:exit', handler)
    },
  },
  projects: {
    list: () => ipcRenderer.invoke('projects:list') as Promise<string[]>,
    getDir: () => ipcRenderer.invoke('projects:getDir') as Promise<string>,
  },
  session: {
    save: (state: SessionState) => ipcRenderer.invoke('session:save', state) as Promise<void>,
    load: () => ipcRenderer.invoke('session:load') as Promise<SessionState | null>,
  },
  memory: {
    list: (projectName: string) => ipcRenderer.invoke('memory:list', projectName) as Promise<string[]>,
    read: (projectName: string, filename: string) => ipcRenderer.invoke('memory:read', projectName, filename) as Promise<string>,
    readGlobal: () => ipcRenderer.invoke('memory:readGlobal') as Promise<string>,
    watch: (projectName: string) => ipcRenderer.send('memory:watch', projectName),
    unwatch: (projectName: string) => ipcRenderer.send('memory:unwatch', projectName),
    onChanged: (callback: (projectName: string) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, projectName: string) => callback(projectName)
      ipcRenderer.on('memory:changed', handler)
      return () => ipcRenderer.removeListener('memory:changed', handler)
    },
  },
  plans: {
    list: () => ipcRenderer.invoke('plans:list') as Promise<PlanEntry[]>,
    read: (project: string, filename: string) => ipcRenderer.invoke('plans:read', project, filename) as Promise<string>,
  },
  shell: {
    openPath: (dirPath: string) => ipcRenderer.invoke('shell:openPath', dirPath) as Promise<string>,
    openClaude: () => ipcRenderer.invoke('shell:openClaude') as Promise<void>,
  },
  diagnostics: {
    getEvents: () => ipcRenderer.invoke('diagnostics:getEvents') as Promise<FreezeEvent[]>,
    reportRendererFreeze: (duration: number) => ipcRenderer.send('diagnostics:rendererFreeze', duration),
    reportError: (message: string) => ipcRenderer.send('diagnostics:error', message),
  },
}

contextBridge.exposeInMainWorld('electronAPI', api)
