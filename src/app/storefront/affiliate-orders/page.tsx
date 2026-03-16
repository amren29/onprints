'use client'

import { useState } from 'react'
import MyStoreShell from '@/components/MyStoreShell'
import ViewModal, { ViewRow, SectionLabel } from '@/components/ViewModal'
import { getAffiliateOrders, type DbAffiliateOrder } from '@/lib/db/affiliates'
import { useShop } from '@/providers/shop-provider'
import { useQuery } from '@tanstack/react-query'
import Pagination, { usePagination } from '@/components/Pagination'
import RowMenu from '@/components/RowMenu'
import BulkActionBar, { BulkCheckbox, useBulkSelect } from '@/components/BulkActionBar'
import { downloadCSV } from '@/lib/csv-utils'

const SearchIcon = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>)
const ExportIcon = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>)
const LinkIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>)
const ArrowUpIcon = () => (<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>)

function fmt(n: number) {
  return `RM ${(n ?? 0).toLocaleString('en-MY', { minimumFractionDigits: 0 })}`
}

export default function AffiliateOrdersPage() {
  const { shopId } = useShop()

  const { data: orders = [] } = useQuery({
    queryKey: ['affiliate-orders', shopId],
    queryFn: () => getAffiliateOrders(shopId),
    enabled: !!shopId,
  })

  const [search, setSearch] = useState('')
  const [affiliateFilter, setAffiliateFilter] = useState('All')
  const [viewTarget, setViewTarget] = useState<DbAffiliateOrder | null>(null)

  // Get unique affiliate names for filter
  const affiliateNames = ['All', ...Array.from(new Set(orders.map(o => o.affiliate_name)))]

  const filtered = orders.filter(o => {
    if (affiliateFilter !== 'All' && o.affiliate_name !== affiliateFilter) return false
    if (search && !o.customer_name.toLowerCase().includes(search.toLowerCase()) && !o.order_id.toLowerCase().includes(search.toLowerCase()) && !o.affiliate_code.toLowerCase().includes(search.toLowerCase()) && !o.affiliate_name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const { page, perPage, totalPages, paged, setPage, setPerPage, total: totalFiltered } = usePagination(filtered)
  const bulk = useBulkSelect(paged, filtered)

  const totalOrders = orders.length
  const totalRevenue = orders.reduce((s, o) => s + o.order_total, 0)

  // Per-affiliate summary
  const affiliateSummary = Array.from(new Set(orders.map(o => o.affiliate_code))).map(code => {
    const afOrders = orders.filter(o => o.affiliate_code === code)
    return { code, name: afOrders[0]?.affiliate_name ?? code, count: afOrders.length, total: afOrders.reduce((s, o) => s + o.order_total, 0) }
  })

  return (
    <MyStoreShell>
      <div className="page-header">
        <div><div className="page-title">Affiliate Orders</div><div className="page-subtitle">Orders referred through affiliate links</div></div>
        <div className="page-actions">
          <button className="topbar-btn" onClick={() => downloadCSV('affiliate-orders', filtered, [{ key: 'id', label: 'ID' }, { key: 'order_id', label: 'Order ID' }, { key: 'customer_name', label: 'Customer' }, { key: 'affiliate_name', label: 'Affiliate' }, { key: 'affiliate_code', label: 'Code' }, { key: 'order_total', label: 'Total' }, { key: 'order_date', label: 'Date' }])}><ExportIcon /><span>Export</span></button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="finance-stats">
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-label"><LinkIcon /> Total Referred</div><span className="stat-card-period">All time</span></div>
          <div className="stat-value" style={{ fontSize: 20 }}>{totalOrders}<span className="stat-change-pos"><ArrowUpIcon /> {totalOrders}</span></div>
          <div className="stat-vs">Orders via affiliate links</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-label"><LinkIcon /> Revenue</div></div>
          <div className="stat-value" style={{ fontSize: 20 }}>{fmt(totalRevenue)}</div>
          <div className="stat-vs">From affiliate referrals</div>
        </div>
        {affiliateSummary.map(a => (
          <div key={a.code} className="stat-card">
            <div className="stat-card-header">
              <div className="stat-card-label">
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>{a.name.split(' ').map(n => n[0]).join('')}</div>
                {a.name}
              </div>
            </div>
            <div className="stat-value" style={{ fontSize: 20 }}>{a.count} orders</div>
            <div className="stat-vs">{fmt(a.total)} total &middot; Code: {a.code}</div>
          </div>
        ))}
      </div>

      <div className="page-scroll">
        {/* Filter row */}
        <div className="filter-row">
          <div className="filter-bar">
            {affiliateNames.map(name => (
              <button key={name} className={`filter-tab${affiliateFilter === name ? ' active' : ''}`} onClick={() => { setAffiliateFilter(name); setPage(1) }}>{name}</button>
            ))}
          </div>
          <div className="filter-right">
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '6px 12px' }}>
              <SearchIcon />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search orders..." style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12.5, color: 'var(--text-primary)', width: 170 }} />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="card">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}><BulkCheckbox checked={bulk.allPageSelected} indeterminate={!bulk.allPageSelected && bulk.somePageSelected} onChange={bulk.toggleAll} /></th>
                <th>Ref #</th>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Affiliate</th>
                <th>Code</th>
                <th style={{ textAlign: 'right' }}>Order Total</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={9}><div className="empty-state">No affiliate orders found</div></td></tr>}
              {paged.map(o => (
                <tr key={o.id}>
                  <td><BulkCheckbox checked={bulk.selectedIds.has(o.id)} onChange={() => bulk.toggleSelect(o.id)} /></td>
                  <td>
                    <button onClick={() => setViewTarget(o)} style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font)' }}>{o.id}</button>
                  </td>
                  <td><span style={{ fontSize: 12.5, color: 'var(--accent)', fontWeight: 500 }}>{o.order_id}</span></td>
                  <td><span className="cell-name">{o.customer_name}</span></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>{o.affiliate_name.split(' ').map(n => n[0]).join('')}</div>
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{o.affiliate_name}</span>
                    </div>
                  </td>
                  <td><span className="badge badge-info">{o.affiliate_code}</span></td>
                  <td style={{ textAlign: 'right', fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{fmt(o.order_total)}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{o.order_date}</td>
                  <td>
                    <RowMenu items={[
                      { label: 'View', action: () => setViewTarget(o) },
                    ]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} total={totalFiltered} perPage={perPage} onPageChange={setPage} onPerPageChange={setPerPage} />
      </div>

      {/* View modal */}
      {viewTarget && (
        <ViewModal title={viewTarget.id} subtitle={`${viewTarget.order_id} \u00b7 ${viewTarget.customer_name}`} status="Active" onClose={() => setViewTarget(null)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
            <div>
              <SectionLabel>Order</SectionLabel>
              <ViewRow label="Order ID" value={viewTarget.order_id} accent />
              <ViewRow label="Customer" value={viewTarget.customer_name} />
              <ViewRow label="Order Total" value={fmt(viewTarget.order_total)} accent />
              <ViewRow label="Date" value={viewTarget.order_date} />
            </div>
            <div>
              <SectionLabel>Affiliate Attribution</SectionLabel>
              <ViewRow label="Affiliate" value={viewTarget.affiliate_name} />
              <ViewRow label="Code" value={viewTarget.affiliate_code} badge="Active" />
            </div>
          </div>
        </ViewModal>
      )}
      <BulkActionBar count={bulk.selectedIds.size} total={filtered.length} onDeselectAll={bulk.clearSelection} actions={[
        { label: 'Export CSV', icon: <ExportIcon />, action: () => downloadCSV('affiliate-orders-selected', bulk.selectedItems, [{ key: 'id', label: 'ID' }, { key: 'order_id', label: 'Order ID' }, { key: 'customer_name', label: 'Customer' }, { key: 'affiliate_name', label: 'Affiliate' }, { key: 'affiliate_code', label: 'Code' }, { key: 'order_total', label: 'Total' }, { key: 'order_date', label: 'Date' }]) },
      ]} />
    </MyStoreShell>
  )
}
