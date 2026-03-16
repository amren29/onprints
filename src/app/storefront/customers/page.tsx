'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import MyStoreShell from '@/components/MyStoreShell'
import DateRangePicker from '@/components/DateRangePicker'
import ViewModal, { SectionLabel, ViewRow } from '@/components/ViewModal'
import RowMenu from '@/components/RowMenu'
import { getCustomers, type DbCustomer } from '@/lib/db/customers'
import { getOrders, type DbOrder } from '@/lib/db/orders'
import { useShop } from '@/providers/shop-provider'
import { useQuery } from '@tanstack/react-query'
import BulkActionBar, { BulkCheckbox, useBulkSelect } from '@/components/BulkActionBar'

/* -- ICONS ------------------------------------------------ */
const ExportIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
)
const SearchIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
)
const GlobeIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
  </svg>
)

const STATUS_BADGE: Record<string, string> = {
  VIP:      'badge badge-success',
  Active:   'badge badge-info',
  'At Risk':'badge badge-warning',
  Inactive: 'badge badge-pending',
}

const TABS = ['All', 'VIP', 'Active', 'At Risk']

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

function fmtMoney(n: number) {
  return `RM ${(n ?? 0).toLocaleString('en-MY', { minimumFractionDigits: 0 })}`
}

export default function StorefrontCustomersPage() {
  const router = useRouter()
  const { shopId } = useShop()

  const { data: allCustomers = [] } = useQuery({
    queryKey: ['customers', shopId],
    queryFn: () => getCustomers(shopId),
    enabled: !!shopId,
  })

  const { data: allOrders = [] } = useQuery({
    queryKey: ['orders', shopId],
    queryFn: () => getOrders(shopId),
    enabled: !!shopId,
  })

  const [tab, setTab]       = useState('All')
  const [search, setSearch] = useState('')
  const [viewTarget, setViewTarget] = useState<DbCustomer | null>(null)

  // Derive online-store customers and metrics
  const { customers, onlineOrderCounts, onlineRevenue } = useMemo(() => {
    const onlineOrders = allOrders.filter(o => o.source === 'online-store')
    const onlineCustomerNames = new Set(onlineOrders.map(o => o.customer_name))

    const counts: Record<string, number> = {}
    const revenue: Record<string, number> = {}
    onlineOrders.forEach(o => {
      counts[o.customer_name] = (counts[o.customer_name] || 0) + 1
      revenue[o.customer_name] = (revenue[o.customer_name] || 0) + (o.grand_total ?? 0)
    })

    const filtered = allCustomers.filter(c => onlineCustomerNames.has(c.name))
    return { customers: filtered, onlineOrderCounts: counts, onlineRevenue: revenue }
  }, [allCustomers, allOrders])

  const filtered = customers.filter(c => {
    if (tab !== 'All' && c.status !== tab) return false
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) &&
        !c.company.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const bulk = useBulkSelect(filtered, filtered)

  const vip    = customers.filter(c => c.status === 'VIP').length
  const active = customers.filter(c => c.status === 'Active').length
  const totalOnlineRev = Object.values(onlineRevenue).reduce((s, v) => s + v, 0)

  return (
    <MyStoreShell>
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">Customers</div>
          <div className="page-subtitle">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <GlobeIcon /> Customers who ordered from your online store · {customers.length} total
            </span>
          </div>
        </div>
        <div className="page-actions">
          <DateRangePicker />
          <button className="topbar-btn">
            <ExportIcon />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="finance-stats">
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-label">Online Customers</div></div>
          <div className="stat-value">{customers.length}</div>
          <div className="stat-vs">Ordered via online store</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-label">VIP</div></div>
          <div className="stat-value">{vip}</div>
          <div className="stat-vs">High-value accounts</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-label">Active</div></div>
          <div className="stat-value">{active}</div>
          <div className="stat-vs">Ordering regularly</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-label">Online Revenue</div></div>
          <div className="stat-value" style={{ fontSize: 20 }}>{fmtMoney(totalOnlineRev)}</div>
          <div className="stat-vs">From online store</div>
        </div>
      </div>

      <div className="page-scroll">
        {/* Filters */}
        <div className="filter-row">
          <div className="filter-bar">
            {TABS.map(t => (
              <button key={t} className={`filter-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{t}</button>
            ))}
          </div>
          <div className="filter-right">
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '6px 12px' }}>
              <SearchIcon />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers..."
                style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12.5, color: 'var(--text-primary)', width: 180 }} />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="card">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}><BulkCheckbox checked={bulk.allPageSelected} indeterminate={!bulk.allPageSelected && bulk.somePageSelected} onChange={bulk.toggleAll} /></th>
                <th>Customer</th>
                <th>Contact</th>
                <th>Channel</th>
                <th>Online Orders</th>
                <th>Online Revenue</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8}><div className="empty-state">No online store customers found</div></td></tr>
              )}
              {filtered.map(c => (
                <tr key={c.id}>
                  <td><BulkCheckbox checked={bulk.selectedIds.has(c.id)} onChange={() => bulk.toggleSelect(c.id)} /></td>
                  <td>
                    <div className="td-with-icon">
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                        {initials(c.name)}
                      </div>
                      <div>
                        <button className="cell-name" onClick={() => setViewTarget(c)} style={{ color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600, fontSize: 13, fontFamily: 'var(--font)' }}>{c.name}</button>
                        <div className="cell-sub">{c.seq_id} · {c.company || '\u2014'}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: 12.5 }}>{c.email}</div>
                    <div className="cell-sub">{c.phone}</div>
                  </td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'var(--accent)', fontWeight: 500 }}>
                      <GlobeIcon /> Online Store
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{onlineOrderCounts[c.name] || 0}</td>
                  <td style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{fmtMoney(onlineRevenue[c.name] || 0)}</td>
                  <td><span className={STATUS_BADGE[c.status] || 'badge badge-pending'}>{c.status}</span></td>
                  <td>
                    <RowMenu items={[
                      { label: 'View',               action: () => setViewTarget(c) },
                      { label: 'Open in Customers',   action: () => router.push(`/customers/${c.id}`) },
                    ]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <BulkActionBar count={bulk.selectedIds.size} total={filtered.length} onDeselectAll={bulk.clearSelection} actions={[]} />

      {/* View Modal */}
      {viewTarget && (
        <ViewModal
          title={viewTarget.name}
          subtitle={`${viewTarget.seq_id} · Online Store Customer`}
          status={viewTarget.status}
          onClose={() => setViewTarget(null)}
          onEdit={() => { setViewTarget(null); router.push(`/customers/${viewTarget.id}`) }}
        >
          <SectionLabel>Contact Details</SectionLabel>
          <ViewRow label="Email" value={viewTarget.email || '\u2014'} />
          <ViewRow label="Phone" value={viewTarget.phone || '\u2014'} />
          <ViewRow label="Company" value={viewTarget.company || '\u2014'} />
          <ViewRow label="Location" value={viewTarget.location || '\u2014'} />
          <div style={{ marginTop: 18 }} />
          <SectionLabel>Online Store Activity</SectionLabel>
          <ViewRow label="Channel" value="Online Store" />
          <ViewRow label="Online Orders" value={onlineOrderCounts[viewTarget.name] || 0} />
          <ViewRow label="Online Revenue" value={fmtMoney(onlineRevenue[viewTarget.name] || 0)} accent />
          <ViewRow label="Member Since" value={viewTarget.created_at || '\u2014'} />
          {viewTarget.notes && (
            <>
              <div style={{ marginTop: 18 }} />
              <SectionLabel>Notes</SectionLabel>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0 }}>{viewTarget.notes}</p>
            </>
          )}

          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <button className="btn-secondary" style={{ fontSize: 12, gap: 5 }} onClick={() => { setViewTarget(null); router.push(`/customers/${viewTarget.id}`) }}>
              Open full customer in dashboard &rarr;
            </button>
          </div>
        </ViewModal>
      )}
    </MyStoreShell>
  )
}
