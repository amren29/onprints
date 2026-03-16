'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import MyStoreShell from '@/components/MyStoreShell'
import DateRangePicker from '@/components/DateRangePicker'
import ViewModal, { ViewRow, SectionLabel } from '@/components/ViewModal'
import RowMenu from '@/components/RowMenu'
import { getProducts, type DbProduct } from '@/lib/db/catalog'
import { useShop } from '@/providers/shop-provider'
import { useQuery } from '@tanstack/react-query'
import BulkActionBar, { BulkCheckbox, useBulkSelect } from '@/components/BulkActionBar'

const ExportIcon = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>)
const SearchIcon = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>)
const GlobeIcon = () => (<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>)

function fmt(n: number) {
  return `RM ${(n ?? 0).toLocaleString('en-MY', { minimumFractionDigits: 0 })}`
}

const PRICING_BADGE: Record<string, { label: string; cls: string }> = {
  fixed:  { label: 'Fixed',   cls: 'badge badge-info'    },
  volume: { label: 'Volume',  cls: 'badge badge-pending' },
  tier:   { label: 'Tiered',  cls: 'badge badge-warning' },
  sqft:   { label: 'Sq. Ft.', cls: 'badge badge-info'    },
}
const STATUS_BADGE: Record<string, string> = { Active: 'badge badge-success', Paused: 'badge badge-pending' }
const TABS = ['All', 'Active', 'Paused']

export default function StorefrontProductsPage() {
  const router = useRouter()
  const { shopId } = useShop()

  const { data: allProducts = [] } = useQuery({
    queryKey: ['products', shopId],
    queryFn: () => getProducts(shopId),
    enabled: !!shopId,
  })

  // Only show products published on the online store
  const items = useMemo(() => allProducts.filter(c => c.visibility === 'published'), [allProducts])

  const [tab, setTab]               = useState('All')
  const [search, setSearch]         = useState('')
  const [viewTarget, setViewTarget] = useState<DbProduct | null>(null)

  const filtered = items.filter(c => {
    if (tab === 'Active' && c.status !== 'Active') return false
    if (tab === 'Paused' && c.status !== 'Paused') return false
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) &&
        !c.sku.toLowerCase().includes(search.toLowerCase()) &&
        !c.pricing_type.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const bulk = useBulkSelect(filtered, filtered)

  const active     = items.filter(c => c.status === 'Active').length
  const paused     = items.filter(c => c.status === 'Paused').length
  const categories = [...new Set(items.map(c => c.pricing_type))].length

  return (
    <MyStoreShell>
      <div className="page-header">
        <div>
          <div className="page-title">Products</div>
          <div className="page-subtitle">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <GlobeIcon /> Products listed on your online store · {items.length} published
            </span>
          </div>
        </div>
        <div className="page-actions">
          <DateRangePicker />
          <button className="topbar-btn"><ExportIcon /><span>Export</span></button>
        </div>
      </div>

      <div className="finance-stats">
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-label">Published</div></div>
          <div className="stat-value">{items.length}</div>
          <div className="stat-vs">On online store</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-label">Active</div></div>
          <div className="stat-value">{active}</div>
          <div className="stat-vs">Available to order</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-label">Paused</div></div>
          <div className="stat-value" style={{ color: 'var(--text-muted)' }}>{paused}</div>
          <div className="stat-vs">Temporarily unavailable</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-label">Pricing Types</div></div>
          <div className="stat-value">{categories}</div>
          <div className="stat-vs">Product pricing types</div>
        </div>
      </div>

      <div className="page-scroll">
        <div className="filter-row">
          <div className="filter-bar">{TABS.map(t => (<button key={t} className={`filter-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{t}</button>))}</div>
          <div className="filter-right">
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '6px 12px' }}>
              <SearchIcon />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12.5, color: 'var(--text-primary)', width: 180 }} />
            </div>
          </div>
        </div>

        <div className="card">
          <table className="data-table">
            <thead>
              <tr><th style={{ width: 40 }}><BulkCheckbox checked={bulk.allPageSelected} indeterminate={!bulk.allPageSelected && bulk.somePageSelected} onChange={bulk.toggleAll} /></th><th>Product</th><th>SKU</th><th>Pricing Type</th><th>Price</th><th>Pricing</th><th>Channel</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={9}><div className="empty-state">No published products found</div></td></tr>}
              {filtered.map(c => {
                const pricing = PRICING_BADGE[c.pricing_type] || { label: c.pricing_type, cls: 'badge badge-info' }
                return (
                  <tr key={c.id}>
                    <td><BulkCheckbox checked={bulk.selectedIds.has(c.id)} onChange={() => bulk.toggleSelect(c.id)} /></td>
                    <td>
                      <button onClick={() => setViewTarget(c)} style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font)', textAlign: 'left' }}>{c.name}</button>
                      <div className="cell-sub">{c.seq_id}</div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>{c.sku}</td>
                    <td style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{c.pricing_type}</td>
                    <td style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{c.base_price > 0 ? fmt(c.base_price) : '\u2014'}</td>
                    <td><span className={pricing.cls}>{pricing.label}</span></td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'var(--accent)', fontWeight: 500 }}>
                        <GlobeIcon /> Online Store
                      </span>
                    </td>
                    <td><span className={STATUS_BADGE[c.status]}>{c.status}</span></td>
                    <td>
                      <RowMenu items={[
                        { label: 'View',            action: () => setViewTarget(c) },
                        { label: 'Open in Catalog',  action: () => router.push(`/catalog/${c.id}`) },
                      ]} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <BulkActionBar count={bulk.selectedIds.size} total={filtered.length} onDeselectAll={bulk.clearSelection} actions={[]} />

      {viewTarget && (
        <ViewModal title={viewTarget.name} subtitle={`${viewTarget.seq_id} · ${viewTarget.sku}`} status={viewTarget.status} onClose={() => setViewTarget(null)} onEdit={() => { setViewTarget(null); router.push(`/catalog/${viewTarget.id}`) }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
            <div>
              <SectionLabel>Product Info</SectionLabel>
              <ViewRow label="Pricing Type" value={viewTarget.pricing_type} />
              <ViewRow label="SKU"         value={viewTarget.sku} />
              <ViewRow label="Price"       value={viewTarget.base_price > 0 ? fmt(viewTarget.base_price) : '\u2014'} accent />
              <ViewRow label="Pricing Type" value={(PRICING_BADGE[viewTarget.pricing_type] || { label: viewTarget.pricing_type }).label} />
            </div>
            <div>
              <SectionLabel>Publishing</SectionLabel>
              <ViewRow label="Status"     value={viewTarget.status} />
              <ViewRow label="Channel"    value="Online Store" />
              <ViewRow label="Visibility" value="Published" />
            </div>
          </div>
          {viewTarget.description && <div style={{ marginTop: 20 }}><SectionLabel>Description</SectionLabel><div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{viewTarget.description}</div></div>}
          {viewTarget.notes && <div style={{ marginTop: 20 }}><SectionLabel>Notes</SectionLabel><div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{viewTarget.notes}</div></div>}

          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <button className="btn-secondary" style={{ fontSize: 12, gap: 5 }} onClick={() => { setViewTarget(null); router.push(`/catalog/${viewTarget.id}`) }}>
              Open full product in catalog &rarr;
            </button>
          </div>
        </ViewModal>
      )}
    </MyStoreShell>
  )
}
