'use client'

import { useState } from 'react'
import AppShell from '@/components/AppShell'
import DateRangePicker from '@/components/DateRangePicker'
import ConfirmModal from '@/components/ConfirmModal'
import CustomSelect from '@/components/CustomSelect'
import RowMenu from '@/components/RowMenu'
import {
  getStockLogs, getStockItems,
  createStockLog, deleteStockLog,
  type DbStockLog, type DbStockItem,
} from '@/lib/db/inventory'
import { useShop } from '@/providers/shop-provider'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

type LogType = 'in' | 'out' | 'adjustment'

/* ── Icons ───────────────────────────────────────────── */
const ExportIcon  = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>)
const PlusIcon    = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>)
const SearchIcon  = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>)
const ArrowDownIcon = () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>)
const ArrowUpIcon   = () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>)
const SlidersIcon   = () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="10" y1="18" x2="14" y2="18"/></svg>)
const LogIcon       = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>)
const XIcon         = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>)

/* ── Constants ───────────────────────────────────────── */
const TABS = ['All', 'In', 'Out', 'Adjustment']

const TYPE_COLOR: Record<LogType, { bg: string; color: string }> = {
  in:         { bg: 'rgba(0,106,255,0.1)', color: '#006AFF' },
  out:        { bg: 'var(--danger-bg)', color: 'var(--negative)' },
  adjustment: { bg: 'var(--warning-bg)', color: 'var(--icon-color-amber)' },
}

const REASONS_IN  = ['Supplier restock', 'Purchase order received', 'Transfer in', 'Return from job', 'Other']
const REASONS_OUT = ['Used in production', 'Used for job', 'Waste / damage', 'Transfer out', 'Other']
const REASONS_ADJ = ['Stock count correction', 'Cycle count', 'System reconciliation', 'Other']

const fmtDate = (iso: string) => {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
}

/* ── Blank form ──────────────────────────────────────── */
type LogForm = {
  itemId:  string
  type:    LogType
  qty:     string
  reason:  string
  orderId: string
  by:      string
}

const blank = (): LogForm => ({ itemId: '', type: 'in', qty: '', reason: '', orderId: '', by: 'Admin' })

