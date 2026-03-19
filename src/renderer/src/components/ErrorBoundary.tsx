import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: string
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: '' }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: `${error.name}: ${error.message}` }
  }

  componentDidCatch(error: Error) {
    const msg = `${error.name}: ${error.message}\n${error.stack || ''}`
    console.error('[ErrorBoundary]', msg)
    try {
      window.electronAPI.diagnostics.reportError(msg.slice(0, 500))
    } catch {
      // diagnostics might not be available
    }
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: '#1a1a2e',
          color: '#e0e0e0',
          fontFamily: 'monospace',
          gap: '20px',
          padding: '40px',
        }}>
          <h1 style={{ color: '#e94560', fontSize: '28px' }}>AgentHub Crash</h1>
          <pre style={{
            background: '#0a0a1a',
            padding: '20px',
            borderRadius: '8px',
            maxWidth: '600px',
            overflow: 'auto',
            fontSize: '14px',
            color: '#ff6b6b',
          }}>
            {this.state.error}
          </pre>
          <p style={{ color: '#888', fontSize: '14px' }}>
            Fehler wurde in diagnostics.log gespeichert.
          </p>
          <button
            onClick={this.handleReload}
            style={{
              padding: '12px 32px',
              background: '#e94560',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '18px',
              cursor: 'pointer',
            }}
          >
            Neu laden
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
