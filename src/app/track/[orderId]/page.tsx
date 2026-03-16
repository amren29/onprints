'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { getOrderById, type DbOrder } from '@/lib/db/orders'
import { fetchStoreSettings } from '@/lib/store-settings-store'

const SHOP_ID = process.env.NEXT_PUBLIC_SHOP_ID!

/* ── Icons ─────────────────────────────────────────── */
const CheckIcon    = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>)
const ClockIcon    = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>)
const TruckIcon    = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>)
const BoxIcon      = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>)
const SearchIcon   = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>)
const WhatsAppIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>)

/* ── Helpers ────────────────────────────────────────── */
const fmt = (n: number) => `RM ${n.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`

/* Status pipeline */
const PIPELINE = [
  { key: 'order_placed',      label: 'Order Placed',        icon: CheckIcon },
  { key: 'confirmed',         label: 'Confirmed',           icon: CheckIcon },
  { key: 'in_production',     label: 'In Production',       icon: BoxIcon },
  { key: 'quality_check',     label: 'Quality Check',       icon: CheckIcon },
  { key: 'ready',             label: 'Ready / Shipped',     icon: TruckIcon },
  { key: 'delivered',         label: 'Delivered / Collected', icon: CheckIcon },
]

function getActiveStep(order: DbOrder): number {
  if (order.status === 'Pending')   return 0
  if (order.status === 'Cancelled') return -1
  // Confirmed — map production status
  const p = order.production
  if (p === '—' || p === 'Queued')         return 1
  if (p === 'In Progress')                 return 2
  if (p === 'Quality Check')               return 3
  if (p === 'Completed' || p === 'Shipped')return 4
  if (p === 'Delivered')                   return 5
  return 1
}

function statusColor(order: DbOrder) {
  if (order.status === 'Cancelled') return 'var(--negative)'
  if (order.status === 'Pending')   return 'var(--warning)'
  const p = order.production
  if (p === 'Delivered') return '#16a34a'
  return '#006AFF'
}

function timeAgo(iso: string) {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  const m  = Math.floor(ms / 60000)
  if (m < 60)  return `${m}m ago`
  const h  = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  const d  = Math.floor(h / 24)
  return `${d}d ago`
}

