'use client'

import { useState, useMemo } from 'react'
import MyStoreShell from '@/components/MyStoreShell'
import ConfirmModal from '@/components/ConfirmModal'
import ViewModal, { ViewRow, SectionLabel } from '@/components/ViewModal'
import RowMenu from '@/components/RowMenu'
import BulkActionBar, { BulkCheckbox } from '@/components/BulkActionBar'
import { getAbandonedCarts, deleteAbandonedCart, clearAllAbandonedCarts, type DbAbandonedCart } from '@/lib/db/storefront'
import { useShop } from '@/providers/shop-provider'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

/* ── Icons ─────────────────────────────────────────── */
const SearchIcon = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>)
const RefreshIcon = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>)
const TrashIcon = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>)

/* ── Helpers ───────────────────────────────────────── */
function fmt(n: number) {
  return `RM ${(n ?? 0).toLocaleString('en-MY', { minimumFractionDigits: 0 })}`
}

function hoursSince(dateStr: string): number {
  const diff = Date.now() - new Date(dateStr).getTime()
  return Math.floor(diff / 3600000)
}

function timeAgo(dateStr: string): string {
  const h = hoursSince(dateStr)
  if (h < 1) return 'Just now'
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

const TABS = ['All', 'Guest', 'Registered', 'Stale (24h+)']

/* ════════════════════════════════════════════════════ */
export default function AbandonedCartsPage() {
  const { shopId } = useShop()
  const qc = useQueryClient()

  const { data: carts = [], refetch } = useQuery({
    queryKey: ['abandoned-carts', shopId],
    queryFn: () => getAbandonedCarts(shopId),
    enabled: !!shopId,
  })

  const [tab, setTab]     = useState('All')
  const [search, setSearch] = useState('')
  const [viewTarget, setViewTarget] = useState<DbAbandonedCart | null>(null)
  const [delId, setDelId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkDel, setBulkDel] = useState(false)

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteAbandonedCart(shopId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['abandoned-carts', shopId] }),
    onError: (err: any) => {
      console.error('[deleteAbandonedCart]', err)
      alert('Failed to delete: ' + (err?.message || 'Unknown error'))
    },
  })

  const filtered = useMemo(() => {
    let list = carts
    if (tab === 'Guest')          list = list.filter(c => c.is_guest)
    if (tab === 'Registered')     list = list.filter(c => !c.is_guest)
    if (tab === 'Stale (24h+)')   list = list.filter(c => hoursSince(c.updated_at) >= 24)
    if (search) list = list.filter(c =>
      c.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      c.customer_email.toLowerCase().includes(search.toLowerCase()) ||
      c.session_id.toLowerCase().includes(search.toLowerCase())
    )
    return [...list].sort((a, b) => a.updated_at.localeCompare(b.updated_at))
  }, [carts, tab, search])

  const totalValue  = carts.reduce((s, c) => s + c.total_value, 0)
  const guestCount  = carts.filter(c => c.is_guest).length
  const staleCount  = carts.filter(c => hoursSince(c.updated_at) >= 24).length

  const handleDelete = () => {
    if (delId) {
      deleteMut.mutate(delId)
      setDelId(null)
    }
  }

  const toggleOne = (id: string) => setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  const toggleAll = () => setSelected(prev => prev.size === filtered.length ? new Set() : new Set(filtered.map(c => c.id)))
  const handleBulkRemove = () => {
    selected.forEach(id => deleteMut.mutate(id))
    setSelected(new Set()); setBulkDel(false)
  }

  return (
    <MyStoreShell>
      <div className="page-header">
        <div>
          <div className="page-title">Abandoned Carts</div>
          <div className="page-subtitle">Customers who added items to cart but didn&apos;t check out</div>
        </div>
        <div className="page-actions">
          <button className="btn-secondary" onClick={() => refetch()} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><RefreshIcon /> Refresh</button>
        </div>
      </div>

      <div className="page-scroll">
        <div className="finance-stats">
          <div className="stat-card">
            <div className="stat-card-header"><div className="stat-card-label">Abandoned Carts</div></div>
            <div className="stat-value">{carts.length}</div>
            <div className="stat-vs">Carts with items</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-header"><div className="stat-card-label">Guest Carts</div></div>
            <div className="stat-value" style={{ color: '#d97706' }}>{guestCount}</div>
            <div className="stat-vs">No account</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-header"><div className="stat-card-label">Potential Revenue</div></div>
            <div className="stat-value" style={{ color: '#16a34a', fontSize: 20 }}>{fmt(totalValue)}</div>
            <div className="stat-vs">Recoverable</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-header"><div className="stat-card-label">Stale (24h+)</div></div>
            <div className="stat-value" style={{ color: 'var(--negative)' }}>{staleCount}</div>
            <div className="stat-vs">Likely lost</div>
          </div>
        </div>

        <div style={{ padding: '10px 16px', borderRadius: 10, background: '#006AFF10', border: '1px solid #006AFF30', fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--accent)', fontWeight: 600 }}>i</span>
          These are customers who added items to their cart but left without completing checkout. Carts are automatically removed when a customer successfully checks out.
        </div>

        <div className="filter-row">
          <div className="filter-bar">
            {TABS.map(t => (
              <button key={t} className={`filter-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{t}</button>
            ))}
          </div>
          <div className="filter-right">
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '6px 12px' }}>
              <SearchIcon />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customer…"
                style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12.5, color: 'var(--text-primary)', width: 180 }} />
            </div>
          </div>
        </div>

        <div className="card">
          {filtered.length === 0 ? (
            <div className="empty-state">No abandoned carts found.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th style={{ width: 40 }}><BulkCheckbox checked={filtered.length > 0 && selected.size === filtered.length} indeterminate={selected.size > 0 && selected.size < filtered.length} onChange={toggleAll} /></th><th>Customer</th><th>Items</th><th>Qty</th><th>Cart Value</th><th>Last Active</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const h = hoursSince(c.updated_at)
                  const stale = h >= 24
                  return (
                    <tr key={c.id}>
                      <td><BulkCheckbox checked={selected.has(c.id)} onChange={() => toggleOne(c.id)} /></td>
                      <td>
                        <button onClick={() => setViewTarget(c)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font)' }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{c.customer_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          {c.is_guest
                            ? <span className="badge badge-pending" style={{ fontSize: 10, padding: '1px 6px' }}>Guest</span>
                            : <span>{c.customer_email}</span>
                          }
                        </div>
                        </button>
                      </td>
                      <td style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                        {(c.items as any[]).slice(0, 2).map((i: any) => (i.name || '').split(' — ')[0]).join(', ')}
                        {(c.items as any[]).length > 2 && ` +${(c.items as any[]).length - 2} more`}
                      </td>
                      <td style={{ fontWeight: 600, fontSize: 13, textAlign: 'center' }}>{c.item_count}</td>
                      <td style={{ fontWeight: 700, fontSize: 13, color: 'var(--accent)' }}>{fmt(c.total_value)}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {timeAgo(c.updated_at)}
                      </td>
                      <td>
                        <span className={stale ? 'badge badge-danger' : 'badge badge-info'}>
                          {stale ? 'Stale' : 'Active'}
                        </span>
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <RowMenu items={[
                          { label: 'View',   action: () => setViewTarget(c) },
                          { label: 'Remove', action: () => setDelId(c.id), danger: true },
                        ]} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <BulkActionBar count={selected.size} total={filtered.length} onDeselectAll={() => setSelected(new Set())} actions={[
        { label: 'Remove', icon: <TrashIcon />, action: () => setBulkDel(true), danger: true },
      ]} />

      {bulkDel && (
        <ConfirmModal
          title="Remove Selected Carts"
          message={`Remove ${selected.size} selected abandoned cart(s)?`}
          confirmLabel="Remove All"
          onConfirm={handleBulkRemove}
          onCancel={() => setBulkDel(false)}
        />
      )}

      {delId && (
        <ConfirmModal
          title="Remove Abandoned Cart"
          message={`Remove this abandoned cart from "${carts.find(c => c.id === delId)?.customer_name ?? 'Guest'}"? This just clears the record.`}
          onConfirm={handleDelete}
          onCancel={() => setDelId(null)}
        />
      )}

      {viewTarget && (
        <ViewModal
          title={viewTarget.customer_name}
          subtitle={`${viewTarget.is_guest ? 'Guest' : viewTarget.customer_email} · ${timeAgo(viewTarget.updated_at)}`}
          status={hoursSince(viewTarget.updated_at) >= 24 ? 'Stale' : 'Active'}
          onClose={() => setViewTarget(null)}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
            <div>
              <SectionLabel>Customer</SectionLabel>
              <ViewRow label="Name" value={viewTarget.customer_name} />
              <ViewRow label="Email" value={viewTarget.is_guest ? 'Guest (no account)' : viewTarget.customer_email} />
              <ViewRow label="Type" value="" badge={viewTarget.is_guest ? 'Guest' : 'Registered'} />
            </div>
            <div>
              <SectionLabel>Cart Summary</SectionLabel>
              <ViewRow label="Items" value={viewTarget.item_count} />
              <ViewRow label="Cart Value" value={fmt(viewTarget.total_value)} accent />
              <ViewRow label="Last Active" value={timeAgo(viewTarget.updated_at)} />
              <ViewRow label="Session ID" value={viewTarget.session_id} />
            </div>
          </div>
          <div style={{ marginTop: 20 }}>
            <SectionLabel>Cart Items</SectionLabel>
            <table className="data-table" style={{ marginTop: 8 }}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Options</th>
                  <th style={{ textAlign: 'center' }}>Qty</th>
                  <th style={{ textAlign: 'right' }}>Unit Price</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {(viewTarget.items as any[]).map((item: any, i: number) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600, fontSize: 13 }}>{(item.name || '').split(' — ')[0]}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.optionSummary || '—'}</td>
                    <td style={{ textAlign: 'center', fontSize: 13 }}>{item.qty}</td>
                    <td style={{ textAlign: 'right', fontSize: 13 }}>{fmt(item.unitPrice)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, fontSize: 13 }}>{fmt(item.total)}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={4} style={{ textAlign: 'right', fontWeight: 700, fontSize: 13, paddingTop: 10 }}>Total</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 14, color: 'var(--accent)', paddingTop: 10 }}>{fmt(viewTarget.total_value)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </ViewModal>
      )}
    </MyStoreShell>
  )
}
