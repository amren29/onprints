'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import DateRangePicker from '@/components/DateRangePicker'
import { getOrders, type DbOrder } from '@/lib/db/orders'
import { getPayments } from '@/lib/db/payments'
import { getStockItems } from '@/lib/db/inventory'
import { getStoreSettings } from '@/lib/db/storefront'
import { getProducts } from '@/lib/db/catalog'
import { useShop } from '@/providers/shop-provider'
import { useQuery } from '@tanstack/react-query'

type Order = DbOrder

/* ── Icons ─────────────────────────────────────────── */
const PlusIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>)
const SendIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>)
const EyeIcon  = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>)
const DotsIcon = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>)
const TrendIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>)
const ArrowUpIcon = () => (<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>)
const ArrowDownIcon = () => (<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>)
const FilterIcon = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>)
const SortIcon = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>)
const ChevronRightIcon = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>)
const ManageIcon = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>)
const OrdersIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>)
const AlertIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>)
const InvoiceIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>)
const UserIcon = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>)

/* ── Helpers ────────────────────────────────────────── */
const fmtRM  = (n: number) => `RM ${n.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`
const fmtRMK = (n: number) => n >= 1000 ? `RM ${(n / 1000).toFixed(1)}K` : `RM ${n.toFixed(0)}`

const initials = (name: string) =>
  name.trim().split(/\s+/).map(w => w[0]?.toUpperCase() ?? '').slice(0, 2).join('')

const ICON_COLORS = ['green', 'amber', 'blue', 'red', 'purple']
const iconColor   = (name: string) => ICON_COLORS[name.charCodeAt(0) % ICON_COLORS.length]

function orderGrandTotal(o: Order): number {
  if (o.grand_total != null && o.grand_total > 0) return o.grand_total
  const items = (o.items ?? []) as { total?: number }[]
  return items.reduce((s, i) => s + (i.total ?? 0), 0)
}

/* ── Chart data generators ───────────────────────────── */
function groupByDay(orders: Order[], days: number): number[] {
  const today = new Date()
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (days - 1 - i))
    const key = d.toISOString().slice(0, 10)
    return orders.filter(o => (o.created_at ?? '').slice(0, 10) === key).reduce((s, o) => s + orderGrandTotal(o), 0)
  })
}

function groupByWeek(orders: Order[], weeks: number): number[] {
  const today = new Date()
  return Array.from({ length: weeks }, (_, i) => {
    const wEnd = new Date(today); wEnd.setDate(today.getDate() - (weeks - 1 - i) * 7)
    const wStart = new Date(wEnd); wStart.setDate(wEnd.getDate() - 6)
    return orders.filter(o => { const d = new Date(o.created_at); return d >= wStart && d <= wEnd })
      .reduce((s, o) => s + orderGrandTotal(o), 0)
  })
}

function periodLabels(count: number, stepDays: number): string[] {
  const today = new Date()
  const step  = Math.floor(count / 4)
  return Array.from({ length: 4 }, (_, i) => {
    const idx = i * step + Math.floor(step / 2)
    const d   = new Date(today)
    d.setDate(today.getDate() - (count - 1 - idx) * stepDays)
    return d.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })
  })
}

