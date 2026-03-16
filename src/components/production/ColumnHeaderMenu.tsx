'use client'
import { useRef, useEffect } from 'react'

interface Props {
  columnId: string
  columnName: string
  isLocked: boolean   // true for production board columns
  onRename: () => void
  onDelete: () => void
  onPermissions: () => void
  onClose: () => void
}

export default function ColumnHeaderMenu({ isLocked, onRename, onDelete, onPermissions, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const btnStyle = (danger = false): React.CSSProperties => ({
    display: 'block', width: '100%', textAlign: 'left',
    fontSize: 13, padding: '6px 12px', borderRadius: 4,
    border: 'none', cursor: isLocked ? 'not-allowed' : 'pointer',
    background: 'transparent',
    color: danger ? '#ef4444' : 'var(--text-primary)',
    opacity: isLocked ? 0.4 : 1,
    fontFamily: 'var(--font)',
  })

  return (
    <div ref={ref} style={{
      position: 'absolute', top: '100%', right: 0, marginTop: 4,
      background: 'var(--bg-card)', borderRadius: 8,
      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
      border: '1px solid var(--border)', zIndex: 100,
      minWidth: 160, padding: 4,
    }}>
      <button style={btnStyle()} disabled={isLocked} onClick={() => { if (!isLocked) { onRename(); onClose() } }}>
        Rename column
      </button>
      <button style={btnStyle()} disabled={isLocked} onClick={() => { if (!isLocked) { onPermissions(); onClose() } }}>
        Set visibility
      </button>
      <div style={{ height: 1, background: 'var(--border)', margin: '4px 8px' }} />
      <button style={btnStyle(true)} disabled={isLocked} onClick={() => { if (!isLocked) { onDelete(); onClose() } }}>
        Delete column
      </button>
    </div>
  )
}
