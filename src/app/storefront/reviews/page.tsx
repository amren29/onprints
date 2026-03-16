'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import MyStoreShell from '@/components/MyStoreShell'
import CreateToast from '@/components/CreateToast'
import ConfirmModal from '@/components/ConfirmModal'
import ViewModal, { ViewRow, SectionLabel } from '@/components/ViewModal'
import RowMenu from '@/components/RowMenu'
import BulkActionBar, { BulkCheckbox, useBulkSelect } from '@/components/BulkActionBar'
import { getReviews, updateReview, deleteReview, type DbReview } from '@/lib/db/reviews'
import { useShop } from '@/providers/shop-provider'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

/* ── Icons ─────────────────────────────────────────── */
const SearchIcon = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>)
const PinIcon    = () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>)
const TrashIcon  = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>)

/* ── Star renderer ──────────────────────────────────── */
function Stars({ rating, size = 12 }: { rating: number; size?: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i <= rating ? '#f59e0b' : 'none'} stroke={i <= rating ? '#f59e0b' : '#d1d5db'} strokeWidth="1.5">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      ))}
    </span>
  )
}

/* ── Helpers ───────────────────────────────────────── */
const TABS = ['All', 'Approved', 'Pending', 'Rejected']

function statusBadge(s: string) {
  if (s === 'Approved') return 'badge badge-success'
  if (s === 'Rejected') return 'badge badge-danger'
  return 'badge badge-pending'
}

