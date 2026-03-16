'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import MyStoreShell from '@/components/MyStoreShell'
import DateRangePicker from '@/components/DateRangePicker'
import ConfirmModal from '@/components/ConfirmModal'
import RowMenu from '@/components/RowMenu'
import { getOrders, deleteOrder, type DbOrder } from '@/lib/db/orders'
import { useShop } from '@/providers/shop-provider'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import ViewModal, { ViewRow, SectionLabel } from '@/components/ViewModal'
import BulkActionBar, { BulkCheckbox, useBulkSelect } from '@/components/BulkActionBar'

const ExportIcon = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>)
const TrashIcon = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>)
const SearchIcon = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>)
const GlobeIcon = () => (<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>)

function fmt(n: number) {
  return `RM ${(n ?? 0).toLocaleString('en-MY', { minimumFractionDigits: 0 })}`
}

const STATUS_BADGE: Record<string, string> = {
  Pending:   'badge badge-warning',
  Confirmed: 'badge badge-info',
  Cancelled: 'badge badge-pending',
}
const PROD_BADGE: Record<string, string> = {
  Queued:          'badge badge-pending',
  'In Progress':   'badge badge-info',
  'Quality Check': 'badge badge-warning',
  Completed:       'badge badge-success',
  Shipped:         'badge badge-info',
  Delivered:       'badge badge-success',
  '\u2014':             '',
}
const TABS = ['All', 'Pending', 'Confirmed', 'Cancelled']

