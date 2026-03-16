'use client'

import { useState, useMemo } from 'react'
import MyStoreShell from '@/components/MyStoreShell'
import { getOrders, type DbOrder } from '@/lib/db/orders'
import { getCustomers } from '@/lib/db/customers'
import { getStockItems } from '@/lib/db/inventory'
import { getWebsiteAnalytics, getMarketingAnalytics, type WebsiteAnalytics, type MarketingAnalytics, type DailyTraffic } from '@/lib/store/website-analytics-store'
import { useShop } from '@/providers/shop-provider'
import { useQuery } from '@tanstack/react-query'

/* -- Icons ------------------------------------------------ */
const DownloadIcon = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>)
const UpIcon   = () => (<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>)
const DownIcon = () => (<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>)
const CalIcon  = () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>)
const ChevronIcon = () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>)
const GlobeIcon = () => (<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>)

/* -- Helpers ---------------------------------------------- */
function fmt(n: number) {
  return `RM ${(n ?? 0).toLocaleString('en-MY', { minimumFractionDigits: 0 })}`
}

const COGS_RATE = 0.55

function orderGrandTotal(o: DbOrder): number {
  return o.grand_total ?? 0
}

function baseName(name: string): string {
  return name.split(' \u2014 ')[0].trim()
}

const initials = (name: string) =>
  name.trim().split(/\s+/).map(w => w[0]?.toUpperCase() ?? '').slice(0, 2).join('')

function periodStart(period: string): Date {
  const now = new Date()
  if (period === 'Last 7 days')  { const d = new Date(now); d.setDate(now.getDate() - 7);   return d }
  if (period === 'Last 30 days') { const d = new Date(now); d.setDate(now.getDate() - 30);  return d }
  if (period === 'Last 90 days') { const d = new Date(now); d.setDate(now.getDate() - 90);  return d }
  return new Date(now.getFullYear(), 0, 1)
}

/* -- Chart ------------------------------------------------ */
type MonthRow = { month: string; revenue: number; orders: number; cogs: number }

