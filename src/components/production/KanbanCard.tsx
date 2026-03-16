'use client'
import { useState } from 'react'
import type { KanbanItem } from './types'
import { formatAnyDate, isUrgent } from './utils'
import ConfirmModal from '@/components/ConfirmModal'

// Inline SVG icons
const ChatIcon  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
const GlobeIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
const LinkIcon  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
const CalIcon   = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{opacity:0.7}}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
const DotsIcon  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>

const PRIORITY_PILL: Record<string, { bg: string; color: string }> = {
  high:   { bg: 'rgba(239,68,68,0.1)',  color: '#ef4444' },
  medium: { bg: 'rgba(245,158,11,0.1)', color: '#d97706' },
}

const PROOF_CFG: Record<string, { bg: string; color: string; border: string; label: string }> = {
  none:                    { bg:'var(--bg, #f1f5f9)', color:'var(--text-muted)', border:'var(--border)', label:'No action' },
  artwork_proof_generated: { bg:'rgba(168,85,247,0.1)', color:'#9333ea', border:'rgba(168,85,247,0.25)', label:'Proof Generated' },
  approved:                { bg:'rgba(0,106,255,0.1)', color:'var(--accent, #006AFF)', border:'rgba(0,106,255,0.2)', label:'Approved' },
  sent:                    { bg:'rgba(0,106,255,0.1)', color:'var(--accent, #006AFF)', border:'rgba(0,106,255,0.2)', label:'Sent' },
  changes_requested:       { bg:'rgba(245,158,11,0.12)', color:'#f59e0b', border:'rgba(245,158,11,0.25)', label:'Changes' },
  rejected:                { bg:'rgba(239,68,68,0.1)', color:'#ef4444', border:'rgba(239,68,68,0.2)', label:'Rejected' },
  pending:                 { bg:'var(--bg, #f1f5f9)', color:'var(--text-secondary)', border:'var(--border)', label:'Pending' },
}

interface Props {
  item: KanbanItem
  columnName: string
  tone: string
  isDragging?: boolean
  onPointerDown: (e: React.PointerEvent) => void
  onClick: () => void
  onDelete?: (id: string) => void
}

export default function KanbanCard({ item, columnName, tone, isDragging, onPointerDown, onClick, onDelete }: Props) {
  const [menuOpen, setMenuOpen]           = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const urgent = isUrgent(item.due)

  return (
    <>
    <div
      className={`kanban-ticket${isDragging ? ' is-dragging' : ''}`}
      onPointerDown={onPointerDown}
      onClick={onClick}
    >
      {/* ROW 1 — Badges + menu */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          {urgent && <span style={{ width:7, height:7, borderRadius:'50%', background:'#ef4444', boxShadow:'0 0 0 2px rgba(239,68,68,0.2)', flexShrink:0 }} />}
          {item.priority !== 'low' && (
            <span style={{ fontSize:9, fontWeight:600, padding:'1px 5px', borderRadius:3, background:PRIORITY_PILL[item.priority].bg, color:PRIORITY_PILL[item.priority].color }}>
              {item.priority}
            </span>
          )}
          {(() => { const ps = item.proofStatus ?? 'none'; const cfg = PROOF_CFG[ps]; return cfg ? (
            <span style={{ fontSize:9, fontWeight:600, padding:'1px 5px', borderRadius:3, background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}` }}>
              {cfg.label}
            </span>
          ) : null })()}
        </div>
        <div style={{ position:'relative' }}>
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); setMenuOpen(v => !v) }}
            style={{ color:'var(--text-muted)', padding:2, borderRadius:4 }}
          >
            <DotsIcon />
          </button>
          {menuOpen && (
            <div onPointerDown={e => e.stopPropagation()} style={{ position:'absolute', top:'100%', right:0, background:'var(--bg-card)', borderRadius:8, boxShadow:'0 10px 15px -3px rgba(0,0,0,0.12)', zIndex:100, minWidth:120, padding:4, marginTop:4, border:'1px solid var(--border)' }}>
              <button onClick={e => { e.stopPropagation(); setMenuOpen(false) }} style={{ display:'block', width:'100%', textAlign:'left', fontSize:13, padding:'6px 12px', borderRadius:4, color:'var(--text-primary)', background:'transparent', border:'none', cursor:'pointer', fontFamily:'var(--font)' }}>Edit</button>
              <button
                onClick={e => { e.stopPropagation(); setMenuOpen(false); setConfirmDelete(true) }}
                style={{ display:'block', width:'100%', textAlign:'left', fontSize:13, padding:'6px 12px', borderRadius:4, color:'#ef4444', background:'transparent', border:'none', cursor:'pointer', fontFamily:'var(--font)' }}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ROW 2 — Order ID */}
      <div style={{ fontSize:10, fontWeight:600, color:'var(--text-muted)', letterSpacing:'0.02em', lineHeight:1 }}>
        #{item.id}
      </div>

      {/* ROW 3 — Title */}
      <div style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)', lineHeight:1.3, marginTop:1, marginBottom:1, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>
        {item.task}
      </div>

      <>
        {/* ROW 4 — Description */}
        {item.description && (
          <div style={{ fontSize:10, color:'var(--text-muted)', lineHeight:1.3, marginTop:1, marginBottom:6, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:1, WebkitBoxOrient:'vertical' }}>
            {item.description}
          </div>
        )}

          {/* ROW 5 — Meta */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:3, fontSize:10, fontWeight:500, color:'var(--text-muted)' }}>
              <CalIcon /> {formatAnyDate(item.due)}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <div style={{ display:'flex', alignItems:'center' }}>
                {(item.assignees && item.assignees.length > 0 ? item.assignees : []).slice(0,3).map((name, i) => (
                  <div key={name+i} style={{ width:18, height:18, borderRadius:'50%', background:'var(--border, #e2e8f0)', border:'1.5px solid var(--bg-card)', fontSize:8, fontWeight:700, color:'var(--text-secondary)', display:'flex', alignItems:'center', justifyContent:'center', marginLeft:i===0?0:-4, zIndex:3-i, boxShadow:'0 0 0 1px rgba(0,0,0,0.05)', flexShrink:0 }}>
                    {name[0]}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height:1, background:'var(--border)', margin:'2px 0' }} />

          {/* ROW 6 — Footer */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', fontSize:10, fontWeight:500, color:'var(--text-muted)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:4 }}><ChatIcon />{item.comments}</div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ display:'flex', alignItems:'center', gap:4 }}><GlobeIcon />{item.links}</div>
              <div style={{ display:'flex', alignItems:'center', gap:4 }}><LinkIcon />{item.files}</div>
            </div>
          </div>
      </>
    </div>

    {confirmDelete && (
      <ConfirmModal
        title={`Delete ${item.id}?`}
        message="This will permanently remove the card."
        confirmLabel="Delete card"
        onConfirm={() => { setConfirmDelete(false); onDelete?.(item.id) }}
        onCancel={() => setConfirmDelete(false)}
      />
    )}
    </>
  )
}
