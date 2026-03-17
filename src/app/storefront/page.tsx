'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import MyStoreShell from '@/components/MyStoreShell'
import { getProducts, type DbProduct } from '@/lib/db/catalog'
import { getOrders, type DbOrder } from '@/lib/db/orders'
import { getStorePages } from '@/lib/db/storefront'
import {
  type GlobalSettings, type PageSection,
  DEFAULT_GLOBAL, PAGE_IDS, DEFAULT_PAGE_SECTIONS,
} from '@/lib/store-builder'
import { useShop } from '@/providers/shop-provider'
import { useQuery } from '@tanstack/react-query'

function fmt(n: number) {
  return `RM ${(n ?? 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`
}

/* ── Icons ──────────────────────────────────────────── */
const GlobeIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>)
const CopyIcon = () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>)
const EditIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>)
const LinkIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>)
const ChevronRight = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>)
const PackageIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>)
const GearIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>)
const CatalogIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>)
const CreditCardIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>)
const TruckIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>)
const GlobeDomainIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>)
const PaletteIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r="2"/><circle cx="17.5" cy="10.5" r="2"/><circle cx="8.5" cy="7.5" r="2"/><circle cx="6.5" cy="12" r="2"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.7-.7 1.7-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.7-1.7 1.7-1.7H17c2.8 0 5-2.2 5-5 0-5.2-4.5-9.5-10-9.5z"/></svg>)
const PlusBoxIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>)

