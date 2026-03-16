'use client'

import { useRef, useState } from 'react'
import { type PageSection, SECTION_REGISTRY } from '@/lib/store-builder'

const GripIcon = () => (<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><circle cx="8" cy="4" r="2"/><circle cx="16" cy="4" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="8" cy="20" r="2"/><circle cx="16" cy="20" r="2"/></svg>)
const EyeIcon = () => (<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>)
const EyeOffIcon = () => (<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>)
const ChevronUp = () => (<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="18 15 12 9 6 15"/></svg>)
const ChevronDown = () => (<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>)
const PlusIcon = () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>)

type Props = {
  sections: PageSection[]
  selectedId: string | null
  onSelect: (id: string) => void
  onMove: (id: string, dir: 'up' | 'down') => void
  onToggle: (id: string) => void
  onRemove: (id: string) => void
  onReorder: (sections: PageSection[]) => void
  onAddClick: () => void
}

export default function SectionList({ sections, selectedId, onSelect, onMove, onToggle, onRemove, onReorder, onAddClick }: Props) {
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)
  const dragRef = useRef<number | null>(null)

  const handleDragStart = (idx: number) => { dragRef.current = idx; setDragIdx(idx) }
  const handleDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); setOverIdx(idx) }
  const handleDrop = (idx: number) => {
    const from = dragRef.current
    if (from === null || from === idx) { setDragIdx(null); setOverIdx(null); return }
    const next = [...sections]
    const [moved] = next.splice(from, 1)
    next.splice(idx, 0, moved)
    onReorder(next)
    setDragIdx(null); setOverIdx(null)
  }
  const handleDragEnd = () => { setDragIdx(null); setOverIdx(null) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', padding: '0 2px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>Sections</span>
        <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>{sections.length}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {sections.map((sec, idx) => {
          const def = SECTION_REGISTRY[sec.type]
          const isSelected = selectedId === sec.id
          const isDrag = dragIdx === idx
          const isOver = overIdx === idx && dragIdx !== idx
          return (
            <div
              key={sec.id}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={e => handleDragOver(e, idx)}
              onDrop={() => handleDrop(idx)}
              onDragEnd={handleDragEnd}
              onClick={() => onSelect(sec.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                background: isSelected ? 'var(--accent)' : isOver ? 'var(--bg)' : 'transparent',
                color: isSelected ? '#fff' : 'var(--text-primary)',
                opacity: isDrag ? 0.4 : sec.visible ? 1 : 0.45,
                border: isOver ? '1px dashed var(--accent)' : '1px solid transparent',
                transition: 'background 0.12s, opacity 0.12s',
              }}
            >
              <span style={{ cursor: 'grab', color: isSelected ? 'rgba(255,255,255,0.5)' : 'var(--text-muted)', flexShrink: 0, display: 'flex' }}><GripIcon /></span>
              <span style={{ flex: 1, fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{def.label}</span>
              <div style={{ display: 'flex', gap: 2, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                <button onClick={() => onToggle(sec.id)} title={sec.visible ? 'Hide' : 'Show'} style={{ width: 22, height: 22, borderRadius: 5, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isSelected ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)' }}>
                  {sec.visible ? <EyeIcon /> : <EyeOffIcon />}
                </button>
                <button onClick={() => onMove(sec.id, 'up')} disabled={idx === 0} title="Move up" style={{ width: 22, height: 22, borderRadius: 5, border: 'none', background: 'transparent', cursor: idx === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isSelected ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)', opacity: idx === 0 ? 0.3 : 1 }}>
                  <ChevronUp />
                </button>
                <button onClick={() => onMove(sec.id, 'down')} disabled={idx === sections.length - 1} title="Move down" style={{ width: 22, height: 22, borderRadius: 5, border: 'none', background: 'transparent', cursor: idx === sections.length - 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isSelected ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)', opacity: idx === sections.length - 1 ? 0.3 : 1 }}>
                  <ChevronDown />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <button onClick={onAddClick} style={{
        marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        padding: '8px 0', borderRadius: 8, border: '1.5px dashed var(--border)',
        background: 'transparent', color: 'var(--text-muted)', fontSize: 12, fontWeight: 500,
        cursor: 'pointer', fontFamily: 'var(--font)', transition: 'border-color 0.15s, color 0.15s',
      }}>
        <PlusIcon /> Add Section
      </button>
    </div>
  )
}
