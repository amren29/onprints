'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS   = ['Mo','Tu','We','Th','Fr','Sa','Su']

const CalIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function fmtDisplay(d: Date) {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

interface Props {
  value: string           // YYYY-MM-DD
  onChange: (v: string) => void
  placeholder?: string
  error?: boolean
}

export default function DatePicker({ value, onChange, placeholder = 'Select date', error }: Props) {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [mounted, setMounted] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  const parsed = value ? new Date(value + 'T00:00:00') : null
  const today = new Date()

  const [calYM, setCalYM] = useState(() => {
    const d = parsed || today
    return { year: d.getFullYear(), month: d.getMonth() }
  })

  useEffect(() => { setMounted(true) }, [])

  // Sync calendar view when value changes externally
  useEffect(() => {
    if (parsed) setCalYM({ year: parsed.getFullYear(), month: parsed.getMonth() })
  }, [value])

  const handleOpen = () => {
    if (triggerRef.current) setRect(triggerRef.current.getBoundingClientRect())
    setOpen(o => !o)
  }

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        dropRef.current && !dropRef.current.contains(e.target as Node)
      ) close()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, close])

  useEffect(() => {
    if (!open) return
    const update = () => { if (triggerRef.current) setRect(triggerRef.current.getBoundingClientRect()) }
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => { window.removeEventListener('scroll', update, true); window.removeEventListener('resize', update) }
  }, [open])

  function prevMonth() {
    setCalYM(m => { const d = new Date(m.year, m.month - 1); return { year: d.getFullYear(), month: d.getMonth() } })
  }
  function nextMonth() {
    setCalYM(m => { const d = new Date(m.year, m.month + 1); return { year: d.getFullYear(), month: d.getMonth() } })
  }

  function selectDate(d: Date) {
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    onChange(`${yyyy}-${mm}-${dd}`)
    close()
  }

  function handleClear() {
    onChange('')
    close()
  }

  function handleToday() {
    selectDate(today)
  }

  // Build calendar grid
  const first = new Date(calYM.year, calYM.month, 1)
  const last = new Date(calYM.year, calYM.month + 1, 0)
  const offset = (first.getDay() + 6) % 7
  const cells: (Date | null)[] = []
  for (let i = 0; i < offset; i++) cells.push(null)
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(calYM.year, calYM.month, d))

  const displayLabel = parsed ? fmtDisplay(parsed) : placeholder
  const isPlaceholder = !parsed

  const navBtn: React.CSSProperties = {
    width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 6, border: '1px solid var(--border)', background: 'transparent',
    cursor: 'pointer', fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500,
  }

  const dropdown = open && rect && mounted ? createPortal(
    <div
      ref={dropRef}
      style={{
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: 280,
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
        zIndex: 9999,
        padding: 16,
      }}
    >
      {/* Month navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <button type="button" onClick={prevMonth} style={navBtn}>&#8249;</button>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
          {MONTHS[calYM.month]} {calYM.year}
        </span>
        <button type="button" onClick={nextMonth} style={navBtn}>&#8250;</button>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '1px 0', marginBottom: 2 }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', padding: '3px 0' }}>{d}</div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} />
          const isSel = parsed && sameDay(d, parsed)
          const isTo = sameDay(d, today)
          return (
            <div
              key={d.getDate()}
              onClick={() => selectDate(d)}
              style={{
                textAlign: 'center', fontSize: 12, padding: '6px 2px',
                borderRadius: 6, cursor: 'pointer',
                background: isSel ? 'var(--accent)' : 'transparent',
                color: isSel ? '#fff' : isTo ? 'var(--accent)' : 'var(--text-primary)',
                fontWeight: isSel || isTo ? 600 : 400,
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'var(--bg)' }}
              onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent' }}
            >
              {d.getDate()}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
        <button type="button" onClick={handleClear} style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Clear</button>
        <button type="button" onClick={handleToday} style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Today</button>
      </div>
    </div>,
    document.body
  ) : null

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        style={{
          width: '100%',
          padding: '8px 11px',
          fontSize: 13,
          fontFamily: 'var(--font)',
          color: isPlaceholder ? 'var(--text-muted)' : 'var(--text-primary)',
          background: 'var(--bg)',
          border: `1px solid ${error ? 'var(--negative, #ef4444)' : open ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 'var(--r-md)',
          outline: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          transition: 'border-color 0.15s',
          boxSizing: 'border-box',
          textAlign: 'left',
          boxShadow: error ? '0 0 0 2px rgba(239,68,68,0.12)' : 'none',
        }}
      >
        <span style={{ color: 'var(--text-muted)', flexShrink: 0, display: 'flex', alignItems: 'center' }}><CalIcon /></span>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayLabel}
        </span>
      </button>
      {dropdown}
    </div>
  )
}
