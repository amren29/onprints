'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { useShop } from '@/providers/shop-provider'
import { useQuery } from '@tanstack/react-query'
import { getCustomers } from '@/lib/db/customers'
import { getAgents } from '@/lib/db/agents'
import { getPayments } from '@/lib/db/payments'
import { getOrders } from '@/lib/db/orders'
import { getProducts } from '@/lib/db/catalog'
import { getStockItems } from '@/lib/db/inventory'

interface SearchResult {
  id: string
  label: string
  sub: string
  badge?: string
  amount?: string
  route: string
}

interface ResultGroup {
  key: string
  label: string
  results: SearchResult[]
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <strong style={{ color: 'var(--accent)', fontWeight: 600 }}>
        {text.slice(idx, idx + query.length)}
      </strong>
      {text.slice(idx + query.length)}
    </>
  )
}

function fmtAmt(n: number) {
  return 'RM ' + n.toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function buildGroups(
  query: string,
  customers: any[],
  agents: any[],
  payments: any[],
  orders: any[],
  catalog: any[],
  stock: any[],
): ResultGroup[] {
  const q = query.trim().toLowerCase()

  function match(...fields: string[]) {
    return fields.some(f => (f ?? '').toLowerCase().includes(q))
  }

  const groups: ResultGroup[] = [
    {
      key: 'customers',
      label: 'Customers',
      results: customers
        .filter(c => match(c.seq_id ?? c.id, c.name, c.company, c.email, c.phone, c.location, c.customer_type, c.status))
        .slice(0, 4)
        .map(c => ({
          id: c.id,
          label: c.name,
          sub: [c.seq_id ?? c.id, c.company].filter(Boolean).join(' · ') || '—',
          badge: c.status,
          route: `/customers/${c.id}`,
        })),
    },
    {
      key: 'payments',
      label: 'Payments',
      results: payments
        .filter(p => match(p.seq_id ?? p.id, p.client ?? '', p.status, p.method ?? '', p.ref ?? ''))
        .slice(0, 4)
        .map(p => ({
          id: p.id,
          label: p.seq_id ?? p.id,
          sub: p.client ?? '',
          badge: p.status,
          amount: fmtAmt(p.amount_paid ?? p.amountPaid ?? 0),
          route: `/payments/${p.id}`,
        })),
    },
    {
      key: 'orders',
      label: 'Orders',
      results: orders
        .filter(o => match(o.seq_id ?? o.id, o.customer_name ?? o.customer ?? '', o.agent_name ?? o.agent ?? '', o.status, o.source ?? '', o.delivery_method ?? ''))
        .slice(0, 4)
        .map(o => ({
          id: o.id,
          label: o.seq_id ?? o.id,
          sub: o.customer_name ?? o.customer ?? '',
          badge: o.status,
          route: `/orders/${o.id}`,
        })),
    },
    {
      key: 'agents',
      label: 'Agents',
      results: agents
        .filter(a => match(a.seq_id ?? a.id, a.full_name ?? a.fullName ?? '', a.email, a.phone, a.region, a.status))
        .slice(0, 4)
        .map(a => ({
          id: a.id,
          label: a.full_name ?? a.fullName ?? '',
          sub: [a.seq_id ?? a.id, a.email].join(' · '),
          badge: a.status,
          route: `/agents/${a.id}`,
        })),
    },
    {
      key: 'catalog',
      label: 'Catalog',
      results: catalog
        .filter(c => match(c.seq_id ?? c.id, c.name, c.sku, c.description ?? '', c.status))
        .slice(0, 4)
        .map(c => ({
          id: c.id,
          label: c.name,
          sub: [c.sku].filter(Boolean).join(' · '),
          badge: c.status,
          route: `/catalog/${c.id}`,
        })),
    },
    {
      key: 'stock',
      label: 'Stock',
      results: stock
        .filter(s => match(s.seq_id ?? s.id, s.name, s.sku, s.supplier ?? '', s.status))
        .slice(0, 4)
        .map(s => ({
          id: s.id,
          label: s.name,
          sub: [s.sku, s.supplier].filter(Boolean).join(' · '),
          badge: s.status,
          route: `/stock/${s.id}`,
        })),
    },
  ]

  const ALL_PAGES = [
    { id: 'pg-dashboard',    label: 'Dashboard',    sub: 'Overview analytics',              route: '/dashboard' },
    { id: 'pg-orders',       label: 'Orders',       sub: 'All orders list',                 route: '/orders' },
    { id: 'pg-production',   label: 'Production',   sub: 'Print production management',     route: '/production' },
    { id: 'pg-customers',    label: 'Customers',    sub: 'Manage customers CRM',            route: '/customers' },
    { id: 'pg-kanban',       label: 'Kanban',       sub: 'Order pipeline board',            route: '/kanban' },
    { id: 'pg-proofing',     label: 'Proofing',     sub: 'Artwork proof approvals',         route: '/proofing' },
    { id: 'pg-reports',      label: 'Reports',      sub: 'Analytics reports',               route: '/reports' },
    { id: 'pg-payments',     label: 'Payments',     sub: 'Payment records',                 route: '/payments' },
    { id: 'pg-catalog',      label: 'Catalog',      sub: 'Products pricing catalog',        route: '/catalog' },
    { id: 'pg-stock',        label: 'Stock',         sub: 'Inventory stock management',      route: '/stock' },
    { id: 'pg-stock-logs',   label: 'Stock Logs',   sub: 'Stock movement history logs',     route: '/stock-logs' },
    { id: 'pg-suppliers',    label: 'Suppliers',    sub: 'Supplier vendor management',      route: '/suppliers' },
    { id: 'pg-agents',       label: 'Agents',       sub: 'Sales agents & resellers',        route: '/agents' },
    { id: 'pg-settings',     label: 'Settings',     sub: 'Account preferences roles',       route: '/settings' },
    { id: 'pg-new-customer', label: 'New Customer', sub: 'Create add customer',             route: '/customers/new' },
    { id: 'pg-new-order',    label: 'New Order',    sub: 'Create add order',                route: '/orders/new' },
    { id: 'pg-new-agent',    label: 'New Agent',    sub: 'Create add agent',                route: '/agents/new' },
  ]

  const matchedPages = ALL_PAGES.filter(p =>
    match(p.label, p.sub)
  ).slice(0, 4).map(p => ({ ...p, badge: undefined, amount: undefined }))

  if (matchedPages.length > 0) {
    groups.unshift({
      key: 'pages',
      label: 'Pages',
      results: matchedPages,
    })
  }

  return groups.filter(g => g.results.length > 0)
}

const NAV_GROUPS = [
  {
    section: 'Navigate',
    items: [
      { label: 'Dashboard',   route: '/dashboard' },
      { label: 'Orders',      route: '/orders' },
      { label: 'Production',  route: '/production' },
      { label: 'Customers',   route: '/customers' },
      { label: 'Kanban',      route: '/kanban' },
      { label: 'Proofing',    route: '/proofing' },
      { label: 'Reports',     route: '/reports' },
    ],
  },
  {
    section: 'Finance',
    items: [
      { label: 'Payments',    route: '/payments' },
    ],
  },
  {
    section: 'Catalog & Stock',
    items: [
      { label: 'Catalog',     route: '/catalog' },
      { label: 'Stock',       route: '/stock' },
      { label: 'Stock Logs',  route: '/stock-logs' },
      { label: 'Suppliers',   route: '/suppliers' },
    ],
  },
  {
    section: 'Team',
    items: [
      { label: 'Agents',      route: '/agents' },
      { label: 'Settings',    route: '/settings' },
    ],
  },
  {
    section: 'Create New',
    items: [
      { label: 'New Customer',   route: '/customers/new' },
      { label: 'New Order',      route: '/orders/new' },
      { label: 'New Agent',      route: '/agents/new' },
    ],
  },
]

const BADGE_COLORS: Record<string, string> = {
  Active: '#006AFF',
  VIP: '#7c3aed',
  'At Risk': '#d97706',
  Inactive: '#9ca3af',
  Paid: '#006AFF',
  Sent: '#2563eb',
  Overdue: '#dc2626',
  Draft: '#9ca3af',
  'Partially Paid': '#d97706',
  Approved: '#006AFF',
  Expired: '#dc2626',
  Captured: '#006AFF',
  Pending: '#d97706',
  Failed: '#dc2626',
  Suspended: '#dc2626',
  'In Progress': '#2563eb',
  Completed: '#006AFF',
  Cancelled: '#dc2626',
  Active_stock: '#006AFF',
  'Low Stock': '#d97706',
  'Out of Stock': '#dc2626',
}

function badgeColor(status: string) {
  return BADGE_COLORS[status] ?? '#9ca3af'
}

export default function SearchPalette({ onClose }: { onClose: () => void }) {
  const [query, setQuery]     = useState('')
  const [groups, setGroups]   = useState<ResultGroup[]>([])
  const [activeIdx, setActive] = useState(-1)
  const router    = useRouter()
  const inputRef  = useRef<HTMLInputElement>(null)
  const listRef   = useRef<HTMLDivElement>(null)
  const { shopId } = useShop()

  // Pre-fetch all data for instant search filtering
  const { data: customers = [] } = useQuery({
    queryKey: ['customers', shopId],
    queryFn: () => getCustomers(shopId),
    enabled: !!shopId,
    staleTime: 60_000,
  })
  const { data: agents = [] } = useQuery({
    queryKey: ['agents', shopId],
    queryFn: () => getAgents(shopId),
    enabled: !!shopId,
    staleTime: 60_000,
  })
  const { data: payments = [] } = useQuery({
    queryKey: ['payments', shopId],
    queryFn: () => getPayments(shopId),
    enabled: !!shopId,
    staleTime: 60_000,
  })
  const { data: orders = [] } = useQuery({
    queryKey: ['orders', shopId],
    queryFn: () => getOrders(shopId),
    enabled: !!shopId,
    staleTime: 60_000,
  })
  const { data: catalog = [] } = useQuery({
    queryKey: ['products', shopId],
    queryFn: () => getProducts(shopId),
    enabled: !!shopId,
    staleTime: 60_000,
  })
  const { data: stock = [] } = useQuery({
    queryKey: ['stock', shopId],
    queryFn: () => getStockItems(shopId),
    enabled: !!shopId,
    staleTime: 60_000,
  })

  // Focus input on mount, lock body scroll
  useEffect(() => {
    inputRef.current?.focus()
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Rebuild results on query change
  useEffect(() => {
    if (!query.trim()) { setGroups([]); setActive(-1); return }
    setGroups(buildGroups(query, customers, agents, payments, orders, catalog, stock))
    setActive(-1)
  }, [query, customers, agents, payments, orders, catalog, stock])

  // Flatten all results for keyboard nav
  const allResults: Array<SearchResult & { groupKey: string }> = groups.flatMap(g =>
    g.results.map(r => ({ ...r, groupKey: g.key }))
  )

  const navigate = useCallback((route: string) => {
    setQuery('')
    router.push(route)
    onClose()
  }, [router, onClose])

  // Keyboard handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        if (query.trim() && allResults.length > 0) {
          setActive(v => (v + 1) % allResults.length)
        }
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        if (query.trim() && allResults.length > 0) {
          setActive(v => (v - 1 + allResults.length) % allResults.length)
        }
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        if (!query.trim()) return
        if (activeIdx >= 0 && allResults[activeIdx]) {
          navigate(allResults[activeIdx].route)
        } else if (allResults[0]) {
          navigate(allResults[0].route)
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, allResults, activeIdx, navigate, query])

  // Scroll active item into view
  useEffect(() => {
    if (activeIdx < 0 || !listRef.current) return
    const el = listRef.current.querySelectorAll<HTMLElement>('[data-result-row]')[activeIdx]
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  const showEmpty = !query.trim()

  const panel = (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'var(--modal-overlay)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '10vh',
      }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          width: 560, maxHeight: 480,
          background: 'var(--bg-card)',
          borderRadius: 16,
          boxShadow: 'var(--shadow-modal)',
          border: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: 'var(--font)',
        }}
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Input row */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '0 20px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search customers, orders, payments…"
            style={{
              flex: 1,
              fontSize: 16,
              padding: '16px 0',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-primary)',
              outline: 'none',
              fontFamily: 'var(--font)',
            }}
          />
          <span style={{
            fontSize: 10, fontWeight: 600,
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 5,
            padding: '2px 7px',
            color: 'var(--text-muted)',
            flexShrink: 0,
            letterSpacing: '0.02em',
          }}>
            ⌘K
          </span>
        </div>

        {/* Results */}
        <div ref={listRef} style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {showEmpty ? (
            /* All pages grouped */
            <div style={{ padding: '4px 0 8px' }}>
              {NAV_GROUPS.map(group => (
                <div key={group.section}>
                  <div style={{
                    fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: 0.8, color: 'var(--text-muted)',
                    padding: '8px 16px 2px',
                  }}>
                    {group.section}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, padding: '0 8px' }}>
                    {group.items.map(item => (
                      <div
                        key={item.route}
                        onClick={() => navigate(item.route)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '7px 10px',
                          cursor: 'pointer',
                          borderRadius: 7,
                          transition: 'background 0.1s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="9 18 15 12 9 6"/></svg>
                        <span style={{ fontSize: 13, fontWeight: 450, color: 'var(--text-primary)' }}>
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : groups.length === 0 ? (
            <div style={{
              padding: '40px 20px', textAlign: 'center',
              color: 'var(--text-muted)', fontSize: 13,
            }}>
              No results for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <div style={{ padding: '4px 0 8px' }}>
              {groups.map(group => {
                return (
                  <div key={group.key}>
                    <div style={{
                      fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: 0.8, color: 'var(--text-muted)',
                      padding: '8px 16px 4px',
                    }}>
                      {group.label}
                    </div>
                    {group.results.map(result => {
                      const flatIdx = allResults.findIndex(r => r.id === result.id && r.groupKey === group.key)
                      const isActive = flatIdx === activeIdx
                      return (
                        <div
                          key={result.id}
                          data-result-row
                          onClick={() => navigate(result.route)}
                          onMouseEnter={() => setActive(flatIdx)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '7px 16px',
                            cursor: 'pointer',
                            background: isActive ? 'var(--bg)' : 'transparent',
                            borderRadius: 8,
                            margin: '0 8px',
                            transition: 'background 0.08s',
                          }}
                        >
                          {/* Avatar / page icon */}
                          <div style={{
                            width: 28, height: 28, borderRadius: group.key === 'pages' ? 7 : '50%',
                            background: group.key === 'pages' ? 'var(--accent)' + '14' : 'var(--bg)',
                            border: '1px solid var(--border)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 600,
                            color: group.key === 'pages' ? 'var(--accent)' : 'var(--text-secondary)',
                            flexShrink: 0,
                          }}>
                            {group.key === 'pages' ? (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                            ) : result.label.slice(0, 1).toUpperCase()}
                          </div>

                          {/* Main text */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {highlight(result.label, query)}
                            </div>
                            {result.sub && (
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {highlight(result.sub, query)}
                              </div>
                            )}
                          </div>

                          {/* Badge */}
                          {result.badge && (
                            <span style={{
                              fontSize: 10.5, fontWeight: 500,
                              color: badgeColor(result.badge),
                              background: badgeColor(result.badge) + '14',
                              padding: '2px 8px', borderRadius: 20,
                              flexShrink: 0,
                            }}>
                              {result.badge}
                            </span>
                          )}

                          {/* Amount */}
                          {result.amount && (
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', flexShrink: 0 }}>
                              {result.amount}
                            </span>
                          )}

                          {/* Arrow */}
                          <svg style={{ opacity: isActive ? 0.6 : 0.25, flexShrink: 0 }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          borderTop: '1px solid var(--border)',
          padding: '8px 16px',
          display: 'flex', alignItems: 'center', gap: 14,
          flexShrink: 0,
        }}>
          {[['↑↓', 'navigate'], ['↵', 'open'], ['⎋', 'close']].map(([key, label]) => (
            <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-muted)' }}>
              <kbd style={{
                fontSize: 11, fontWeight: 600,
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 4, padding: '1px 5px',
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font)',
              }}>
                {key}
              </kbd>
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return null
  return createPortal(panel, document.body)
}
