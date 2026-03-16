'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import MyStoreShell from '@/components/MyStoreShell'
import CreateToast from '@/components/CreateToast'
import ConfirmModal from '@/components/ConfirmModal'
import RowMenu from '@/components/RowMenu'
import BulkActionBar, { BulkCheckbox, useBulkSelect } from '@/components/BulkActionBar'
import { getBundles, updateBundle, deleteBundle, type DbBundle } from '@/lib/db/bundles'
import { useShop } from '@/providers/shop-provider'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

/* ── Icons ─────────────────────────────────────────── */
const PlusIcon   = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>)
const SearchIcon = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>)
const TrashIcon  = () => (<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>)
const StarFill   = () => (<svg width="11" height="11" viewBox="0 0 24 24" fill="#f59e0b" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>)

/* ── Helpers ───────────────────────────────────────── */
const TABS = ['All', 'Active', 'Draft', 'Paused']

function statusBadge(s: string) {
  if (s === 'Active') return 'badge badge-success'
  if (s === 'Paused') return 'badge badge-danger'
  return 'badge badge-pending'
}
function fmtDiscount(b: DbBundle) {
  return b.discount_type === 'percentage' ? `${b.discount_value}% off` : `RM ${b.discount_value.toFixed(2)} off`
}
function fmtPrice(b: DbBundle) {
  if (b.original_price <= 0) return '—'
  const disc = b.discount_type === 'percentage'
    ? b.original_price * (1 - b.discount_value / 100)
    : b.original_price - b.discount_value
  return `RM ${disc.toFixed(2)}`
}

