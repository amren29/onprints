'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import { getOrders, updateOrder, type DbOrder } from '@/lib/db/orders'
import { useAuthStore } from '@/lib/store/auth-store'
import { useShop } from '@/providers/shop-provider'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

/* ── Icons ──────────────────────────────────────────── */
const ListIcon    = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>)
const BoardIcon   = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="11" rx="1"/><rect x="17" y="3" width="5" height="15" rx="1"/></svg>)
const GlobeIcon   = () => (<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>)
const ExternalIcon = () => (<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>)

/* ── Column config ──────────────────────────────────── */
type ProductionStatus = 'Queued' | 'In Progress' | 'Quality Check' | 'Completed' | 'Shipped' | 'Delivered'

const COLUMNS: { status: ProductionStatus; label: string; color: string; bg: string }[] = [
  { status: 'Queued',        label: 'Queued',         color: '#6b7280', bg: '#f3f4f6' },
  { status: 'In Progress',   label: 'In Progress',    color: '#d97706', bg: '#fef3c7' },
  { status: 'Quality Check', label: 'Quality Check',  color: '#7c3aed', bg: '#ede9fe' },
  { status: 'Completed',     label: 'Completed',      color: '#059669', bg: '#d1fae5' },
  { status: 'Shipped',       label: 'Shipped',        color: '#0284c7', bg: '#e0f2fe' },
  { status: 'Delivered',     label: 'Delivered',      color: '#16a34a', bg: '#dcfce7' },
]

const STATUS_COL: Record<string, string> = {
  Queued: '#6b7280', 'In Progress': '#d97706', 'Quality Check': '#7c3aed',
  Completed: '#059669', Shipped: '#0284c7', Delivered: '#16a34a', '—': '#9ca3af',
}

function orderTotal(o: DbOrder) {
  return (o.items as any[]).reduce((s: number, i: any) => s + i.total, 0)
}
function isOverdue(o: DbOrder) {
  if (!o.due_date) return false
  return new Date(o.due_date) < new Date() && o.production !== 'Delivered' && o.production !== 'Completed'
}

