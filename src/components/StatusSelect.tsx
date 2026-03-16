'use client'

import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'

const STATUS_BADGE: Record<string, string> = {
  // Order
  Pending:   'badge badge-warning',
  Confirmed: 'badge badge-info',
  Cancelled: 'badge badge-pending',
  // Agent / Customer
  Active:    'badge badge-success',
  Suspended: 'badge badge-warning',
  Inactive:  'badge badge-pending',
  VIP:       'badge badge-success',
  'At Risk': 'badge badge-warning',
  // Payment
  Captured:  'badge badge-success',
  Failed:    'badge badge-danger',
  // Membership
  pending:   'badge badge-warning',
  approved:  'badge badge-success',
  rejected:  'badge badge-danger',
  suspended: 'badge badge-warning',
  inactive:  'badge badge-danger',
}

interface Props {
  value: string
  onChange: (value: string) => void
  options: string[]
}

export default function StatusSelect({ value, onChange, options }: Props) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const [rect, setRect] = useState<DOMRect | null>(null)

  const badgeCls = STATUS_BADGE[value] || 'badge badge-pending'
  const label = value.charAt(0).toUpperCase() + value.slice(1)

  const toggle = () => {
    if (!open && btnRef.current) setRect(btnRef.current.getBoundingClientRect())
    setOpen(o => !o)
  }

  return (
    <div style={{ display: 'inline-block' }} onClick={e => e.stopPropagation()}>
      <button
        ref={btnRef}
        onClick={toggle}
        className={badgeCls}
        style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, border: open ? '1.5px solid var(--accent)' : undefined }}
      >
        {label}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && rect && typeof document !== 'undefined' && createPortal(
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'fixed', top: rect.bottom + 4, left: rect.right - 130, zIndex: 9999,
            background: 'var(--bg-card, #fff)', border: '1px solid var(--border)', borderRadius: 'var(--r-md, 8px)',
            boxShadow: '0 8px 24px rgba(15,23,42,0.14), 0 2px 6px rgba(15,23,42,0.08)', minWidth: 130, overflow: 'hidden',
          }}>
            {options.map(s => {
              const optLabel = s.charAt(0).toUpperCase() + s.slice(1)
              return (
                <button
                  key={s}
                  onClick={() => { onChange(s); setOpen(false) }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px',
                    fontSize: 12.5, fontWeight: value === s ? 600 : 400,
                    color: value === s ? 'var(--accent)' : 'var(--text-primary)',
                    background: value === s ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : 'none',
                    border: 'none', cursor: 'pointer', fontFamily: 'var(--font)',
                  }}
                  onMouseEnter={e => { if (value !== s) e.currentTarget.style.background = 'color-mix(in srgb, var(--text-primary) 8%, transparent)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = value === s ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : 'none' }}
                >
                  {optLabel}
                </button>
              )
            })}
          </div>
        </>,
        document.body
      )}
    </div>
  )
}