function RevenueChart({ data }: { data: MonthRow[] }) {
  const CHART_H = 180, PAD_L = 52, PAD_R = 12, PAD_TOP = 16, PAD_BOT = 28
  const INNER_H = CHART_H - PAD_TOP - PAD_BOT
  const maxVal  = Math.max(...data.map(d => d.revenue), 1)
  const gridMax = Math.ceil(maxVal / 10000) * 10000 || 10000
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(gridMax * f))
  const TOTAL_W = 700, innerW = TOTAL_W - PAD_L - PAD_R
  const GROUP_GAP = 10, BAR_GAP = 3
  const groupW = data.length > 0 ? (innerW - GROUP_GAP * (data.length - 1)) / data.length : innerW
  const barW   = (groupW - BAR_GAP) / 2
  const y      = (val: number) => PAD_TOP + INNER_H - (val / gridMax) * INNER_H

  return (
    <svg viewBox={`0 0 ${TOTAL_W} ${CHART_H}`} width="100%" height={CHART_H} style={{ display: 'block', overflow: 'visible' }}>
      {gridLines.map(g => (
        <g key={g}>
          <line x1={PAD_L} y1={y(g)} x2={TOTAL_W - PAD_R} y2={y(g)} stroke="#e5e7eb" strokeWidth="1" strokeDasharray={g === 0 ? '0' : '3 3'} />
          <text x={PAD_L - 6} y={y(g) + 4} textAnchor="end" fontSize={9} fill="#9ca3af" fontFamily="Inter,sans-serif">
            {g >= 1000 ? `${(g / 1000).toFixed(0)}k` : g}
          </text>
        </g>
      ))}
      {data.map((d, i) => {
        const gx    = PAD_L + i * (groupW + GROUP_GAP)
        const revH  = Math.max(2, (d.revenue / gridMax) * INNER_H)
        const cogsH = Math.max(2, (d.cogs    / gridMax) * INNER_H)
        const isLast = i === data.length - 1
        return (
          <g key={d.month}>
            <rect x={gx}             y={y(d.revenue)} width={barW} height={revH}  rx={3} fill={isLast ? '#006AFF' : '#006AFF55'} />
            <rect x={gx + barW + BAR_GAP} y={y(d.cogs)} width={barW} height={cogsH} rx={3} fill={isLast ? 'var(--text-muted)' : '#94a3b855'} />
            <text x={gx + groupW / 2} y={CHART_H - 6} textAnchor="middle" fontSize={9.5}
              fill={isLast ? '#374151' : '#9ca3af'} fontWeight={isLast ? '600' : '400'} fontFamily="Inter,sans-serif">
              {d.month}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/* -- Traffic Chart ---------------------------------------- */
function TrafficChart({ data }: { data: DailyTraffic[] }) {
  const CHART_H = 180, PAD_L = 52, PAD_R = 12, PAD_TOP = 16, PAD_BOT = 28
  const INNER_H = CHART_H - PAD_TOP - PAD_BOT
  const TOTAL_W = 700, innerW = TOTAL_W - PAD_L - PAD_R

  const maxVal = Math.max(...data.map(d => Math.max(d.visitors, d.pageViews)), 1)
  const gridMax = Math.ceil(maxVal / 100) * 100 || 100
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(gridMax * f))

  const y = (val: number) => PAD_TOP + INNER_H - (val / gridMax) * INNER_H
  const x = (i: number) => PAD_L + (i / Math.max(data.length - 1, 1)) * innerW

  const makePath = (key: 'visitors' | 'pageViews') =>
    data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join(' ')

  const labelStep = Math.max(1, Math.floor(data.length / 6))

  return (
    <svg viewBox={`0 0 ${TOTAL_W} ${CHART_H}`} width="100%" height={CHART_H} style={{ display: 'block', overflow: 'visible' }}>
      {gridLines.map(g => (
        <g key={g}>
          <line x1={PAD_L} y1={y(g)} x2={TOTAL_W - PAD_R} y2={y(g)} stroke="#e5e7eb" strokeWidth="1" strokeDasharray={g === 0 ? '0' : '3 3'} />
          <text x={PAD_L - 6} y={y(g) + 4} textAnchor="end" fontSize={9} fill="#9ca3af" fontFamily="Inter,sans-serif">
            {g >= 1000 ? `${(g / 1000).toFixed(g >= 10000 ? 0 : 1)}k` : g}
          </text>
        </g>
      ))}
      <path d={makePath('pageViews')} fill="none" stroke="#006AFF33" strokeWidth="2" />
      <path d={makePath('visitors')} fill="none" stroke="#006AFF" strokeWidth="2" />
      {data.map((d, i) =>
        i % labelStep === 0 || i === data.length - 1 ? (
          <text key={d.date} x={x(i)} y={CHART_H - 6} textAnchor="middle" fontSize={9}
            fill={i === data.length - 1 ? '#374151' : '#9ca3af'} fontWeight={i === data.length - 1 ? '600' : '400'} fontFamily="Inter,sans-serif">
            {new Date(d.date).toLocaleDateString('en-MY', { month: 'short', day: 'numeric' })}
          </text>
        ) : null
      )}
    </svg>
  )
}

/* -- Funnel Chart ----------------------------------------- */
function FunnelChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {data.map((d, i) => {
        const pct = (d.value / max) * 100
        const dropoff = i > 0 ? (((data[i - 1].value - d.value) / data[i - 1].value) * 100).toFixed(1) : null
        return (
          <div key={d.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
              <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-primary)' }}>{d.label}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {dropoff !== null && <span style={{ fontSize: 11, color: 'var(--negative)' }}>-{dropoff}%</span>}
                <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--accent)' }}>{d.value.toLocaleString()}</span>
              </div>
            </div>
            <div style={{ height: 22, background: 'var(--border)', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{
                width: `${Math.max(pct, 2)}%`, height: '100%', borderRadius: 6,
                background: `hsl(${220 - i * 20}, 85%, ${55 + i * 5}%)`,
                transition: 'width 0.3s',
              }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* -- Sub-components --------------------------------------- */
function HBar({ pct, color = '#006AFF' }: { pct: number; color?: string }) {
  return (
    <div style={{ height: 4, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', marginTop: 5 }}>
      <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: color, borderRadius: 3 }} />
    </div>
  )
}

function Trend({ val }: { val: number }) {
  const up = val >= 0
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11.5, fontWeight: 500, color: up ? 'var(--positive)' : 'var(--negative)' }}>
      {up ? <UpIcon /> : <DownIcon />} {Math.abs(val)}%
    </span>
  )
}

const REPORT_TABS    = ['Overview', 'Sales', 'Products', 'Customers', 'Website', 'Marketing']
const PERIOD_OPTIONS = ['Last 7 days', 'Last 30 days', 'Last 90 days', 'This year']

/* -- Page ------------------------------------------------- */
export default function StorefrontAnalyticsPage() {
  const { shopId } = useShop()

  const [tab,        setTab]        = useState('Overview')
  const [period,     setPeriod]     = useState('Last 30 days')
  const [showPeriod, setShowPeriod] = useState(false)

  const { data: rawOrders = [] } = useQuery({
    queryKey: ['orders', shopId],
    queryFn: () => getOrders(shopId),
    enabled: !!shopId,
  })

  const { data: rawCustomers = [] } = useQuery({
    queryKey: ['customers', shopId],
    queryFn: () => getCustomers(shopId),
    enabled: !!shopId,
  })

  const { data: stockItems = [] } = useQuery({
    queryKey: ['stock-items', shopId],
    queryFn: () => getStockItems(shopId),
    enabled: !!shopId,
  })

  // Only online-store orders
  const allOnlineOrders = useMemo(() => rawOrders.filter(o => o.source === 'online-store'), [rawOrders])

  const customerCount = useMemo(() => {
    const onlineCustomerNames = new Set(allOnlineOrders.map(o => o.customer_name))
    return onlineCustomerNames.size
  }, [allOnlineOrders])

  const skuCount = stockItems.length

  // Website & marketing analytics (mock data - kept as-is)
  const websiteData: WebsiteAnalytics | null = useMemo(() => {
    try { return getWebsiteAnalytics() } catch { return null }
  }, [])
  const marketingData: MarketingAnalytics | null = useMemo(() => {
    try { return getMarketingAnalytics() } catch { return null }
  }, [])

  /* -- Period-filtered orders -- */
  const orders = useMemo(() => {
    const start = periodStart(period)
    return allOnlineOrders.filter(o => new Date(o.created_at) >= start)
  }, [allOnlineOrders, period])

  /* -- Monthly rows (last 7 months, online orders only) -- */
  const monthly: MonthRow[] = useMemo(() => {
    const now = new Date()
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (6 - i), 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const monthOrders = allOnlineOrders.filter(o => o.created_at.startsWith(key))
      const revenue = monthOrders.reduce((s, o) => s + orderGrandTotal(o), 0)
      return {
        month: d.toLocaleDateString('en-MY', { month: 'short' }),
        revenue,
        orders: monthOrders.length,
        cogs:   Math.round(revenue * COGS_RATE),
      }
    })
  }, [allOnlineOrders])

  /* -- KPIs for current period -- */
  const totalRevenue   = useMemo(() => orders.reduce((s, o) => s + orderGrandTotal(o), 0), [orders])
  const totalOrders    = orders.length
  const avgOrder       = totalOrders > 0 ? totalRevenue / totalOrders : 0
  const grossProfit    = totalRevenue * (1 - COGS_RATE)
  const margin         = totalRevenue > 0 ? (1 - COGS_RATE) * 100 : 0

  const momData = useMemo(() => {
    const now = new Date()
    const curKey  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const prevD   = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevKey = `${prevD.getFullYear()}-${String(prevD.getMonth() + 1).padStart(2, '0')}`
    const curOrds  = allOnlineOrders.filter(o => o.created_at.startsWith(curKey))
    const prevOrds = allOnlineOrders.filter(o => o.created_at.startsWith(prevKey))
    const curRev  = curOrds.reduce((s, o) => s + orderGrandTotal(o), 0)
    const prevRev = prevOrds.reduce((s, o) => s + orderGrandTotal(o), 0)
    const revGrowth = prevRev > 0 ? +((curRev - prevRev) / prevRev * 100).toFixed(1) : 0
    const ordGrowth = prevOrds.length > 0 ? +((curOrds.length - prevOrds.length) / prevOrds.length * 100).toFixed(1) : 0
    return { revGrowth, ordGrowth }
  }, [allOnlineOrders])

  /* -- Top products -- */
  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number }> = {}
    orders.forEach(o => {
      const items = (o.items ?? []) as { name: string; qty: number; total: number }[]
      items.forEach(item => {
        const name = baseName(item.name)
        if (!map[name]) map[name] = { name, qty: 0, revenue: 0 }
        map[name].qty     += item.qty
        map[name].revenue += item.total
      })
    })
    const sorted = Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 5)
    const maxRev = Math.max(...sorted.map(p => p.revenue), 1)
    return sorted.map(p => ({ ...p, pct: Math.round(p.revenue / maxRev * 100) }))
  }, [orders])

  /* -- Top customers -- */
  const topCustomers = useMemo(() => {
    const map: Record<string, { name: string; orders: number; revenue: number }> = {}
    orders.forEach(o => {
      if (!map[o.customer_name]) map[o.customer_name] = { name: o.customer_name, orders: 0, revenue: 0 }
      map[o.customer_name].orders++
      map[o.customer_name].revenue += orderGrandTotal(o)
    })
    const now = new Date()
    const curKey  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const prevD   = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevKey = `${prevD.getFullYear()}-${String(prevD.getMonth() + 1).padStart(2, '0')}`
    const curMap: Record<string, number>  = {}
    const prevMap: Record<string, number> = {}
    allOnlineOrders.filter(o => o.created_at.startsWith(curKey)).forEach(o => { curMap[o.customer_name]  = (curMap[o.customer_name]  || 0) + orderGrandTotal(o) })
    allOnlineOrders.filter(o => o.created_at.startsWith(prevKey)).forEach(o => { prevMap[o.customer_name] = (prevMap[o.customer_name] || 0) + orderGrandTotal(o) })

    const maxRev = Math.max(...Object.values(map).map(c => c.revenue), 1)
    return Object.values(map)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map(c => {
        const cur  = curMap[c.name]  || 0
        const prev = prevMap[c.name] || 0
        const growth = prev > 0 ? +((cur - prev) / prev * 100).toFixed(1) : null
        return { ...c, growth, pct: Math.round(c.revenue / maxRev * 100) }
      })
  }, [orders, allOnlineOrders])

  /* -- Customer insights -- */
  const customerInsights = useMemo(() => {
    const now = new Date()
    const d30 = new Date(now); d30.setDate(now.getDate() - 30)
    const d60 = new Date(now); d60.setDate(now.getDate() - 60)
    const withOrders = new Set(allOnlineOrders.map(o => o.customer_name))
    const recent30   = new Set(allOnlineOrders.filter(o => new Date(o.created_at) >= d30).map(o => o.customer_name))
    const recent60   = new Set(allOnlineOrders.filter(o => new Date(o.created_at) >= d60).map(o => o.customer_name))
    const churnRisk  = [...withOrders].filter(c => !recent60.has(c)).length
    const allRevenue = allOnlineOrders.reduce((s, o) => s + orderGrandTotal(o), 0)
    const avgLTV     = withOrders.size > 0 ? allRevenue / withOrders.size : 0
    return { active: recent30.size, churnRisk, avgLTV }
  }, [allOnlineOrders])

  /* -- Period-filtered traffic -- */
  const filteredTraffic = useMemo(() => {
    if (!websiteData) return []
    const start = periodStart(period)
    return websiteData.dailyTraffic.filter(d => new Date(d.date) >= start)
  }, [websiteData, period])

  const trafficStats = useMemo(() => {
    if (filteredTraffic.length === 0) return { visitors: 0, pageViews: 0 }
    return {
      visitors: filteredTraffic.reduce((s, d) => s + d.visitors, 0),
      pageViews: filteredTraffic.reduce((s, d) => s + d.pageViews, 0),
    }
  }, [filteredTraffic])

  /* -- Best product -- */
  const bestProduct = topProducts[0]

  /* -- Render -- */
  return (
    <MyStoreShell>
      <div className="page-header">
        <div>
          <div className="page-title">Analytics</div>
          <div className="page-subtitle">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <GlobeIcon /> Online store performance · {totalOrders} orders in period
            </span>
          </div>
        </div>
        <div className="page-actions">
          <div style={{ position: 'relative' }}>
            <button className="btn-secondary" style={{ gap: 6 }} onClick={() => setShowPeriod(p => !p)}>
              <CalIcon /> {period} <ChevronIcon />
            </button>
            {showPeriod && (
              <div style={{ position: 'absolute', top: '110%', right: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 4, zIndex: 50, minWidth: 160, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
                {PERIOD_OPTIONS.map(o => (
                  <button key={o} onClick={() => { setPeriod(o); setShowPeriod(false) }}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 12px', fontSize: 12.5, borderRadius: 7, background: period === o ? 'var(--accent)' : 'transparent', color: period === o ? '#fff' : 'var(--text-primary)', cursor: 'pointer', border: 'none', fontFamily: 'var(--font)' }}>
                    {o}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="btn-primary" style={{ gap: 6 }}><DownloadIcon /> Export CSV</button>
        </div>
      </div>

      <div className="page-scroll">

        <div className="filter-row" style={{ marginBottom: 2 }}>
          <div className="filter-bar">
            {REPORT_TABS.map(t => (
              <button key={t} className={`filter-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{t}</button>
            ))}
          </div>
        </div>

        {/* OVERVIEW */}
        {tab === 'Overview' && (<>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { label: 'Online Revenue',  value: fmt(totalRevenue), trend: momData.revGrowth, sub: 'vs last month' },
              { label: 'Online Orders',   value: String(totalOrders), trend: momData.ordGrowth, sub: 'vs last month' },
              { label: 'Avg Order Value', value: fmt(avgOrder), trend: null, sub: 'Per online order' },
              { label: 'Gross Margin',    value: `${margin.toFixed(1)}%`, trend: null, sub: `Est. profit: ${fmt(grossProfit)}` },
            ].map(k => (
              <div key={k.label} className="stat-card">
                <div className="stat-card-label" style={{ marginBottom: 6 }}>{k.label}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1, marginBottom: 8 }}>{k.value}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                  {k.trend !== null && <Trend val={k.trend} />}
                  <span>{k.sub}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="card" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Online Store Revenue vs COGS — Last 7 Months</div>
              <div style={{ display: 'flex', gap: 14 }}>
                {[['#006AFF', 'Revenue'], ['var(--text-muted)', 'COGS (est. 55%)']].map(([c, l]) => (
                  <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-muted)' }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: c, flexShrink: 0 }} />{l}
                  </div>
                ))}
              </div>
            </div>
            {monthly.some(m => m.revenue > 0)
              ? <RevenueChart data={monthly} />
              : <div className="empty-state" style={{ height: 140 }}>No online order data yet</div>
            }
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="card" style={{ padding: '18px 20px' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Top Products by Online Revenue</div>
              {topProducts.length === 0
                ? <div className="empty-state">No product data in period</div>
                : <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {topProducts.map((p, i) => (
                      <div key={p.name}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <span style={{ fontSize: 12.5, color: 'var(--text-primary)', fontWeight: 500 }}>
                            <span style={{ color: 'var(--text-muted)', fontWeight: 600, marginRight: 6 }}>{i + 1}.</span>{p.name}
                          </span>
                          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--accent)', flexShrink: 0, marginLeft: 8 }}>{fmt(p.revenue)}</span>
                        </div>
                        <HBar pct={p.pct} />
                      </div>
                    ))}
                  </div>
              }
            </div>

            <div className="card" style={{ padding: '18px 20px' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Top Online Customers</div>
              {topCustomers.length === 0
                ? <div className="empty-state">No customer data in period</div>
                : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {topCustomers.map((c, i) => (
                      <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#006AFF18', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 12.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                            <span style={{ fontSize: 12.5, fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>{fmt(c.revenue)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.orders} order{c.orders !== 1 ? 's' : ''}</span>
                            {c.growth !== null ? <Trend val={c.growth} /> : <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{'\u2014'}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
              }
            </div>
          </div>

          <div className="card" style={{ padding: '18px 20px 0' }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Monthly Breakdown (Online Store)</div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th style={{ textAlign: 'right' }}>Revenue</th>
                  <th style={{ textAlign: 'right' }}>COGS</th>
                  <th style={{ textAlign: 'right' }}>Gross Profit</th>
                  <th style={{ textAlign: 'right' }}>Margin</th>
                  <th style={{ textAlign: 'right' }}>Orders</th>
                  <th style={{ textAlign: 'right' }}>MoM</th>
                </tr>
              </thead>
              <tbody>
                {[...monthly].reverse().map((m, i, arr) => {
                  const gp   = m.revenue - m.cogs
                  const mgn  = m.revenue > 0 ? ((gp / m.revenue) * 100).toFixed(1) : '\u2014'
                  const prev = arr[i + 1]
                  const mom  = prev && prev.revenue > 0 ? +((m.revenue - prev.revenue) / prev.revenue * 100).toFixed(1) : null
                  return (
                    <tr key={m.month}>
                      <td style={{ fontWeight: 600 }}>{m.month}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(m.revenue)}</td>
                      <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{fmt(m.cogs)}</td>
                      <td style={{ textAlign: 'right', color: 'var(--positive)', fontWeight: 600 }}>{fmt(gp)}</td>
                      <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{mgn}{typeof mgn === 'string' && mgn !== '\u2014' ? '%' : ''}</td>
                      <td style={{ textAlign: 'right' }}>{m.orders}</td>
                      <td style={{ textAlign: 'right' }}>{mom !== null ? <Trend val={mom} /> : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{'\u2014'}</span>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>)}

        {/* SALES */}
        {tab === 'Sales' && (<>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { label: 'Online Revenue',   value: fmt(totalRevenue),             sub: `${totalOrders} online orders`,  warn: false },
              { label: 'Est. Net',         value: fmt(totalRevenue * 0.97),       sub: 'After ~3% discounts',           warn: false },
              { label: 'Avg Order',        value: fmt(avgOrder),              sub: 'Per online order',              warn: false },
              { label: 'Conversion',       value: `${customerCount} buyers`,      sub: 'Unique online customers',       warn: false },
            ].map(k => (
              <div key={k.label} className="stat-card">
                <div className="stat-card-label" style={{ marginBottom: 6 }}>{k.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: k.warn ? 'var(--negative)' : 'var(--text-primary)', lineHeight: 1, marginBottom: 6 }}>{k.value}</div>
                <div style={{ fontSize: 12, color: k.warn ? 'var(--negative)' : 'var(--text-muted)' }}>{k.sub}</div>
              </div>
            ))}
          </div>

          <div className="card" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Online Store Monthly Revenue</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-muted)' }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: '#006AFF', flexShrink: 0 }} /> Revenue
              </div>
            </div>
            {monthly.some(m => m.revenue > 0)
              ? <RevenueChart data={monthly} />
              : <div className="empty-state" style={{ height: 140 }}>No online order data yet</div>
            }
          </div>

          <div className="card" style={{ padding: '18px 20px 0' }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Online Sales by Month</div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th style={{ textAlign: 'right' }}>Orders</th>
                  <th style={{ textAlign: 'right' }}>Revenue</th>
                  <th style={{ textAlign: 'right' }}>Avg Order</th>
                  <th style={{ textAlign: 'right' }}>MoM Growth</th>
                </tr>
              </thead>
              <tbody>
                {[...monthly].reverse().map((m, i, arr) => {
                  const prev   = arr[i + 1]
                  const growth = prev && prev.revenue > 0 ? +((m.revenue - prev.revenue) / prev.revenue * 100).toFixed(1) : null
                  return (
                    <tr key={m.month}>
                      <td style={{ fontWeight: 600 }}>{m.month}</td>
                      <td style={{ textAlign: 'right' }}>{m.orders}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(m.revenue)}</td>
                      <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{m.orders > 0 ? fmt(Math.round(m.revenue / m.orders)) : '\u2014'}</td>
                      <td style={{ textAlign: 'right' }}>{growth !== null ? <Trend val={growth} /> : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{'\u2014'}</span>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>)}

        {/* PRODUCTS */}
        {tab === 'Products' && (<>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { label: 'Active SKUs',  value: String(skuCount),                                         sub: 'In inventory' },
              { label: 'Best Seller',  value: bestProduct ? bestProduct.name.split(' ')[0] + '\u2026' : '\u2014', sub: bestProduct ? `${bestProduct.qty.toLocaleString()} units via online store` : 'No data' },
              { label: 'Top Revenue',  value: bestProduct ? fmt(bestProduct.revenue) : '\u2014',             sub: bestProduct ? bestProduct.name : 'No data' },
            ].map(k => (
              <div key={k.label} className="stat-card">
                <div className="stat-card-label" style={{ marginBottom: 6 }}>{k.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1, marginBottom: 6 }}>{k.value}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{k.sub}</div>
              </div>
            ))}
          </div>

          <div className="card" style={{ padding: '18px 20px 0' }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Online Store Product Performance</div>
            {topProducts.length === 0
              ? <div className="empty-state" style={{ padding: '32px 0' }}>No online product data in selected period</div>
              : <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Product</th>
                      <th style={{ textAlign: 'right' }}>Units Sold</th>
                      <th style={{ textAlign: 'right' }}>Revenue</th>
                      <th style={{ minWidth: 140 }}>Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.map((p, i) => (
                      <tr key={p.name}>
                        <td style={{ color: 'var(--text-muted)', fontWeight: 700 }}>{i + 1}</td>
                        <td style={{ fontWeight: 500 }}>{p.name}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 12.5 }}>{p.qty.toLocaleString()}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent)' }}>{fmt(p.revenue)}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1 }}><HBar pct={p.pct} /></div>
                            <span style={{ fontSize: 11.5, color: 'var(--text-muted)', width: 34, textAlign: 'right' }}>{p.pct}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            }
          </div>
        </>)}

        {/* CUSTOMERS */}
        {tab === 'Customers' && (<>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { label: 'Online Customers', value: String(customerCount),             sub: 'Ordered via store',             warn: false },
              { label: 'Active Buyers',    value: String(customerInsights.active),   sub: 'Ordered in last 30 days',       warn: false },
              { label: 'Avg LTV',          value: fmt(customerInsights.avgLTV),      sub: 'Per online customer',           warn: false },
              { label: 'Churn Risk',       value: String(customerInsights.churnRisk),sub: 'No online orders in 60+ days',  warn: customerInsights.churnRisk > 0 },
            ].map(k => (
              <div key={k.label} className="stat-card">
                <div className="stat-card-label" style={{ marginBottom: 6 }}>{k.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: k.warn ? 'var(--warning)' : 'var(--text-primary)', lineHeight: 1, marginBottom: 6 }}>{k.value}</div>
                <div style={{ fontSize: 12, color: k.warn ? 'var(--warning)' : 'var(--text-muted)' }}>{k.sub}</div>
              </div>
            ))}
          </div>

          <div className="card" style={{ padding: '18px 20px 0' }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Top Online Store Customers by Revenue</div>
            {topCustomers.length === 0
              ? <div className="empty-state" style={{ padding: '32px 0' }}>No online customer data in selected period</div>
              : <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th><th>Customer</th>
                      <th style={{ textAlign: 'right' }}>Orders</th>
                      <th style={{ textAlign: 'right' }}>Revenue</th>
                      <th style={{ textAlign: 'right' }}>MoM</th>
                      <th style={{ minWidth: 120 }}>Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topCustomers.map((c, i) => (
                      <tr key={c.name}>
                        <td style={{ color: 'var(--text-muted)', fontWeight: 700 }}>{i + 1}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#006AFF18', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{initials(c.name)}</div>
                            <span style={{ fontWeight: 500 }}>{c.name}</span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>{c.orders}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent)' }}>{fmt(c.revenue)}</td>
                        <td style={{ textAlign: 'right' }}>{c.growth !== null ? <Trend val={c.growth} /> : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{'\u2014'}</span>}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1 }}><HBar pct={c.pct} /></div>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 34, textAlign: 'right' }}>{c.pct}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            }
          </div>
        </>)}

        {/* WEBSITE */}
        {tab === 'Website' && websiteData && (<>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { label: 'Total Visitors',      value: trafficStats.visitors.toLocaleString(),     sub: `${filteredTraffic.length} days tracked` },
              { label: 'Page Views',           value: trafficStats.pageViews.toLocaleString(),    sub: `${(trafficStats.pageViews / Math.max(trafficStats.visitors, 1)).toFixed(1)} pages/visit` },
              { label: 'Avg Session Duration', value: websiteData.avgSessionDuration,              sub: 'Across all pages' },
              { label: 'Bounce Rate',          value: `${websiteData.bounceRate}%`,                sub: 'Single-page sessions' },
            ].map(k => (
              <div key={k.label} className="stat-card">
                <div className="stat-card-label" style={{ marginBottom: 6 }}>{k.label}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1, marginBottom: 8 }}>{k.value}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{k.sub}</div>
              </div>
            ))}
          </div>

          <div className="card" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Daily Traffic — {period}</div>
              <div style={{ display: 'flex', gap: 14 }}>
                {[['#006AFF', 'Visitors'], ['#006AFF33', 'Page Views']].map(([c, l]) => (
                  <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-muted)' }}>
                    <span style={{ width: 16, height: 3, borderRadius: 2, background: c, flexShrink: 0 }} />{l}
                  </div>
                ))}
              </div>
            </div>
            {filteredTraffic.length > 0
              ? <TrafficChart data={filteredTraffic} />
              : <div className="empty-state" style={{ height: 140 }}>No traffic data in period</div>
            }
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="card" style={{ padding: '18px 20px 0' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Top Pages</div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Page</th>
                    <th style={{ textAlign: 'right' }}>Views</th>
                    <th style={{ textAlign: 'right' }}>Avg Time</th>
                  </tr>
                </thead>
                <tbody>
                  {websiteData.topPages.map(p => (
                    <tr key={p.path}>
                      <td style={{ fontWeight: 500, fontFamily: 'monospace', fontSize: 12 }}>{p.path}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{p.views.toLocaleString()}</td>
                      <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{p.avgTime}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="card" style={{ padding: '18px 20px' }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Device Breakdown</div>
                {Object.entries(websiteData.deviceBreakdown).map(([device, pct]) => (
                  <div key={device} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                      <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>{device}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{pct}%</span>
                    </div>
                    <HBar pct={pct} color={device === 'desktop' ? '#006AFF' : device === 'mobile' ? '#10b981' : '#f59e0b'} />
                  </div>
                ))}
              </div>

              <div className="card" style={{ padding: '18px 20px' }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Browser Breakdown</div>
                {Object.entries(websiteData.browserBreakdown).map(([browser, pct]) => {
                  const colors: Record<string, string> = { chrome: '#4285f4', safari: '#5AC8FA', firefox: '#ff7139', edge: '#0078d4', other: '#9ca3af' }
                  return (
                    <div key={browser} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                        <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>{browser}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{pct}%</span>
                      </div>
                      <HBar pct={pct} color={colors[browser] || '#9ca3af'} />
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </>)}

        {/* MARKETING */}
        {tab === 'Marketing' && marketingData && (<>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { label: 'Conversion Rate',      value: `${marketingData.conversionRate}%`,                         sub: 'Visitors \u2192 Buyers' },
              { label: 'Cart Abandonment',      value: `${marketingData.cartAbandonmentRate}%`,                    sub: 'Carts not completed' },
              { label: 'Add to Cart Rate',      value: `${marketingData.addToCartRate}%`,                          sub: 'Visitors who add items' },
              { label: 'Cost per Acquisition',  value: `RM ${marketingData.costPerAcquisition.toFixed(2)}`,        sub: 'Avg marketing cost/sale' },
            ].map(k => (
              <div key={k.label} className="stat-card">
                <div className="stat-card-label" style={{ marginBottom: 6 }}>{k.label}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1, marginBottom: 8 }}>{k.value}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{k.sub}</div>
              </div>
            ))}
          </div>

          <div className="card" style={{ padding: '18px 20px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Conversion Funnel</div>
            <FunnelChart data={[
              { label: 'Visitors', value: marketingData.funnelData.visitors },
              { label: 'Product Views', value: marketingData.funnelData.productViews },
              { label: 'Added to Cart', value: marketingData.funnelData.addedToCart },
              { label: 'Checkout', value: marketingData.funnelData.checkout },
              { label: 'Purchased', value: marketingData.funnelData.purchased },
            ]} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="card" style={{ padding: '18px 20px 0' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Traffic Sources</div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Source</th>
                    <th style={{ textAlign: 'right' }}>Visitors</th>
                    <th style={{ textAlign: 'right' }}>Conversions</th>
                    <th style={{ textAlign: 'right' }}>Conv. Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {marketingData.trafficSources.map(s => (
                    <tr key={s.source}>
                      <td style={{ fontWeight: 500 }}>{s.source}</td>
                      <td style={{ textAlign: 'right' }}>{s.visitors.toLocaleString()}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--accent)' }}>{s.conversions}</td>
                      <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{s.visitors > 0 ? ((s.conversions / s.visitors) * 100).toFixed(1) : '0'}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="card" style={{ padding: '18px 20px 0' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Top Referrers</div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Domain</th>
                    <th style={{ textAlign: 'right' }}>Visitors</th>
                    <th style={{ minWidth: 100 }}>Share</th>
                  </tr>
                </thead>
                <tbody>
                  {marketingData.topReferrers.map(r => {
                    const maxRef = Math.max(...marketingData.topReferrers.map(x => x.visitors), 1)
                    const pct = Math.round((r.visitors / maxRef) * 100)
                    return (
                      <tr key={r.domain}>
                        <td style={{ fontWeight: 500 }}>{r.domain}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{r.visitors.toLocaleString()}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1 }}><HBar pct={pct} /></div>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 34, textAlign: 'right' }}>{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>)}

      </div>
    </MyStoreShell>
  )
}
