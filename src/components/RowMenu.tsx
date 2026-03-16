'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

export type RowMenuItem = {
  label: string
  action: () => void
  danger?: boolean
}

const DotsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>
  </svg>
)

export default function RowMenu({ items }: { items: RowMenuItem[] }) {
  const [open, setOpen]       = useState(false)
  const [rect, setRect]       = useState<DOMRect | null>(null)
  const [mounted, setMounted] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef    = useRef<HTMLDivElement>(null)

  useEffect(() => { setMounted(true) }, [])

  const close = useCallback(() => setOpen(false), [])

  const handleOpen = () => {
    if (triggerRef.current) setRect(triggerRef.current.getBoundingClientRect())
    setOpen(o => !o)
  }

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) return
      close()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, close])

  const menuStyle = (): React.CSSProperties => {
    if (!rect) return {}
    const approxHeight = items.length * 38 + 8
    const spaceBelow   = window.innerHeight - rect.bottom
    const openUp       = spaceBelow < approxHeight + 8
    return {
      position: 'fixed',
      left:  rect.right - 148,
      width: 148,
      ...(openUp
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
      zIndex: 9999,
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      boxShadow: '0 8px 24px rgba(15,23,42,0.12)',
      overflow: 'hidden',
    }
  }

  const dropdown = open && rect && mounted ? createPortal(
    <div ref={menuRef} style={menuStyle()}>
      {items.map(item => (
        <button
          key={item.label}
          type="button"
          onClick={() => { item.action(); close() }}
          style={{
            display: 'block', width: '100%', padding: '9px 16px',
            textAlign: 'left', fontSize: 13, fontFamily: 'var(--font)',
            color: item.danger ? 'var(--negative)' : 'var(--text-primary)',
            background: 'transparent', border: 'none', cursor: 'pointer',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          {item.label}
        </button>
      ))}
    </div>,
    document.body
  ) : null

  return (
    <>
      <button ref={triggerRef} type="button" className="btn-ghost" onClick={handleOpen}>
        <DotsIcon />
      </button>
      {dropdown}
    </>
  )
}
