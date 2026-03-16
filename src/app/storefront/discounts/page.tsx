'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import MyStoreShell from '@/components/MyStoreShell'
import CreateToast from '@/components/CreateToast'
import ConfirmModal from '@/components/ConfirmModal'
import ViewModal, { ViewRow, SectionLabel } from '@/components/ViewModal'
import RowMenu from '@/components/RowMenu'
import BulkActionBar, { BulkCheckbox, useBulkSelect } from '@/components/BulkActionBar'
import { getDiscounts, deleteDiscount, type DbDiscount } from '@/lib/db/discounts'
import { useShop } from '@/providers/shop-provider'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

/* ── Icons ─────────────────────────────────────────── */
const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)
const SearchIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
)
const TrashIcon = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>)

/* ── Helpers ───────────────────────────────────────── */
const TABS = ['All', 'Active', 'Draft', 'Expired']

function statusBadge(s: string) {
  if (s === 'Active')  return 'badge badge-success'
  if (s === 'Expired') return 'badge badge-danger'
  return 'badge badge-pending'
}
function fmtValue(d: DbDiscount) {
  return d.type === 'percentage' ? `${d.value}%` : `RM ${d.value.toFixed(2)}`
}
function fmtExpiry(s: string) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' })
}

/* ════════════════════════════════════════════════════ */
export default function DiscountsPage() {
  const router = useRouter()
  const { shopId } = useShop()
  const qc = useQueryClient()

  const { data: rows = [] } = useQuery({
    queryKey: ['discounts', shopId],
    queryFn: () => getDiscounts(shopId),
    enabled: !!shopId,
  })

  const [search, setSearch]     = useState('')
  const [tab, setTab]           = useState('All')

  const [viewTarget, setViewTarget] = useState<DbDiscount | null>(null)
  const [delId, setDelId]           = useState<string | null>(null)

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDiscount(shopId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['discounts', shopId] }),
  })

  /* ── Filtering ── */
  const visible = rows.filter(d => {
    if (tab !== 'All' && d.status !== tab) return false
    if (search && !d.code.toLowerCase().includes(search.toLowerCase()) && !d.notes.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const bulk = useBulkSelect(visible, visible)

  const handleDelete = () => {
    if (delId) { deleteMutation.mutate(delId); setDelId(null) }
  }

  return (
    <MyStoreShell>
      <CreateToast param="created" title="Discount created successfully" subtitle="The new discount code has been added" basePath="/storefront/discounts" />
      <CreateToast param="saved" title="Discount updated successfully" subtitle="Changes have been saved" basePath="/storefront/discounts" />

      <div className="page-header">
        <div>
          <div className="page-title">Discounts</div>
          <div className="page-subtitle">Create and manage discount codes for the online store</div>
        </div>
        <div className="page-actions">
          <Link href="/storefront/discounts/new" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
            <PlusIcon /> New Discount
          </Link>
        </div>
      </div>

      <div className="page-scroll">
        <div className="finance-stats">
          <div className="stat-card">
            <div className="stat-card-header"><div className="stat-card-label">Total Codes</div></div>
            <div className="stat-value">{rows.length}</div>
            <div className="stat-vs">{rows.filter(d => d.status === 'Active').length} active</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-header"><div className="stat-card-label">Active</div></div>
            <div className="stat-value" style={{ color: '#16a34a' }}>{rows.filter(d => d.status === 'Active').length}</div>
            <div className="stat-vs">Available for use</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-header"><div className="stat-card-label">Draft</div></div>
            <div className="stat-value" style={{ color: '#d97706' }}>{rows.filter(d => d.status === 'Draft').length}</div>
            <div className="stat-vs">Not yet published</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-header"><div className="stat-card-label">Total Uses</div></div>
            <div className="stat-value" style={{ color: 'var(--purple-text)' }}>{rows.reduce((s, d) => s + d.used_count, 0)}</div>
            <div className="stat-vs">Times redeemed</div>
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
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search codes…"
                style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12.5, color: 'var(--text-primary)', width: 180 }} />
            </div>
          </div>
        </div>

        <div className="card">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}><BulkCheckbox checked={bulk.allPageSelected} indeterminate={!bulk.allPageSelected && bulk.somePageSelected} onChange={bulk.toggleAll} /></th>
                <th>Code</th>
                <th>Type</th>
                <th>Value</th>
                <th>Min Order</th>
                <th>Usage</th>
                <th>Expiry</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr><td colSpan={9}><div className="empty-state">No discount codes found</div></td></tr>
              )}
              {visible.map(d => (
                <tr key={d.id}>
                  <td><BulkCheckbox checked={bulk.selectedIds.has(d.id)} onChange={() => bulk.toggleSelect(d.id)} /></td>
                  <td>
                    <button onClick={() => setViewTarget(d)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'monospace' }}>
                      <code style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.04em' }}>{d.code}</code>
                    </button>
                  </td>
                  <td style={{ fontSize: 12.5, textTransform: 'capitalize' }}>{d.type}</td>
                  <td style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{fmtValue(d)}</td>
                  <td style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{d.min_order > 0 ? `RM ${d.min_order}` : '—'}</td>
                  <td style={{ fontSize: 12.5 }}>
                    <span style={{ fontWeight: 600 }}>{d.used_count}</span>
                    {d.max_uses > 0 && <span style={{ color: 'var(--text-muted)' }}> / {d.max_uses}</span>}
                    {d.max_uses === 0 && <span style={{ color: 'var(--text-muted)' }}> / ∞</span>}
                  </td>
                  <td style={{ fontSize: 12.5, color: d.expiry && new Date(d.expiry) < new Date() ? 'var(--negative)' : 'var(--text-secondary)' }}>{fmtExpiry(d.expiry)}</td>
                  <td><span className={statusBadge(d.status)}>{d.status}</span></td>
                  <td onClick={e => e.stopPropagation()}>
                    <RowMenu items={[
                      { label: 'View',   action: () => setViewTarget(d) },
                      { label: 'Edit',   action: () => router.push(`/storefront/discounts/${d.id}`) },
                      { label: 'Delete', action: () => setDelId(d.id), danger: true },
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

      {/* ── Confirm Bulk Delete ── */}
      {bulk.bulkDelOpen && (
        <ConfirmModal
          title={`Delete ${bulk.selectedIds.size} discounts?`}
          message="This will permanently remove all selected discount codes. This cannot be undone."
          confirmLabel="Delete All"
          onConfirm={() => {
            bulk.selectedItems.forEach(d => deleteMutation.mutate(d.id))
            bulk.clearSelection(); bulk.setBulkDelOpen(false)
          }}
          onCancel={() => bulk.setBulkDelOpen(false)}
        />
      )}

      {/* ── Confirm Delete ── */}
      {delId && (
        <ConfirmModal
          title="Delete Discount Code"
          message={`Permanently delete ${rows.find(d => d.id === delId)?.code ?? 'this code'}? This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDelId(null)}
        />
      )}

      {viewTarget && (
        <ViewModal
          title={viewTarget.code}
          subtitle={`${viewTarget.type === 'percentage' ? 'Percentage' : 'Fixed Amount'} · ${fmtValue(viewTarget)}`}
          status={viewTarget.status}
          onClose={() => setViewTarget(null)}
          onEdit={() => { setViewTarget(null); router.push(`/storefront/discounts/${viewTarget.id}`) }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
            <div>
              <SectionLabel>Code &amp; Type</SectionLabel>
              <ViewRow label="Code" value={viewTarget.code} accent />
              <ViewRow label="Type" value={viewTarget.type === 'percentage' ? 'Percentage (%)' : 'Fixed Amount (RM)'} />
              <ViewRow label="Value" value={fmtValue(viewTarget)} accent />
              <ViewRow label="Min Order" value={viewTarget.min_order > 0 ? `RM ${viewTarget.min_order}` : 'No minimum'} />
            </div>
            <div>
              <SectionLabel>Usage &amp; Validity</SectionLabel>
              <ViewRow label="Usage" value={`${viewTarget.used_count} used${viewTarget.max_uses > 0 ? ` / ${viewTarget.max_uses} limit` : ' / unlimited'}`} />
              <ViewRow label="Expiry" value={fmtExpiry(viewTarget.expiry)} />
              <ViewRow label="Status" value="" badge={viewTarget.status} />
            </div>
          </div>
          {viewTarget.notes && (
            <div style={{ marginTop: 20 }}>
              <SectionLabel>Notes</SectionLabel>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: 6 }}>{viewTarget.notes}</p>
            </div>
          )}
        </ViewModal>
      )}
    </MyStoreShell>
  )
}
