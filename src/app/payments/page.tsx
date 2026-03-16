'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import CreateToast from '@/components/CreateToast'
import DateRangePicker from '@/components/DateRangePicker'
import ConfirmModal from '@/components/ConfirmModal'
import { getPayments, updatePayment, deletePayment, type DbPayment } from '@/lib/db/payments'
import StatusSelect from '@/components/StatusSelect'
import { printDocument, docHeader, docFooter, fields2, fields3, section, textBlock, badgeColors } from '@/lib/print-utils'
import Pagination, { usePagination } from '@/components/Pagination'
import RowMenu from '@/components/RowMenu'
import ViewModal, { ViewRow, SectionLabel } from '@/components/ViewModal'
import ShareModal from '@/components/ShareModal'
import { downloadCSV } from '@/lib/csv-utils'
import BulkActionBar, { BulkCheckbox, useBulkSelect } from '@/components/BulkActionBar'
import { useShop } from '@/providers/shop-provider'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const ExportIcon = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>)
const PlusIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>)
const SearchIcon = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>)
const DotsIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>)
const PayIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H6"/></svg>)
const ArrowUpIcon = () => (<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>)
const ArrowDownIcon = () => (<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>)
const PaperclipIcon = () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>)

const fmt = (n: number) => `RM ${n.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`

function buildPaymentPrint(p: DbPayment): string {
  const [bg, color] = badgeColors(p.status)
  const balance = p.amount_due - p.amount_paid
  return docHeader('PAYMENT RECEIPT', p.seq_id, p.status, bg, color) +
    section('Payment Details', fields2([
      { label: 'Client', value: p.client },
      { label: 'Invoice Ref', value: p.invoice_id || '—' },
      { label: 'Payment Method', value: p.method || '—' },
      { label: 'Reference', value: p.ref || '—' },
      { label: 'Date', value: p.date || '—' },
      { label: 'Status', value: p.status },
    ])) +
    section('Amounts', fields3([
      { label: 'Amount Due', value: fmt(p.amount_due) },
      { label: 'Amount Paid', value: fmt(p.amount_paid), accent: true },
      { label: balance > 0 ? 'Balance Due' : 'Balance', value: balance > 0 ? fmt(balance) : 'Settled' },
    ])) +
    (p.notes ? section('Notes', textBlock(p.notes)) : '') +
    docFooter()
}

const STATUS_BADGE: Record<string, string> = { Captured: 'badge badge-success', Pending: 'badge badge-warning', Failed: 'badge badge-danger' }
const TABS = ['All', 'Captured', 'Pending', 'Failed']
type PaymentStatus = 'Captured' | 'Pending' | 'Failed'

