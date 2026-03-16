'use client'
import type { KanbanColumn, KanbanItem } from './types'
import { formatAnyDate } from './utils'

const PROOF_CFG: Record<string, { bg: string; color: string; border: string; label: string }> = {
  artwork_proof_generated: { bg:'rgba(168,85,247,0.1)', color:'#9333ea', border:'rgba(168,85,247,0.25)', label:'Proof Generated' },
  approved:                { bg:'rgba(0,106,255,0.1)', color:'var(--accent, #006AFF)', border:'rgba(0,106,255,0.2)', label:'Approved' },
  sent:                    { bg:'rgba(0,106,255,0.1)', color:'var(--accent, #006AFF)', border:'rgba(0,106,255,0.2)', label:'Sent' },
  changes_requested:       { bg:'rgba(245,158,11,0.12)', color:'#f59e0b', border:'rgba(245,158,11,0.25)', label:'Changes' },
  rejected:                { bg:'rgba(239,68,68,0.1)', color:'#ef4444', border:'rgba(239,68,68,0.2)', label:'Rejected' },
  pending:                 { bg:'var(--bg, #f1f5f9)', color:'var(--text-secondary)', border:'var(--border)', label:'Pending' },
}

const PRIORITY_COLORS: Record<string, { bg: string; color: string }> = {
  high:   { bg: 'rgba(239,68,68,0.1)',  color: '#ef4444' },
  medium: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
  low:    { bg: 'rgba(100,116,139,0.1)', color: 'var(--text-secondary)' },
}

const TONE_STATUS: Record<string, { bg: string; color: string }> = {
  neutral: { bg: 'rgba(100,116,139,0.08)', color: 'var(--text-muted)'      },
  info:    { bg: 'rgba(0,106,255,0.1)',     color: 'var(--accent, #006AFF)' },
  warning: { bg: 'rgba(245,158,11,0.12)',   color: '#f59e0b'                },
  success: { bg: 'rgba(0,106,255,0.1)',     color: 'var(--accent, #006AFF)' },
}

interface Props {
  columns: KanbanColumn[]
  filterStatus: string
  filterPriority: string
  sortBy: 'due' | 'priority' | 'created'
  onCardClick: (item: KanbanItem) => void
}

export default function ProductionListView({ columns, filterStatus, filterPriority, sortBy, onCardClick }: Props) {
  const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 }

  let items = columns.flatMap(col =>
    col.items.map(item => ({ ...item, colName: col.name, colTone: col.tone ?? 'neutral', colId: col.id }))
  )

  if (filterStatus !== 'All') items = items.filter(i => i.colId === filterStatus || i.colName === filterStatus)
  if (filterPriority !== 'All') items = items.filter(i => i.priority === filterPriority.toLowerCase())

  if (sortBy === 'priority') items.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
  else if (sortBy === 'due') items.sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime())

  const DotsIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>

  return (
    <div className="card">
      <table className="data-table">
        <thead>
          <tr>
            <th>Task</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Due</th>
            <th>Assignees</th>
            <th>Proof</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr><td colSpan={7}><div className="empty-state">No items found</div></td></tr>
          )}
          {items.map(item => {
            const sp = TONE_STATUS[item.colTone]
            const pr = PRIORITY_COLORS[item.priority]
            const od = new Date(item.due) < new Date(new Date().toDateString())
            return (
              <tr key={item.id} onClick={() => onCardClick(item)} style={{ cursor: 'pointer' }}>
                <td>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }}>{item.task}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>#{item.id}</div>
                </td>
                <td>
                  <span style={{ display:'inline-flex', alignItems:'center', fontSize:12, fontWeight:500, padding:'2px 8px', borderRadius:4, background:sp.bg, color:sp.color }}>
                    {item.colName}
                  </span>
                </td>
                <td>
                  <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:4, background:pr.bg, color:pr.color }}>
                    {item.priority}
                  </span>
                </td>
                <td style={{ fontSize:12.5, color: od ? '#ef4444' : 'var(--text-secondary)', fontWeight: od ? 600 : 400 }}>
                  {od && '⚠ '}{formatAnyDate(item.due)}
                </td>
                <td>
                  <div style={{ display:'flex', alignItems:'center' }}>
                    {(item.assignees && item.assignees.length > 0 ? item.assignees : []).slice(0,3).map((n, i) => (
                      <div key={n+i} style={{ width:22, height:22, borderRadius:'50%', background:'var(--border, #e2e8f0)', border:'2px solid var(--bg-card)', fontSize:9, fontWeight:700, color:'var(--text-secondary)', display:'flex', alignItems:'center', justifyContent:'center', marginLeft:i===0?0:-6 }}>{n[0]}</div>
                    ))}
                  </div>
                </td>
                <td>
                  {item.proofStatus && item.proofStatus !== 'none' && PROOF_CFG[item.proofStatus] && (
                    <span style={{ fontSize:11, fontWeight:600, padding:'2px 6px', borderRadius:3, border:`1px solid ${PROOF_CFG[item.proofStatus].border}`, background:PROOF_CFG[item.proofStatus].bg, color:PROOF_CFG[item.proofStatus].color }}>
                      {PROOF_CFG[item.proofStatus].label}
                    </span>
                  )}
                </td>
                <td><button className="btn-ghost" onClick={e => e.stopPropagation()}><DotsIcon /></button></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
