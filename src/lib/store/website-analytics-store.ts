/**
 * Website & Marketing Analytics Store
 *
 * Mock data for website health and marketing analytics.
 * Uses a seeded PRNG for deterministic data across sessions.
 * Derives some metrics from order-store and abandoned-cart-tracker.
 */

// TODO [Batch H]: Replace with real analytics — this is mock data that uses order count
import { getOrders, initOrderData } from '@/lib/order-store'
import { getAbandonedCarts } from '@/lib/store/abandoned-cart-tracker'

/* ── Seeded PRNG ─────────────────────────────────────── */
function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = mulberry32(42)

function randInt(min: number, max: number) {
  return Math.floor(rand() * (max - min + 1)) + min
}

function randFloat(min: number, max: number, decimals = 1) {
  return +(min + rand() * (max - min)).toFixed(decimals)
}

/* ── Types ────────────────────────────────────────────── */

export type DailyTraffic = {
  date: string
  visitors: number
  pageViews: number
}

export type TopPage = {
  path: string
  views: number
  avgTime: string
}

export type TrafficSource = {
  source: string
  visitors: number
  conversions: number
}

export type TopReferrer = {
  domain: string
  visitors: number
}

export type FunnelData = {
  visitors: number
  productViews: number
  addedToCart: number
  checkout: number
  purchased: number
}

export type WebsiteAnalytics = {
  totalVisitors: number
  totalPageViews: number
  uniqueVisitors: number
  avgSessionDuration: string
  bounceRate: number
  dailyTraffic: DailyTraffic[]
  topPages: TopPage[]
  deviceBreakdown: { desktop: number; mobile: number; tablet: number }
  browserBreakdown: { chrome: number; safari: number; firefox: number; edge: number; other: number }
}

export type MarketingAnalytics = {
  conversionRate: number
  cartAbandonmentRate: number
  addToCartRate: number
  costPerAcquisition: number
  trafficSources: TrafficSource[]
  topReferrers: TopReferrer[]
  funnelData: FunnelData
}

/* ── Generate daily traffic (last 90 days) ────────────── */
function generateDailyTraffic(): DailyTraffic[] {
  const days: DailyTraffic[] = []
  const now = new Date()
  for (let i = 89; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    const dayOfWeek = d.getDay()
    // Weekends get less traffic
    const base = dayOfWeek === 0 || dayOfWeek === 6 ? 60 : 120
    const visitors = randInt(base, base + 80)
    const pageViews = randInt(Math.round(visitors * 2.2), Math.round(visitors * 3.5))
    days.push({
      date: d.toISOString().slice(0, 10),
      visitors,
      pageViews,
    })
  }
  return days
}

/* ── Build data ───────────────────────────────────────── */

let _website: WebsiteAnalytics | null = null
let _marketing: MarketingAnalytics | null = null

