'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import CreateToast from '@/components/CreateToast'
import ConfirmModal from '@/components/ConfirmModal'
import ViewModal, { ViewRow, SectionLabel } from '@/components/ViewModal'
import { getMembershipRequests, updateMembershipRequest, deleteMembershipRequest, type DbMembershipRequest } from '@/lib/db/memberships'
import { getMemberships } from '@/lib/db/memberships'
import { activateStoreMembership, suspendStoreMembership, deactivateStoreMembership, deleteStoreMembership, completeStoreMembershipPurchases } from '@/lib/store/auth-store' // TODO: migrate to Supabase
import Pagination, { usePagination } from '@/components/Pagination'
import RowMenu from '@/components/RowMenu'
import BulkActionBar, { BulkCheckbox, useBulkSelect } from '@/components/BulkActionBar'
import StatusSelect from '@/components/StatusSelect'
import { useShop } from '@/providers/shop-provider'
import { useQuery, useQueryClient } from '@tanstack/react-query'

type MembershipRequest = DbMembershipRequest
const fmt = (n: number) => `RM ${(n ?? 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`

const SearchIcon = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>)
const CardIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>)
const PlusIcon = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>)

const STATUS_BADGE: Record<string, string> = {
  pending: 'badge badge-warning',
  approved: 'badge badge-success',
  rejected: 'badge badge-danger',
  suspended: 'badge badge-warning',
  inactive: 'badge badge-danger',
}

const MEMBERSHIP_STATUSES: string[] = ['approved', 'suspended', 'inactive']

const TABS = ['All', 'Pending', 'Approved', 'Suspended', 'Inactive', 'Rejected']


