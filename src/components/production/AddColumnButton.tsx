'use client'
import { useState, useRef, useEffect } from 'react'

interface Props {
  onAdd: (name: string) => void
}

export default function AddColumnButton({ onAdd }: Props) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (open) inputRef.current?.focus() }, [open])

  function submit() {
    const trimmed = name.trim()
    if (trimmed) { onAdd(trimmed); setName(''); setOpen(false) }
  }

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 14px', borderRadius: 10,
        border: '2px dashed var(--border-strong)',
        background: 'transparent', cursor: 'pointer',
        fontSize: 12, fontWeight: 500, color: 'var(--text-muted)',
        whiteSpace: 'nowrap', transition: 'all 0.15s',
        fontFamily: 'var(--font)', minWidth: 140,
      }}
    >
      + Add column
    </button>
  )

  return (
    <div style={{
      background: 'var(--bg-card)', borderRadius: 10,
      border: '1px solid var(--border)', padding: 10,
      minWidth: 200, display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <input
        ref={inputRef}
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') { setOpen(false); setName('') } }}
        placeholder="Column name…"
        style={{
          width: '100%', padding: '6px 8px', borderRadius: 6,
          border: '1px solid var(--border)', background: 'var(--bg)',
          fontSize: 12, color: 'var(--text-primary)', fontFamily: 'var(--font)',
          outline: 'none',
        }}
      />
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={submit} style={{ flex: 1, padding: '4px 0', borderRadius: 6, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font)' }}>
          Add
        </button>
        <button onClick={() => { setOpen(false); setName('') }} style={{ flex: 1, padding: '4px 0', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)' }}>
          Cancel
        </button>
      </div>
    </div>
  )
}
