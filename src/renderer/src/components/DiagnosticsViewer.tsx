import { useState, useEffect } from 'react'
import type { FreezeEvent } from '../../../shared/types'

interface DiagnosticsViewerProps {
  onClose: () => void
}

export default function DiagnosticsViewer({ onClose }: DiagnosticsViewerProps) {
  const [events, setEvents] = useState<FreezeEvent[]>([])

  useEffect(() => {
    window.electronAPI.diagnostics.getEvents().then(setEvents)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="file-viewer" onClick={(e) => e.stopPropagation()}>
        <div className="file-viewer-header">
          <span className="file-viewer-title">Diagnostics — Freeze Events</span>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="file-viewer-content diagnostics-list">
          {events.length === 0 ? (
            <p style={{ color: '#666' }}>Keine Freeze-Events aufgezeichnet.</p>
          ) : (
            <table className="diagnostics-table">
              <thead>
                <tr>
                  <th>Zeit</th>
                  <th>Quelle</th>
                  <th>Dauer</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {events.slice().reverse().map((ev, i) => (
                  <tr key={i}>
                    <td>{ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : '—'}</td>
                    <td className={`diag-source-${ev.source}`}>{ev.source}</td>
                    <td>{ev.duration}ms</td>
                    <td>{ev.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
