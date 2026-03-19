import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import type { SessionState } from '../shared/types'

export class SessionStore {
  private filePath: string
  private saveTimer: ReturnType<typeof setTimeout> | null = null
  private pendingState: SessionState | null = null

  constructor() {
    const userDataPath = app.getPath('userData')
    this.filePath = path.join(userDataPath, 'session.json')
  }

  save(state: SessionState): void {
    this.pendingState = state
    if (this.saveTimer) return
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null
      if (this.pendingState) {
        this.flush(this.pendingState)
        this.pendingState = null
      }
    }, 500)
  }

  private async flush(state: SessionState): Promise<void> {
    try {
      await fs.promises.writeFile(this.filePath, JSON.stringify(state, null, 2), 'utf-8')
    } catch (err) {
      console.error('Failed to save session:', err)
    }
  }

  async load(): Promise<SessionState | null> {
    try {
      try {
        await fs.promises.access(this.filePath)
      } catch {
        return null
      }
      const data = await fs.promises.readFile(this.filePath, 'utf-8')
      return JSON.parse(data) as SessionState
    } catch (err) {
      console.error('Failed to load session:', err)
      return null
    }
  }
}