export default function MembershipApprovalsPage() {
  const router = useRouter()
  const { shopId } = useShop()
  const qc = useQueryClient()

  const { data: tiers = [] } = useQuery({
    queryKey: ['memberships', shopId],
    queryFn: () => getMemberships(shopId),
    enabled: !!shopId,
  })

  const { data: requests = [] } = useQuery({
    queryKey: ['membershipRequests', shopId],
    queryFn: () => getMembershipRequests(shopId),
    enabled: !!shopId,
  })

  const [tab, setTab] = useState('All')
  const [search, setSearch] = useState('')
  const [viewTarget, setViewTarget] = useState<MembershipRequest | null>(null)
  const [approveTarget, setApproveTarget] = useState<MembershipRequest | null>(null)
  const [rejectTarget, setRejectTarget] = useState<MembershipRequest | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MembershipRequest | null>(null)

  const reload = () => qc.invalidateQueries({ queryKey: ['membershipRequests', shopId] })

  const filtered = requests.filter(r => {
    if (tab !== 'All' && r.status !== tab.toLowerCase()) return false
    if (search && !r.customer_name.toLowerCase().includes(search.toLowerCase()) && !r.customer_email.toLowerCase().includes(search.toLowerCase()) && !r.tier_name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const { page, perPage, totalPages, paged, setPage, setPerPage, total: totalFiltered } = usePagination(filtered)
  const bulk = useBulkSelect(paged, filtered)

  const pendingCount = requests.filter(r => r.status === 'pending').length
  const approvedCount = requests.filter(r => r.status === 'approved').length
  const rejectedCount = requests.filter(r => r.status === 'rejected').length
  const suspendedCount = requests.filter(r => r.status === 'suspended').length
  const inactiveCount = requests.filter(r => r.status === 'inactive').length
  const totalRevenue = requests.filter(r => r.status === 'approved').reduce((s, r) => s + r.price, 0)

  const handleApprove = async () => {
    if (!approveTarget) return
    await updateMembershipRequest(shopId, approveTarget.id, { status: 'approved' })

    if (approveTarget.customer_email) {
      const tier = tiers.find(t => t.id === approveTarget.tier_id)
      if (tier) {
        activateStoreMembership(approveTarget.customer_email, tier.id, tier.name, tier.discount_rate, tier.duration_months)
        completeStoreMembershipPurchases(approveTarget.customer_email, tier.id)
      }
    }

    reload()
    setApproveTarget(null)
  }

  const handleReject = async () => {
    if (!rejectTarget) return
    await updateMembershipRequest(shopId, rejectTarget.id, { status: 'rejected' })
    reload()
    setRejectTarget(null)
  }

  const handleBulkApprove = async () => {
    for (const r of bulk.selectedItems) {
      if (r.status === 'pending') await updateMembershipRequest(shopId, r.id, { status: 'approved' })
    }
    bulk.clearSelection()
    reload()
  }

  const handleBulkDelete = async () => {
    for (const r of bulk.selectedItems) {
      await deleteMembershipRequest(shopId, r.id)
    }
    bulk.clearSelection()
    reload()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    if (deleteTarget.customer_email) deleteStoreMembership(deleteTarget.customer_email)
    await deleteMembershipRequest(shopId, deleteTarget.id)
    reload()
    setDeleteTarget(null)
  }

  const handleStatusChange = async (r: MembershipRequest, newStatus: string) => {
    await updateMembershipRequest(shopId, r.id, { status: newStatus })

    if (r.customer_email) {
      const tier = tiers.find(t => t.id === r.tier_id)
      if (newStatus === 'approved' && tier) {
        activateStoreMembership(r.customer_email, tier.id, tier.name, tier.discount_rate, tier.duration_months)
        completeStoreMembershipPurchases(r.customer_email, tier.id)
      } else if (newStatus === 'suspended') {
        suspendStoreMembership(r.customer_email)
      } else if (newStatus === 'inactive') {
        deactivateStoreMembership(r.customer_email)
      }
    }

    reload()
  }

  return (
    <AppShell>
      <CreateToast param="created" title="Membership request created" subtitle="The new request has been added" basePath="/membership-approvals" />
      <CreateToast param="saved" title="Membership request updated" subtitle="Changes have been saved" basePath="/membership-approvals" />

      <div className="page-header">
        <div><div className="page-title">Membership</div><div className="page-subtitle">Manage storefront membership subscriptions</div></div>
        <div className="page-actions">
          <Link href="/membership-approvals/new" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}><PlusIcon /><span>New</span></Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="finance-stats">
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-label"><CardIcon /> Pending Review</div></div>
          <div className="stat-value" style={{ fontSize: 20 }}>{pendingCount}</div>
          <div className="stat-vs">Awaiting admin action</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-label"><CardIcon /> Approved</div></div>
          <div className="stat-value" style={{ fontSize: 20, color: 'var(--positive)' }}>{approvedCount}</div>
          <div className="stat-vs">Active memberships</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-label"><CardIcon /> Rejected</div></div>
          <div className="stat-value" style={{ fontSize: 20 }}>{rejectedCount}</div>
          <div className="stat-vs">Declined requests</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-label"><CardIcon /> Revenue</div></div>
          <div className="stat-value" style={{ fontSize: 20 }}>{fmt(totalRevenue)}</div>
          <div className="stat-vs">From approved memberships</div>
        </div>
      </div>

      <div className="page-scroll">
        {/* Filter row */}
        <div className="filter-row">
          <div className="filter-bar">
            {TABS.map(t => (
              <button key={t} className={`filter-tab${tab === t ? ' active' : ''}`} onClick={() => { setTab(t); setPage(1) }}>{t}</button>
            ))}
          </div>
          <div className="filter-right">
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '6px 12px' }}>
              <SearchIcon />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search requests…" style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12.5, color: 'var(--text-primary)', width: 170 }} />
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
                <th>Customer</th>
                <th>Tier</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Receipt</th>
                <th>Submitted</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={10}><div className="empty-state">No membership requests found</div></td></tr>}
              {paged.map(r => (
                <tr key={r.id}>
                  <td><BulkCheckbox checked={bulk.selectedIds.has(r.id)} onChange={() => bulk.toggleSelect(r.id)} /></td>
                  <td>
                    <button onClick={() => setViewTarget(r)} style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font)' }}>{r.id}</button>
                  </td>
                  <td>
                    <span className="cell-name">{r.customer_name}</span>
                    <div className="cell-sub">{r.customer_email}</div>
                  </td>
                  <td><span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{r.tier_name}</span></td>
                  <td style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{fmt(r.price)}</td>
                  <td style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{r.payment_method === 'bank-transfer' ? 'Bank Transfer' : 'Online'}</td>
                  <td>{r.receipt_file ? <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}>{r.receipt_file}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.created_at}</td>
                  <td>
                    {(r.status === 'approved' || r.status === 'suspended' || r.status === 'inactive') ? (
                      <StatusSelect value={r.status} onChange={(v) => handleStatusChange(r, v as MembershipRequest['status'])} options={MEMBERSHIP_STATUSES} />
                    ) : (
                      <span className={STATUS_BADGE[r.status]}>{r.status}</span>
                    )}
                  </td>
                  <td>
                    <RowMenu items={[
                      { label: 'View', action: () => setViewTarget(r) },
                      { label: 'Edit', action: () => router.push(`/membership-approvals/${r.id}`) },
                      ...(r.status === 'pending' ? [
                        { label: 'Approve', action: () => setApproveTarget(r) },
                        { label: 'Reject', action: () => setRejectTarget(r), danger: true },
                      ] : []),
                      { label: 'Delete', action: () => setDeleteTarget(r), danger: true },
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
        <ViewModal title={viewTarget.id} subtitle={`${viewTarget.customer_name} · ${viewTarget.tier_name} Membership`} status={viewTarget.status === 'approved' ? 'Active' : viewTarget.status === 'pending' ? 'Pending' : 'Cancelled'} onClose={() => setViewTarget(null)} onEdit={() => { setViewTarget(null); router.push(`/membership-approvals/${viewTarget.id}`) }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
            <div>
              <SectionLabel>Customer</SectionLabel>
              <ViewRow label="Name" value={viewTarget.customer_name} />
              <ViewRow label="Email" value={viewTarget.customer_email} />
            </div>
            <div>
              <SectionLabel>Membership</SectionLabel>
              <ViewRow label="Tier" value={viewTarget.tier_name} />
              <ViewRow label="Price" value={fmt(viewTarget.price)} accent />
              <ViewRow label="Method" value={viewTarget.payment_method === 'bank-transfer' ? 'Bank Transfer' : 'Online'} />
            </div>
          </div>
          {viewTarget.receipt_file && (
            <div style={{ marginTop: 20, padding: 14, background: 'var(--bg, #f8f9fa)', borderRadius: 8, border: '1px solid var(--border, #e5e7eb)' }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: 'var(--text-muted)', marginBottom: 8 }}>Receipt</div>
              <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 500 }}>{viewTarget.receipt_file}</div>
            </div>
          )}
          <div style={{ marginTop: 20 }}>
            <SectionLabel>Status</SectionLabel>
            <ViewRow label="Status" value="" badge={viewTarget.status === 'approved' ? 'Active' : viewTarget.status === 'pending' ? 'Pending' : 'Cancelled'} />
            <ViewRow label="Submitted" value={viewTarget.created_at} />
            {viewTarget.updated_at && <ViewRow label="Reviewed" value={viewTarget.updated_at} />}
          </div>
        </ViewModal>
      )}

      {/* Approve confirm */}
      {approveTarget && (
        <ConfirmModal
          title={`Approve ${approveTarget.tier_name} Membership`}
          message={`Approve ${approveTarget.customer_name}'s ${approveTarget.tier_name} membership purchase (${fmt(approveTarget.price)})? This will activate their membership.`}
          confirmLabel="Approve"
          danger={false}
          onConfirm={handleApprove}
          onCancel={() => setApproveTarget(null)}
        />
      )}

      {/* Reject confirm */}
      {rejectTarget && (
        <ConfirmModal
          title={`Reject Membership Request`}
          message={`Reject ${rejectTarget.customer_name}'s ${rejectTarget.tier_name} membership request? This cannot be undone.`}
          confirmLabel="Reject"
          danger
          onConfirm={handleReject}
          onCancel={() => setRejectTarget(null)}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <ConfirmModal
          title="Delete Membership Request"
          message={`Permanently delete ${deleteTarget.customer_name}'s ${deleteTarget.tier_name} request (${deleteTarget.id})? This action cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <BulkActionBar count={bulk.selectedIds.size} total={filtered.length} onDeselectAll={bulk.clearSelection} actions={[
        { label: 'Approve Selected', action: handleBulkApprove },
        { label: 'Delete Selected', action: handleBulkDelete, danger: true },
      ]} />
    </AppShell>
  )
}