export default function StoreOrdersPage() {
  const router = useRouter()
  const { shopId } = useShop()
  const qc = useQueryClient()

  const { data: rawOrders = [] } = useQuery({
    queryKey: ['orders', shopId],
    queryFn: () => getOrders(shopId),
    enabled: !!shopId,
  })

  // Only show orders from the online store
  const allOrders = useMemo(() => rawOrders.filter(o => o.source === 'online-store'), [rawOrders])

  const [tab, setTab]             = useState('All')
  const [search, setSearch]       = useState('')
  const [viewTarget, setViewTarget] = useState<DbOrder | null>(null)
  const [delTarget, setDelTarget]   = useState<DbOrder | null>(null)

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteOrder(shopId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders', shopId] }),
  })

  const filtered = allOrders.filter(o => {
    if (tab !== 'All' && o.status !== tab) return false
    if (search && !o.seq_id.toLowerCase().includes(search.toLowerCase()) &&
        !o.customer_name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const bulk = useBulkSelect(filtered, filtered)

  const pending   = allOrders.filter(o => o.status === 'Pending').length
  const confirmed = allOrders.filter(o => o.status === 'Confirmed').length
  const totalRev  = allOrders.filter(o => o.status !== 'Cancelled').reduce((s, o) => s + (o.grand_total ?? 0), 0)
  const inProd    = allOrders.filter(o => ['In Progress', 'Quality Check'].includes(o.production)).length

  const handleDelete = () => {
    if (!delTarget) return
    deleteMut.mutate(delTarget.id)
    setDelTarget(null)
  }

  return (
    <MyStoreShell>
      <div className="page-header">
        <div>
          <div className="page-title">Orders</div>
          <div className="page-subtitle">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <GlobeIcon /> Online store orders · {allOrders.length} total
            </span>
          </div>
        </div>
        <div className="page-actions">
          <DateRangePicker />
          <button className="topbar-btn"><ExportIcon /><span>Export</span></button>
        </div>
      </div>

      <div className="finance-stats">
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-label">Online Orders</div></div>
          <div className="stat-value">{allOrders.length}</div>
          <div className="stat-vs">{confirmed} confirmed</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-label">Pending</div></div>
          <div className="stat-value" style={{ color: 'var(--warning)' }}>{pending}</div>
          <div className="stat-vs">Awaiting confirmation</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-label">In Production</div></div>
          <div className="stat-value" style={{ color: 'var(--accent, #006AFF)' }}>{inProd}</div>
          <div className="stat-vs">Active on floor</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-label">Revenue</div></div>
          <div className="stat-value" style={{ fontSize: 20 }}>{fmt(totalRev)}</div>
          <div className="stat-vs">From online store</div>
        </div>
      </div>

      <div className="page-scroll">
        <div className="filter-row">
          <div className="filter-bar">
            {TABS.map(t => (
              <button key={t} className={`filter-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{t}</button>
            ))}
          </div>
          <div className="filter-right">
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '6px 12px' }}>
              <SearchIcon />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search orders..."
                style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12.5, color: 'var(--text-primary)', width: 180 }} />
            </div>
          </div>
        </div>

        <div className="card">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}><BulkCheckbox checked={bulk.allPageSelected} indeterminate={!bulk.allPageSelected && bulk.somePageSelected} onChange={bulk.toggleAll} /></th>
                <th>Order</th>
                <th>Customer</th>
                <th>Channel</th>
                <th style={{ textAlign: 'center' }}>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Production</th>
                <th>Due Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={10}><div className="empty-state">No online orders found</div></td></tr>
              )}
              {filtered.map(o => {
                const items = (o.items ?? []) as { id: string; name: string; sku: string; qty: number; unitPrice: number; total: number }[]
                const total = o.grand_total ?? 0
                return (
                  <tr key={o.id}>
                    <td><BulkCheckbox checked={bulk.selectedIds.has(o.id)} onChange={() => bulk.toggleSelect(o.id)} /></td>
                    <td>
                      <button onClick={() => setViewTarget(o)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
                        <div className="cell-name" style={{ color: 'var(--accent)' }}>{o.seq_id}</div>
                        <div className="cell-sub">{o.created_at?.slice(0, 10)}</div>
                      </button>
                    </td>
                    <td style={{ fontSize: 12.5, color: 'var(--text-primary)', fontWeight: 500 }}>{o.customer_name}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'var(--accent)', fontWeight: 500 }}>
                        <GlobeIcon /> Online Store
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, fontSize: 13, textAlign: 'center' }}>{items.length}</td>
                    <td style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{fmt(total)}</td>
                    <td><span className={STATUS_BADGE[o.status]}>{o.status}</span></td>
                    <td>
                      {o.production !== '\u2014'
                        ? <span className={PROD_BADGE[o.production]}>{o.production}</span>
                        : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{'\u2014'}</span>
                      }
                    </td>
                    <td style={{ fontSize: 12.5, color: o.due_date && new Date(o.due_date) < new Date() && o.status !== 'Cancelled' ? 'var(--negative)' : 'var(--text-secondary)', fontWeight: o.due_date && new Date(o.due_date) < new Date() && o.status !== 'Cancelled' ? 600 : 400 }}>
                      {o.due_date || '\u2014'}
                    </td>
                    <td>
                      <RowMenu items={[
                        { label: 'View',             action: () => setViewTarget(o) },
                        { label: 'Open in Orders',   action: () => router.push(`/orders/${o.id}`) },
                        { label: 'Delete',           action: () => setDelTarget(o), danger: true },
                      ]} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <BulkActionBar count={bulk.selectedIds.size} total={filtered.length} onDeselectAll={bulk.clearSelection} actions={[
        { label: 'Delete', icon: <TrashIcon />, action: () => bulk.setBulkDelOpen(true), danger: true },
      ]} />

      {/* -- View Modal -- */}
      {viewTarget && (() => {
        const items = (viewTarget.items ?? []) as { id: string; name: string; sku: string; qty: number; unitPrice: number; total: number }[]
        const payments = (viewTarget.payments ?? []) as { id: string; date: string; method: string; ref: string; status: string; amount: number }[]
        const vTotal    = viewTarget.subtotal ?? items.reduce((s, i) => s + i.total, 0)
        const vTax      = viewTarget.sst_amount ?? 0
        const vGrand    = viewTarget.grand_total ?? (vTotal + vTax)
        const vPaid     = payments.filter(p => p.status === 'Captured').reduce((s, p) => s + p.amount, 0)
        const vBalance  = vGrand - vPaid
        return (
          <ViewModal
            title={viewTarget.seq_id}
            subtitle={`${viewTarget.customer_name} · Online Store`}
            status={viewTarget.status}
            onClose={() => setViewTarget(null)}
            onEdit={() => { setViewTarget(null); router.push(`/orders/${viewTarget.id}`) }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24, padding: 16, background: 'var(--bg, #f8f9fa)', borderRadius: 10, border: '1px solid var(--border, #e5e7eb)' }}>
              {[
                { label: 'Grand Total', value: fmt(vGrand),   color: 'var(--text-primary)' },
                { label: 'Paid',        value: fmt(vPaid),    color: 'var(--positive)' },
                { label: 'Balance Due', value: fmt(vBalance), color: vBalance > 0 ? 'var(--negative)' : 'var(--positive)' },
                { label: 'Items',       value: `${items.length} line item${items.length !== 1 ? 's' : ''}`, color: 'var(--text-primary)' },
              ].map(cell => (
                <div key={cell.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6, color: 'var(--text-muted)', marginBottom: 4 }}>{cell.label}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: cell.color }}>{cell.value}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, marginBottom: 24 }}>
              <div>
                <SectionLabel>Order Info</SectionLabel>
                <ViewRow label="Order Status"  value="" badge={viewTarget.status} />
                <ViewRow label="Production"    value={viewTarget.production} />
                <ViewRow label="Channel"       value="Online Store" />
                <ViewRow label="Created"       value={viewTarget.created_at?.slice(0, 10)} />
                <ViewRow label="Due Date"      value={viewTarget.due_date || '\u2014'} />
              </div>
              <div>
                <SectionLabel>Delivery</SectionLabel>
                <ViewRow label="Method"   value={viewTarget.delivery_method} />
                <ViewRow label="Customer" value={viewTarget.customer_name} />
                {viewTarget.delivery_address && viewTarget.delivery_address !== '\u2014' && (
                  <div style={{ paddingTop: 9 }}>
                    <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 4 }}>Address</div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-primary)', lineHeight: 1.5 }}>{viewTarget.delivery_address}</div>
                  </div>
                )}
              </div>
            </div>

            {items.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <SectionLabel>Order Items</SectionLabel>
                <table className="data-table" style={{ fontSize: 12.5 }}>
                  <thead><tr><th>Product</th><th>SKU</th><th style={{ textAlign: 'right' }}>Qty</th><th style={{ textAlign: 'right' }}>Unit Price</th><th style={{ textAlign: 'right' }}>Total</th></tr></thead>
                  <tbody>
                    {items.map(item => (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 500 }}>{item.name}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: 11.5, color: 'var(--text-muted)' }}>{item.sku}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{item.qty.toLocaleString()}</td>
                        <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{fmt(item.unitPrice)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--accent)' }}>{fmt(item.total)}</td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: '2px solid var(--border)' }}>
                      <td colSpan={4} style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-muted)', paddingTop: 8 }}>Subtotal</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, paddingTop: 8 }}>{fmt(vTotal)}</td>
                    </tr>
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-muted)' }}>SST</td>
                      <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-muted)' }}>{fmt(vTax)}</td>
                    </tr>
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'right', fontWeight: 700 }}>Grand Total</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 13.5, color: 'var(--text-primary)' }}>{fmt(vGrand)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {payments.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <SectionLabel>Payment History</SectionLabel>
                <table className="data-table" style={{ fontSize: 12.5 }}>
                  <thead><tr><th>Date</th><th>Method</th><th>Reference</th><th>Status</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead>
                  <tbody>
                    {payments.map(p => (
                      <tr key={p.id}>
                        <td style={{ color: 'var(--text-muted)' }}>{p.date}</td>
                        <td>{p.method}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: 11.5, color: 'var(--text-muted)' }}>{p.ref}</td>
                        <td><span className={p.status === 'Captured' ? 'badge badge-success' : p.status === 'Pending' ? 'badge badge-warning' : 'badge badge-danger'}>{p.status}</span></td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--positive)' }}>{fmt(p.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {viewTarget.notes && (
              <div>
                <SectionLabel>Notes</SectionLabel>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{viewTarget.notes}</div>
              </div>
            )}

            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button className="btn-secondary" style={{ fontSize: 12, gap: 5 }} onClick={() => { setViewTarget(null); router.push(`/orders/${viewTarget.id}`) }}>
                Open full order in dashboard &rarr;
              </button>
            </div>
          </ViewModal>
        )
      })()}

      {bulk.bulkDelOpen && (
        <ConfirmModal
          title={`Delete ${bulk.selectedIds.size} orders?`}
          message="This will permanently remove all selected orders. This cannot be undone."
          confirmLabel="Delete All"
          onConfirm={() => {
            bulk.selectedItems.forEach(o => deleteMut.mutate(o.id))
            bulk.clearSelection(); bulk.setBulkDelOpen(false)
          }}
          onCancel={() => bulk.setBulkDelOpen(false)}
        />
      )}

      {delTarget && (
        <ConfirmModal
          title={`Delete ${delTarget.seq_id}?`}
          message={`This will permanently remove the order for ${delTarget.customer_name}. This action cannot be undone.`}
          confirmLabel="Delete Order"
          onConfirm={handleDelete}
          onCancel={() => setDelTarget(null)}
        />
      )}
    </MyStoreShell>
  )
}
