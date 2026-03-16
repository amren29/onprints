'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { PrintSpecs } from '@/types/store'

interface Props {
  imageUrl: string
  printSpecs: PrintSpecs
  isPDF?: boolean
}

const RULER_SIZE = 28
const RULER_BG = '#f8f9fa'
const RULER_TEXT = '#6b7280'
const RULER_TICK = '#d1d5db'
const CANVAS_BG = '#e8e8e8'
const HANDLE_SIZE = 8

// ── Drawing helpers ──────────────────────────────────────────────────────────

function drawRulers(
  ctx: CanvasRenderingContext2D,
  cw: number, ch: number,
  mmToPx: number,
  originX: number, originY: number,
) {
  // Top ruler bg
  ctx.fillStyle = RULER_BG
  ctx.fillRect(0, 0, cw, RULER_SIZE)
  // Left ruler bg
  ctx.fillRect(0, 0, RULER_SIZE, ch)
  // Corner box
  ctx.fillStyle = '#eee'
  ctx.fillRect(0, 0, RULER_SIZE, RULER_SIZE)
  ctx.fillStyle = '#9ca3af'
  ctx.font = '8px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('mm', RULER_SIZE / 2, RULER_SIZE / 2 + 3)

  let majorInterval = 5
  if (mmToPx < 2) majorInterval = 20
  else if (mmToPx < 4) majorInterval = 10

  ctx.strokeStyle = RULER_TICK
  ctx.fillStyle = RULER_TEXT
  ctx.font = '9px system-ui, sans-serif'
  ctx.lineWidth = 0.5

  // Top ruler
  const startMmX = -Math.floor(originX / mmToPx)
  const endMmX = Math.ceil((cw - originX) / mmToPx)
  for (let mm = startMmX; mm <= endMmX; mm++) {
    const px = originX + mm * mmToPx
    if (px < RULER_SIZE || px > cw) continue
    const isMajor = mm % majorInterval === 0
    ctx.beginPath()
    ctx.moveTo(px, RULER_SIZE)
    ctx.lineTo(px, RULER_SIZE - (isMajor ? 12 : 5))
    ctx.stroke()
    if (isMajor) { ctx.textAlign = 'center'; ctx.fillText(String(mm), px, 10) }
  }

  // Left ruler
  const startMmY = -Math.floor(originY / mmToPx)
  const endMmY = Math.ceil((ch - originY) / mmToPx)
  for (let mm = startMmY; mm <= endMmY; mm++) {
    const py = originY + mm * mmToPx
    if (py < RULER_SIZE || py > ch) continue
    const isMajor = mm % majorInterval === 0
    ctx.beginPath()
    ctx.moveTo(RULER_SIZE, py)
    ctx.lineTo(RULER_SIZE - (isMajor ? 12 : 5), py)
    ctx.stroke()
    if (isMajor) {
      ctx.save(); ctx.translate(10, py); ctx.rotate(-Math.PI / 2)
      ctx.textAlign = 'center'; ctx.fillText(String(mm), 0, 0); ctx.restore()
    }
  }

  // Ruler border lines
  ctx.strokeStyle = '#d1d5db'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(RULER_SIZE, 0); ctx.lineTo(RULER_SIZE, ch)
  ctx.moveTo(0, RULER_SIZE); ctx.lineTo(cw, RULER_SIZE)
  ctx.stroke()
}

function drawHandle(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = '#ffffff'
  ctx.strokeStyle = '#374151'
  ctx.lineWidth = 1.5
  ctx.fillRect(x - HANDLE_SIZE / 2, y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE)
  ctx.strokeRect(x - HANDLE_SIZE / 2, y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE)
}

type DragMode = null | 'move' | 'nw' | 'ne' | 'sw' | 'se'

function getHandleAtPoint(
  mx: number, my: number,
  imgX: number, imgY: number, imgW: number, imgH: number,
): DragMode {
  const hs = HANDLE_SIZE + 4 // hit area slightly larger
  const corners: { mode: DragMode; cx: number; cy: number }[] = [
    { mode: 'nw', cx: imgX, cy: imgY },
    { mode: 'ne', cx: imgX + imgW, cy: imgY },
    { mode: 'sw', cx: imgX, cy: imgY + imgH },
    { mode: 'se', cx: imgX + imgW, cy: imgY + imgH },
  ]
  for (const c of corners) {
    if (Math.abs(mx - c.cx) < hs && Math.abs(my - c.cy) < hs) return c.mode
  }
  // Check if inside image
  if (mx >= imgX && mx <= imgX + imgW && my >= imgY && my <= imgY + imgH) return 'move'
  return null
}