/* ════════════════════════════════════════════════════ */
export default function OrdersKanbanPage() {
  const { shopId } = useShop()
  const qc = useQueryClient()

  const { data: orders = [] } = useQuery({
    queryKey: ['orders', shopId],
    queryFn: () => getOrders(shopId),
    enabled: !!shopId,
  })

  const updateMut = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof updateOrder>[2] }) =>
      updateOrder(shopId, id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders', shopId] }),
    onError: (err: any) => {
      console.error('[updateOrder]', err)
      alert('Failed to update: ' + (err?.message || 'Unknown error'))
    },
  })

  const [filterStatus, setFilterStatus] = useState<'All' | 'manual' | 'online-store'>('All')
  const [draggingId, setDraggingId]     = useState<string | null>(null)
  const [dragOver, setDragOver]         = useState<ProductionStatus | null>(null)
  const [toast, setToast]               = useState('')
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    if (toastRef.current) clearTimeout(toastRef.current)
    toastRef.current = setTimeout(() => setToast(''), 2800)
  }

  /* ── Filter ── */
  const visibleOrders = orders.filter(o => {
    if (o.production === '—') return false   // no production status yet
    if (filterStatus === 'manual' && o.source !== 'manual') return false
    if (filterStatus === 'online-store' && o.source !== 'online-store') return false
    return true
  })

  /* ── Drag handlers ── */
  const handleDragStart = (e: React.DragEvent, orderId: string) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('orderId', orderId)
    setDraggingId(orderId)
  }
  const handleDragEnd   = () => { setDraggingId(null); setDragOver(null) }
  const handleDragOver  = (e: React.DragEvent, colStatus: ProductionStatus) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(colStatus)
  }
  const handleDrop      = (e: React.DragEvent, colStatus: ProductionStatus) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('orderId')
    if (!id) return
    updateMut.mutate({ id, updates: { production: colStatus } })
    const order = orders.find(o => o.id === id)
    if (order?.source === 'online-store') {
      useAuthStore.getState().updateOrderStatus(id, { production: colStatus })
    }
    setDraggingId(null)
    setDragOver(null)
    showToast(`Moved to ${colStatus}`)
  }

  const handleMoveToStatus = (order: DbOrder, newStatus: ProductionStatus) => {
    updateMut.mutate({ id: order.id, updates: { production: newStatus } })
    if (order.source === 'online-store') {
      useAuthStore.getState().updateOrderStatus(order.id, { production: newStatus })
    }
    showToast(`${order.seq_id} → ${newStatus}`)
  }

  /* ── Pending/Cancelled orders (shown in sidebar) ── */
  const pendingOrders = orders.filter(o => o.production === '—' && o.status !== 'Cancelled')
  const totalOrders   = visibleOrders.length

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <div className="page-title">Production Board</div>
          <div className="page-subtitle">Drag orders between columns to update production status</div>
        </div>
        <div className="page-actions">
          {/* Filter pills */}
          <div style={{ display: 'flex', gap: 4, marginRight: 8 }}>
            {(['All', 'manual', 'online-store'] as const).map(f => (
              <button key={f} onClick={() => setFilterStatus(f)} style={{
                padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
                background: filterStatus === f ? 'var(--accent)' : 'transparent',
                color: filterStatus === f ? '#fff' : 'var(--text-secondary)',
                fontFamily: 'Inter,sans-serif',
              }}>{f === 'All' ? 'All' : f === 'manual' ? 'Manual' : 'Online'}</button>
            ))}
          </div>
          <Link href="/orders" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1.5px solid var(--border)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
            <ListIcon /> List View
          </Link>
        </div>
      </div>

      {/* Summary strip */}
      <div style={{ display: 'flex', gap: 12, padding: '0 24px 16px', overflowX: 'auto' }}>
        {COLUMNS.map(col => {
          const count = visibleOrders.filter(o => o.production === col.status).length
          return (
            <div key={col.status} style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: 10, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, minWidth: 120 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>{count}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{col.label}</div>
              </div>
            </div>
          )
        })}
        {pendingOrders.length > 0 && (
          <div style={{ background: '#fef3c7', border: '1.5px solid #fde68a', borderRadius: 10, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, minWidth: 120 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#d97706', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#92400e' }}>{pendingOrders.length}</div>
              <div style={{ fontSize: 10, color: '#92400e', whiteSpace: 'nowrap' }}>Unassigned</div>
            </div>
          </div>
        )}
      </div>

      {/* Kanban board */}
      <div style={{ display: 'flex', gap: 14, padding: '0 24px 32px', overflowX: 'auto', alignItems: 'flex-start', flex: 1 }}>
        {COLUMNS.map(col => {
          const colOrders = visibleOrders.filter(o => o.production === col.status)
          const isOver    = dragOver === col.status
          return (
            <div
              key={col.status}
              data-col={col.status}
              onDragOver={e => handleDragOver(e, col.status)}
              onDragLeave={() => setDragOver(null)}
              onDrop={e => handleDrop(e, col.status)}
              style={{
                flexShrink: 0, width: 260,
                background: isOver ? `${col.bg}` : 'var(--bg)',
                borderRadius: 14,
                border: `2px solid ${isOver ? col.color : 'var(--border)'}`,
                transition: 'border-color 0.15s, background 0.15s',
                minHeight: 200,
              }}
            >
              {/* Column header */}
              <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: col.color }} />
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)' }}>{col.label}</span>
                </div>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: col.color, background: col.bg, borderRadius: 20, padding: '2px 8px' }}>{colOrders.length}</span>
              </div>

              {/* Cards */}
              <div style={{ padding: '10px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {colOrders.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    isDragging={draggingId === order.id}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onMoveToStatus={(newStatus) => handleMoveToStatus(order, newStatus)}
                    columns={COLUMNS}
                  />
                ))}
                {colOrders.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '20px 10px', color: 'var(--text-muted)', fontSize: 12 }}>
                    Drop orders here
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* Unassigned column */}
        {pendingOrders.length > 0 && (
          <div style={{ flexShrink: 0, width: 260, background: 'var(--bg)', borderRadius: 14, border: '2px dashed var(--border)' }}>
            <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#d97706' }} />
                <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)' }}>Unassigned</span>
              </div>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#d97706', background: '#fef3c7', borderRadius: 20, padding: '2px 8px' }}>{pendingOrders.length}</span>
            </div>
            <div style={{ padding: '10px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pendingOrders.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  isDragging={draggingId === order.id}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onMoveToStatus={(newStatus) => handleMoveToStatus(order, newStatus)}
                  columns={COLUMNS}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', background: '#111', color: '#fff', padding: '10px 20px', borderRadius: 10, fontSize: 12.5, fontWeight: 600, zIndex: 999, boxShadow: '0 4px 20px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
          <span style={{ color: '#4ade80' }}>✓</span> {toast}
        </div>
      )}
    </AppShell>
  )
}

