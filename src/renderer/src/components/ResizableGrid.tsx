import { useState, useEffect, useCallback, useRef, type ReactElement, type ReactNode } from 'react'

interface ResizableGridProps {
  children: ReactNode[]
  resetKey?: number
  onSwapPanels?: (fromIndex: number, toIndex: number) => void
  focusMode?: boolean
  focusedPanelId?: string | null
}

export default function ResizableGrid({ children, resetKey, onSwapPanels, focusMode, focusedPanelId }: ResizableGridProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [colWidths, setColWidths] = useState<number[]>([1])
  const [rowHeights, setRowHeights] = useState<number[]>([1])
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const dragSourceIndex = useRef<number | null>(null)

  const count = children.length
  const isResizable = count >= 2

  let cols: number
  if (count <= 1) cols = 1
  else if (count <= 4) cols = 2
  else if (count <= 9) cols = 3
  else cols = 4
  const rows = Math.ceil(count / cols)

  // Reset weights when layout changes
  useEffect(() => {
    setColWidths(Array(cols).fill(1))
    setRowHeights(Array(rows).fill(1))
  }, [cols, rows, resetKey])

  // Build grid template: [1fr 6px 1fr 6px 1fr]
  const buildTemplate = (weights: number[], expected: number) => {
    const w = weights.length === expected ? weights : Array(expected).fill(1)
    if (w.length === 1) return `${w[0]}fr`
    return w.map(v => `${v}fr`).join(' 6px ')
  }

  const gridTemplateColumns = buildTemplate(colWidths, cols)
  const gridTemplateRows = buildTemplate(rowHeights, rows)

  // --- Drag handlers ---

  const startColDividerDrag = useCallback((e: React.MouseEvent, d: number) => {
    e.preventDefault()
    const startX = e.clientX
    const startW = [...colWidths]
    const total = startW.reduce((a, b) => a + b, 0)

    const onMove = (ev: MouseEvent) => {
      if (!containerRef.current) return
      const delta = ((ev.clientX - startX) / containerRef.current.offsetWidth) * total
      const left = startW[d] + delta
      const right = startW[d + 1] - delta
      if (left >= 0.15 && right >= 0.15) {
        const nw = [...startW]
        nw[d] = left
        nw[d + 1] = right
        setColWidths(nw)
      }
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [colWidths])

  const startRowDividerDrag = useCallback((e: React.MouseEvent, r: number) => {
    e.preventDefault()
    const startY = e.clientY
    const startH = [...rowHeights]
    const total = startH.reduce((a, b) => a + b, 0)

    const onMove = (ev: MouseEvent) => {
      if (!containerRef.current) return
      const delta = ((ev.clientY - startY) / containerRef.current.offsetHeight) * total
      const top = startH[r] + delta
      const bot = startH[r + 1] - delta
      if (top >= 0.15 && bot >= 0.15) {
        const nh = [...startH]
        nh[r] = top
        nh[r + 1] = bot
        setRowHeights(nh)
      }
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [rowHeights])

  const startIntersectionDrag = useCallback((e: React.MouseEvent, colIdx: number, rowIdx: number) => {
    e.preventDefault()
    const startX = e.clientX
    const startY = e.clientY
    const startW = [...colWidths]
    const startH = [...rowHeights]
    const totalW = startW.reduce((a, b) => a + b, 0)
    const totalH = startH.reduce((a, b) => a + b, 0)

    const onMove = (ev: MouseEvent) => {
      if (!containerRef.current) return
      const dx = ((ev.clientX - startX) / containerRef.current.offsetWidth) * totalW
      const dy = ((ev.clientY - startY) / containerRef.current.offsetHeight) * totalH

      const nwL = startW[colIdx] + dx
      const nwR = startW[colIdx + 1] - dx
      if (nwL >= 0.15 && nwR >= 0.15) {
        const nw = [...startW]
        nw[colIdx] = nwL
        nw[colIdx + 1] = nwR
        setColWidths(nw)
      }

      const nhT = startH[rowIdx] + dy
      const nhB = startH[rowIdx + 1] - dy
      if (nhT >= 0.15 && nhB >= 0.15) {
        const nh = [...startH]
        nh[rowIdx] = nhT
        nh[rowIdx + 1] = nhB
        setRowHeights(nh)
      }
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.body.style.cursor = 'move'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [colWidths, rowHeights])

  // --- Cell positioning ---

  const cellStyle = (index: number): React.CSSProperties => {
    const col = index % cols
    const row = Math.floor(index / cols)
    const gridColumn = cols === 1 ? 1 : col * 2 + 1
    const gridRow = rows === 1 ? 1 : row * 2 + 1

    // Last panel in incomplete row: span to end
    if (index === count - 1 && count % cols !== 0) {
      return { gridColumn: `${gridColumn} / -1`, gridRow }
    }
    return { gridColumn, gridRow }
  }

  // --- Spanning logic for column dividers ---

  const hasSpanning = count % cols !== 0
  const lastPanelCol = (count - 1) % cols // column where last (spanning) panel starts

  // Column divider d: does it extend into the last row?
  const colDividerExtendsToLastRow = (d: number) => !hasSpanning || d < lastPanelCol

  // --- Drag-to-swap ---

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, toIndex: number) => {
    e.preventDefault()
    setDragOverIndex(null)
    const fromIndex = dragSourceIndex.current
    if (fromIndex !== null && fromIndex !== toIndex && onSwapPanels) {
      onSwapPanels(fromIndex, toIndex)
    }
    dragSourceIndex.current = null
  }, [onSwapPanels])

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    dragSourceIndex.current = index
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
    const cell = (e.target as HTMLElement).closest('.grid-cell') as HTMLElement
    if (cell) {
      requestAnimationFrame(() => cell.classList.add('grid-cell-dragging'))
    }
  }, [])

  const handleDragEnd = useCallback(() => {
    setDragOverIndex(null)
    dragSourceIndex.current = null
    containerRef.current?.querySelectorAll('.grid-cell-dragging').forEach((el) => {
      el.classList.remove('grid-cell-dragging')
    })
  }, [])

  return (
    <div
      ref={containerRef}
      className={`resizable-grid${focusMode ? ' resizable-grid-focus' : ''}`}
      style={focusMode ? undefined : { gridTemplateColumns, gridTemplateRows }}
      onDragEnd={focusMode ? undefined : handleDragEnd}
    >
      {/* Panel cells */}
      {children.map((child, i) => {
        const childKey = (child as ReactElement)?.key ?? i
        const isFocused = focusMode && String(childKey) === focusedPanelId

        return (
          <div
            key={childKey}
            className={`grid-cell${!focusMode && dragOverIndex === i && dragSourceIndex.current !== i ? ' grid-cell-drop-target' : ''}`}
            style={focusMode
              ? {
                  position: 'absolute' as const,
                  top: 0, left: 0, right: 0, bottom: 0,
                  visibility: (isFocused ? 'visible' : 'hidden') as 'visible' | 'hidden',
                  zIndex: isFocused ? 1 : 0,
                }
              : cellStyle(i)}
            onDragStart={focusMode ? undefined : (e) => handleDragStart(e, i)}
            onDragOver={focusMode ? undefined : (e) => handleDragOver(e, i)}
            onDragLeave={focusMode ? undefined : handleDragLeave}
            onDrop={focusMode ? undefined : (e) => handleDrop(e, i)}
            data-grid-index={i}
          >
            {child}
          </div>
        )
      })}

      {/* Column dividers */}
      {!focusMode && isResizable && cols > 1 && Array.from({ length: cols - 1 }, (_, d) => {
        const gridCol = (d + 1) * 2
        const extendsToEnd = colDividerExtendsToLastRow(d)
        const gridRow = rows === 1
          ? '1'
          : extendsToEnd
            ? '1 / -1'
            : `1 / ${(rows - 1) * 2 + 1}`
        return (
          <div
            key={`col-div-${d}`}
            className="grid-divider grid-divider-col"
            style={{ gridColumn: gridCol, gridRow }}
            onMouseDown={(e) => startColDividerDrag(e, d)}
          />
        )
      })}

      {/* Row dividers */}
      {!focusMode && isResizable && rows > 1 && Array.from({ length: rows - 1 }, (_, r) => (
        <div
          key={`row-div-${r}`}
          className="grid-divider grid-divider-row"
          style={{ gridRow: (r + 1) * 2, gridColumn: '1 / -1' }}
          onMouseDown={(e) => startRowDividerDrag(e, r)}
        />
      ))}

      {/* Intersection handles (balls at crossings) */}
      {!focusMode && isResizable && cols > 1 && rows > 1 && Array.from({ length: cols - 1 }, (_, d) =>
        Array.from({ length: rows - 1 }, (_, r) => (
          <div
            key={`int-${d}-${r}`}
            className="grid-center-handle"
            style={{ gridColumn: (d + 1) * 2, gridRow: (r + 1) * 2 }}
            onMouseDown={(e) => startIntersectionDrag(e, d, r)}
          />
        ))
      )}
    </div>
  )
}