/* ── Revenue Chart ───────────────────────────────────── */
function RevenueChart({ rev, cost, labels, selectedBar, onBarClick }: { rev: number[]; cost: number[]; labels: string[]; selectedBar: number | null; onBarClick: (i: number | null) => void }) {
  const [hovered, setHovered] = useState<number | null>(null)
  const CHART_W = 600, CHART_H = 180, PAD_LEFT = 52, PAD_BOT = 24, PAD_TOP = 12
  const midY    = Math.round(CHART_H * 0.52)
  const maxUpH  = midY - PAD_TOP
  const maxDownH= CHART_H - PAD_BOT - midY
  const maxRev  = Math.max(...rev, 1)
  const maxCost = Math.max(...cost, 1)
  const count   = rev.length
  const barW    = count <= 20 ? 16 : 11
  const barGap  = count <= 20 ?  7 :  4
  const plotW   = CHART_W - PAD_LEFT - 4
  const usedW   = Math.min(count * (barW + barGap), plotW)
  const startX  = PAD_LEFT + (plotW - usedW) / 2
  const actStep = usedW / count

  return (
    <div style={{ width: '100%', height: 180, overflow: 'hidden', position: 'relative' }}>
      <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} width="100%" height="180" preserveAspectRatio="none" style={{ display: 'block', cursor: 'pointer' }}
        onMouseLeave={() => setHovered(null)}>
        <text x="0" y={PAD_TOP + 4}           fontSize="9" fill="var(--text-muted, #9ca3af)">{fmtRMK(maxRev)}</text>
        <text x="0" y={midY + 4}              fontSize="9" fill="var(--text-muted, #9ca3af)">RM 0</text>
        <text x="0" y={CHART_H - PAD_BOT + 4} fontSize="9" fill="var(--text-muted, #9ca3af)">{fmtRMK(maxCost)}</text>
        <line x1={PAD_LEFT} y1={midY} x2={CHART_W} y2={midY} stroke="var(--border, #e5e7eb)" strokeWidth="1" strokeDasharray="4 3" />
        {rev.map((r, i) => {
          const x    = startX + i * actStep
          const revH = Math.max(2, Math.round((r / maxRev) * maxUpH))
          const cosH = Math.max(2, Math.round(((cost[i] || 0) / maxCost) * maxDownH))
          const isActive = selectedBar === i
          const isDim = selectedBar !== null && selectedBar !== i
          const isHov = hovered === i
          return (
            <g key={i} style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHovered(i)}
              onClick={() => onBarClick(selectedBar === i ? null : i)}>
              {/* Hit area */}
              <rect x={x - 2} y={PAD_TOP} width={barW + 4} height={CHART_H - PAD_TOP - PAD_BOT} fill="transparent" />
              {/* Revenue bar */}
              <rect x={x} y={midY - revH} width={barW} height={revH}
                fill={isActive ? 'var(--accent)' : 'var(--text-muted)'} rx="2"
                opacity={isDim ? 0.3 : 1}
                style={{ transition: 'opacity 0.15s, fill 0.15s' }} />
              {/* Expense bar */}
              <rect x={x} y={midY} width={barW} height={cosH}
                fill='var(--accent)' rx="2"
                opacity={isDim ? 0.25 : 0.85}
                style={{ transition: 'opacity 0.15s, fill 0.15s' }} />
              {/* Hover highlight ring */}
              {isHov && !isActive && (
                <rect x={x - 1.5} y={midY - revH - 1.5} width={barW + 3} height={revH + cosH + 3}
                  fill="none" stroke="var(--accent, #006AFF)" strokeWidth="1.5" rx="3" opacity="0.5" />
              )}
              {/* Active top marker */}
              {isActive && (
                <rect x={x + barW / 2 - 2} y={midY - revH - 5} width={4} height={4} rx="2" fill="var(--accent, #006AFF)" />
              )}
            </g>
          )
        })}
        {labels.map((lbl, i) => {
          const seg = count / labels.length
          const x   = startX + (i * seg + seg / 2) * actStep
          return <text key={i} x={x} y={CHART_H - 6} fontSize="9.5" fill="var(--text-muted, #9ca3af)" textAnchor="middle">{lbl}</text>
        })}
        {/* Tooltip */}
        {hovered !== null && (() => {
          const x = startX + hovered * actStep + barW / 2
          const tipY = 8
          return (
            <g>
              <rect x={x - 42} y={tipY} width={84} height={28} rx="5" fill="var(--bg-card, #fff)" stroke="var(--border, #e5e7eb)" strokeWidth="1" />
              <text x={x} y={tipY + 11} fontSize="8" fill="var(--text-muted, #9ca3af)" textAnchor="middle">Rev: {fmtRMK(rev[hovered])}</text>
              <text x={x} y={tipY + 22} fontSize="8" fill="var(--text-muted, #9ca3af)" textAnchor="middle">Exp: {fmtRMK(cost[hovered] || 0)}</text>
            </g>
          )
        })()}
      </svg>
    </div>
  )
}

/* ── Stat Card ───────────────────────────────────────── */
function StatCard({ icon, label, period, value, changeLabel, changeType, vs }: {
  icon: React.ReactNode; label: string; period: string; value: string
  changeLabel: string; changeType: 'pos' | 'neg' | 'warn'; vs: string
}) {
  const cls = changeType === 'pos' ? 'stat-change-pos' : changeType === 'neg' ? 'stat-change-neg' : 'stat-change-warn'
  return (
    <div className="stat-card">
      <div className="stat-card-header">
        <div className="stat-card-label">{icon}{label}</div>
        <span className="stat-card-period">{period}</span>
      </div>
      <div className="stat-value">
        {value}
        <span className={cls}>
          {changeType === 'pos' ? <ArrowUpIcon /> : <ArrowDownIcon />}
          {changeLabel}
        </span>
      </div>
      <div className="stat-vs">{vs}</div>
    </div>
  )
}