/* ════════════════════════════════════════════════════ */
export default function TrackOrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params)
  const [order,      setOrder]      = useState<DbOrder | null | undefined>(undefined) // undefined=loading
  const [storePhone, setStorePhone] = useState('')
  const [storeName,  setStoreName]  = useState('Kinabalu Print Shop')
  const [query,      setQuery]      = useState(orderId || '')
  const [searched,   setSearched]   = useState(!!orderId)

  useEffect(() => {
    fetchStoreSettings().then(settings => {
      setStorePhone(settings.whatsapp || '60123456789')
      if (settings.storeName) setStoreName(settings.storeName)
    }).catch(() => {})
    if (orderId) {
      getOrderById(SHOP_ID, orderId).then(o => setOrder(o ?? null)).catch(() => setOrder(null))
    }
  }, [orderId])

  const handleSearch = () => {
    if (!query.trim()) return
    setSearched(true)
    setOrder(undefined) // loading
    getOrderById(SHOP_ID, query.trim()).then(o => setOrder(o ?? null)).catch(() => setOrder(null))
  }

  const orderItems = (order?.items ?? []) as any[]
  const subtotal  = order ? orderItems.reduce((s: number, i: any) => s + (i.total ?? 0), 0) : 0
  const tax       = subtotal * 0.08
  const grandTotal= subtotal + tax
  const activeStep= order ? getActiveStep(order) : -1

  const waMsg = order
    ? encodeURIComponent(`Hi! I'd like to follow up on my order *${order.seq_id || order.id}*. Could you please update me on the status? Thank you!`)
    : ''

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'Inter, sans-serif' }}>
      {/* Topbar */}
      <header style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: '#1a2744' }}>
          {storeName}
        </div>
        <div style={{ fontSize: 12.5, color: '#006AFF', fontWeight: 600 }}>Order Tracking</div>
      </header>

      <main style={{ maxWidth: 680, margin: '0 auto', padding: '32px 16px' }}>
        {/* Search bar */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#1a2744', marginBottom: 4 }}>Track Your Order</div>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>Enter your order ID (e.g. ORD-0001) to check the status</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="ORD-0001"
              style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1.5px solid var(--border)', fontSize: 13.5, fontFamily: 'monospace', outline: 'none', color: 'var(--text-primary)' }}
            />
            <button
              onClick={handleSearch}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 8, background: '#006AFF', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13.5, fontWeight: 600 }}
            >
              <SearchIcon /> Track
            </button>
          </div>
        </div>

        {/* Loading */}
        {order === undefined && searched && (
          <div style={{ textAlign: 'center', padding: 48, color: '#9ca3af', fontSize: 13 }}>Loading…</div>
        )}

        {/* Not found */}
        {order === null && searched && (
          <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: 40, textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#1a2744', marginBottom: 6 }}>Order not found</div>
            <div style={{ fontSize: 13, color: '#6b7280' }}>We couldn't find an order with that ID. Please double-check and try again.</div>
            {storePhone && (
              <a href={`https://wa.me/${storePhone}?text=${encodeURIComponent('Hi! I need help finding my order.')}`} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 20, padding: '10px 18px', borderRadius: 8, background: '#25D366', color: '#fff', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
                <WhatsAppIcon /> Contact Us
              </a>
            )}
          </div>
        )}

        {/* Order found */}
        {order && (
          <>
            {/* Header card */}
            <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 800, color: '#006AFF' }}>{order.seq_id || order.id}</div>
                  <div style={{ fontSize: 13, color: '#6b7280', marginTop: 3 }}>Placed {new Date(order.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })} · {order.customer_name}</div>
                </div>
                <span style={{
                  padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                  background: `${statusColor(order)}18`, color: statusColor(order),
                  border: `1px solid ${statusColor(order)}40`,
                }}>
                  {order.status === 'Cancelled' ? 'Cancelled' : order.production !== '—' ? order.production : order.status}
                </span>
              </div>

              {/* Progress pipeline */}
              {order.status !== 'Cancelled' && (
                <div style={{ marginBottom: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0, position: 'relative' }}>
                    {/* Connector line */}
                    <div style={{ position: 'absolute', top: 16, left: 16, right: 16, height: 2, background: 'var(--border)', zIndex: 0 }} />
                    <div style={{ position: 'absolute', top: 16, left: 16, height: 2, background: '#006AFF', zIndex: 1, width: activeStep <= 0 ? '0%' : `${Math.min(100, (activeStep / (PIPELINE.length - 1)) * 100)}%`, transition: 'width 0.6s ease' }} />

                    {PIPELINE.map((step, idx) => {
                      const done    = idx < activeStep
                      const current = idx === activeStep
                      return (
                        <div key={step.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, position: 'relative', zIndex: 2 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: done || current ? '#006AFF' : 'var(--bg-card)',
                            border: `2px solid ${done || current ? '#006AFF' : '#d1d5db'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: done || current ? '#fff' : '#9ca3af',
                            boxShadow: current ? '0 0 0 4px rgba(0,106,255,0.15)' : 'none',
                            transition: 'all 0.3s',
                          }}>
                            {done ? <CheckIcon /> : <step.icon />}
                          </div>
                          <div style={{ fontSize: 9.5, fontWeight: current ? 700 : 500, color: done || current ? '#006AFF' : '#9ca3af', marginTop: 6, textAlign: 'center', maxWidth: 60, lineHeight: 1.3 }}>
                            {step.label}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {order.status === 'Cancelled' && (
                <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, fontSize: 13, color: '#dc2626' }}>
                  This order has been cancelled. Please contact us if you have any questions.
                </div>
              )}
            </div>

            {/* Order items */}
            <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1a2744', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Order Items</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {orderItems.map((item: any) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: '#111' }}>{item.name}</div>
                      {item.optionSummary && <div style={{ fontSize: 11.5, color: '#6b7280', marginTop: 2 }}>{item.optionSummary}</div>}
                      <div style={{ fontSize: 11.5, color: '#9ca3af', marginTop: 2 }}>Qty: {(item.qty ?? 0).toLocaleString()} × {fmt(item.unitPrice ?? 0)}</div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: '#006AFF', whiteSpace: 'nowrap' }}>{fmt(item.total ?? 0)}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '2px solid var(--border)' }}>
                {[
                  { label: 'Subtotal', value: fmt(subtotal), bold: false },
                  { label: 'SST (8%)', value: fmt(tax),      bold: false },
                ].map(r => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: '#6b7280' }}>
                    <span>{r.label}</span><span>{r.value}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 15, color: '#1a2744', marginTop: 8 }}>
                  <span>Grand Total</span><span style={{ color: '#006AFF' }}>{fmt(grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Delivery & Timeline */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1a2744', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>Delivery</div>
                <div style={{ fontSize: 13, color: '#374151', marginBottom: 4 }}><strong>{order.delivery_method}</strong></div>
                {order.delivery_address && order.delivery_address !== '—' && (
                  <div style={{ fontSize: 12.5, color: '#6b7280', lineHeight: 1.5 }}>{order.delivery_address}</div>
                )}
                {order.due_date && (
                  <div style={{ marginTop: 10, fontSize: 12, color: '#6b7280' }}>
                    <span style={{ fontWeight: 600, color: '#374151' }}>Est. Ready:</span> {new Date(order.due_date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                )}
              </div>

              <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1a2744', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>Timeline</div>
                {(order.timeline as any[]).length === 0 ? (
                  <div style={{ fontSize: 12.5, color: '#9ca3af' }}>No activity yet</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(order.timeline as any[]).slice().reverse().slice(0, 4).map((t: any) => (
                      <div key={t.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#006AFF', marginTop: 5, flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>{t.event}</div>
                          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{timeAgo(t.date)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Help / WhatsApp */}
            <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#1a2744' }}>Need help with your order?</div>
                <div style={{ fontSize: 12.5, color: '#6b7280', marginTop: 2 }}>Send us a WhatsApp message and we'll get back to you shortly.</div>
              </div>
              <a
                href={`https://wa.me/${storePhone}?text=${waMsg}`}
                target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 8, background: '#25D366', color: '#fff', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}
              >
                <WhatsAppIcon /> WhatsApp Us
              </a>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
