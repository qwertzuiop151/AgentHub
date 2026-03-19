const FREEZE_THRESHOLD_MS = 2000

let lastTick = Date.now()
let interval: ReturnType<typeof setInterval> | null = null
let toastTimeout: ReturnType<typeof setTimeout> | null = null

function showToast(message: string, color = 'rgba(233, 69, 96, 0.9)') {
  const existing = document.getElementById('freeze-toast')
  if (existing) existing.remove()
  if (toastTimeout) clearTimeout(toastTimeout)

  const toast = document.createElement('div')
  toast.id = 'freeze-toast'
  toast.className = 'freeze-toast'
  toast.style.background = color
  toast.textContent = message
  document.body.appendChild(toast)

  toastTimeout = setTimeout(() => {
    toast.classList.add('freeze-toast-fade')
    setTimeout(() => toast.remove(), 500)
  }, 4000)
}

export function startRendererWatchdog() {
  lastTick = Date.now()
  interval = setInterval(() => {
    const now = Date.now()
    const delta = now - lastTick
    if (delta > FREEZE_THRESHOLD_MS) {
      console.warn(`[Diagnostics] Renderer freeze: ${delta}ms`)
      window.electronAPI.diagnostics.reportRendererFreeze(delta)
      showToast(`UI war ${(delta / 1000).toFixed(1)}s blockiert`)
    }
    lastTick = now
  }, 1000)

  // Catch unhandled errors
  window.addEventListener('error', (event) => {
    const msg = `${event.message} (${event.filename}:${event.lineno})`
    console.error('[Diagnostics] Unhandled error:', msg)
    window.electronAPI.diagnostics.reportError(msg)
    showToast(`Error: ${event.message}`, 'rgba(200, 50, 50, 0.95)')
  })

  window.addEventListener('unhandledrejection', (event) => {
    const msg = `Unhandled rejection: ${event.reason}`
    console.error('[Diagnostics] Unhandled rejection:', msg)
    window.electronAPI.diagnostics.reportError(msg)
    showToast(`Error: ${msg}`, 'rgba(200, 50, 50, 0.95)')
  })
}

export function stopRendererWatchdog() {
  if (interval) {
    clearInterval(interval)
    interval = null
  }
}