/* ── Order Card ─────────────────────────────────────── */
function OrderCard({
  order, isDragging, onDragStart, onDragEnd, onMoveToStatus, columns,
}: {
  order: DbOrder
  isDragging: boolean
  onDragStart: (e: React.DragEvent, id: string) => void
  onDragEnd: () => void
  onMoveToStatus: (s: ProductionStatus) => void
  columns: typeof COLUMNS
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const total   = orderTotal(order)
  const overdue = isOverdue(order)

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, order.id)}
      onDragEnd={onDragEnd}
      style={{
        background: 'var(--bg-card)',
        borderRadius: 12,
        border: `1.5px solid ${overdue ? '#fecaca' : 'var(--border)'}`,
        padding: '12px 14px',
        cursor: 'grab',
        opacity: isDragging ? 0.4 : 1,
        transition: 'opacity 0.15s, box-shadow 0.15s',
        boxShadow: isDragging ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
        position: 'relative',
      }}
      onMouseEnter={e => { if (!isDragging) (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)' }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <Link href={`/orders/${order.id}`} style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--accent)', textDecoration: 'none', letterSpacing: '0.02em' }}>{order.seq_id}</Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {order.source === 'online-store' && (
            <span title="Online Store" style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center' }}><GlobeIcon /></span>
          )}
          {/* Quick move menu */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={e => { e.stopPropagation(); setMenuOpen(v => !v) }}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px 4px', borderRadius: 4, color: 'var(--text-muted)', fontSize: 14, lineHeight: 1 }}
            >⋯</button>
            {menuOpen && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setMenuOpen(false)} />
                <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', zIndex: 50, minWidth: 160, overflow: 'hidden' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 12px 4px' }}>Move to</div>
                  {columns.map(col => (
                    <button key={col.status} onClick={() => { onMoveToStatus(col.status); setMenuOpen(false) }} style={{ width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12.5, fontWeight: 500, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Inter,sans-serif' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color, flexShrink: 0 }} />
                      {col.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Customer */}
      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6, lineHeight: 1.3 }}>{order.customer_name}</div>

      {/* Items summary */}
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.4 }}>
        {(order.items as any[]).length > 0
          ? (order.items as any[]).slice(0, 2).map((i: any) => `${i.qty.toLocaleString()}× ${i.name}`).join(', ') + ((order.items as any[]).length > 2 ? ` +${(order.items as any[]).length - 2} more` : '')
          : 'No items'}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {/* Order status badge */}
          <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20,
            background: order.status === 'Confirmed' ? 'rgba(22,163,74,0.12)' : order.status === 'Pending' ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.1)',
            color: order.status === 'Confirmed' ? '#16a34a' : order.status === 'Pending' ? '#d97706' : '#ef4444',
          }}>{order.status}</span>
          {overdue && <span style={{ fontSize: 10, fontWeight: 600, color: '#ef4444', background: 'rgba(239,68,68,0.08)', borderRadius: 20, padding: '2px 7px' }}>Overdue</span>}
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: total > 0 ? 'var(--accent)' : 'var(--text-muted)' }}>
          {total > 0 ? `RM ${total.toFixed(0)}` : '—'}
        </div>
      </div>

      {order.due_date && (
        <div style={{ marginTop: 6, fontSize: 10.5, color: overdue ? '#ef4444' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
          {overdue ? '⚠ Due ' : '📅 '}{order.due_date}
        </div>
      )}
    </div>
  )
}
