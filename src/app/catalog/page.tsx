'use client'

import { useState } from 'react'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import CreateToast from '@/components/CreateToast'
import DateRangePicker from '@/components/DateRangePicker'
import ConfirmModal from '@/components/ConfirmModal'
import RowMenu from '@/components/RowMenu'
import { getProducts, deleteProduct, getCategories, type DbProduct, type DbCategory } from '@/lib/db/catalog'
import { printDocument, docHeader, docFooter, fields2, fields3, section, textBlock, badgeColors } from '@/lib/print-utils'
import { useRouter } from 'next/navigation'
import { useShop } from '@/providers/shop-provider'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const ExportIcon = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>)
const PlusIcon  = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>)
const SearchIcon = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>)
const BookIcon  = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>)
const GlobeIcon = () => (<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>)
const CheckSm = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>)

function displayPrice(c: DbProduct): string {
  if (c.pricing_type === 'fixed' && c.base_price > 0) return `RM ${c.base_price.toFixed(2)}`
  return 'Variable'
}

function buildCatalogPrint(c: DbProduct, categoryName: string): string {
  const [bg, color] = badgeColors(c.status)
  return docHeader('PRODUCT', c.seq_id, c.status, bg, color) +
    section('Product Details', fields2([
      { label: 'Name', value: c.name },
      { label: 'SKU', value: c.sku },
      { label: 'Category', value: categoryName },
      { label: 'Price', value: displayPrice(c) || '—', accent: true },
      { label: 'Pricing Type', value: c.pricing_type },
      { label: 'Visibility', value: c.visibility === 'published' ? 'Published' : 'Draft' },
    ])) +
    (c.description ? section('Description', textBlock(c.description)) : '') +
    (c.notes ? section('Notes', textBlock(c.notes)) : '') +
    docFooter()
}

