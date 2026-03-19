import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import type { FreezeEvent } from '../shared/types'

const FREEZE_THRESHOLD_MS = 2000
const MAX_EVENTS = 100

class Diagnostics {
  private logPath: string
  private events: FreezeEvent[] = []
  private lastTick = Date.now()
  private interval: ReturnType<typeof setInterval> | null = null

  constructor() {
    const userDataPath = app.getPath('userData')
    this.logPath = path.join(userDataPath, 'diagnostics.log')
    this.loadEvents()
  }

  start() {
    this.lastTick = Date.now()
    this.interval = setInterval(() => {
      const now = Date.now()
      const delta = now - this.lastTick
      if (delta > FREEZE_THRESHOLD_MS) {
        const event: FreezeEvent = {
          timestamp: new Date(now).toISOString(),
          duration: Math.round(delta),
          source: 'main',
          details: `Event loop blocked for ${Math.round(delta)}ms`,
        }
        this.addEvent(event)
        console.warn(`[Diagnostics] Main process freeze detected: ${delta}ms`)
      }
      this.lastTick = now
    }, 1000)
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
  }

  reportRendererFreeze(duration: number) {
    const event: FreezeEvent = {
      timestamp: new Date().toISOString(),
      duration: Math.round(duration),
      source: 'renderer',
      details: `Renderer blocked for ${Math.round(duration)}ms`,
    }
    this.addEvent(event)
    console.warn(`[Diagnostics] Renderer freeze detected: ${duration}ms`)
  }

  reportError(message: string) {
    const event: FreezeEvent = {
      timestamp: new Date().toISOString(),
      duration: 0,
      source: 'renderer',
      details: `ERROR: ${message}`,
    }
    this.addEvent(event)
    console.error(`[Diagnostics] Renderer error: ${message}`)
  }

  reportCrash(source: 'main' | 'renderer', message: string, stack?: string) {
    const details = stack ? `CRASH: ${message}\n${stack}` : `CRASH: ${message}`
    const event: FreezeEvent = {
      timestamp: new Date().toISOString(),
      duration: 0,
      source,
      details,
    }
    this.addEvent(event)
    // Crash-Logs auch synchron schreiben (Prozess könnte gleich sterben)
    const line = `[${event.timestamp}] ${source.toUpperCase()} crash — ${message}\n${stack ? stack + '\n' : ''}`
    try {
      fs.appendFileSync(this.logPath, line, 'utf-8')
    } catch { /* last resort */ }
  }

  getEvents(): FreezeEvent[] {
    return [...this.events]
  }

  private addEvent(event: FreezeEvent) {
    this.events.push(event)
    if (this.events.length > MAX_EVENTS) {
      this.events = this.events.slice(-MAX_EVENTS)
    }
    this.appendToLog(event)
  }

  private async appendToLog(event: FreezeEvent) {
    const isError = event.details?.startsWith('ERROR:')
    const line = isError
      ? `[${event.timestamp}] ${event.source.toUpperCase()} error — ${event.details}\n`
      : `[${event.timestamp}] ${event.source.toUpperCase()} freeze: ${event.duration}ms — ${event.details}\n`
    try {
      await fs.promises.appendFile(this.logPath, line, 'utf-8')
    } catch (err) {
      console.error('[Diagnostics] Failed to write log:', err)
    }
  }

  private async loadEvents() {
    try {
      await fs.promises.access(this.logPath)
      const data = await fs.promises.readFile(this.logPath, 'utf-8')
      const lines = data.trim().split('\n').filter(Boolean)
      this.events = lines.slice(-MAX_EVENTS).map((line) => {
        const match = line.match(/^\[(.+?)\] (MAIN|RENDERER) freeze: (\d+)ms — (.+)$/)
        if (match) {
          return {
            timestamp: match[1],
            duration: parseInt(match[2] === 'MAIN' ? match[3] : match[3]),
            source: match[2].toLowerCase() as 'main' | 'renderer',
            details: match[4],
          }
        }
        return { timestamp: '', duration: 0, source: 'main' as const, details: line }
      })
    } catch {
      // No log file yet
    }
  }
}

export const diagnostics = new Diagnostics()