/* ════════════════════════════════════════════════════ */
export default function BundlesPage() {
  const router = useRouter()
  const { shopId } = useShop()
  const qc = useQueryClient()

  const { data: rows = [] } = useQuery({
    queryKey: ['bundles', shopId],
    queryFn: () => getBundles(shopId),
    enabled: !!shopId,
  })

  const [search, setSearch]     = useState('')
  const [tab, setTab]           = useState('All')
  const [delId, setDelId]       = useState<string | null>(null)

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteBundle(shopId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bundles', shopId] }),
  })

  const featureMut = useMutation({
    mutationFn: ({ id, featured }: { id: string; featured: boolean }) => updateBundle(shopId, id, { featured }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bundles', shopId] }),
  })

  const visible = rows.filter(b => {
    if (tab !== 'All' && b.status !== tab) return false
    if (search && !b.name.toLowerCase().includes(search.toLowerCase()) && !b.description.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const bulk = useBulkSelect(visible, visible)

  const handleDelete = () => {
    if (delId) { deleteMut.mutate(delId); setDelId(null) }
  }

  return (
    <MyStoreShell>
      <CreateToast param="created" title="Bundle created successfully" subtitle="The new bundle has been added" basePath="/storefront/bundles" />
      <CreateToast param="saved" title="Bundle updated successfully" subtitle="Changes have been saved" basePath="/storefront/bundles" />

      <div className="page-header">
        <div>
          <div className="page-title">Product Bundles</div>
          <div className="page-subtitle">Create combo deals shown as featured offers in your online store</div>
        </div>
        <div className="page-actions">
          <Link href="/storefront/bundles/new" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
            <PlusIcon /> New Bundle
          </Link>
        </div>
      </div>

      <div className="page-scroll">
        <div className="finance-stats">
          <div className="stat-card">
            <div className="stat-card-header"><div className="stat-card-label">Total Bundles</div></div>
            <div className="stat-value">{rows.length}</div>
            <div className="stat-vs">{rows.filter(b => b.status === 'Active').length} active</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-header"><div className="stat-card-label">Active</div></div>
            <div className="stat-value" style={{ color: '#16a34a' }}>{rows.filter(b => b.status === 'Active').length}</div>
            <div className="stat-vs">In store</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-header"><div className="stat-card-label">Featured</div></div>
            <div className="stat-value" style={{ color: 'var(--warning)' }}>{rows.filter(b => b.featured).length}</div>
            <div className="stat-vs">Highlighted</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-header"><div className="stat-card-label">Draft</div></div>
            <div className="stat-value" style={{ color: '#d97706' }}>{rows.filter(b => b.status === 'Draft').length}</div>
            <div className="stat-vs">In preparation</div>
          </div>
        </div>

        <div className="filter-row">
          <div className="filter-bar">
            {TABS.map(t => (
              <button key={t} className={`filter-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{t}</button>
            ))}
          </div>
          <div className="filter-right">
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '6px 12px' }}>
              <SearchIcon />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search bundles…"
                style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12.5, color: 'var(--text-primary)', width: 180 }} />
            </div>
          </div>
        </div>

        <div className="card">
          <table className="data-table">
            <thead>
              <tr><th style={{ width: 40 }}><BulkCheckbox checked={bulk.allPageSelected} indeterminate={!bulk.allPageSelected && bulk.somePageSelected} onChange={bulk.toggleAll} /></th><th>Bundle</th><th>Items</th><th>Discount</th><th>Bundle Price</th><th>Status</th><th>Featured</th><th></th></tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr><td colSpan={8}><div className="empty-state">No bundles found</div></td></tr>
              )}
              {visible.map(b => (
                <tr key={b.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/storefront/bundles/${b.id}`)}>
                  <td onClick={e => e.stopPropagation()}><BulkCheckbox checked={bulk.selectedIds.has(b.id)} onChange={() => bulk.toggleSelect(b.id)} /></td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{b.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{b.id}</div>
                  </td>
                  <td style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                    {(b.items as any[]).length > 0
                      ? (b.items as any[]).slice(0, 2).map((i: any) => `${i.name.split(' ')[0]}×${i.qty}`).join(', ') + ((b.items as any[]).length > 2 ? ` +${(b.items as any[]).length - 2}` : '')
                      : '—'
                    }
                  </td>
                  <td>
                    <span className="badge badge-info">{fmtDiscount(b)}</span>
                  </td>
                  <td style={{ fontWeight: 700, fontSize: 13, color: 'var(--accent)' }}>{fmtPrice(b)}</td>
                  <td><span className={statusBadge(b.status)}>{b.status}</span></td>
                  <td>
                    {b.featured
                      ? <span style={{ color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}><StarFill /> Yes</span>
                      : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                    }
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <RowMenu items={[
                      { label: 'Edit',   action: () => router.push(`/storefront/bundles/${b.id}`) },
                      { label: b.featured ? 'Unfeature' : 'Feature', action: () => featureMut.mutate({ id: b.id, featured: !b.featured }) },
                      { label: 'Delete', action: () => setDelId(b.id), danger: true },
                    ]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <BulkActionBar count={bulk.selectedIds.size} total={visible.length} onDeselectAll={bulk.clearSelection} actions={[
        { label: 'Delete', icon: <TrashIcon />, action: () => bulk.setBulkDelOpen(true), danger: true },
      ]} />

      {bulk.bulkDelOpen && (
        <ConfirmModal
          title={`Delete ${bulk.selectedIds.size} bundles?`}
          message="This will permanently remove all selected bundles. This cannot be undone."
          confirmLabel="Delete All"
          onConfirm={() => {
            bulk.selectedItems.forEach(b => deleteMut.mutate(b.id))
            bulk.clearSelection(); bulk.setBulkDelOpen(false)
          }}
          onCancel={() => bulk.setBulkDelOpen(false)}
        />
      )}

      {delId && (
        <ConfirmModal title="Delete Bundle" message={`Permanently delete "${rows.find(b => b.id === delId)?.name ?? 'this bundle'}"?`} onConfirm={handleDelete} onCancel={() => setDelId(null)} />
      )}
    </MyStoreShell>
  )
}