export default function PaymentsPage() {
  const router = useRouter()
  const { shopId } = useShop()
  const qc = useQueryClient()

  const { data: payments = [] } = useQuery({
    queryKey: ['payments', shopId],
    queryFn: () => getPayments(shopId),
    enabled: !!shopId,
  })

  const updateMut = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof updatePayment>[2] }) =>
      updatePayment(shopId, id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payments', shopId] }),
    onError: (err: any) => {
      console.error('[updatePayment]', err)
      alert('Failed to update: ' + (err?.message || 'Unknown error'))
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deletePayment(shopId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payments', shopId] }),
    onError: (err: any) => {
      console.error('[deletePayment]', err)
      alert('Failed to delete: ' + (err?.message || 'Unknown error'))
    },
  })

  const [tab, setTab] = useState('All')
  const [search, setSearch] = useState('')
  const [delTarget, setDelTarget] = useState<DbPayment | null>(null)
  const [viewTarget, setViewTarget] = useState<DbPayment | null>(null)
  const [shareTarget, setShareTarget] = useState<DbPayment | null>(null)

  const PAY_STATUSES: PaymentStatus[] = ['Captured', 'Pending', 'Failed']

  const handleStatusChange = (p: DbPayment, newStatus: string) => {
    updateMut.mutate({ id: p.id, updates: { status: newStatus } })
  }

  const filtered = payments.filter(p => { if (tab !== 'All' && p.status !== tab) return false; if (search && !p.client.toLowerCase().includes(search.toLowerCase()) && !p.seq_id.toLowerCase().includes(search.toLowerCase())) return false; return true })
  const { page, perPage, totalPages, paged, setPage, setPerPage, total: totalFiltered } = usePagination(filtered)
  const bulk = useBulkSelect(paged, filtered)
  const totalReceived = payments.filter(p => p.status === 'Captured').reduce((s, p) => s + p.amount_paid, 0)
  const totalPending = payments.filter(p => p.status === 'Pending').reduce((s, p) => s + (p.amount_due - p.amount_paid), 0)
  const capturedCount = payments.filter(p => p.status === 'Captured').length
  const failedCount = payments.filter(p => p.status === 'Failed').length

  const handleDelete = () => {
    if (!delTarget) return
    deleteMut.mutate(delTarget.id)
    setDelTarget(null)
  }

  return (
    <AppShell>
      <CreateToast param="created" title="Payment recorded successfully" subtitle="The new payment has been added to your records" basePath="/payments" />
      <CreateToast param="saved" title="Payment updated successfully" subtitle="Changes have been saved" basePath="/payments" />
      <div className="page-header">
        <div><div className="page-title">Payments</div><div className="page-subtitle">{payments.length} payments recorded this period</div></div>
        <div className="page-actions">
          <DateRangePicker />
          <button className="topbar-btn" onClick={() => downloadCSV('payments', filtered, [{ key: 'seq_id', label: 'Payment #' }, { key: 'client', label: 'Client' }, { key: 'invoice_id', label: 'Invoice' }, { key: 'method', label: 'Method' }, { key: 'amount_due', label: 'Amount Due' }, { key: 'amount_paid', label: 'Amount Paid' }, { key: 'status', label: 'Status' }, { key: 'date', label: 'Date' }, { key: 'ref', label: 'Reference' }])}><ExportIcon /><span>Export</span></button>
          <Link href="/payments/new" className="btn-primary"><PlusIcon /> Record Payment</Link>
        </div>
      </div>

      <div className="finance-stats">
        <div className="stat-card"><div className="stat-card-header"><div className="stat-card-label"><PayIcon /> Total Received</div><span className="stat-card-period">Last 30 days</span></div><div className="stat-value" style={{ fontSize: 20 }}>{fmt(totalReceived)}<span className="stat-change-pos"><ArrowUpIcon /> 22%</span></div><div className="stat-vs">{capturedCount} successful payments</div></div>
        <div className="stat-card"><div className="stat-card-header"><div className="stat-card-label"><PayIcon /> Pending Collection</div></div><div className="stat-value" style={{ fontSize: 20 }}>{fmt(totalPending)}</div><div className="stat-vs">Across {payments.filter(p => p.status === 'Pending').length} payments</div></div>
        <div className="stat-card"><div className="stat-card-header"><div className="stat-card-label"><PayIcon /> This Month</div></div><div className="stat-value" style={{ fontSize: 20 }}>{fmt(totalReceived)}<span className="stat-change-pos"><ArrowUpIcon /> 14%</span></div><div className="stat-vs">vs. RM 4,800 last month</div></div>
        <div className="stat-card"><div className="stat-card-header"><div className="stat-card-label"><PayIcon /> Failed</div></div><div className="stat-value">{failedCount}<span className="stat-change-neg"><ArrowDownIcon /> 1</span></div><div className="stat-vs">Requires follow-up</div></div>
      </div>

      <div className="page-scroll">
        <div className="filter-row">
          <div className="filter-bar">{TABS.map(t => (<button key={t} className={`filter-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{t}</button>))}</div>
          <div className="filter-right"><div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '6px 12px' }}><SearchIcon /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search payments…" style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12.5, color: 'var(--text-primary)', width: 170 }} /></div></div>
        </div>

        <div className="card">
          <table className="data-table">
            <thead><tr><th style={{ width: 40 }}><BulkCheckbox checked={bulk.allPageSelected} indeterminate={!bulk.allPageSelected && bulk.somePageSelected} onChange={bulk.toggleAll} /></th><th>Ref #</th><th>Client</th><th>Invoice</th><th>Method</th><th>Amount Due</th><th>Amount Paid</th><th>Status</th><th>Date</th><th></th></tr></thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={10}><div className="empty-state">No payments found</div></td></tr>}
              {paged.map(p => (
                <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/payments/${p.id}`)}>
                  <td onClick={e => e.stopPropagation()}><BulkCheckbox checked={bulk.selectedIds.has(p.id)} onChange={() => bulk.toggleSelect(p.id)} /></td>
                  <td><button onClick={e => { e.stopPropagation(); setViewTarget(p) }} style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font)' }}>{p.seq_id}</button><div className="cell-sub">{p.ref}</div></td>
                  <td><span className="cell-name">{p.client}</span></td>
                  <td><span style={{ fontSize: 12.5, color: 'var(--accent)', fontWeight: 500 }}>{p.invoice_id}</span></td>
                  <td><span style={{ fontSize: 12.5 }}>{p.method}</span></td>
                  <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{fmt(p.amount_due)}</td>
                  <td style={{ fontWeight: 600, fontSize: 13, color: p.amount_paid === p.amount_due ? 'var(--positive)' : 'var(--text-primary)' }}>{fmt(p.amount_paid)}</td>
                  <td><StatusSelect value={p.status} onChange={(v) => handleStatusChange(p, v)} options={PAY_STATUSES} /></td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.date}</td>
                  <td onClick={e => e.stopPropagation()}>
                    <RowMenu items={[
                      { label: 'View',   action: () => setViewTarget(p) },
                      { label: 'Edit',   action: () => router.push(`/payments/${p.id}`) },
                      { label: 'Share',  action: () => setShareTarget(p) },
                      { label: 'Delete', action: () => setDelTarget(p), danger: true },
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
        { label: 'Export CSV', icon: <ExportIcon />, action: () => downloadCSV('payments-selected', bulk.selectedItems, [{ key: 'seq_id', label: 'Payment #' }, { key: 'client', label: 'Client' }, { key: 'invoice_id', label: 'Invoice' }, { key: 'method', label: 'Method' }, { key: 'amount_due', label: 'Amount Due' }, { key: 'amount_paid', label: 'Amount Paid' }, { key: 'status', label: 'Status' }, { key: 'date', label: 'Date' }]) },
        { label: 'Delete', action: () => bulk.setBulkDelOpen(true), danger: true },
      ]} />
      {bulk.bulkDelOpen && <ConfirmModal title={`Delete ${bulk.selectedIds.size} payments?`} message="This will permanently remove all selected payments. This cannot be undone." confirmLabel="Delete All" onConfirm={() => { bulk.selectedItems.forEach(p => { deleteMut.mutate(p.id) }); bulk.clearSelection(); bulk.setBulkDelOpen(false) }} onCancel={() => bulk.setBulkDelOpen(false)} />}
      {viewTarget && (() => {
        const balance = viewTarget.amount_due - viewTarget.amount_paid
        return (
          <ViewModal
            title={viewTarget.seq_id}
            subtitle={`${viewTarget.client} · ${viewTarget.date}`}
            status={viewTarget.status}
            onClose={() => setViewTarget(null)}
            onEdit={() => { setViewTarget(null); router.push(`/payments/${viewTarget.id}`) }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
              <div>
                <SectionLabel>Payment Details</SectionLabel>
                <ViewRow label="Client" value={viewTarget.client} />
                <ViewRow label="Invoice Ref" value={viewTarget.invoice_id || '—'} />
                <ViewRow label="Method" value={viewTarget.method} />
                <ViewRow label="Reference" value={viewTarget.ref || '—'} />
                <ViewRow label="Date" value={viewTarget.date} />
                <ViewRow label="Status" value="" badge={viewTarget.status} />
              </div>
              <div>
                <SectionLabel>Amounts</SectionLabel>
                <ViewRow label="Amount Due" value={fmt(viewTarget.amount_due)} />
                <ViewRow label="Amount Paid" value={fmt(viewTarget.amount_paid)} accent />
                <ViewRow label="Balance" value={balance > 0 ? fmt(balance) : 'Settled'} />
              </div>
            </div>
            {viewTarget.notes && (
              <div style={{ marginTop: 20 }}>
                <SectionLabel>Notes</SectionLabel>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginTop: 6, padding: '12px 14px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>{viewTarget.notes}</p>
              </div>
            )}
          </ViewModal>
        )
      })()}

      {delTarget && <ConfirmModal title={`Delete ${delTarget.seq_id}?`} message={`This will permanently remove the payment record for ${delTarget.client}.`} confirmLabel="Delete" onConfirm={handleDelete} onCancel={() => setDelTarget(null)} />}
      {shareTarget && <ShareModal title={`Payment ${shareTarget.seq_id} — ${shareTarget.client}`} shareText={`Payment ${shareTarget.seq_id} from ${shareTarget.client} (${fmt(shareTarget.amount_paid)})`} shareUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/payments/${shareTarget.id}`} onClose={() => setShareTarget(null)} onPrint={() => printDocument(`Payment ${shareTarget.seq_id}`, buildPaymentPrint(shareTarget))} />}
    </AppShell>
  )
}