/* ── Component ───────────────────────────────────────── */
export default function StockLogsPage() {
  const { shopId } = useShop()
  const qc = useQueryClient()

  const { data: logs = [] } = useQuery({
    queryKey: ['stock-logs', shopId],
    queryFn: () => getStockLogs(shopId),
    enabled: !!shopId,
  })
  const { data: stockItems = [] } = useQuery({
    queryKey: ['stock-items', shopId],
    queryFn: () => getStockItems(shopId),
    enabled: !!shopId,
  })

  const [tab,        setTab]       = useState('All')
  const [search,     setSearch]    = useState('')
  const [showModal,  setShowModal] = useState(false)
  const [form,       setForm]      = useState<LogForm>(blank())
  const [errors,     setErrors]    = useState<Partial<LogForm>>({})
  const [delId,      setDelId]     = useState<string | null>(null)

  const createMutation = useMutation({
    mutationFn: (input: Parameters<typeof createStockLog>[1]) => createStockLog(shopId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-logs', shopId] })
      qc.invalidateQueries({ queryKey: ['stock-items', shopId] })
    },
    onError: (err: any) => {
      console.error('[createStockLog]', err)
      alert('Failed to create: ' + (err?.message || 'Unknown error'))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteStockLog(shopId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stock-logs', shopId] }),
    onError: (err: any) => {
      console.error('[deleteStockLog]', err)
      alert('Failed to delete: ' + (err?.message || 'Unknown error'))
    },
  })

  /* ── Filtering ─────────────────────────────────────── */
  const tabKey = tab === 'In' ? 'in' : tab === 'Out' ? 'out' : tab === 'Adjustment' ? 'adjustment' : ''
  const filtered = logs.filter(l => {
    if (tabKey && l.type !== tabKey) return false
    if (search) {
      const q = search.toLowerCase()
      if (!l.item_name.toLowerCase().includes(q) &&
          !l.reason.toLowerCase().includes(q) &&
          !l.order_id.toLowerCase().includes(q) &&
          !l.seq_id.toLowerCase().includes(q)) return false
    }
    return true
  })

  /* ── Stats ─────────────────────────────────────────── */
  const totalIn  = logs.filter(l => l.type === 'in').reduce((s, l) => s + l.qty, 0)
  const totalOut = logs.filter(l => l.type === 'out').reduce((s, l) => s + l.qty, 0)
  const adjCount = logs.filter(l => l.type === 'adjustment').length

  /* ── Form helpers ──────────────────────────────────── */
  const reasonOptions = form.type === 'in' ? REASONS_IN : form.type === 'out' ? REASONS_OUT : REASONS_ADJ

  const validate = (): boolean => {
    const e: Partial<LogForm> = {}
    if (!form.itemId)               e.itemId = 'required'
    if (!form.qty || Number(form.qty) <= 0) e.qty = 'required'
    if (!form.reason)               e.reason = 'required'
    if (!form.by.trim())            e.by     = 'required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    const item = stockItems.find(s => s.id === form.itemId)!
    createMutation.mutate({
      item_id:   form.itemId,
      item_name: item.name,
      date:     new Date().toISOString().slice(0, 10),
      type:     form.type,
      qty:      Number(form.qty),
      reason:   form.reason,
      order_id: form.orderId,
      by:       form.by,
    })
    setShowModal(false)
    setForm(blank())
    setErrors({})
  }

  const handleDelete = () => {
    if (!delId) return
    deleteMutation.mutate(delId)
    setDelId(null)
  }

  const field = <K extends keyof LogForm>(key: K, val: LogForm[K]) =>
    setForm(p => ({ ...p, [key]: val }))

  /* ── Render ────────────────────────────────────────── */
  return (
    <AppShell>
      <div className="page-header">
        <div>
          <div className="page-title">Stock Logs</div>
          <div className="page-subtitle">Full movement audit trail · {logs.length} entries</div>
        </div>
        <div className="page-actions">
          <DateRangePicker />
          <button className="btn-secondary"><ExportIcon /><span>Export</span></button>
          <button className="btn-primary" onClick={() => { setForm(blank()); setErrors({}); setShowModal(true) }}>
            <PlusIcon /> Log Movement
          </button>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="finance-stats">
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-label"><LogIcon /> Total Movements</div></div>
          <div className="stat-value">{logs.length}</div>
          <div className="stat-vs">All time</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-label"><ArrowDownIcon /> Stock In</div></div>
          <div className="stat-value" style={{ color: 'var(--positive)' }}>{totalIn}</div>
          <div className="stat-vs">Units received</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-label"><ArrowUpIcon /> Stock Out</div></div>
          <div className="stat-value" style={{ color: 'var(--negative)' }}>{totalOut}</div>
          <div className="stat-vs">Units consumed</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-label"><SlidersIcon /> Adjustments</div></div>
          <div className="stat-value">{adjCount}</div>
          <div className="stat-vs">Manual corrections</div>
        </div>
      </div>

      <div className="page-scroll">
        {/* ── Filter row ── */}
        <div className="filter-row">
          <div className="filter-bar">
            {TABS.map(t => (
              <button key={t} className={`filter-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{t}</button>
            ))}
          </div>
          <div className="filter-right">
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '6px 12px' }}>
              <SearchIcon />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search logs…"
                style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12.5, color: 'var(--text-primary)', width: 180 }} />
            </div>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="card">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 44 }}>Type</th>
                <th>Log #</th>
                <th>Material</th>
                <th style={{ textAlign: 'right' }}>Qty</th>
                <th>Reason</th>
                <th>Order Ref</th>
                <th>By</th>
                <th>Date</th>
                <th style={{ width: 36 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={9}><div className="empty-state">No logs found</div></td></tr>
              )}
              {filtered.map(l => {
                const tc = TYPE_COLOR[l.type as LogType]
                return (
                  <tr key={l.id}>
                    <td>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: tc.bg, color: tc.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {l.type === 'in' ? <ArrowDownIcon /> : l.type === 'out' ? <ArrowUpIcon /> : <SlidersIcon />}
                      </div>
                    </td>
                    <td style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', fontFamily: 'monospace' }}>{l.seq_id}</td>
                    <td>
                      <div className="cell-name">{l.item_name}</div>
                      <div className="cell-sub">{l.item_id}</div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: tc.color }}>
                        {l.type === 'out' ? '−' : '+'}{l.qty}
                      </span>
                    </td>
                    <td style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{l.reason}</td>
                    <td>
                      {l.order_id
                        ? <span style={{ fontSize: 12.5, color: 'var(--accent)', fontWeight: 500 }}>{l.order_id}</span>
                        : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                    </td>
                    <td style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{l.by}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmtDate(l.date)}</td>
                    <td>
                      <RowMenu items={[
                        { label: 'Delete', action: () => setDelId(l.id), danger: true },
                      ]} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Log Movement Modal ── */}
      {showModal && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div style={{ background: 'var(--bg-card)', borderRadius: 14, width: 480, maxWidth: '100%', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>

            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Log Movement</div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                <XIcon />
              </button>
            </div>

            {/* Modal body */}
            <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Movement type toggle */}
              <div className="form-group">
                <label className="form-label">Movement Type</label>
                <div style={{ display: 'flex', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 9, padding: 3, gap: 2 }}>
                  {(['in', 'out', 'adjustment'] as LogType[]).map(t => {
                    const active = form.type === t
                    const col = TYPE_COLOR[t]
                    const label = t === 'in' ? 'Stock In' : t === 'out' ? 'Stock Out' : 'Adjustment'
                    return (
                      <button key={t} onClick={() => { field('type', t); field('reason', '') }}
                        style={{
                          flex: 1, padding: '7px 6px', borderRadius: 7, border: 'none', cursor: 'pointer',
                          fontSize: 12, fontWeight: 600, background: active ? col.bg : 'transparent',
                          color: active ? col.color : 'var(--text-muted)', transition: 'all 0.15s',
                        }}>
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Item */}
              <div className="form-group">
                <label className="form-label">Material / Item <span style={{ color: 'var(--negative)' }}>*</span></label>
                <CustomSelect
                  value={form.itemId}
                  onChange={v => field('itemId', v)}
                  placeholder="— Select stock item —"
                  options={stockItems.map(s => ({ value: s.id, label: `${s.name}  ·  ${s.id}` }))}
                />
                {errors.itemId && <div style={{ fontSize: 11, color: 'var(--negative)', marginTop: 3 }}>Select a stock item</div>}
                {/* Show current stock as hint */}
                {form.itemId && (() => {
                  const it = stockItems.find(s => s.id === form.itemId)
                  return it ? (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                      Current stock: <strong style={{ color: 'var(--text-primary)' }}>{it.current_stock} {it.unit}</strong>
                      {' · '}Reorder at {it.reorder_level}
                    </div>
                  ) : null
                })()}
              </div>

              {/* Qty */}
              <div className="form-group">
                <label className="form-label">Quantity <span style={{ color: 'var(--negative)' }}>*</span></label>
                <input
                  type="number" min="1" className="form-input"
                  value={form.qty} onChange={e => field('qty', e.target.value)}
                  placeholder="0"
                />
                {errors.qty && <div style={{ fontSize: 11, color: 'var(--negative)', marginTop: 3 }}>Enter a valid quantity</div>}
              </div>

              {/* Reason */}
              <div className="form-group">
                <label className="form-label">Reason <span style={{ color: 'var(--negative)' }}>*</span></label>
                <CustomSelect
                  value={form.reason}
                  onChange={v => field('reason', v)}
                  placeholder="— Select reason —"
                  options={reasonOptions.map(r => ({ value: r, label: r }))}
                />
                {form.reason === 'Other' && (
                  <input className="form-input" style={{ marginTop: 6 }} value=""
                    placeholder="Describe reason…"
                    onChange={e => field('reason', e.target.value)}
                  />
                )}
                {errors.reason && <div style={{ fontSize: 11, color: 'var(--negative)', marginTop: 3 }}>Select a reason</div>}
              </div>

              {/* Order Ref (optional) */}
              <div className="form-group">
                <label className="form-label">Order Reference <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                <input className="form-input" value={form.orderId} onChange={e => field('orderId', e.target.value)}
                  placeholder="e.g. ORD-1085" />
              </div>

              {/* Logged by */}
              <div className="form-group">
                <label className="form-label">Logged By <span style={{ color: 'var(--negative)' }}>*</span></label>
                <input className="form-input" value={form.by} onChange={e => field('by', e.target.value)}
                  placeholder="Name or role" />
                {errors.by && <div style={{ fontSize: 11, color: 'var(--negative)', marginTop: 3 }}>Enter who is logging this</div>}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleSubmit}>
                  Save Log
                </button>
                <button className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowModal(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm ── */}
      {delId && (
        <ConfirmModal
          title="Delete Log Entry"
          message="This log entry will be permanently removed. The stock level will not be reversed."
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setDelId(null)}
        />
      )}
    </AppShell>
  )
}