function buildData() {
  if (_website && _marketing) return

  const dailyTraffic = generateDailyTraffic()
  const totalVisitors = dailyTraffic.reduce((s, d) => s + d.visitors, 0)
  const totalPageViews = dailyTraffic.reduce((s, d) => s + d.pageViews, 0)
  const uniqueVisitors = Math.round(totalVisitors * 0.72)

  // Get order count for conversion rate
  initOrderData()
  const orders = getOrders().filter(o => o.source === 'online-store')
  const abandonedCarts = getAbandonedCarts()

  const totalOrders = orders.length
  const abandonedCount = abandonedCarts.length

  _website = {
    totalVisitors,
    totalPageViews,
    uniqueVisitors,
    avgSessionDuration: `${randInt(2, 4)}m ${randInt(10, 55)}s`,
    bounceRate: randFloat(35, 52),
    dailyTraffic,
    topPages: [
      { path: '/', views: randInt(2800, 4200), avgTime: `${randInt(0, 1)}m ${randInt(20, 58)}s` },
      { path: '/products', views: randInt(2200, 3500), avgTime: `${randInt(1, 2)}m ${randInt(10, 50)}s` },
      { path: '/products/custom-tshirt', views: randInt(1400, 2200), avgTime: `${randInt(2, 4)}m ${randInt(5, 55)}s` },
      { path: '/products/hoodie-premium', views: randInt(900, 1500), avgTime: `${randInt(1, 3)}m ${randInt(15, 50)}s` },
      { path: '/products/tote-bag', views: randInt(600, 1100), avgTime: `${randInt(1, 2)}m ${randInt(20, 55)}s` },
      { path: '/cart', views: randInt(500, 900), avgTime: `${randInt(1, 2)}m ${randInt(5, 40)}s` },
      { path: '/about', views: randInt(300, 700), avgTime: `${randInt(1, 3)}m ${randInt(10, 45)}s` },
      { path: '/contact', views: randInt(200, 500), avgTime: `${randInt(0, 1)}m ${randInt(30, 58)}s` },
    ],
    deviceBreakdown: { desktop: 42, mobile: 48, tablet: 10 },
    browserBreakdown: { chrome: 52, safari: 26, firefox: 10, edge: 8, other: 4 },
  }

  const conversionRate = totalOrders > 0 && totalVisitors > 0
    ? +((totalOrders / totalVisitors) * 100).toFixed(2)
    : randFloat(1.8, 3.2, 2)

  const cartAbandonmentRate = abandonedCount > 0
    ? +((abandonedCount / (abandonedCount + totalOrders)) * 100).toFixed(1)
    : randFloat(55, 72)

  const organicVisitors = Math.round(totalVisitors * 0.38)
  const directVisitors = Math.round(totalVisitors * 0.25)
  const socialVisitors = Math.round(totalVisitors * 0.18)
  const emailVisitors = Math.round(totalVisitors * 0.12)
  const paidVisitors = totalVisitors - organicVisitors - directVisitors - socialVisitors - emailVisitors

  const funnelProductViews = Math.round(totalVisitors * randFloat(0.55, 0.68, 2))
  const funnelAddToCart = Math.round(funnelProductViews * randFloat(0.20, 0.32, 2))
  const funnelCheckout = Math.round(funnelAddToCart * randFloat(0.40, 0.55, 2))
  const funnelPurchased = totalOrders > 0 ? totalOrders : Math.round(funnelCheckout * randFloat(0.60, 0.78, 2))

  _marketing = {
    conversionRate,
    cartAbandonmentRate,
    addToCartRate: randFloat(6, 14),
    costPerAcquisition: randFloat(8, 22, 2),
    trafficSources: [
      { source: 'Organic Search', visitors: organicVisitors, conversions: randInt(Math.round(organicVisitors * 0.02), Math.round(organicVisitors * 0.04)) },
      { source: 'Direct', visitors: directVisitors, conversions: randInt(Math.round(directVisitors * 0.03), Math.round(directVisitors * 0.05)) },
      { source: 'Social Media', visitors: socialVisitors, conversions: randInt(Math.round(socialVisitors * 0.01), Math.round(socialVisitors * 0.03)) },
      { source: 'Email', visitors: emailVisitors, conversions: randInt(Math.round(emailVisitors * 0.04), Math.round(emailVisitors * 0.07)) },
      { source: 'Paid Ads', visitors: paidVisitors, conversions: randInt(Math.round(paidVisitors * 0.03), Math.round(paidVisitors * 0.06)) },
    ],
    topReferrers: [
      { domain: 'google.com', visitors: randInt(1800, 3200) },
      { domain: 'instagram.com', visitors: randInt(800, 1600) },
      { domain: 'facebook.com', visitors: randInt(500, 1200) },
      { domain: 'tiktok.com', visitors: randInt(300, 800) },
      { domain: 'shopee.com.my', visitors: randInt(150, 500) },
      { domain: 'twitter.com', visitors: randInt(100, 350) },
    ],
    funnelData: {
      visitors: totalVisitors,
      productViews: funnelProductViews,
      addedToCart: funnelAddToCart,
      checkout: funnelCheckout,
      purchased: funnelPurchased,
    },
  }
}

/* ── Public API ───────────────────────────────────────── */

export function getWebsiteAnalytics(): WebsiteAnalytics {
  buildData()
  return _website!
}

export function getMarketingAnalytics(): MarketingAnalytics {
  buildData()
  return _marketing!
}
