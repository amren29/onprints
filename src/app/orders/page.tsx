'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import CreateToast from '@/components/CreateToast'
import DateRangePicker from '@/components/DateRangePicker'
import ConfirmModal from '@/components/ConfirmModal'
import RowMenu from '@/components/RowMenu'
import ViewModal, { ViewRow, SectionLabel } from '@/components/ViewModal'
import { getOrders, updateOrder, deleteOrder, type DbOrder } from '@/lib/db/orders'
import StatusSelect from '@/components/StatusSelect'
import { useAuthStore } from '@/lib/store/auth-store'
import { useShop } from '@/providers/shop-provider'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const ExportIcon = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>)
const PlusIcon  = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>)
const SearchIcon = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>)
const OrderIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>)
const ClockIcon = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>)
const GlobeIcon = () => (<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>)
const PenIcon   = () => (<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>)
const BoardIcon = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="11" rx="1"/><rect x="17" y="3" width="5" height="15" rx="1"/></svg>)

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
  '—':             '',
}
const TABS = ['All', 'Pending', 'Confirmed', 'Cancelled']
const fmt  = (n: number) => `RM ${n.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`

type OrderStatus = 'Pending' | 'Confirmed' | 'Cancelled'

export default function OrdersPage() {
  const router = useRouter()
  const { shopId } = useShop()
  const qc = useQueryClient()

  const { data: orders = [] } = useQuery({
    queryKey: ['orders', shopId],
    queryFn: () => getOrders(shopId),
    enabled: !!shopId,
  })

  const [tab, setTab]               = useState('All')
  const [search, setSearch]         = useState('')
  const [delTarget, setDelTarget]   = useState<DbOrder | null>(null)
  const [viewTarget, setViewTarget] = useState<DbOrder | null>(null)

  const ORDER_STATUSES: OrderStatus[] = ['Pending', 'Confirmed', 'Cancelled']

  const updateMut = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof updateOrder>[2] }) =>
      updateOrder(shopId, id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders', shopId] }),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteOrder(shopId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders', shopId] }),
  })

  const handleStatusChange = (o: DbOrder, newStatus: string) => {
    const payments = newStatus === 'Confirmed'
      ? ((o.payments as any[]) || []).map((p: any) => p.status === 'Pending' ? { ...p, status: 'Captured' } : p)
      : newStatus === 'Cancelled'
        ? ((o.payments as any[]) || []).map((p: any) => p.status === 'Pending' ? { ...p, status: 'Failed' } : p)
        : o.payments
    updateMut.mutate({ id: o.id, updates: { status: newStatus, payments } })
  }

  const filtered = orders.filter(o => {
    if (tab !== 'All' && o.status !== tab) return false
    if (search && !o.seq_id.toLowerCase().includes(search.toLowerCase()) &&
        !o.customer_name.toLowerCase().includes(search.toLowerCase()) &&
        !o.agent_name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const pending   = orders.filter(o => o.status === 'Pending').length
  const confirmed = orders.filter(o => o.status === 'Confirmed').length
  const totalRev  = orders.filter(o => o.status !== 'Cancelled').reduce((s, o) => s + (o.grand_total ?? (o.items as any[]).reduce((si: number, i: any) => si + i.total, 0)), 0)
  const inProd    = orders.filter(o => ['In Progress', 'Quality Check'].includes(o.production)).length

  const handleDelete = () => {
    if (!delTarget) return
    deleteMut.mutate(delTarget.id)
    // Sync: also remove from online store auth store
    useAuthStore.getState().removeOrder(delTarget.id)
    setDelTarget(null)
  }

  const handleExport = () => {
    const headers = ['Order ID', 'Customer', 'Agent', 'Source', 'Status', 'Production', 'Due Date', 'Items', 'Total (RM)', 'Created']
    const rows = filtered.map(o => {
      const total = o.grand_total ?? (o.items as any[]).reduce((s: number, i: any) => s + i.total, 0)
      return [
        o.seq_id, o.customer_name, o.agent_name || '', o.source === 'online-store' ? 'Online' : 'Manual',
        o.status, o.production, o.due_date, (o.items as any[]).length, total.toFixed(2), o.created_at,
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    })
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `orders_${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <AppShell>
      <CreateToast param="created" title="Order created successfully" subtitle="The new order has been added to your list" basePath="/orders" />
      <CreateToast param="saved" title="Order updated successfully" subtitle="Changes have been saved" basePath="/orders" />
      <div className="page-header">
        <div>
          <div className="page-title">Orders</div>
          <div className="page-subtitle">{orders.length} orders this month</div>
        </div>
        <div className="page-actions">
          <DateRangePicker />
          <button className="topbar-btn" onClick={handleExport}><ExportIcon /><span>Export</span></button>
          <Link href="/orders/kanban" className="topbar-btn" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><BoardIcon /> Board</Link>
          <Link href="/orders/new" className="btn-primary"><PlusIcon /> New Order</Link>
        </div>
      </div>

      <div className="finance-stats">
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-label"><OrderIcon /> Total Orders</div></div>
          <div className="stat-value">{orders.length}</div>
          <div className="stat-vs">{confirmed} confirmed</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-label"><ClockIcon /> Pending</div></div>
          <div className="stat-value" style={{ color: 'var(--warning)' }}>{pending}</div>
          <div className="stat-vs">Awaiting confirmation</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-label"><OrderIcon /> In Production</div></div>
          <div className="stat-value" style={{ color: 'var(--accent, #006AFF)' }}>{inProd}</div>
          <div className="stat-vs">Active on floor</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-label"><OrderIcon /> Revenue</div></div>
          <div className="stat-value" style={{ fontSize: 20 }}>{fmt(totalRev)}</div>
          <div className="stat-vs">Excl. cancelled</div>
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
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search orders…"
                style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12.5, color: 'var(--text-primary)', width: 180 }} />
            </div>
          </div>
        </div>

        <div className="card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Source</th>
                <th>Agent</th>
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
                <tr><td colSpan={10}><div className="empty-state">No orders found</div></td></tr>
              )}
              {filtered.map(o => {
                const items = o.items as any[]
                const subtotal = items.reduce((s: number, i: any) => s + i.total, 0)
                const total = o.grand_total ?? subtotal
                const isOnline = o.source === 'online-store'
                return (
                  <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/orders/${o.id}`)}>
                    <td>
                      <button onClick={e => { e.stopPropagation(); setViewTarget(o) }} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
                        <div className="cell-name" style={{ color: 'var(--accent)' }}>{o.seq_id}</div>
                        <div className="cell-sub">{o.created_at}</div>
                      </button>
                    </td>
                    <td style={{ fontSize: 12.5, color: 'var(--text-primary)', fontWeight: 500 }}>{o.customer_name}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 500, color: isOnline ? 'var(--accent)' : 'var(--text-muted)' }}>
                        {isOnline ? <><GlobeIcon /> Online</> : <><PenIcon /> Manual</>}
                      </span>
                    </td>
                    <td style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{o.agent_name || '—'}</td>
                    <td style={{ fontWeight: 600, fontSize: 13, textAlign: 'center' }}>{items.length}</td>
                    <td style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{fmt(total)}</td>
                    <td onClick={e => e.stopPropagation()}><StatusSelect value={o.status} onChange={(v) => handleStatusChange(o, v)} options={ORDER_STATUSES} /></td>
                    <td>
                      {o.production !== '—'
                        ? <span className={PROD_BADGE[o.production]}>{o.production}</span>
                        : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                      }
                    </td>
                    <td style={{ fontSize: 12.5, color: new Date(o.due_date) < new Date() && o.status !== 'Cancelled' ? 'var(--negative)' : 'var(--text-secondary)', fontWeight: new Date(o.due_date) < new Date() && o.status !== 'Cancelled' ? 600 : 400 }}>
                      {o.due_date}
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <RowMenu items={[
                        { label: 'View',   action: () => setViewTarget(o) },
                        { label: 'Edit',   action: () => router.push(`/orders/${o.id}`) },
                        { label: 'Delete', action: () => setDelTarget(o), danger: true },
                      ]} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {viewTarget && (() => {
        const items = viewTarget.items as any[]
        const subtotal = viewTarget.subtotal ?? items.reduce((s: number, i: any) => s + i.total, 0)
        const total = viewTarget.grand_total ?? subtotal
        const isOnline = viewTarget.source === 'online-store'
        const payments = (viewTarget.payments as any[]) || []
        const paid = payments.filter((p: any) => p.status === 'Captured').reduce((s: number, p: any) => s + p.amount, 0)
        const balance = total - paid
        return (
          <ViewModal
            title={viewTarget.seq_id}
            subtitle={`${viewTarget.customer_name} · ${isOnline ? 'Online Store' : 'Manual'}`}
            status={viewTarget.status}
            onClose={() => setViewTarget(null)}
            onEdit={() => { setViewTarget(null); router.push(`/orders/${viewTarget.id}`) }}
          >
            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24, padding: 16, background: 'var(--bg, #f8f9fa)', borderRadius: 10, border: '1px solid var(--border, #e5e7eb)' }}>
              {[
                { label: 'Grand Total', value: fmt(total),   color: 'var(--text-primary)' },
                { label: 'Paid',        value: fmt(paid),    color: 'var(--positive)' },
                { label: 'Balance Due', value: fmt(balance), color: balance > 0 ? 'var(--negative)' : 'var(--positive)' },
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
                <ViewRow label="Order Status" value="" badge={viewTarget.status} />
                <ViewRow label="Production" value={viewTarget.production} />
                <ViewRow label="Channel" value={isOnline ? 'Online Store' : 'Manual'} />
                <ViewRow label="Created" value={viewTarget.created_at} />
                <ViewRow label="Due Date" value={viewTarget.due_date || '—'} />
              </div>
              <div>
                <SectionLabel>Delivery</SectionLabel>
                <ViewRow label="Method" value={viewTarget.delivery_method} />
                <ViewRow label="Customer" value={viewTarget.customer_name} />
                {viewTarget.agent_name && <ViewRow label="Agent" value={viewTarget.agent_name} />}
                {viewTarget.delivery_address && viewTarget.delivery_address !== '—' && (
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
                    {items.map((item: any, i: number) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 500 }}>{item.name}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: 11.5, color: 'var(--text-muted)' }}>{item.sku || '—'}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{item.qty.toLocaleString()}</td>
                        <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{fmt(item.unitPrice)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--accent)' }}>{fmt(item.total)}</td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: '2px solid var(--border)' }}>
                      <td colSpan={4} style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-muted)', paddingTop: 8 }}>Subtotal</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, paddingTop: 8 }}>{fmt(subtotal)}</td>
                    </tr>
                    {viewTarget.discount > 0 && (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-muted)' }}>Discount{viewTarget.discount_type === 'percent' ? ` (${viewTarget.discount}%)` : ''}</td>
                        <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--negative)' }}>-{fmt(viewTarget.discount_type === 'percent' ? subtotal * viewTarget.discount / 100 : viewTarget.discount)}</td>
                      </tr>
                    )}
                    {viewTarget.sst_enabled && (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-muted)' }}>SST ({viewTarget.sst_rate}%)</td>
                        <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-muted)' }}>{fmt(viewTarget.sst_amount)}</td>
                      </tr>
                    )}
                    {(viewTarget.shipping_cost ?? 0) > 0 && (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-muted)' }}>Shipping</td>
                        <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-muted)' }}>{fmt(viewTarget.shipping_cost)}</td>
                      </tr>
                    )}
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'right', fontWeight: 700 }}>Grand Total</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 13.5, color: 'var(--text-primary)' }}>{fmt(total)}</td>
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
                    {payments.map((p: any) => (
                      <tr key={p.id}>
                        <td style={{ color: 'var(--text-muted)' }}>{p.date}</td>
                        <td>{p.method}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: 11.5, color: 'var(--text-muted)' }}>{p.ref || '—'}</td>
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
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginTop: 6, padding: '12px 14px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>{viewTarget.notes}</p>
              </div>
            )}
          </ViewModal>
        )
      })()}

      {delTarget && (
        <ConfirmModal
          title={`Delete ${delTarget.seq_id}?`}
          message={`This will permanently remove the order for ${delTarget.customer_name}. This action cannot be undone.`}
          confirmLabel="Delete Order"
          onConfirm={handleDelete}
          onCancel={() => setDelTarget(null)}
        />
      )}

    </AppShell>
  )
}
