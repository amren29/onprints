'use client'

import { useState, type ReactNode } from 'react'

export type BulkAction = {
  label: string
  icon?: ReactNode
  action: () => void
  danger?: boolean
}

type Props = {
  count: number
  total: number
  onDeselectAll: () => void
  actions: BulkAction[]
}

/* ── Icons ────────────────────────────────────────── */
const CloseIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)

export default function BulkActionBar({ count, total, onDeselectAll, actions }: Props) {
  if (count === 0) return null

  return (
    <div style={{
      position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
      zIndex: 900,
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 16px 10px 20px',
      background: 'var(--bg-card, #fff)',
      border: '1px solid var(--border, #e5e7eb)',
      borderRadius: 14,
      boxShadow: '0 8px 40px rgba(15,23,42,0.14), 0 2px 8px rgba(15,23,42,0.06)',
      fontFamily: 'var(--font)',
      animation: 'bulkBarIn 0.2s ease',
    }}>
      {/* Count */}
      <span style={{
        fontSize: 13, fontWeight: 600,
        color: 'var(--accent, #006AFF)',
        whiteSpace: 'nowrap',
      }}>
        {count} of {total} selected
      </span>

      {/* Divider */}
      <div style={{ width: 1, height: 24, background: 'var(--border, #e5e7eb)' }} />

      {/* Actions */}
      {actions.map((a, i) => (
        <button
          key={i}
          onClick={a.action}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 8,
            fontSize: 12.5, fontWeight: 500,
            fontFamily: 'var(--font)',
            background: a.danger ? 'rgba(239,68,68,0.08)' : 'var(--bg, #f0f0f3)',
            color: a.danger ? '#ef4444' : 'var(--text-primary)',
            border: `1px solid ${a.danger ? 'rgba(239,68,68,0.2)' : 'var(--border, #e5e7eb)'}`,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'background 0.15s, border-color 0.15s',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget
            el.style.background = a.danger ? 'rgba(239,68,68,0.15)' : 'var(--bg-card, #fff)'
            el.style.borderColor = a.danger ? '#ef4444' : 'var(--accent, #006AFF)'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget
            el.style.background = a.danger ? 'rgba(239,68,68,0.08)' : 'var(--bg, #f0f0f3)'
            el.style.borderColor = a.danger ? 'rgba(239,68,68,0.2)' : 'var(--border, #e5e7eb)'
          }}
        >
          {a.icon}
          {a.label}
        </button>
      ))}

      {/* Divider */}
      <div style={{ width: 1, height: 24, background: 'var(--border, #e5e7eb)' }} />

      {/* Deselect */}
      <button
        onClick={onDeselectAll}
        title="Deselect all"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 28, height: 28, borderRadius: 6,
          background: 'transparent', border: 'none',
          color: 'var(--text-muted)', cursor: 'pointer',
          transition: 'background 0.15s, color 0.15s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'var(--bg, #f0f0f3)'
          e.currentTarget.style.color = 'var(--text-primary)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = 'var(--text-muted)'
        }}
      >
        <CloseIcon />
      </button>
    </div>
  )
}

/* ── Selection hook ──────────────────────────────── */
export function useBulkSelect<T extends { id: string }>(paged: T[], filtered: T[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDelOpen, setBulkDelOpen] = useState(false)

  const toggleSelect = (id: string) =>
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const allPageSelected = paged.length > 0 && paged.every(x => selectedIds.has(x.id))
  const somePageSelected = paged.some(x => selectedIds.has(x.id))

  const toggleAll = () => {
    if (allPageSelected) {
      setSelectedIds(prev => { const n = new Set(prev); paged.forEach(x => n.delete(x.id)); return n })
    } else {
      setSelectedIds(prev => { const n = new Set(prev); paged.forEach(x => n.add(x.id)); return n })
    }
  }

  const selectedItems = filtered.filter(x => selectedIds.has(x.id))
  const clearSelection = () => setSelectedIds(new Set())

  return { selectedIds, toggleSelect, allPageSelected, somePageSelected, toggleAll, selectedItems, clearSelection, bulkDelOpen, setBulkDelOpen }
}

/* ── Checkbox helper ─────────────────────────────── */
export function BulkCheckbox({ checked, indeterminate, onChange, style }: {
  checked: boolean
  indeterminate?: boolean
  onChange: () => void
  style?: React.CSSProperties
}) {
  return (
    <div
      onClick={e => { e.stopPropagation(); onChange() }}
      style={{
        width: 18, height: 18, borderRadius: 5,
        border: `1.5px solid ${checked || indeterminate ? 'var(--accent, #006AFF)' : 'var(--border, #d1d5db)'}`,
        background: checked || indeterminate ? 'var(--accent, #006AFF)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        flexShrink: 0,
        ...style,
      }}
    >
      {checked && (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      )}
      {indeterminate && !checked && (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      )}
    </div>
  )
}
