'use client'
import { useState } from 'react'
import KanbanCard from './KanbanCard'
import ColumnHeaderMenu from './ColumnHeaderMenu'
import type { KanbanColumn, KanbanItem } from './types'

const PlusIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
const DotsIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>

interface Props {
  column: KanbanColumn
  draggingId: string | null
  dropOver: { colId: string; index: number } | null
  isProduction: boolean
  onCardClick: (item: KanbanItem) => void
  onCardPointerDown: (e: React.PointerEvent, item: KanbanItem, colId: string) => void
  onColPointerEnter: (colId: string) => void
  onRenameColumn: (colId: string) => void
  onDeleteColumn: (colId: string) => void
  onPermissionsColumn: (colId: string) => void
  onAddCard: (colId: string) => void
  onDeleteCard?: (cardId: string) => void
}

export default function KanbanColumn({
  column, draggingId, dropOver, isProduction,
  onCardClick, onCardPointerDown, onColPointerEnter,
  onRenameColumn, onDeleteColumn, onPermissionsColumn, onAddCard, onDeleteCard,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false)

  const isHovering = dropOver?.colId === column.id
  const filteredItems = column.items

  const TONE_PILL: Record<string, { bg: string; color: string }> = {
    neutral: { bg: 'var(--bg-card)',        color: 'var(--text-primary)' },
    info:    { bg: 'rgba(59,130,246,0.12)',  color: '#1d4ed8' },
    warning: { bg: 'rgba(245,158,11,0.14)',  color: '#b45309' },
    success: { bg: 'rgba(0,106,255,0.12)',   color: '#1d4ed8' },
  }
  const pill = TONE_PILL[column.tone ?? 'neutral'] ?? TONE_PILL.neutral

  return (
    <div
      className="kanban-lane"
      data-col-id={column.id}
      onPointerEnter={() => onColPointerEnter(column.id)}
    >
      {/* Header */}
      <div className="kanban-lane-header" style={{ paddingTop:8, position:'relative' }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, flex:1, minWidth:0 }}>
          <span style={{ fontSize:12, color:'var(--text-muted)', letterSpacing:'-2px', flexShrink:0, cursor: isProduction ? 'default' : 'grab' }}>⠿</span>
          <span style={{ fontSize:12, fontWeight:600, padding:'4px 10px', borderRadius:6, background:pill.bg, color:pill.color, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            {column.name}
          </span>
          <span style={{ fontSize:11, padding:'2px 8px', borderRadius:6, background:'rgba(12,18,28,0.08)', color:'var(--text-secondary)', flexShrink:0 }}>
            {column.items.length}
          </span>
        </div>
        {!isProduction && (
          <div style={{ display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
            <button className="kanban-hdr-btn" onPointerDown={e => e.stopPropagation()} onClick={() => onAddCard(column.id)}><PlusIcon /></button>
            <div style={{ position:'relative' }}>
              <button className="kanban-hdr-btn" onPointerDown={e => e.stopPropagation()} onClick={() => setMenuOpen(v => !v)}><DotsIcon /></button>
              {menuOpen && (
                <ColumnHeaderMenu
                  columnId={column.id}
                  columnName={column.name}
                  isLocked={!!column.systemKey || isProduction}
                  onRename={() => onRenameColumn(column.id)}
                  onDelete={() => onDeleteColumn(column.id)}
                  onPermissions={() => onPermissionsColumn(column.id)}
                  onClose={() => setMenuOpen(false)}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="kanban-lane-body">
        {filteredItems.map((item, i) => (
          <>
            {isHovering && dropOver!.index === i && (
              <div key="ph-before" className="kanban-placeholder" />
            )}
            <div key={item.id} data-card-id={item.id}>
              <KanbanCard
                item={item}
                columnName={column.name}
                tone={column.tone ?? 'neutral'}
                isDragging={draggingId === item.id}
                onPointerDown={e => onCardPointerDown(e, item, column.id)}
                onClick={() => onCardClick(item)}
                onDelete={onDeleteCard}
              />
            </div>
          </>
        ))}
        {isHovering && dropOver!.index >= filteredItems.length && (
          <div key="ph-end" className="kanban-placeholder" />
        )}
        {filteredItems.length === 0 && !isHovering && (
          <div style={{ textAlign:'center', padding:'24px 8px', fontSize:11, color:'var(--text-muted)' }}>
            No cards
          </div>
        )}
      </div>
    </div>
  )
}