/* ════════════════════════════════════════════════════ */
export default function ReviewsPage() {
  const router = useRouter()
  const { shopId } = useShop()
  const qc = useQueryClient()

  const { data: rows = [] } = useQuery({
    queryKey: ['reviews', shopId],
    queryFn: () => getReviews(shopId),
    enabled: !!shopId,
  })

  const [search, setSearch]     = useState('')
  const [tab, setTab]           = useState('All')

  const [viewTarget, setViewTarget] = useState<DbReview | null>(null)
  const [delId, setDelId]           = useState<string | null>(null)

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteReview(shopId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reviews', shopId] }),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof updateReview>[2] }) => updateReview(shopId, id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reviews', shopId] }),
  })

  const visible = rows.filter(r => {
    if (tab !== 'All' && r.status !== tab) return false
    if (search && !r.customer_name.toLowerCase().includes(search.toLowerCase()) &&
        !r.product.toLowerCase().includes(search.toLowerCase()) &&
        !r.comment.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const bulk = useBulkSelect(visible, visible)

  const avgRating = rows.filter(r => r.status === 'Approved').reduce((s, r, _, a) => s + r.rating / a.length, 0)

  const handleDelete = () => {
    if (delId) { deleteMut.mutate(delId); setDelId(null) }
  }

  const quickApprove = (id: string) => { updateMut.mutate({ id, updates: { status: 'Approved' } }) }
  const quickReject  = (id: string) => { updateMut.mutate({ id, updates: { status: 'Rejected' } }) }
  const togglePin    = (r: DbReview)  => { updateMut.mutate({ id: r.id, updates: { pinned: !r.pinned } }) }

  return (
    <MyStoreShell>
      <CreateToast param="created" title="Review added successfully" subtitle="The new review has been added" basePath="/storefront/reviews" />
      <CreateToast param="saved" title="Review updated successfully" subtitle="Changes have been saved" basePath="/storefront/reviews" />

      <div className="page-header">
        <div>
          <div className="page-title">Customer Reviews</div>
          <div className="page-subtitle">Manage and moderate product reviews shown on your store</div>
        </div>
        <div className="page-actions">
        </div>
      </div>

      <div className="page-scroll">
        <div className="finance-stats">
          <div className="stat-card">
            <div className="stat-card-header"><div className="stat-card-label">Total Reviews</div></div>
            <div className="stat-value">{rows.length}</div>
            <div className="stat-vs">{rows.filter(r => r.status === 'Approved').length} approved</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-header"><div className="stat-card-label">Approved</div></div>
            <div className="stat-value" style={{ color: '#16a34a' }}>{rows.filter(r => r.status === 'Approved').length}</div>
            <div className="stat-vs">Shown on store</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-header"><div className="stat-card-label">Pending</div></div>
            <div className="stat-value" style={{ color: '#d97706' }}>{rows.filter(r => r.status === 'Pending').length}</div>
            <div className="stat-vs">Awaiting moderation</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-header"><div className="stat-card-label">Avg Rating</div></div>
            <div className="stat-value" style={{ color: 'var(--warning)' }}>{rows.filter(r => r.status === 'Approved').length > 0 ? `${avgRating.toFixed(1)} ★` : '—'}</div>
            <div className="stat-vs">From approved reviews</div>
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
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search reviews…"
                style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12.5, color: 'var(--text-primary)', width: 180 }} />
            </div>
          </div>
        </div>

        <div className="card">
          <table className="data-table">
            <thead>
              <tr><th style={{ width: 40 }}><BulkCheckbox checked={bulk.allPageSelected} indeterminate={!bulk.allPageSelected && bulk.somePageSelected} onChange={bulk.toggleAll} /></th><th>Reviewer</th><th>Product</th><th>Rating</th><th>Review</th><th>Status</th><th>Pinned</th><th>Date</th><th></th></tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr><td colSpan={9}><div className="empty-state">No reviews found</div></td></tr>
              )}
              {visible.map(r => (
                <tr key={r.id}>
                  <td><BulkCheckbox checked={bulk.selectedIds.has(r.id)} onChange={() => bulk.toggleSelect(r.id)} /></td>
                  <td>
                    <button onClick={() => setViewTarget(r)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font)' }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{r.customer_name}</div>
                      {r.company && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.company}</div>}
                    </button>
                  </td>
                  <td style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{r.product || '—'}</td>
                  <td><Stars rating={r.rating} /></td>
                  <td style={{ maxWidth: 220 }}>
                    <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{r.comment}</div>
                  </td>
                  <td><span className={statusBadge(r.status)}>{r.status}</span></td>
                  <td>
                    {r.pinned
                      ? <span style={{ color: 'var(--warning)', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><PinIcon /> Pinned</span>
                      : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                    }
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.date}</td>
                  <td onClick={e => e.stopPropagation()}>
                    <RowMenu items={[
                      { label: 'View',    action: () => setViewTarget(r) },
                      { label: 'Edit',    action: () => router.push(`/storefront/reviews/${r.id}`) },
                      ...(r.status !== 'Approved' ? [{ label: 'Approve', action: () => quickApprove(r.id) }] : []),
                      ...(r.status !== 'Rejected' ? [{ label: 'Reject',  action: () => quickReject(r.id) }] : []),
                      { label: r.pinned ? 'Unpin' : 'Pin to Top', action: () => togglePin(r) },
                      { label: 'Delete',  action: () => setDelId(r.id), danger: true },
                    ]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <BulkActionBar count={bulk.selectedIds.size} total={visible.length} onDeselectAll={bulk.clearSelection} actions={[
        { label: 'Approve', action: () => { bulk.selectedItems.forEach(r => updateMut.mutate({ id: r.id, updates: { status: 'Approved' } })); bulk.clearSelection() } },
        { label: 'Reject', action: () => { bulk.selectedItems.forEach(r => updateMut.mutate({ id: r.id, updates: { status: 'Rejected' } })); bulk.clearSelection() } },
        { label: 'Delete', icon: <TrashIcon />, action: () => bulk.setBulkDelOpen(true), danger: true },
      ]} />

      {bulk.bulkDelOpen && (
        <ConfirmModal
          title={`Delete ${bulk.selectedIds.size} reviews?`}
          message="This will permanently remove all selected reviews. This cannot be undone."
          confirmLabel="Delete All"
          onConfirm={() => {
            bulk.selectedItems.forEach(r => deleteMut.mutate(r.id))
            bulk.clearSelection(); bulk.setBulkDelOpen(false)
          }}
          onCancel={() => bulk.setBulkDelOpen(false)}
        />
      )}

      {delId && (
        <ConfirmModal title="Delete Review" message={`Permanently delete review from "${rows.find(r => r.id === delId)?.customer_name ?? 'this reviewer'}"?`} onConfirm={handleDelete} onCancel={() => setDelId(null)} />
      )}

      {viewTarget && (
        <ViewModal
          title={viewTarget.customer_name}
          subtitle={`${viewTarget.product || 'General'} · ${viewTarget.date}`}
          status={viewTarget.status}
          onClose={() => setViewTarget(null)}
          onEdit={() => { setViewTarget(null); router.push(`/storefront/reviews/${viewTarget.id}`) }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
            <div>
              <SectionLabel>Reviewer Info</SectionLabel>
              <ViewRow label="Name" value={viewTarget.customer_name} />
              {viewTarget.company && <ViewRow label="Company" value={viewTarget.company} />}
              <ViewRow label="Product / Service" value={viewTarget.product || '—'} />
              <ViewRow label="Date" value={viewTarget.date} />
            </div>
            <div>
              <SectionLabel>Review Details</SectionLabel>
              <ViewRow label="Rating" value={
                <span style={{ display: 'inline-flex', gap: 2, verticalAlign: 'middle' }}>
                  {[1,2,3,4,5].map(i => (
                    <svg key={i} width="13" height="13" viewBox="0 0 24 24" fill={i <= viewTarget.rating ? '#f59e0b' : 'none'} stroke={i <= viewTarget.rating ? '#f59e0b' : '#d1d5db'} strokeWidth="1.5">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                  ))}
                  <span style={{ fontSize: 12, marginLeft: 4, color: 'var(--text-secondary)' }}>{viewTarget.rating} / 5</span>
                </span>
              } />
              <ViewRow label="Status" value="" badge={viewTarget.status} />
              <ViewRow label="Pinned" value={viewTarget.pinned ? 'Yes — shown at top' : 'No'} />
            </div>
          </div>
          <div style={{ marginTop: 20 }}>
            <SectionLabel>Review Text</SectionLabel>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginTop: 6, padding: '12px 14px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
              {viewTarget.comment || '—'}
            </p>
          </div>
        </ViewModal>
      )}
    </MyStoreShell>
  )
}
