import { useEffect } from 'react'

interface FileViewerProps {
  title: string
  content: string
  onClose: () => void
}

export default function FileViewer({ title, content, onClose }: FileViewerProps) {
  useEffect(() => {
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
          <span className="file-viewer-title">{title}</span>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <pre className="file-viewer-content">{content}</pre>
      </div>
    </div>
  )
}
