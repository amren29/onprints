'use client'
import { useState, useRef, useEffect, useCallback, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'

type Opt = { value: string; label: string }

interface Props {
  value: string
  onChange: (value: string) => void
  options: (string | Opt)[]
  placeholder?: string
  style?: CSSProperties
  error?: boolean
}

const ChevronDown = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
)

export default function CustomSelect({ value, onChange, options, placeholder = '— Select —', style, error }: Props) {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [mounted, setMounted] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setMounted(true) }, [])

  const normalized: Opt[] = options.map(o => typeof o === 'string' ? { value: o, label: o } : o)
  const selected = normalized.find(o => o.value === value)
  const displayLabel = selected ? selected.label : placeholder
  const isPlaceholder = !selected

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

  // Recalculate position on scroll/resize while open
  useEffect(() => {
    if (!open) return
    const update = () => {
      if (triggerRef.current) setRect(triggerRef.current.getBoundingClientRect())
    }
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => { window.removeEventListener('scroll', update, true); window.removeEventListener('resize', update) }
  }, [open])

  const dropdown = open && rect && mounted ? createPortal(
    <div
      ref={dropRef}
      style={{
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-md)',
        boxShadow: '0 8px 24px rgba(15,23,42,0.14), 0 2px 6px rgba(15,23,42,0.08)',
        zIndex: 9999,
        overflow: 'hidden',
        maxHeight: 224,
        overflowY: 'auto',
      }}
    >
      {normalized.map(opt => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={() => { onChange(opt.value); close() }}
            style={{
              display: 'block',
              width: '100%',
              padding: '8px 12px',
              textAlign: 'left',
              fontSize: 12.5,
              fontFamily: 'var(--font)',
              color: active ? 'var(--accent)' : 'var(--text-primary)',
              background: active ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontWeight: active ? 600 : 400,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg)' }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.background = active ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : 'transparent' }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>,
    document.body
  ) : null

  return (
    <div style={{ position: 'relative', ...style }}>
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
          boxShadow: error ? '0 0 0 2px rgba(239,68,68,0.12)' : 'none',
          borderRadius: 'var(--r-md)',
          outline: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
          transition: 'border-color 0.15s',
          boxSizing: 'border-box',
          textAlign: 'left',
        }}
      >
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayLabel}
        </span>
        <span style={{
          color: 'var(--text-muted)', flexShrink: 0,
          transform: open ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.15s ease',
          display: 'flex', alignItems: 'center',
        }}>
          <ChevronDown />
        </span>
      </button>
      {dropdown}
    </div>
  )
}