const PRICING_BADGE: Record<string, { label: string; cls: string }> = {
  fixed:  { label: 'Fixed',   cls: 'badge badge-info'    },
  volume: { label: 'Volume',  cls: 'badge badge-pending' },
  tier:   { label: 'Tiered',  cls: 'badge badge-warning' },
  sqft:   { label: 'Sq. Ft.', cls: 'badge badge-info'    },
}
const STATUS_BADGE: Record<string, string> = { Active: 'badge badge-success', Paused: 'badge badge-pending' }
const TABS         = ['All', 'Active', 'Paused', 'Published', 'Draft']
export default function CatalogPage() {
  const router = useRouter()
  const { shopId } = useShop()
  const qc = useQueryClient()

  const { data: items = [] } = useQuery({
    queryKey: ['products', shopId],
    queryFn: () => getProducts(shopId),
    enabled: !!shopId,
  })
  const { data: cats = [] } = useQuery({
    queryKey: ['categories', shopId],
    queryFn: () => getCategories(shopId),
    enabled: !!shopId,
  })

  const catMap = Object.fromEntries(cats.map(c => [c.id, c.name]))
  const getCategoryName = (categoryId: string | null) => (categoryId ? catMap[categoryId] ?? '' : '')

  const [tab, setTab]               = useState('All')
  const [search, setSearch]         = useState('')
  const [delTarget, setDelTarget]   = useState<DbProduct | null>(null)

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteProduct(shopId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products', shopId] }),
    onError: (err: any) => {
      console.error('[deleteProduct]', err)
      alert('Failed to delete: ' + (err?.message || 'Unknown error'))
    },
  })

  const filtered = items.filter(c => {
    if (tab === 'Active'    && c.status     !== 'Active')    return false
    if (tab === 'Paused'    && c.status     !== 'Paused')    return false
    if (tab === 'Published' && c.visibility !== 'published') return false
    if (tab === 'Draft'     && c.visibility !== 'draft')     return false
    const catName = getCategoryName(c.category_id)
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) &&
        !c.sku.toLowerCase().includes(search.toLowerCase()) &&
        !catName.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const active     = items.filter(c => c.status === 'Active').length
  const paused     = items.filter(c => c.status === 'Paused').length
  const published  = items.filter(c => c.visibility === 'published').length
  const uniqueCats = new Set(items.map(c => c.category_id).filter(Boolean)).size

  const handleDelete = () => {
    if (!delTarget) return
    deleteMut.mutate(delTarget.id)
    setDelTarget(null)
  }

  return (
    <AppShell>
      <CreateToast param="created" title="Product created successfully" subtitle="The new product has been added to your catalog" basePath="/catalog" />
      <CreateToast param="saved" title="Product updated successfully" subtitle="Changes have been saved" basePath="/catalog" />
      <div className="page-header">
        <div>
          <div className="page-title">Catalog</div>
          <div className="page-subtitle">{items.length} products · {uniqueCats} categories</div>
        </div>
        <div className="page-actions">
          <DateRangePicker />
          <button className="topbar-btn"><ExportIcon /><span>Export</span></button>
          <Link href="/catalog/new" className="btn-primary"><PlusIcon /> Add Product</Link>
        </div>
      </div>

      <div className="finance-stats">
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-label"><BookIcon /> Total Products</div></div>
          <div className="stat-value">{items.length}</div>
          <div className="stat-vs">Across {uniqueCats} categories</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-label"><BookIcon /> Active</div></div>
          <div className="stat-value">{active}</div>
          <div className="stat-vs">Available to order</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-label"><BookIcon /> Paused</div></div>
          <div className="stat-value" style={{ color: 'var(--text-muted)' }}>{paused}</div>
          <div className="stat-vs">Temporarily unavailable</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-label"><GlobeIcon /> On Storefront</div></div>
          <div className="stat-value">{published}</div>
          <div className="stat-vs">Publicly visible</div>
        </div>
      </div>

      <div className="page-scroll">
        <div className="filter-row">
          <div className="filter-bar">{TABS.map(t => (<button key={t} className={`filter-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{t}</button>))}</div>
          <div className="filter-right">
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '6px 12px' }}>
              <SearchIcon />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products…" style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12.5, color: 'var(--text-primary)', width: 180 }} />
            </div>
          </div>
        </div>

        <div className="card">
          <table className="data-table">
            <thead>
              <tr><th>Product</th><th>SKU</th><th>Category</th><th>Price</th><th>Pricing</th><th>Status</th><th>Visibility</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={8}><div className="empty-state">No products found</div></td></tr>}
              {filtered.map(c => {
                const pricing = PRICING_BADGE[c.pricing_type] ?? PRICING_BADGE['volume']
                return (
                  <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/catalog/${c.id}`)}>
                    <td>
                      <button onClick={() => router.push(`/catalog/${c.id}`)} style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font)', textAlign: 'left' }}>{c.name}</button>
                      <div className="cell-sub">{c.seq_id}</div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>{c.sku}</td>
                    <td style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{getCategoryName(c.category_id)}</td>
                    <td style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{displayPrice(c)}</td>
                    <td><span className={pricing.cls}>{pricing.label}</span></td>
                    <td><span className={STATUS_BADGE[c.status]}>{c.status}</span></td>
                    <td>
                      {c.visibility === 'published'
                        ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--positive)', fontWeight: 500 }}><GlobeIcon /> Published</span>
                        : <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Draft</span>}
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <RowMenu items={[
                        { label: 'Edit',   action: () => router.push(`/catalog/${c.id}`) },
                        { label: 'Delete', action: () => setDelTarget(c), danger: true },
                      ]} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {delTarget && (
        <ConfirmModal title={`Delete ${delTarget.seq_id}?`} message={`This will permanently remove "${delTarget.name}".`} confirmLabel="Delete" onConfirm={handleDelete} onCancel={() => setDelTarget(null)} />
      )}
    </AppShell>
  )
}
