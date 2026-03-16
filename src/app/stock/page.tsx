'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import CreateToast from '@/components/CreateToast'
import DateRangePicker from '@/components/DateRangePicker'
import ConfirmModal from '@/components/ConfirmModal'
import RowMenu from '@/components/RowMenu'
import { getStockItems, deleteStockItem, type DbStockItem } from '@/lib/db/inventory'
import { useShop } from '@/providers/shop-provider'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { printDocument, docHeader, docFooter, fields2, fields3, section, textBlock, badgeColors } from '@/lib/print-utils'

const ExportIcon = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>)
const PlusIcon  = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>)
const SearchIcon = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>)
const BoxIcon   = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>)
const AlertIcon = () => (<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>)

function buildStockPrint(s: DbStockItem): string {
  const [bg, color] = badgeColors(s.status)
  return docHeader('STOCK ITEM', s.seq_id, s.status, bg, color) +
    section('Item Details', fields2([
      { label: 'Name', value: s.name },
      { label: 'SKU', value: s.sku },
      { label: 'Unit', value: s.unit },
      { label: 'Supplier', value: s.supplier || '—' },
    ])) +
    section('Stock Levels', fields3([
      { label: 'Current Stock', value: `${s.current_stock.toLocaleString()} ${s.unit}`, accent: true },
      { label: 'Reorder Level', value: `${s.reorder_level.toLocaleString()} ${s.unit}` },
      { label: 'Status', value: s.status },
    ])) +
    (s.notes ? section('Notes', textBlock(s.notes)) : '') +
    docFooter()
}

const STATUS_BADGE: Record<string, string> = { Healthy: 'badge badge-success', Low: 'badge badge-warning', Critical: 'badge badge-danger' }
const TABS = ['All', 'Healthy', 'Low', 'Critical']

function StockBar({ current, reorder }: { current: number; reorder: number }) {
  const max   = Math.max(current, reorder * 3)
  const pct   = Math.min(100, Math.round((current / max) * 100))
  const color = current < reorder ? '#ef4444' : current < reorder * 1.8 ? '#f59e0b' : '#006AFF'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 64, height: 5, borderRadius: 3, background: 'var(--border)', overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{current}</span>
    </div>
  )
}

export default function StockPage() {
  const router = useRouter()
  const { shopId } = useShop()
  const qc = useQueryClient()

  const { data: items = [] } = useQuery({
    queryKey: ['stock-items', shopId],
    queryFn: () => getStockItems(shopId),
    enabled: !!shopId,
  })

  const [tab, setTab]             = useState('All')
  const [search, setSearch]       = useState('')
  const [delTarget, setDelTarget]   = useState<DbStockItem | null>(null)

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteStockItem(shopId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stock-items', shopId] }),
  })

  const filtered = items.filter(s => {
    if (tab !== 'All' && s.status !== tab) return false
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.sku.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const healthy  = items.filter(s => s.status === 'Healthy').length
  const low      = items.filter(s => s.status === 'Low').length
  const critical = items.filter(s => s.status === 'Critical').length

  const handleDelete = () => {
    if (!delTarget) return
    deleteMutation.mutate(delTarget.id)
    setDelTarget(null)
  }

  return (
    <AppShell>
      <CreateToast param="created" title="Stock item created successfully" subtitle="The new item has been added to your inventory" basePath="/stock" />
      <CreateToast param="saved" title="Stock item updated successfully" subtitle="Changes have been saved" basePath="/stock" />
      <div className="page-header">
        <div>
          <div className="page-title">Stock</div>
          <div className="page-subtitle">{items.length} materials tracked</div>
        </div>
        <div className="page-actions">
          <DateRangePicker />
          <button className="topbar-btn"><ExportIcon /><span>Export</span></button>
          <Link href="/stock/new" className="btn-primary"><PlusIcon /> Add Item</Link>
        </div>
      </div>

      <div className="finance-stats">
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-label"><BoxIcon /> Total Items</div></div>
          <div className="stat-value">{items.length}</div>
          <div className="stat-vs">Materials on hand</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-label"><BoxIcon /> Healthy</div></div>
          <div className="stat-value">{healthy}</div>
          <div className="stat-vs">Well stocked</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-label"><BoxIcon /> Low</div></div>
          <div className="stat-value" style={{ color: 'var(--warning)' }}>{low}</div>
          <div className="stat-vs">Order soon</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-label"><AlertIcon /> Critical</div></div>
          <div className="stat-value" style={{ color: 'var(--negative)' }}>{critical}</div>
          <div className="stat-vs">Order immediately</div>
        </div>
      </div>

      <div className="page-scroll">
        <div className="filter-row">
          <div className="filter-bar">{TABS.map(t => (<button key={t} className={`filter-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{t}</button>))}</div>
          <div className="filter-right">
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '6px 12px' }}>
              <SearchIcon />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search stock…" style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12.5, color: 'var(--text-primary)', width: 180 }} />
            </div>
          </div>
        </div>

        <div className="card">
          <table className="data-table">
            <thead>
              <tr><th>Material</th><th>SKU</th><th>Current Stock</th><th>Reorder Level</th><th>Unit</th><th>Supplier</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={8}><div className="empty-state">No items found</div></td></tr>}
              {filtered.map(s => (
                <tr key={s.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/stock/${s.id}`)}>
                  <td>
                    <button onClick={() => router.push(`/stock/${s.id}`)} style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font)', textAlign: 'left' }}>{s.name}</button>
                    <div className="cell-sub">{s.seq_id}</div>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>{s.sku}</td>
                  <td><StockBar current={s.current_stock} reorder={s.reorder_level} /></td>
                  <td style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{s.reorder_level} {s.unit}</td>
                  <td style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{s.unit}</td>
                  <td style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{s.supplier}</td>
                  <td><span className={STATUS_BADGE[s.status]}>{s.status}</span></td>
                  <td onClick={e => e.stopPropagation()}>
                    <RowMenu items={[
                      { label: 'Edit',   action: () => router.push(`/stock/${s.id}`) },
                      { label: 'Delete', action: () => setDelTarget(s), danger: true },
                    ]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {delTarget && (
        <ConfirmModal title={`Delete ${delTarget.seq_id}?`} message={`This will permanently remove "${delTarget.name}".`} confirmLabel="Delete" onConfirm={handleDelete} onCancel={() => setDelTarget(null)} />
      )}
    </AppShell>
  )
}