/* ══════════════════════════════════════════════════════
   MY STORE DASHBOARD
═══════════════════════════════════════════════════════ */
export default function MyStoreDashboard() {
  const { shopId } = useShop()
  const [copied, setCopied] = useState(false)

  // ── Load products from DB ──
  const { data: allProducts = [] } = useQuery({
    queryKey: ['products', shopId],
    queryFn: () => getProducts(shopId),
    enabled: !!shopId,
  })

  // ── Load orders from DB ──
  const { data: allOrders = [] } = useQuery({
    queryKey: ['orders', shopId],
    queryFn: () => getOrders(shopId),
    enabled: !!shopId,
  })

  // ── Load store pages (for global settings + sections) ──
  const { data: dbPages = [] } = useQuery({
    queryKey: ['store-pages', shopId],
    queryFn: () => getStorePages(shopId),
    enabled: !!shopId,
  })

  // ── Derive global settings + homepage sections from DB pages ──
  const { globalSettings, sections } = useMemo(() => {
    let globals: GlobalSettings = { ...DEFAULT_GLOBAL }
    let homeSections: PageSection[] = DEFAULT_PAGE_SECTIONS['homepage']()

    for (const row of dbPages) {
      // Use globals from any page (they're synced across all)
      if (row.globals && Object.keys(row.globals).length > 0) {
        globals = { ...DEFAULT_GLOBAL, ...(row.globals as Partial<GlobalSettings>) }
      }
      if (row.page_id === 'homepage') {
        homeSections = row.sections as PageSection[]
      }
    }

    return { globalSettings: globals, sections: homeSections }
  }, [dbPages])

  // ── Derive online orders ──
  const onlineOrders = useMemo(() =>
    allOrders.filter(o => o.source === 'online-store'),
  [allOrders])

  // ── Derived stats ──
  const totalOnlineRevenue = onlineOrders.filter(o => o.status !== 'Cancelled').reduce((s, o) => s + (o.grand_total ?? 0), 0)
  const pendingOnline = onlineOrders.filter(o => o.status === 'Pending').length
  const confirmedOnline = onlineOrders.filter(o => o.status === 'Confirmed').length
  const storefrontUrl = `onprints.my/s/${globalSettings.slug}`

  // Published + Active products count (replaces localStorage enabledMap)
  const enabledCount = allProducts.filter(p => p.visibility === 'published' && p.status === 'Active').length
  const visibleSections = sections.filter(s => s.visible !== false)

  const copyLink = () => {
    navigator.clipboard?.writeText(`https://${storefrontUrl}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <MyStoreShell>
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <div className="page-title">My Store</div>
          <div className="page-subtitle">Manage your online storefront</div>
        </div>
        <div className="page-actions">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }}>
            <GlobeIcon />
            <a href="/store" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none', fontFamily: 'monospace' }}>{storefrontUrl}</a>
            <span style={{ padding: '2px 7px', borderRadius: 5, fontSize: 10.5, fontWeight: 600, background: globalSettings.published ? 'var(--info-bg)' : 'var(--warning-bg)', color: globalSettings.published ? 'var(--positive)' : 'var(--warning)' }}>
              {globalSettings.published ? '\u25CF Published' : '\u25CB Draft'}
            </span>
            <button className="btn-ghost" style={{ gap: 4, fontSize: 11 }} onClick={copyLink}>
              <CopyIcon /> {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </div>

      <div className="page-scroll">

        {/* ── Hero Card ── */}
        <div className="hero-card">
          <div className="hero-left">
            <div className="hero-label">{globalSettings.shopName || 'My Store'}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 2, marginBottom: 12 }}>
              {globalSettings.tagline || 'Your online storefront'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px',
                borderRadius: 20, fontSize: 11.5, fontWeight: 600,
                background: globalSettings.published ? 'rgba(0,106,255,0.2)' : 'rgba(255,255,255,0.12)',
                color: globalSettings.published ? '#60a5fa' : 'rgba(255,255,255,0.6)',
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: globalSettings.published ? '#60a5fa' : 'rgba(255,255,255,0.4)' }} />
                {globalSettings.published ? 'Live' : 'Draft'}
              </span>
              <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.45)' }}>
                {visibleSections.length} section{visibleSections.length !== 1 ? 's' : ''} &middot; {enabledCount} product{enabledCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <div className="hero-actions">
            <Link href="/storefront/editor"><button className="btn-hero-primary"><EditIcon /> Edit Store</button></Link>
            <button className="btn-hero-secondary" onClick={copyLink}><LinkIcon /> {copied ? 'Copied!' : 'Copy Link'}</button>
          </div>
        </div>

        {/* ── Setup Guide Cards ── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Getting Started</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
            {/* Add your first product */}
            <Link href="/storefront/products" style={{ textDecoration: 'none' }}>
              <div className="card" style={{ padding: '20px 18px', height: '100%', cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,106,255,0.08)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', marginBottom: 14 }}>
                  <PlusBoxIcon />
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Add your first product</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>Add a product with details to your catalog</div>
              </div>
            </Link>

            {/* Design your store */}
            <Link href="/storefront/editor" style={{ textDecoration: 'none' }}>
              <div className="card" style={{ padding: '20px 18px', height: '100%', cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,106,255,0.08)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', marginBottom: 14 }}>
                  <PaletteIcon />
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Design your store</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>Customise layout, branding and themes</div>
              </div>
            </Link>

            {/* Set up payment provider */}
            <Link href="/storefront/settings?tab=Payment" style={{ textDecoration: 'none' }}>
              <div className="card" style={{ padding: '20px 18px', height: '100%', cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,106,255,0.08)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', marginBottom: 14 }}>
                  <CreditCardIcon />
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Set up payment</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>Connect a payment provider to accept payments</div>
              </div>
            </Link>

            {/* Review shipping rates */}
            <Link href="/storefront/settings?tab=Delivery" style={{ textDecoration: 'none' }}>
              <div className="card" style={{ padding: '20px 18px', height: '100%', cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,106,255,0.08)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', marginBottom: 14 }}>
                  <TruckIcon />
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Review shipping rates</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>Set delivery zones and shipping costs</div>
              </div>
            </Link>

            {/* Customise domain */}
            <Link href="/storefront/settings?tab=Store Info" style={{ textDecoration: 'none' }}>
              <div className="card" style={{ padding: '20px 18px', height: '100%', cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,106,255,0.08)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', marginBottom: 14 }}>
                  <GlobeDomainIcon />
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Customise domain</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>Connect a custom domain to your store</div>
              </div>
            </Link>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <div className="stat-card">
            <div className="stat-card-header">
              <div className="stat-card-label">Online Orders</div>
              <span className="stat-card-period">Live</span>
            </div>
            <div className="stat-value">{onlineOrders.length}</div>
            <div className="stat-vs">{confirmedOnline} confirmed · {pendingOnline} pending</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-header">
              <div className="stat-card-label">Revenue</div>
              <span className="stat-card-period">Online store</span>
            </div>
            <div className="stat-value" style={{ fontSize: 20 }}>{fmt(totalOnlineRevenue)}</div>
            <div className="stat-vs">From {onlineOrders.filter(o => o.status !== 'Cancelled').length} orders</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-header">
              <div className="stat-card-label">Avg. Order Value</div>
              <span className="stat-card-period">Online store</span>
            </div>
            <div className="stat-value" style={{ fontSize: 20 }}>{onlineOrders.length > 0 ? fmt(totalOnlineRevenue / onlineOrders.filter(o => o.status !== 'Cancelled').length || 0) : 'RM 0.00'}</div>
            <div className="stat-vs">Per online order</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-header">
              <div className="stat-card-label">Products Shown</div>
              <span className="stat-card-period">Live</span>
            </div>
            <div className="stat-value">{enabledCount}</div>
            <div className="stat-vs">of {allProducts.length} total in catalog</div>
          </div>
        </div>

        {/* ── Two-column grid ── */}
        <div className="bottom-grid">

          {/* Quick Actions */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                Quick Actions
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', padding: '4px 0' }}>
              {[
                { label: 'Edit Store Page', desc: 'Open the visual builder', href: '/storefront/editor', icon: <EditIcon /> },
                { label: 'Manage Products', desc: 'Add or toggle featured products', href: '/catalog', icon: <PackageIcon /> },
                { label: 'Global Settings', desc: 'SEO, contact, design settings', href: '/storefront/editor', icon: <GearIcon /> },
                { label: 'View Catalog', desc: 'Browse your full product catalog', href: '/catalog', icon: <CatalogIcon /> },
              ].map((action, i) => (
                <Link key={i} href={action.href} style={{ textDecoration: 'none' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px',
                    cursor: 'pointer', transition: 'background 0.12s',
                    borderBottom: i < 3 ? '1px solid var(--border)' : 'none',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'var(--bg)', color: 'var(--accent)', flexShrink: 0,
                    }}>
                      {action.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{action.label}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 1 }}>{action.desc}</div>
                    </div>
                    <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}><ChevronRight /></span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Store Details */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                Store Details
              </div>
              <Link href="/storefront/editor" className="card-see-all">Edit <ChevronRight /></Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', padding: '4px 16px 12px' }}>
              {[
                { label: 'Shop Name', value: globalSettings.shopName || '\u2014' },
                { label: 'Accent Color', value: globalSettings.accentColor, isSwatch: true },
                { label: 'Sections', value: `${visibleSections.length} visible of ${sections.length} total` },
                { label: 'Products Shown', value: `${enabledCount} of ${allProducts.length}` },
                { label: 'Contact Email', value: globalSettings.contactEmail || '\u2014' },
                { label: 'Status', value: globalSettings.published ? 'Published' : 'Draft', isBadge: true },
              ].map((row, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 0',
                  borderBottom: i < 5 ? '1px solid var(--border)' : 'none',
                }}>
                  <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{row.label}</span>
                  {row.isSwatch ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 16, height: 16, borderRadius: 4, background: row.value, border: '1px solid var(--border)' }} />
                      <code style={{ fontSize: 12, color: 'var(--text-primary)' }}>{row.value}</code>
                    </div>
                  ) : row.isBadge ? (
                    <span style={{
                      padding: '2px 8px', borderRadius: 5, fontSize: 11, fontWeight: 600,
                      background: globalSettings.published ? 'var(--info-bg)' : 'var(--warning-bg)',
                      color: globalSettings.published ? 'var(--positive)' : 'var(--warning)',
                    }}>
                      {row.value}
                    </span>
                  ) : (
                    <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-primary)' }}>{row.value}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </MyStoreShell>
  )
}
