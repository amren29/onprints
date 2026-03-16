'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import CreateToast from '@/components/CreateToast'
import DateRangePicker from '@/components/DateRangePicker'
import ConfirmModal from '@/components/ConfirmModal'
import RowMenu from '@/components/RowMenu'
import ViewModal, { ViewRow, SectionLabel } from '@/components/ViewModal'
import ShareModal from '@/components/ShareModal'
import { downloadCSV } from '@/lib/csv-utils'
import Pagination, { usePagination } from '@/components/Pagination'
import BulkActionBar, { BulkCheckbox, useBulkSelect } from '@/components/BulkActionBar'
import { getSuppliers, deleteSupplier, type DbSupplier } from '@/lib/db/inventory'
import { useShop } from '@/providers/shop-provider'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { printDocument, docHeader, docFooter, fields2, section, textBlock, badgeColors } from '@/lib/print-utils'

const ExportIcon = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>)
const PlusIcon   = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>)
const SearchIcon = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>)
const TruckIcon  = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>)

const RATING_BADGE: Record<string, string> = { A: 'badge badge-success', B: 'badge badge-info', C: 'badge badge-warning' }
const TABS    = ['All', 'A Rating', 'B Rating', 'C Rating']
function buildSupplierPrint(s: DbSupplier): string {
  const [bg, color] = badgeColors(`${s.rating}-Rated`)
  return docHeader('SUPPLIER PROFILE', s.seq_id, `${s.rating}-Rated`, bg, color) +
    section('Contact', fields2([
      { label: 'Company', value: s.name },
      { label: 'Contact Person', value: s.contact_person },
      { label: 'Email', value: s.contact || '—' },
      { label: 'Phone', value: s.phone || '—' },
      { label: 'Region', value: s.region || '—' },
    ])) +
    section('Terms', fields2([
      { label: 'Rating', value: s.rating },
      { label: 'Lead Time', value: s.lead || '—' },
      { label: 'Payment Terms', value: s.payment_terms || '—' },
    ])) +
    (s.address ? section('Address', textBlock(s.address)) : '') +
    (s.notes ? section('Notes', textBlock(s.notes)) : '') +
    docFooter()
}

