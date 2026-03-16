'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
// TODO [Batch H]: Replace with DB-backed store settings
import { getStoreSettings } from '@/lib/store-settings-store'

/* ── ICONS ─────────────────────────────────────────── */
const ArrowLeft = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
  </svg>
)
const HomeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
)
const OrdersIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
    <rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/>
  </svg>
)
const ProductsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/>
    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
)
const CustomersIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
  </svg>
)
const MarketingIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
  </svg>
)
const DiscountsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>
  </svg>
)
const ContentIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
  </svg>
)

const AnalyticsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 20V10M12 20V4M6 20v-6"/>
  </svg>
)
const BundlesIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
    <line x1="12" y1="12" x2="12" y2="17"/><line x1="9.5" y1="14.5" x2="14.5" y2="14.5"/>
  </svg>
)
const ReviewsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
)
const AffiliatesIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>
  </svg>
)
const MembershipIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
  </svg>
)
const CartsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
    <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
  </svg>
)
const MessagesIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
  </svg>
)
const SettingsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
)

const ChevronsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="7 15 12 20 17 15"/><polyline points="7 9 12 4 17 9"/>
  </svg>
)
const CollapseIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
)
const ExpandIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
)

/* ── NAV DATA ──────────────────────────────────────── */
const NAV = [
  { label: 'Home',           href: '/storefront',                icon: HomeIcon },
  { label: 'Orders',         href: '/storefront/orders',         icon: OrdersIcon },
  { label: 'Products',       href: '/storefront/products',       icon: ProductsIcon },
  { label: 'Discounts',      href: '/storefront/discounts',      icon: DiscountsIcon },
  { label: 'Abandoned Carts',href: '/storefront/abandoned-carts',icon: CartsIcon },
  { label: 'Reviews',        href: '/storefront/reviews',        icon: ReviewsIcon },
  { label: 'Affiliates',     href: '/storefront/affiliates',     icon: AffiliatesIcon },
  { label: 'Membership',    href: '/storefront/membership',     icon: MembershipIcon },
  { label: 'Analytics',      href: '/storefront/analytics',      icon: AnalyticsIcon },
]

/* ── Component ─────────────────────────────────────── */
export default function MyStoreSidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return sessionStorage.getItem('store-sidebar-collapsed') === '1'
  })
  useEffect(() => {
    sessionStorage.setItem('store-sidebar-collapsed', collapsed ? '1' : '0')
  }, [collapsed])

  const isActive = (href: string) => {
    if (href === '#') return false
    if (href === '/storefront') return pathname === '/storefront'
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      {/* Header */}
      <div className="sidebar-header" style={collapsed ? { justifyContent: 'center', padding: 0 } : undefined}>
        {!collapsed && (
          <div className="sidebar-brand">
            <div className="brand-icon">SP</div>
            <span>My Store</span>
          </div>
        )}
        <button className="sidebar-collapse-btn" onClick={() => setCollapsed(c => !c)}>
          {collapsed ? <ExpandIcon /> : <CollapseIcon />}
        </button>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {NAV.map(item => (
          <Link
            key={item.label}
            href={item.href}
            className={`nav-item${isActive(item.href) ? ' active' : ''}`}
          >
            <span className="nav-icon"><item.icon /></span>
            <span className="nav-label">{item.label}</span>
          </Link>
        ))}

        {/* Bottom pinned items */}
        <div style={{ marginTop: 'auto', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
          <Link href="/dashboard" className="nav-item">
            <span className="nav-icon"><HomeIcon /></span>
            <span className="nav-label">Main Dashboard</span>
          </Link>
          <Link href="/storefront/settings" className={`nav-item${isActive('/storefront/settings') ? ' active' : ''}`}>
            <span className="nav-icon"><SettingsIcon /></span>
            <span className="nav-label">Settings</span>
          </Link>
        </div>
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="user-avatar">{(getStoreSettings().storeName || 'A').slice(0, 2).toUpperCase()}</div>
          <div className="user-info">
            <div className="user-name">{getStoreSettings().storeName || 'Admin'}</div>
            <div className="user-email">{getStoreSettings().email || 'admin'}</div>
          </div>
          <span className="user-chevron"><ChevronsIcon /></span>
        </div>
      </div>
    </aside>
  )
}
