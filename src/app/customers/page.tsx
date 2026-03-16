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
import { getCustomers, updateCustomer, deleteCustomer, type DbCustomer } from '@/lib/db/customers'
import { useShop } from '@/providers/shop-provider'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import StatusSelect from '@/components/StatusSelect'
import { printDocument, docHeader, docFooter, fields2, fields3, section, textBlock, badgeColors } from '@/lib/print-utils'

/* ── ICONS ─────────────────────────────────────────── */
const ExportIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
)
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
const DotsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>
  </svg>
)
const UsersIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
  </svg>
)
const ArrowUpIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
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

function buildCustomerPrint(c: DbCustomer): string {
  const [bg, color] = badgeColors(c.status)
  return docHeader('CUSTOMER PROFILE', c.seq_id, c.status, bg, color) +
    section('Contact', fields2([
      { label: 'Name', value: c.name },
      { label: 'Company', value: c.company || '—' },
      { label: 'Email', value: c.email || '—' },
      { label: 'Phone', value: c.phone || '—' },
      { label: 'Location', value: c.location || '—' },
      { label: 'SST No', value: c.sst_no || '—' },
    ])) +
    section('Account', fields3([
      { label: 'Customer Type', value: c.customer_type || '—' },
      { label: 'Payment Terms', value: c.payment_terms || '—' },
      { label: 'Credit Limit', value: c.credit_limit ? fmtMoney(c.credit_limit) : '—' },
      { label: 'Join Date', value: c.created_at ? new Date(c.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' },
      { label: 'Total Orders', value: '0' },
      { label: 'Total Spent', value: fmtMoney(0), accent: true },
    ])) +
    (c.billing_address ? section('Billing Address', textBlock(c.billing_address)) : '') +
    (c.notes ? section('Notes', textBlock(c.notes)) : '') +
    docFooter()
}

export default function CustomersPage() {
  const router = useRouter()
  const { shopId } = useShop()
  const qc = useQueryClient()

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers', shopId],
    queryFn: () => getCustomers(shopId),
    enabled: !!shopId,
  })

  const [tab, setTab]       = useState('All')
  const [search, setSearch] = useState('')

  const [delTarget, setDelTarget]   = useState<DbCustomer | null>(null)
  const [viewTarget, setViewTarget] = useState<DbCustomer | null>(null)
  const [shareTarget, setShareTarget] = useState<DbCustomer | null>(null)

  const CUST_STATUSES: DbCustomer['status'][] = ['Active', 'VIP', 'At Risk', 'Inactive']

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateCustomer(shopId, id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers', shopId] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCustomer(shopId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers', shopId] }),
  })

  const handleStatusChange = (c: DbCustomer, newStatus: string) => {
    statusMutation.mutate({ id: c.id, status: newStatus })
  }

  const filtered = customers.filter(c => {
    if (tab !== 'All' && c.status !== tab) return false
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) &&
        !c.company.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })
  const { page, perPage, totalPages, paged, setPage, setPerPage, total: totalFiltered } = usePagination(filtered)
  const bulk = useBulkSelect(paged, filtered)

  const vip    = customers.filter(c => c.status === 'VIP').length
  const active = customers.filter(c => c.status === 'Active').length
  const atRisk = customers.filter(c => c.status === 'At Risk').length

  const handleDelete = () => {
    if (!delTarget) return
    deleteMutation.mutate(delTarget.id)
    setDelTarget(null)
  }

  return (
    <AppShell>
      <CreateToast param="created" title="Customer created successfully" subtitle="The new customer has been added to your list" basePath="/customers" />
      <CreateToast param="saved" title="Customer updated successfully" subtitle="Changes have been saved" basePath="/customers" />

      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">Customers</div>
          <div className="page-subtitle">{customers.length} customers on record</div>
        </div>
        <div className="page-actions">
          <DateRangePicker />
          <button className="topbar-btn" onClick={() => downloadCSV('customers', filtered, [{ key: 'seq_id', label: 'ID' }, { key: 'name', label: 'Name' }, { key: 'company', label: 'Company' }, { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' }, { key: 'location', label: 'Location' }, { key: 'status', label: 'Status' }, { key: 'credit_limit', label: 'Credit Limit' }, { key: 'payment_terms', label: 'Payment Terms' }])}>
            <ExportIcon />
            <span>Export</span>
          </button>
          <Link href="/customers/new" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <PlusIcon /> New Customer
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="finance-stats">
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-label"><UsersIcon /> Total</div></div>
          <div className="stat-value">{customers.length}<span className="stat-change-pos"><ArrowUpIcon /> 3</span></div>
          <div className="stat-vs">vs. 5 last period</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-label"><UsersIcon /> VIP</div></div>
          <div className="stat-value">{vip}</div>
          <div className="stat-vs">High-value accounts</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-label"><UsersIcon /> Active</div></div>
          <div className="stat-value">{active}</div>
          <div className="stat-vs">Ordering regularly</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-label"><UsersIcon /> At Risk</div></div>
          <div className="stat-value" style={{ color: 'var(--warning)' }}>{atRisk}</div>
          <div className="stat-vs">Needs follow-up</div>
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
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers…"
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
                <th>Location</th>
                <th>Orders</th>
                <th>Total Spent</th>
                <th>Credit Limit</th>
                <th>Terms</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={10}><div className="empty-state">Loading customers...</div></td></tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={10}><div className="empty-state">No customers found</div></td></tr>
              )}
              {paged.map(c => (
                <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/customers/${c.id}`)}>
                  <td onClick={e => e.stopPropagation()}><BulkCheckbox checked={bulk.selectedIds.has(c.id)} onChange={() => bulk.toggleSelect(c.id)} /></td>
                  <td>
                    <div className="td-with-icon">
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                        {initials(c.name)}
                      </div>
                      <div>
                        <button className="cell-name" onClick={e => { e.stopPropagation(); setViewTarget(c) }} style={{ color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600, fontSize: 13, fontFamily: 'var(--font)' }}>{c.name}</button>
                        <div className="cell-sub">{c.seq_id} · {c.company || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: 12.5 }}>{c.email}</div>
                    <div className="cell-sub">{c.phone}</div>
                  </td>
                  <td style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{c.location || '—'}</td>
                  <td style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>0</td>
                  <td style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{fmtMoney(0)}</td>
                  <td style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{c.credit_limit ? fmtMoney(c.credit_limit) : '—'}</td>
                  <td style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{c.payment_terms || '—'}</td>
                  <td><StatusSelect value={c.status} onChange={(v) => handleStatusChange(c, v)} options={CUST_STATUSES} /></td>
                  <td onClick={e => e.stopPropagation()}>
                    <RowMenu items={[
                      { label: 'View',   action: () => setViewTarget(c) },
                      { label: 'Edit',   action: () => router.push(`/customers/${c.id}`) },
                      { label: 'Share',  action: () => setShareTarget(c) },
                      { label: 'Delete', action: () => setDelTarget(c), danger: true },
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
        { label: 'Export CSV', icon: <ExportIcon />, action: () => downloadCSV('customers-selected', bulk.selectedItems, [{ key: 'seq_id', label: 'ID' }, { key: 'name', label: 'Name' }, { key: 'company', label: 'Company' }, { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' }, { key: 'status', label: 'Status' }]) },
        { label: 'Delete', action: () => bulk.setBulkDelOpen(true), danger: true },
      ]} />
      {bulk.bulkDelOpen && <ConfirmModal title={`Delete ${bulk.selectedIds.size} customers?`} message="This will permanently remove all selected customers. This cannot be undone." confirmLabel="Delete All" onConfirm={async () => { for (const c of bulk.selectedItems) { await deleteCustomer(shopId, c.id) } bulk.clearSelection(); bulk.setBulkDelOpen(false); qc.invalidateQueries({ queryKey: ['customers', shopId] }) }} onCancel={() => bulk.setBulkDelOpen(false)} />}

      {viewTarget && (
        <ViewModal
          title={viewTarget.name}
          subtitle={`${viewTarget.company || 'No company'} · ${viewTarget.seq_id}`}
          status={viewTarget.status}
          onClose={() => setViewTarget(null)}
          onEdit={() => { setViewTarget(null); router.push(`/customers/${viewTarget.id}`) }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
            <div>
              <SectionLabel>Contact</SectionLabel>
              <ViewRow label="Name" value={viewTarget.name} />
              <ViewRow label="Company" value={viewTarget.company || '—'} />
              <ViewRow label="Email" value={viewTarget.email || '—'} />
              <ViewRow label="Phone" value={viewTarget.phone || '—'} />
              <ViewRow label="Location" value={viewTarget.location || '—'} />
            </div>
            <div>
              <SectionLabel>Account</SectionLabel>
              <ViewRow label="Customer Type" value={viewTarget.customer_type || '—'} />
              <ViewRow label="Status" value="" badge={viewTarget.status} />
              <ViewRow label="Credit Limit" value={viewTarget.credit_limit ? fmtMoney(viewTarget.credit_limit) : '—'} />
              <ViewRow label="Payment Terms" value={viewTarget.payment_terms || '—'} />
              <ViewRow label="Total Orders" value={0} />
              <ViewRow label="Total Spent" value={fmtMoney(0)} accent />
            </div>
          </div>
          {viewTarget.billing_address && (
            <div style={{ marginTop: 20 }}>
              <SectionLabel>Billing Address</SectionLabel>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginTop: 6, padding: '12px 14px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>{viewTarget.billing_address}</p>
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

      {/* Confirm Delete */}
      {delTarget && (
        <ConfirmModal
          title={`Delete ${delTarget.name}?`}
          message="This will permanently remove this customer. This action cannot be undone."
          confirmLabel="Delete Customer"
          onConfirm={handleDelete}
          onCancel={() => setDelTarget(null)}
        />
      )}

      {shareTarget && <ShareModal title={`Customer ${shareTarget.seq_id} — ${shareTarget.name}`} shareText={`Customer ${shareTarget.name} (${shareTarget.company || 'No company'}) — RM 0 total spent`} shareUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/customers/${shareTarget.id}`} onClose={() => setShareTarget(null)} onPrint={() => printDocument(`Customer ${shareTarget.seq_id}`, buildCustomerPrint(shareTarget))} />}
    </AppShell>
  )
}