export default function SuppliersPage() {
  const router = useRouter()
  const { shopId } = useShop()
  const qc = useQueryClient()

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers', shopId],
    queryFn: () => getSuppliers(shopId),
    enabled: !!shopId,
  })

  const [tab, setTab]               = useState('All')
  const [search, setSearch]         = useState('')
  const [delTarget, setDelTarget]   = useState<DbSupplier | null>(null)
  const [viewTarget, setViewTarget] = useState<DbSupplier | null>(null)
  const [shareTarget, setShareTarget] = useState<DbSupplier | null>(null)

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSupplier(shopId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers', shopId] }),
  })

  const filtered = suppliers.filter(s => {
    const ratingFilter = tab === 'A Rating' ? 'A' : tab === 'B Rating' ? 'B' : tab === 'C Rating' ? 'C' : ''
    if (ratingFilter && s.rating !== ratingFilter) return false
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.contact_person.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })
  const { page, perPage, totalPages, paged, setPage, setPerPage, total: totalFiltered } = usePagination(filtered)
  const bulk = useBulkSelect(paged, filtered)

  const aCount = suppliers.filter(s => s.rating === 'A').length
  const bCount = suppliers.filter(s => s.rating === 'B').length
  const cCount = suppliers.filter(s => s.rating === 'C').length

  const handleDelete = () => {
    if (!delTarget) return
    deleteMutation.mutate(delTarget.id)
    setDelTarget(null)
  }

  return (
    <AppShell>
      <CreateToast param="created" title="Supplier created successfully" subtitle="The new supplier has been added to your list" basePath="/suppliers" />
      <CreateToast param="saved" title="Supplier updated successfully" subtitle="Changes have been saved" basePath="/suppliers" />
      <div className="page-header">
        <div>
          <div className="page-title">Suppliers</div>
          <div className="page-subtitle">{suppliers.length} suppliers registered</div>
        </div>
        <div className="page-actions">
          <DateRangePicker />
          <button className="topbar-btn" onClick={() => downloadCSV('suppliers', filtered, [{ key: 'seq_id', label: 'ID' }, { key: 'name', label: 'Company' }, { key: 'contact_person', label: 'Contact Person' }, { key: 'contact', label: 'Email' }, { key: 'phone', label: 'Phone' }, { key: 'region', label: 'Region' }, { key: 'rating', label: 'Rating' }, { key: 'lead', label: 'Lead Time' }, { key: 'payment_terms', label: 'Payment Terms' }])}><ExportIcon /><span>Export</span></button>
          <Link href="/suppliers/new" className="btn-primary"><PlusIcon /> Add Supplier</Link>
        </div>
      </div>

      <div className="finance-stats">
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-label"><TruckIcon /> Total</div></div>
          <div className="stat-value">{suppliers.length}</div>
          <div className="stat-vs">Active suppliers</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-label"><TruckIcon /> A-Rated</div></div>
          <div className="stat-value" style={{ color: 'var(--positive)' }}>{aCount}</div>
          <div className="stat-vs">Preferred suppliers</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-label"><TruckIcon /> B-Rated</div></div>
          <div className="stat-value">{bCount}</div>
          <div className="stat-vs">Acceptable quality</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-label"><TruckIcon /> C-Rated</div></div>
          <div className="stat-value" style={{ color: 'var(--warning)' }}>{cCount}</div>
          <div className="stat-vs">Under review</div>
        </div>
      </div>

      <div className="page-scroll">
        <div className="filter-row">
          <div className="filter-bar">{TABS.map(t => (<button key={t} className={`filter-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{t}</button>))}</div>
          <div className="filter-right">
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '6px 12px' }}>
              <SearchIcon />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search suppliers…" style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12.5, color: 'var(--text-primary)', width: 180 }} />
            </div>
          </div>
        </div>

        <div className="card">
          <table className="data-table">
            <thead>
              <tr><th style={{ width: 40 }}><BulkCheckbox checked={bulk.allPageSelected} indeterminate={!bulk.allPageSelected && bulk.somePageSelected} onChange={bulk.toggleAll} /></th><th>Supplier</th><th>Contact Person</th><th>Email</th><th>Phone</th><th>Region</th><th>Lead Time</th><th>Payment Terms</th><th>Rating</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={10}><div className="empty-state">No suppliers found</div></td></tr>}
              {paged.map(s => (
                <tr key={s.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/suppliers/${s.id}`)}>
                  <td onClick={e => e.stopPropagation()}><BulkCheckbox checked={bulk.selectedIds.has(s.id)} onChange={() => bulk.toggleSelect(s.id)} /></td>
                  <td>
                    <div className="td-with-icon">
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <TruckIcon />
                      </div>
                      <div>
                        <button onClick={e => { e.stopPropagation(); setViewTarget(s) }} style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font)' }}>{s.name}</button>
                        <div className="cell-sub">{s.seq_id} · {s.region}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{s.contact_person}</td>
                  <td style={{ fontSize: 12.5 }}>{s.contact}</td>
                  <td style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{s.phone}</td>
                  <td style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{s.region}</td>
                  <td style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--text-primary)' }}>{s.lead}</td>
                  <td style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{s.payment_terms}</td>
                  <td><span className={RATING_BADGE[s.rating]}>{s.rating}</span></td>
                  <td onClick={e => e.stopPropagation()}>
                    <RowMenu items={[
                      { label: 'View',   action: () => setViewTarget(s) },
                      { label: 'Edit',   action: () => router.push(`/suppliers/${s.id}`) },
                      { label: 'Share',  action: () => setShareTarget(s) },
                      { label: 'Delete', action: () => setDelTarget(s), danger: true },
                    ]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} total={totalFiltered} perPage={perPage} onPageChange={setPage} onPerPageChange={setPerPage} />
      </div>


      <BulkActionBar count={bulk.selectedIds.size} total={filtered.length} onDeselectAll={bulk.clearSelection} actions={[
        { label: 'Export CSV', icon: <ExportIcon />, action: () => downloadCSV('suppliers-selected', bulk.selectedItems, [{ key: 'seq_id', label: 'ID' }, { key: 'name', label: 'Company' }, { key: 'contact_person', label: 'Contact Person' }, { key: 'contact', label: 'Email' }, { key: 'phone', label: 'Phone' }, { key: 'region', label: 'Region' }, { key: 'rating', label: 'Rating' }]) },
        { label: 'Delete', action: () => bulk.setBulkDelOpen(true), danger: true },
      ]} />
      {bulk.bulkDelOpen && <ConfirmModal title={`Delete ${bulk.selectedIds.size} suppliers?`} message="This will permanently remove all selected suppliers. This cannot be undone." confirmLabel="Delete All" onConfirm={async () => { await Promise.all(bulk.selectedItems.map(s => deleteSupplier(shopId, s.id))); bulk.clearSelection(); bulk.setBulkDelOpen(false); qc.invalidateQueries({ queryKey: ['suppliers', shopId] }) }} onCancel={() => bulk.setBulkDelOpen(false)} />}

      {viewTarget && (
        <ViewModal
          title={viewTarget.name}
          subtitle={`${viewTarget.contact_person} · ${viewTarget.region}`}
          status={`${viewTarget.rating}-Rated`}
          onClose={() => setViewTarget(null)}
          onEdit={() => { setViewTarget(null); router.push(`/suppliers/${viewTarget.id}`) }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
            <div>
              <SectionLabel>Contact</SectionLabel>
              <ViewRow label="Company" value={viewTarget.name} />
              <ViewRow label="Contact Person" value={viewTarget.contact_person} />
              <ViewRow label="Email" value={viewTarget.contact || '—'} />
              <ViewRow label="Phone" value={viewTarget.phone || '—'} />
              <ViewRow label="Region" value={viewTarget.region || '—'} />
            </div>
            <div>
              <SectionLabel>Terms</SectionLabel>
              <ViewRow label="Rating" value="" badge={viewTarget.rating} />
              <ViewRow label="Lead Time" value={viewTarget.lead || '—'} />
              <ViewRow label="Payment Terms" value={viewTarget.payment_terms || '—'} />
            </div>
          </div>
          {viewTarget.address && (
            <div style={{ marginTop: 20 }}>
              <SectionLabel>Address</SectionLabel>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginTop: 6, padding: '12px 14px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>{viewTarget.address}</p>
            </div>
          )}
          {viewTarget.notes && (
            <div style={{ marginTop: 20 }}>
              <SectionLabel>Notes</SectionLabel>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginTop: 6, padding: '12px 14px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>{viewTarget.notes}</p>
            </div>
          )}
        </ViewModal>
      )}

      {delTarget && (
        <ConfirmModal title={`Delete ${delTarget.name}?`} message={`This will permanently remove "${delTarget.name}" from your suppliers.`} confirmLabel="Delete" onConfirm={handleDelete} onCancel={() => setDelTarget(null)} />
      )}

      {shareTarget && <ShareModal title={`Supplier ${shareTarget.seq_id} — ${shareTarget.name}`} shareText={`Supplier ${shareTarget.name} (${shareTarget.region}) — Rating: ${shareTarget.rating}`} shareUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/suppliers/${shareTarget.id}`} onClose={() => setShareTarget(null)} onPrint={() => printDocument(`Supplier ${shareTarget.seq_id}`, buildSupplierPrint(shareTarget))} />}
    </AppShell>
  )
}