function getCursorForMode(mode: DragMode): string {
  if (mode === 'nw' || mode === 'se') return 'nwse-resize'
  if (mode === 'ne' || mode === 'sw') return 'nesw-resize'
  if (mode === 'move') return 'move'
  return 'default'
}

// ── Main component ───────────────────────────────────────────────────────────

export default function ProofingCanvas({ imageUrl, printSpecs, isPDF }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)

  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 600 })
  const [zoom, setZoom] = useState(1)
  const [imgLoaded, setImgLoaded] = useState(0) // counter to force redraw on image load

  // Artwork position & size relative to bleed origin (in px at zoom=1)
  // x,y = offset from bleed top-left as fraction of bleed W/H; w,h = scale factor of bleed W/H
  const [imgFrac, setImgFrac] = useState({ x: 0, y: 0, w: 1, h: 1 })

  const dragRef = useRef<{
    mode: DragMode
    startMx: number; startMy: number
    startFrac: { x: number; y: number; w: number; h: number }
  } | null>(null)

  // ── Undo / Redo history ──
  type FracState = { x: number; y: number; w: number; h: number }
  const historyRef = useRef<FracState[]>([])
  const futureRef = useRef<FracState[]>([])
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const pushHistory = useCallback((prev: FracState) => {
    historyRef.current.push(prev)
    if (historyRef.current.length > 50) historyRef.current.shift()
    futureRef.current = []
    setCanUndo(true)
    setCanRedo(false)
  }, [])

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return
    const prev = historyRef.current.pop()!
    futureRef.current.push({ ...imgFrac })
    setImgFrac(prev)
    setCanUndo(historyRef.current.length > 0)
    setCanRedo(true)
  }, [imgFrac])

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return
    const next = futureRef.current.pop()!
    historyRef.current.push({ ...imgFrac })
    setImgFrac(next)
    setCanUndo(true)
    setCanRedo(futureRef.current.length > 0)
  }, [imgFrac])

  // Layout calculations (memoized-ish)
  const getLayout = useCallback(() => {
    const cw = canvasSize.w
    const ch = canvasSize.h
    const drawW = cw - RULER_SIZE
    const drawH = ch - RULER_SIZE

    const totalWMm = printSpecs.trimWidthMm + printSpecs.bleedMm * 2
    const totalHMm = printSpecs.trimHeightMm + printSpecs.bleedMm * 2
    const mmToPx = Math.min(
      (drawW * 0.7) / totalWMm,
      (drawH * 0.7) / totalHMm
    ) * zoom

    const originX = RULER_SIZE + drawW / 2
    const originY = RULER_SIZE + drawH / 2

    // Bleed rect (outermost)
    const bW = totalWMm * mmToPx
    const bH = totalHMm * mmToPx
    const bX = originX - bW / 2
    const bY = originY - bH / 2

    // Trim rect
    const tW = printSpecs.trimWidthMm * mmToPx
    const tH = printSpecs.trimHeightMm * mmToPx
    const tX = originX - tW / 2
    const tY = originY - tH / 2

    // Safe rect
    const sW = (printSpecs.trimWidthMm - printSpecs.safeAreaMm * 2) * mmToPx
    const sH = (printSpecs.trimHeightMm - printSpecs.safeAreaMm * 2) * mmToPx
    const sX = originX - sW / 2
    const sY = originY - sH / 2

    return { cw, ch, drawW, drawH, mmToPx, originX, originY, bX, bY, bW, bH, tX, tY, tW, tH, sX, sY, sW, sH, totalWMm, totalHMm }
  }, [canvasSize, zoom, printSpecs])

  // Convert imgFrac to pixel rect
  const getImgRect = useCallback(() => {
    const L = getLayout()
    return {
      x: L.bX + imgFrac.x * L.bW,
      y: L.bY + imgFrac.y * L.bH,
      w: imgFrac.w * L.bW,
      h: imgFrac.h * L.bH,
    }
  }, [getLayout, imgFrac])

  // Redraw
  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const img = imgRef.current
    const L = getLayout()

    // Background
    ctx.fillStyle = CANVAS_BG
    ctx.fillRect(0, 0, L.cw, L.ch)

    // Clip to drawing area
    ctx.save()
    ctx.beginPath()
    ctx.rect(RULER_SIZE, RULER_SIZE, L.drawW, L.drawH)
    ctx.clip()

    // White paper (bleed area) with shadow
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.12)'
    ctx.shadowBlur = 16
    ctx.shadowOffsetX = 3
    ctx.shadowOffsetY = 3
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(L.bX, L.bY, L.bW, L.bH)
    ctx.restore()

    // Draw artwork image at its independent position/size
    if (img) {
      const ir = getImgRect()
      ctx.drawImage(img, ir.x, ir.y, ir.w, ir.h)
    }

    // ── Boundary lines (fixed, not moving with artwork) ──

    // Bleed — red dashed
    ctx.save()
    ctx.setLineDash([6, 4])
    ctx.strokeStyle = 'rgba(220,38,38,0.8)'
    ctx.lineWidth = 1.5
    ctx.strokeRect(L.bX, L.bY, L.bW, L.bH)
    ctx.restore()

    // Trim / cut — blue dashed
    ctx.save()
    ctx.setLineDash([8, 4])
    ctx.strokeStyle = 'rgba(37,99,235,0.8)'
    ctx.lineWidth = 1.5
    ctx.strokeRect(L.tX, L.tY, L.tW, L.tH)
    ctx.restore()

    // Safe — green dashed
    ctx.save()
    ctx.setLineDash([5, 5])
    ctx.strokeStyle = 'rgba(22,163,74,0.7)'
    ctx.lineWidth = 1
    ctx.strokeRect(L.sX, L.sY, L.sW, L.sH)
    ctx.restore()

    // ── Resize handles on artwork ──
    if (img) {
      const ir = getImgRect()

      // Thin border around artwork
      ctx.save()
      ctx.setLineDash([])
      ctx.strokeStyle = 'rgba(55,65,81,0.4)'
      ctx.lineWidth = 1
      ctx.strokeRect(ir.x, ir.y, ir.w, ir.h)
      ctx.restore()

      // Delete/close button (top-left corner)
      const btnR = 8
      ctx.save()
      ctx.beginPath()
      ctx.arc(ir.x, ir.y, btnR, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(220,38,38,0.85)'
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 1.5
      const c = 3.5
      ctx.beginPath()
      ctx.moveTo(ir.x - c, ir.y - c); ctx.lineTo(ir.x + c, ir.y + c)
      ctx.moveTo(ir.x + c, ir.y - c); ctx.lineTo(ir.x - c, ir.y + c)
      ctx.stroke()
      ctx.restore()

      // Corner handles
      drawHandle(ctx, ir.x, ir.y)
      drawHandle(ctx, ir.x + ir.w, ir.y)
      drawHandle(ctx, ir.x, ir.y + ir.h)
      drawHandle(ctx, ir.x + ir.w, ir.y + ir.h)
    }

    // Labels below boundary lines
    if (L.bH > 50) {
      ctx.save()
      ctx.font = '10px system-ui, sans-serif'
      ctx.textAlign = 'center'

      // "Safe Line" label below safe zone
      ctx.fillStyle = '#16a34a'
      ctx.fillText('Safe Line', L.sX + L.sW / 2, L.sY + L.sH + 14)

      // "Bleed Size" label below bleed
      ctx.fillStyle = '#dc2626'
      ctx.fillText('Bleed Size', L.bX + L.bW * 0.75, L.bY + L.bH + 14)

      ctx.restore()
    }

    ctx.restore() // un-clip

    // Rulers
    drawRulers(ctx, L.cw, L.ch, L.mmToPx / zoom, L.originX, L.originY)
  }, [getLayout, getImgRect])

  // Reset image position when printSpecs change (size selection)
  useEffect(() => {
    setImgFrac({ x: 0, y: 0, w: 1, h: 1 })
    historyRef.current = []
    futureRef.current = []
    setCanUndo(false)
    setCanRedo(false)
  }, [printSpecs])

  // ── Image loading ──
  useEffect(() => {
    if (!imageUrl || isPDF) {
      imgRef.current = null
      setImgFrac({ x: 0, y: 0, w: 1, h: 1 })
      return
    }
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      setImgFrac({ x: 0, y: 0, w: 1, h: 1 })
      historyRef.current = []
      futureRef.current = []
      setCanUndo(false)
      setCanRedo(false)
      setImgLoaded((n) => n + 1)
    }
    img.src = imageUrl
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl, isPDF])

  // ResizeObserver
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect
        if (width > 0) {
          setCanvasSize({ w: Math.round(width), h: Math.min(Math.round(width * 0.75), 750) })
        }
      }
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  // Keyboard shortcuts: Ctrl+Z / Ctrl+Shift+Z
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo])

  // Redraw on any change
  useEffect(() => { redraw() }, [redraw, canvasSize, zoom, imgFrac, imgLoaded])

  // ── Mouse interactions ──
  const getMousePos = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!imgRef.current) return
    const pos = getMousePos(e)
    const ir = getImgRect()
    const mode = getHandleAtPoint(pos.x, pos.y, ir.x, ir.y, ir.w, ir.h)
    if (!mode) return

    dragRef.current = {
      mode,
      startMx: pos.x,
      startMy: pos.y,
      startFrac: { ...imgFrac },
    }
  }, [getMousePos, getImgRect, imgFrac])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const pos = getMousePos(e)

    // Update cursor
    if (!dragRef.current) {
      if (imgRef.current) {
        const ir = getImgRect()
        const mode = getHandleAtPoint(pos.x, pos.y, ir.x, ir.y, ir.w, ir.h)
        canvas.style.cursor = getCursorForMode(mode)
      }
      return
    }

    const d = dragRef.current
    const L = getLayout()

    const dx = pos.x - d.startMx
    const dy = pos.y - d.startMy
    const fracDx = dx / L.bW
    const fracDy = dy / L.bH

    if (d.mode === 'move') {
      setImgFrac({
        ...d.startFrac,
        x: d.startFrac.x + fracDx,
        y: d.startFrac.y + fracDy,
      })
    } else {
      // Resize from corners
      const sf = d.startFrac
      const aspect = sf.w / sf.h // original aspect ratio
      const shiftHeld = e.shiftKey
      let newX = sf.x, newY = sf.y, newW = sf.w, newH = sf.h

      if (d.mode === 'se') {
        newW = Math.max(0.05, sf.w + fracDx)
        newH = Math.max(0.05, sf.h + fracDy)
        if (shiftHeld) { newH = newW / aspect }
      } else if (d.mode === 'sw') {
        newW = Math.max(0.05, sf.w - fracDx)
        newH = Math.max(0.05, sf.h + fracDy)
        if (shiftHeld) { newH = newW / aspect }
        newX = sf.x + sf.w - newW
      } else if (d.mode === 'ne') {
        newW = Math.max(0.05, sf.w + fracDx)
        newH = Math.max(0.05, sf.h - fracDy)
        if (shiftHeld) { newH = newW / aspect }
        newY = sf.y + sf.h - newH
      } else if (d.mode === 'nw') {
        newW = Math.max(0.05, sf.w - fracDx)
        newH = Math.max(0.05, sf.h - fracDy)
        if (shiftHeld) { newH = newW / aspect }
        newX = sf.x + sf.w - newW
        newY = sf.y + sf.h - newH
      }

      setImgFrac({ x: newX, y: newY, w: newW, h: newH })
    }
  }, [getMousePos, getImgRect, getLayout])

  const handleMouseUp = useCallback(() => {
    if (dragRef.current) {
      const before = dragRef.current.startFrac
      // Only push to history if the position actually changed
      if (before.x !== imgFrac.x || before.y !== imgFrac.y || before.w !== imgFrac.w || before.h !== imgFrac.h) {
        pushHistory(before)
      }
    }
    dragRef.current = null
  }, [imgFrac, pushHistory])

  // Zoom via scroll wheel
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setZoom((z) => Math.min(Math.max(z - e.deltaY * 0.001, 0.3), 5))
  }, [])

  // Touch support
  const touchRef = useRef<{ dist: number; zoom: number } | null>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      touchRef.current = { dist: Math.hypot(dx, dy), zoom }
    } else if (e.touches.length === 1 && imgRef.current) {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height
      const pos = {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      }
      const ir = getImgRect()
      const mode = getHandleAtPoint(pos.x, pos.y, ir.x, ir.y, ir.w, ir.h)
      if (mode) {
        dragRef.current = { mode, startMx: pos.x, startMy: pos.y, startFrac: { ...imgFrac } }
      }
    }
  }, [zoom, getImgRect, imgFrac])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    if (e.touches.length === 2 && touchRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.hypot(dx, dy)
      setZoom(Math.min(Math.max(touchRef.current.zoom * (dist / touchRef.current.dist), 0.3), 5))
    } else if (e.touches.length === 1 && dragRef.current) {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height
      const pos = {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      }
      const d = dragRef.current
      const L = getLayout()
      const fracDx = (pos.x - d.startMx) / L.bW
      const fracDy = (pos.y - d.startMy) / L.bH

      if (d.mode === 'move') {
        setImgFrac({ ...d.startFrac, x: d.startFrac.x + fracDx, y: d.startFrac.y + fracDy })
      } else if (d.mode === 'se') {
        setImgFrac({ ...d.startFrac, w: Math.max(0.05, d.startFrac.w + fracDx), h: Math.max(0.05, d.startFrac.h + fracDy) })
      }
    }
  }, [getLayout])

  const handleTouchEnd = useCallback(() => {
    dragRef.current = null
    touchRef.current = null
  }, [])

  function fitToDesign() {
    setZoom(1)
    setImgFrac({ x: 0, y: 0, w: 1, h: 1 })
  }

  const totalW = printSpecs.trimWidthMm + printSpecs.bleedMm * 2
  const totalH = printSpecs.trimHeightMm + printSpecs.bleedMm * 2

  // Artwork dimensions in mm for display
  const artWMm = (imgFrac.w * totalW).toFixed(1)
  const artHMm = (imgFrac.h * totalH).toFixed(1)

  return (
    <div className="flex flex-col gap-0 w-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-3 py-2 bg-white border border-gray-200 rounded-t-xl text-xs flex-wrap">
        {/* Undo / Redo */}
        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={undo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="px-2 py-1 hover:bg-gray-50 text-gray-600 disabled:text-gray-300 disabled:hover:bg-transparent transition"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
            </svg>
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            title="Redo (Ctrl+Shift+Z)"
            className="px-2 py-1 hover:bg-gray-50 text-gray-600 disabled:text-gray-300 disabled:hover:bg-transparent transition"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
          </button>
        </div>

        <button
          onClick={fitToDesign}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 font-medium transition"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/>
          </svg>
          Fit to design
        </button>
        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
          <button onClick={() => setZoom((z) => Math.max(z - 0.25, 0.3))} className="px-2 py-1 hover:bg-gray-50 text-gray-600 font-bold">−</button>
          <input
            type="range"
            min="30"
            max="500"
            value={Math.round(zoom * 100)}
            onChange={(e) => setZoom(Number(e.target.value) / 100)}
            className="w-20 h-4 accent-accent mx-1"
          />
          <button onClick={() => setZoom((z) => Math.min(z + 0.25, 5))} className="px-2 py-1 hover:bg-gray-50 text-gray-600 font-bold">+</button>
        </div>
        <span className="text-gray-500 tabular-nums">{Math.round(zoom * 100)}%</span>
        <div className="ml-auto flex items-center gap-3 text-gray-500">
          <span>W :{artWMm}</span>
          <span>H :{artHMm}</span>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="relative overflow-hidden border-x border-b border-gray-200 rounded-b-xl w-full"
        style={{ background: CANVAS_BG }}
      >
        {isPDF && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-gray-100/90" style={{ left: RULER_SIZE, top: RULER_SIZE }}>
            <div className="text-4xl mb-3">📄</div>
            <p className="text-sm font-semibold text-gray-700">PDF uploaded</p>
            <p className="text-xs text-gray-500 mt-1">Preview not available — boundary lines shown on placeholder</p>
          </div>
        )}
        <canvas
          ref={canvasRef}
          width={canvasSize.w}
          height={canvasSize.h}
          className="block w-full touch-none"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
      </div>
    </div>
  )
}