/* ── Badge map ───────────────────────────────────────── */
const PROD_BADGE: Record<string, string> = {
  'Completed':     'badge badge-success',
  'Shipped':       'badge badge-success',
  'Delivered':     'badge badge-success',
  'In Progress':   'badge badge-info',
  'Quality Check': 'badge badge-warning',
  'Queued':        'badge badge-pending',
  '—':             'badge badge-pending',
}

/* ── Getting Started Checklist ────────────────────────── */
const CHECKLIST_ITEMS = [
  { key: 'product',  label: 'Add your first product',        href: '/catalog',    description: 'Set up your catalog with products and pricing' },
  { key: 'order',    label: 'Create your first order',       href: '/orders/new', description: 'Process a walk-in or manual order' },
  { key: 'store',    label: 'Customize your online store',   href: '/storefront', description: 'Configure your storefront branding and pages' },
  { key: 'payment',  label: 'Set up payment methods',        href: '/settings',   description: 'Add bank transfer, FPX, or e-wallet options' },
  { key: 'stock',    label: 'Add inventory items',           href: '/stock',      description: 'Track stock levels and get low-stock alerts' },
]

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

function WelcomeBanner({ storeName, onDismiss, completed }: { storeName: string; onDismiss: () => void; completed: string[] }) {
  const router = useRouter()

  const progress = Math.round((completed.length / CHECKLIST_ITEMS.length) * 100)

  return (
    <div className="card" style={{ marginBottom: 20, overflow: 'hidden' }}>
      {/* Banner header */}
      <div style={{
        background: 'var(--bg-hero)',
        padding: '24px 28px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', right: -50, top: -70, width: 220, height: 220,
          borderRadius: '50%', border: '44px solid rgba(255,255,255,0.04)', pointerEvents: 'none',
        }} />
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700, color: '#fff' }}>
              Welcome to {storeName || 'OnPrints'}!
            </h2>
            <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
              Complete these steps to get the most out of your workspace.
            </p>
          </div>
          <button onClick={onDismiss} style={{
            background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8,
            padding: '6px 12px', cursor: 'pointer', color: 'rgba(255,255,255,0.7)',
            fontSize: 12, fontWeight: 500, transition: 'background 0.15s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          >
            Dismiss
          </button>
        </div>
        {/* Progress bar */}
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 1 }}>
          <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.15)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              width: `${progress}%`, height: '100%', background: '#fff',
              borderRadius: 3, transition: 'width 0.4s ease',
            }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap' }}>
            {completed.length}/{CHECKLIST_ITEMS.length}
          </span>
        </div>
      </div>
      {/* Checklist */}
      <div style={{ padding: '8px 0' }}>
        {CHECKLIST_ITEMS.map(item => {
          const done = completed.includes(item.key)
          return (
            <div key={item.key} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '12px 24px',
              transition: 'background 0.1s',
              cursor: 'pointer',
            }}
              onClick={() => router.push(item.href)}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover, #f8fafc)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {/* Status indicator */}
              <div
                style={{
                  width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                  border: done ? 'none' : '2px solid var(--border, #d1d5db)',
                  background: done ? 'var(--accent, #006AFF)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', padding: 0,
                  transition: 'background 0.15s, border 0.15s',
                }}
              >
                {done && <CheckIcon />}
              </div>
              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: 600,
                  color: done ? 'var(--text-muted, #9ca3af)' : 'var(--text-primary, #0f172a)',
                  textDecoration: done ? 'line-through' : 'none',
                  transition: 'color 0.15s',
                }}>
                  {item.label}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted, #9ca3af)', marginTop: 1 }}>
                  {item.description}
                </div>
              </div>
              {/* Arrow */}
              <ChevronRightIcon />
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Page ────────────────────────────────────────────── */
export default function DashboardPage() {
  const { shopId } = useShop()
  const [chartPeriod, setChartPeriod] = useState<'weekly' | 'daily'>('weekly')
  const [selectedBar, setSelectedBar] = useState<number | null>(null)
  const [showWelcome, setShowWelcome] = useState(false)

  const { data: orders = [] } = useQuery({
    queryKey: ['orders', shopId],
    queryFn: () => getOrders(shopId),
    enabled: !!shopId,
  })

  const { data: payments = [] } = useQuery({
    queryKey: ['payments', shopId],
    queryFn: () => getPayments(shopId),
    enabled: !!shopId,
  })

  const { data: stockItems = [] } = useQuery({
    queryKey: ['stockItems', shopId],
    queryFn: () => getStockItems(shopId),
    enabled: !!shopId,
  })

  const { data: storeSettings } = useQuery({
    queryKey: ['storeSettings', shopId],
    queryFn: () => getStoreSettings(shopId),
    enabled: !!shopId,
  })

  const { data: products = [] } = useQuery({
    queryKey: ['products', shopId],
    queryFn: () => getProducts(shopId),
    enabled: !!shopId,
  })

  const storeName = (storeSettings as Record<string, unknown>)?.store_name as string ?? ''

  // Compute checklist from real DB data
  const checklistCompleted = useMemo(() => {
    const done: string[] = []
    if (products.length > 0) done.push('product')
    if (orders.length > 0) done.push('order')
    if (storeName) done.push('store')
    if (payments.length > 0) done.push('payment')
    if (stockItems.length > 0) done.push('stock')
    return done
  }, [products, orders, storeName, payments, stockItems])
  const alertCount = stockItems.filter(s => s.status === 'Low' || s.status === 'Critical').length
  const wallet = payments.map(p => ({ type: p.status === 'Paid' ? 'credit' : 'debit', amount: p.amount_paid, date: p.date }))

  useEffect(() => {
    if (localStorage.getItem('sp_show_welcome') === '1') {
      setShowWelcome(true)
    }
  }, [])

  /* ── Stats ── */
  const totalRevenue   = useMemo(() => orders.reduce((s, o) => s + orderGrandTotal(o), 0), [orders])
  const activeOrders   = useMemo(() => orders.filter(o => o.status === 'Pending' || o.status === 'Confirmed').length, [orders])
  const onlineOrders   = useMemo(() => orders.filter(o => o.source === 'online-store'), [orders])
  const onlineRevenue  = useMemo(() => onlineOrders.reduce((s, o) => s + orderGrandTotal(o), 0), [onlineOrders])
  const pendingOrders = useMemo(() => orders.filter(o => o.status === 'Pending').length, [orders])
  const totalExpenses  = useMemo(() => wallet.filter(e => e.type === 'debit').reduce((s, e) => s + (e.amount || 0), 0), [wallet])

  /* ── Chart data ── */
  const N_W = 20, N_D = 30
  const weeklyRev = useMemo(() => groupByWeek(orders, N_W), [orders])
  const dailyRev  = useMemo(() => groupByDay(orders,  N_D), [orders])

  const weeklyDebits = useMemo(() => {
    const today = new Date()
    return Array.from({ length: N_W }, (_, i) => {
      const wEnd = new Date(today); wEnd.setDate(today.getDate() - (N_W - 1 - i) * 7)
      const wStart = new Date(wEnd); wStart.setDate(wEnd.getDate() - 6)
      return wallet.filter(e => e.type === 'debit' && (() => { const d = new Date(e.date); return d >= wStart && d <= wEnd })())
        .reduce((s, e) => s + (e.amount || 0), 0)
    })
  }, [wallet])

  const dailyDebits = useMemo(() => {
    const today = new Date()
    return Array.from({ length: N_D }, (_, i) => {
      const d = new Date(today); d.setDate(today.getDate() - (N_D - 1 - i))
      const key = d.toDateString()
      return wallet.filter(e => e.type === 'debit' && new Date(e.date).toDateString() === key)
        .reduce((s, e) => s + (e.amount || 0), 0)
    })
  }, [wallet])

  const weeklyLabels = useMemo(() => periodLabels(N_W, 7), [])
  const dailyLabels  = useMemo(() => periodLabels(N_D, 1), [])

  const revData   = chartPeriod === 'weekly' ? weeklyRev    : dailyRev
  const costData  = chartPeriod === 'weekly' ? weeklyDebits : dailyDebits
  const labels    = chartPeriod === 'weekly' ? weeklyLabels : dailyLabels

  const periodRevenue  = revData.reduce((s, v) => s + v, 0)
  const periodExpenses = costData.reduce((s, v) => s + v, 0)

  /* ── Recent orders (filtered by selected bar) ── */
  const recentOrders = useMemo(() => {
    let filtered = orders
    if (selectedBar !== null) {
      const today = new Date()
      if (chartPeriod === 'weekly') {
        const wEnd = new Date(today); wEnd.setDate(today.getDate() - (N_W - 1 - selectedBar) * 7)
        const wStart = new Date(wEnd); wStart.setDate(wEnd.getDate() - 6)
        filtered = orders.filter(o => { const d = new Date(o.created_at); return d >= wStart && d <= wEnd })
      } else {
        const d = new Date(today); d.setDate(today.getDate() - (N_D - 1 - selectedBar))
        const key = d.toISOString().slice(0, 10)
        filtered = orders.filter(o => (o.created_at ?? '').slice(0, 10) === key)
      }
    }
    return [...filtered].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? '')).slice(0, 10)
  }, [orders, selectedBar, chartPeriod])

  /* ── Top customers ── */
  const topCustomers = useMemo(() => {
    const map: Record<string, { name: string; count: number; total: number }> = {}
    orders.forEach(o => {
      const cust = o.customer_name || 'Unknown'
      if (!map[cust]) map[cust] = { name: cust, count: 0, total: 0 }
      map[cust].count++
      map[cust].total += orderGrandTotal(o)
    })
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 5)
  }, [orders])

  /* ── Render ── */
  return (
    <AppShell>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">Welcome back — {orders.length} orders · {activeOrders} active</div>
        </div>
        <div className="page-actions">
          <DateRangePicker />
        </div>
      </div>

      <div className="page-scroll">

        {/* ── Welcome Banner ── */}
        {showWelcome && (
          <WelcomeBanner
            storeName={storeName}
            completed={checklistCompleted}
            onDismiss={() => {
              setShowWelcome(false)
              localStorage.removeItem('sp_show_welcome')
            }}
          />
        )}

        {/* ── Hero ── */}
        <div className="hero-card">
          <div className="hero-left">
            <div className="hero-label">Total Revenue</div>
            <div className="hero-amount">
              {fmtRM(totalRevenue)}
              <span className="hero-change"><ArrowUpIcon /> live</span>
            </div>
          </div>
          <div className="hero-actions">
            <Link href="/orders/new"><button className="btn-hero-primary"><PlusIcon /> New Order</button></Link>
            <Link href="/orders"><button className="btn-hero-secondary"><EyeIcon /> View Orders</button></Link>
            <Link href="/storefront"><button className="btn-hero-secondary"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg> Online Store</button></Link>
            <button className="btn-hero-secondary"><SendIcon /> Export</button>
          </div>
        </div>

        {/* ── Chart ── */}
        <div className="chart-section">
          <div className="chart-main">
            <div className="chart-header">
              <div className="chart-title"><TrendIcon />Revenue &amp; Expenses</div>
              <div className="chart-controls">
                <button className={`chart-tab${chartPeriod === 'weekly' ? ' active' : ''}`} onClick={() => { setChartPeriod('weekly'); setSelectedBar(null) }}>Weekly</button>
                <button className={`chart-tab${chartPeriod === 'daily'  ? ' active' : ''}`} onClick={() => { setChartPeriod('daily'); setSelectedBar(null) }}>Daily</button>
                <button className="chart-manage-btn"><ManageIcon /> Manage</button>
              </div>
            </div>
            <RevenueChart rev={revData} cost={costData} labels={labels} selectedBar={selectedBar} onBarClick={setSelectedBar} />
          </div>

          <div className="chart-side">
            <div className="chart-metric">
              <div className="metric-row">
                <div className="metric-icon-box dark">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                </div>
                <span className="metric-label">Revenue</span>
              </div>
              <div className="metric-value">
                {fmtRM(periodRevenue)}
                <span className="metric-change-pos"><ArrowUpIcon /> {chartPeriod === 'weekly' ? '20 wk' : '30 d'}</span>
              </div>
            </div>

            <div className="chart-metric">
              <div className="metric-row">
                <div className="metric-icon-box green">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 6 10.5 15.5 15.5 10.5 23 18"/><polyline points="17 18 23 18 23 12"/></svg>
                </div>
                <span className="metric-label">Expenses</span>
              </div>
              <div className="metric-value">
                {fmtRM(periodExpenses || totalExpenses)}
                <span className="metric-change-neg"><ArrowDownIcon /> all time</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div className="stat-grid">
          <StatCard
            icon={<OrdersIcon />}
            label="Active Orders"
            period="Live"
            value={String(activeOrders)}
            changeLabel={`of ${orders.length} total`}
            changeType="pos"
            vs={`${orders.filter(o => o.status === 'Confirmed').length} confirmed · ${orders.filter(o => o.status === 'Pending').length} pending`}
          />
          <StatCard
            icon={<InvoiceIcon />}
            label="Pending Orders"
            period="Live"
            value={pendingOrders > 0 ? `${pendingOrders}` : 'None'}
            changeLabel={`${pendingOrders} order${pendingOrders !== 1 ? 's' : ''}`}
            changeType={pendingOrders > 0 ? 'warn' : 'pos'}
            vs={pendingOrders > 0 ? 'Awaiting confirmation' : 'All orders confirmed'}
          />
          <StatCard
            icon={<AlertIcon />}
            label="Stock Alerts"
            period="Live"
            value={alertCount > 0 ? `${alertCount} items` : 'All clear'}
            changeLabel={alertCount > 0 ? 'need attention' : ''}
            changeType={alertCount > 0 ? 'warn' : 'pos'}
            vs={alertCount > 0 ? 'Low or critical stock levels' : 'All stock levels healthy'}
          />
          <StatCard
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>}
            label="Online Store"
            period="All time"
            value={onlineRevenue > 0 ? fmtRM(onlineRevenue) : 'RM 0'}
            changeLabel={`${onlineOrders.length} order${onlineOrders.length !== 1 ? 's' : ''}`}
            changeType="pos"
            vs={onlineOrders.length > 0 ? `${((onlineOrders.length / orders.length) * 100).toFixed(0)}% of all orders` : 'No online orders yet'}
          />
        </div>

        {/* ── Bottom Grid ── */}
        <div className="bottom-grid">

          {/* Recent Orders */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                Recent Orders
              </div>
              <div className="card-header-actions">
                {selectedBar !== null && (
                  <button className="card-action-btn" onClick={() => setSelectedBar(null)} style={{ color: 'var(--accent)', fontWeight: 600 }}>Clear filter</button>
                )}
                <button className="card-action-btn"><FilterIcon /> Filter</button>
                <button className="card-action-btn"><SortIcon /> Sort</button>
                <Link href="/orders"><button className="card-action-btn">View all</button></Link>
              </div>
            </div>

            {recentOrders.length === 0 ? (
              <div className="empty-state">No orders yet</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Order / Customer</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Production</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map(o => {
                    const total = orderGrandTotal(o)
                    const ic    = iconColor(o.customer_name || 'U')
                    const date  = new Date(o.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
                    return (
                      <tr key={o.id}>
                        <td>
                          <div className="td-with-icon">
                            <div className={`row-icon ${ic}`}>
                              <UserIcon />
                            </div>
                            <div>
                              <div className="cell-name">
                                {o.customer_name}
                                {o.source === 'online-store' && (
                                  <span style={{ display: 'inline-block', marginLeft: 6, fontSize: 9, fontWeight: 700, background: 'var(--accent)', color: '#fff', padding: '1px 6px', borderRadius: 10, verticalAlign: 'middle' }}>Online</span>
                                )}
                              </div>
                              <div className="cell-sub">{o.seq_id || o.id} · {date}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="cell-amount">{fmtRM(total)}</div>
                          <div className="cell-amount-sub">{(o.items as unknown[]).length} item{(o.items as unknown[]).length !== 1 ? 's' : ''}</div>
                        </td>
                        <td>
                          <span className={o.status === 'Confirmed' ? 'badge badge-success' : o.status === 'Cancelled' ? 'badge badge-danger' : 'badge badge-pending'}>
                            {o.status}
                          </span>
                        </td>
                        <td>
                          <span className={PROD_BADGE[o.production] || 'badge badge-pending'}>
                            {o.production}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Top Customers */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
                Top Customers
              </div>
              <Link href="/customers" className="card-see-all">See All <ChevronRightIcon /></Link>
            </div>

            {topCustomers.length === 0 ? (
              <div className="empty-state">No customer data yet</div>
            ) : (
              <div className="customer-list">
                {topCustomers.map(c => (
                  <div key={c.name} className="customer-item">
                    <div className="customer-avatar">{initials(c.name)}</div>
                    <div className="customer-info">
                      <div className="customer-name">{c.name}</div>
                      <div className="customer-orders">{c.count} order{c.count !== 1 ? 's' : ''}</div>
                    </div>
                    <div className="customer-amount">{fmtRM(c.total)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </AppShell>
  )
}
