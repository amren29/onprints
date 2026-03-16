'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import MyStoreShell from '@/components/MyStoreShell'
import CreateToast from '@/components/CreateToast'
import ConfirmModal from '@/components/ConfirmModal'
import ViewModal, { ViewRow, SectionLabel } from '@/components/ViewModal'
import { getAffiliates, updateAffiliate, deleteAffiliate, getAffiliateOrders, getPayoutRequests, updatePayoutRequest, type DbAffiliate, type DbAffiliateOrder, type DbPayoutRequest } from '@/lib/db/affiliates'
import { getProducts, type DbProduct } from '@/lib/db/catalog'
import { useShop } from '@/providers/shop-provider'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Pagination, { usePagination } from '@/components/Pagination'
import RowMenu from '@/components/RowMenu'
import BulkActionBar, { BulkCheckbox, useBulkSelect } from '@/components/BulkActionBar'
import { downloadCSV } from '@/lib/csv-utils'

const SearchIcon = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>)
const ExportIcon = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>)
const PlusIcon = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>)
const LinkIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>)
const ArrowUpIcon = () => (<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>)
const OrderLinkIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>)

const STATUS_BADGE: Record<string, string> = {
  active: 'badge badge-success',
  inactive: 'badge badge-pending',
}

function fmt(n: number) {
  return `RM ${(n ?? 0).toLocaleString('en-MY', { minimumFractionDigits: 0 })}`
}

const AFFILIATE_TABS = ['All', 'Active', 'Inactive']

const TOP_TABS = ['Affiliates', 'Orders', 'Payouts'] as const
type TopTab = typeof TOP_TABS[number]

export default function AffiliatesPage() {
  const router = useRouter()
  const { shopId } = useShop()
  const qc = useQueryClient()
  const [topTab, setTopTab] = useState<TopTab>('Affiliates')

  /* ── Shared data ── */
  const { data: affiliates = [] } = useQuery({
    queryKey: ['affiliates', shopId],
    queryFn: () => getAffiliates(shopId),
    enabled: !!shopId,
  })

  const { data: orders = [] } = useQuery({
    queryKey: ['affiliate-orders', shopId],
    queryFn: () => getAffiliateOrders(shopId),
    enabled: !!shopId,
  })

  const { data: payoutRequests = [] } = useQuery({
    queryKey: ['payout-requests', shopId],
    queryFn: () => getPayoutRequests(shopId),
    enabled: !!shopId,
  })

  const { data: catalogProducts = [] } = useQuery({
    queryKey: ['products', shopId],
    queryFn: () => getProducts(shopId),
    enabled: !!shopId,
  })

  const referredOrderCounts: Record<string, number> = {}
  orders.forEach(o => { referredOrderCounts[o.affiliate_code] = (referredOrderCounts[o.affiliate_code] ?? 0) + 1 })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteAffiliate(shopId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['affiliates', shopId] }),
    onError: (err: any) => {
      console.error('[deleteAffiliate]', err)
      alert('Failed to delete: ' + (err?.message || 'Unknown error'))
    },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof updateAffiliate>[2] }) => updateAffiliate(shopId, id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['affiliates', shopId] }),
    onError: (err: any) => {
      console.error('[updateAffiliate]', err)
      alert('Failed to update: ' + (err?.message || 'Unknown error'))
    },
  })

  const updatePayoutMut = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof updatePayoutRequest>[2] }) => updatePayoutRequest(shopId, id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payout-requests', shopId] }),
    onError: (err: any) => {
      console.error('[updatePayoutRequest]', err)
      alert('Failed to update payout: ' + (err?.message || 'Unknown error'))
    },
  })

  /* ── Affiliates view state ── */
  const [affTab, setAffTab] = useState('All')
  const [affSearch, setAffSearch] = useState('')
  const [viewTarget, setViewTarget] = useState<DbAffiliate | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DbAffiliate | null>(null)

  const affFiltered = affiliates.filter(a => {
    if (affTab !== 'All' && a.status !== affTab.toLowerCase()) return false
    if (affSearch && !a.name.toLowerCase().includes(affSearch.toLowerCase()) && !a.email.toLowerCase().includes(affSearch.toLowerCase()) && !a.code.toLowerCase().includes(affSearch.toLowerCase())) return false
    return true
  })

  const affPagination = usePagination(affFiltered)
  const affBulk = useBulkSelect(affPagination.paged, affFiltered)

  const activeCount = affiliates.filter(a => a.status === 'active').length
  const avgCommission = affiliates.length > 0 ? (affiliates.reduce((s, a) => s + a.commission_rate, 0) / affiliates.length).toFixed(1) : '0'
  const totalReferred = Object.values(referredOrderCounts).reduce((s, c) => s + c, 0)

  const handleDelete = () => { if (!deleteTarget) return; deleteMut.mutate(deleteTarget.id); setDeleteTarget(null) }
  const handleBulkDelete = () => { affBulk.selectedItems.forEach(a => deleteMut.mutate(a.id)); affBulk.clearSelection() }
  const handleBulkDeactivate = () => { affBulk.selectedItems.forEach(a => { if (a.status === 'active') updateMut.mutate({ id: a.id, updates: { status: 'inactive' } }) }); affBulk.clearSelection() }

  /* ── Orders view state ── */
  const [ordSearch, setOrdSearch] = useState('')
  const [ordAffFilter, setOrdAffFilter] = useState('All')
  const [ordViewTarget, setOrdViewTarget] = useState<DbAffiliateOrder | null>(null)

  const ordAffNames = ['All', ...Array.from(new Set(orders.map(o => o.affiliate_name)))]

  const ordFiltered = orders.filter(o => {
    if (ordAffFilter !== 'All' && o.affiliate_name !== ordAffFilter) return false
    if (ordSearch && !o.customer_name.toLowerCase().includes(ordSearch.toLowerCase()) && !o.order_id.toLowerCase().includes(ordSearch.toLowerCase()) && !o.affiliate_code.toLowerCase().includes(ordSearch.toLowerCase()) && !o.affiliate_name.toLowerCase().includes(ordSearch.toLowerCase())) return false
    return true
  })

  const ordPagination = usePagination(ordFiltered)
  const ordBulk = useBulkSelect(ordPagination.paged, ordFiltered)

  const totalOrdRevenue = orders.reduce((s, o) => s + o.order_total, 0)
  const affiliateSummary = Array.from(new Set(orders.map(o => o.affiliate_code))).map(code => {
    const afOrders = orders.filter(o => o.affiliate_code === code)
    return { code, name: afOrders[0]?.affiliate_name ?? code, count: afOrders.length, total: afOrders.reduce((s, o) => s + o.order_total, 0) }
  })

  /* ── Payouts view state ── */
  const [approveTarget, setApproveTarget] = useState<DbPayoutRequest | null>(null)
  const [rejectTarget, setRejectTarget] = useState<DbPayoutRequest | null>(null)
  const [rejectNotes, setRejectNotes] = useState('')
  const [reqHistoryTab, setReqHistoryTab] = useState<'pending' | 'all'>('pending')

  const pendingRequests = payoutRequests.filter(r => r.status === 'pending')
  const totalEarned = affiliates.reduce((sum, af) => {
    const afOrders = orders.filter(o => o.affiliate_code === af.code)
    return sum + afOrders.reduce((s, o) => s + o.order_total * (af.commission_rate / 100), 0)
  }, 0)
  const totalPaid = payoutRequests.filter(p => p.status === 'approved').reduce((s, p) => s + p.commission_amount, 0)
  const outstanding = totalEarned - totalPaid

  const handleApprove = (req: DbPayoutRequest) => {
    updatePayoutMut.mutate({ id: req.id, updates: { status: 'approved' } })
    setApproveTarget(null)
  }

  const handleReject = (req: DbPayoutRequest) => {
    updatePayoutMut.mutate({ id: req.id, updates: { status: 'rejected', admin_notes: rejectNotes || '' } })
    setRejectTarget(null)
    setRejectNotes('')
  }

  return (
    <MyStoreShell>
      <CreateToast param="created" title="Affiliate created successfully" subtitle="The new affiliate has been added" basePath="/storefront/affiliates" />
      <CreateToast param="saved" title="Affiliate updated successfully" subtitle="Changes have been saved" basePath="/storefront/affiliates" />

      <div className="page-header">
        <div>
          <div className="page-title">Affiliates</div>
          <div className="page-subtitle">{topTab === 'Affiliates' ? 'Manage affiliate partners and product assignments' : topTab === 'Orders' ? 'Orders referred through affiliate links' : 'Commission payouts via wallet credit'}</div>
        </div>
        <div className="page-actions">
          {topTab === 'Affiliates' ? (
            <>
              <button className="topbar-btn" onClick={() => downloadCSV('affiliates', affFiltered, [{ key: 'id', label: 'ID' }, { key: 'name', label: 'Name' }, { key: 'email', label: 'Email' }, { key: 'code', label: 'Code' }, { key: 'commission_rate', label: 'Commission %' }, { key: 'status', label: 'Status' }, { key: 'created_at', label: 'Created' }])}><ExportIcon /><span>Export</span></button>
              <Link href="/storefront/affiliates/new" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}><PlusIcon /><span>New Affiliate</span></Link>
            </>
          ) : topTab === 'Orders' ? (
            <button className="topbar-btn" onClick={() => downloadCSV('affiliate-orders', ordFiltered, [{ key: 'id', label: 'ID' }, { key: 'order_id', label: 'Order ID' }, { key: 'customer_name', label: 'Customer' }, { key: 'affiliate_name', label: 'Affiliate' }, { key: 'affiliate_code', label: 'Code' }, { key: 'order_total', label: 'Total' }, { key: 'order_date', label: 'Date' }])}><ExportIcon /><span>Export</span></button>
          ) : (
            <button className="topbar-btn" onClick={() => downloadCSV('affiliate-payouts', payoutRequests, [{ key: 'id', label: 'ID' }, { key: 'affiliate_name', label: 'Affiliate' }, { key: 'affiliate_code', label: 'Code' }, { key: 'commission_rate', label: 'Rate %' }, { key: 'order_total', label: 'Order Total' }, { key: 'commission_amount', label: 'Commission' }, { key: 'created_at', label: 'Date' }])}><ExportIcon /><span>Export</span></button>
          )}
        </div>
      </div>

      {/* Top-level tab toggle */}
      <div className="filter-bar" style={{ marginBottom: 16 }}>
        {TOP_TABS.map(t => (
          <button key={t} className={`filter-tab${topTab === t ? ' active' : ''}`} onClick={() => setTopTab(t)}>{t}</button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* AFFILIATES VIEW                                    */}
      {/* ═══════════════════════════════════════════════════ */}
      {topTab === 'Affiliates' && (
        <>
          <div className="finance-stats">
            <div className="stat-card">
              <div className="stat-card-header"><div className="stat-card-label"><LinkIcon /> Total Affiliates</div></div>
              <div className="stat-value" style={{ fontSize: 20 }}>{affiliates.length}</div>
              <div className="stat-vs">{activeCount} active, {affiliates.length - activeCount} inactive</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-header"><div className="stat-card-label"><LinkIcon /> Active</div></div>
              <div className="stat-value" style={{ fontSize: 20, color: 'var(--positive)' }}>{activeCount}</div>
              <div className="stat-vs">Currently active partners</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-header"><div className="stat-card-label"><LinkIcon /> Avg Commission</div></div>
              <div className="stat-value" style={{ fontSize: 20 }}>{avgCommission}%</div>
              <div className="stat-vs">Average commission rate</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-header"><div className="stat-card-label"><LinkIcon /> Referred Orders</div></div>
              <div className="stat-value" style={{ fontSize: 20 }}>{totalReferred}</div>
              <div className="stat-vs">Total orders referred</div>
            </div>
          </div>

          <div className="page-scroll">
            <div className="filter-row">
              <div className="filter-bar">
                {AFFILIATE_TABS.map(t => (
                  <button key={t} className={`filter-tab${affTab === t ? ' active' : ''}`} onClick={() => { setAffTab(t); affPagination.setPage(1) }}>{t}</button>
                ))}
              </div>
              <div className="filter-right">
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '6px 12px' }}>
                  <SearchIcon />
                  <input value={affSearch} onChange={e => { setAffSearch(e.target.value); affPagination.setPage(1) }} placeholder="Search affiliates..." style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12.5, color: 'var(--text-primary)', width: 170 }} />
                </div>
              </div>
            </div>

            <div className="card">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}><BulkCheckbox checked={affBulk.allPageSelected} indeterminate={!affBulk.allPageSelected && affBulk.somePageSelected} onChange={affBulk.toggleAll} /></th>
                    <th>Ref #</th>
                    <th>Name</th>
                    <th>Code</th>
                    <th>Commission</th>
                    <th>Products</th>
                    <th>Orders</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {affFiltered.length === 0 && <tr><td colSpan={9}><div className="empty-state">No affiliates found</div></td></tr>}
                  {affPagination.paged.map(a => (
                    <tr key={a.id}>
                      <td><BulkCheckbox checked={affBulk.selectedIds.has(a.id)} onChange={() => affBulk.toggleSelect(a.id)} /></td>
                      <td>
                        <button onClick={() => setViewTarget(a)} style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font)' }}>{a.id}</button>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>{a.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
                          <div>
                            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{a.name}</span>
                            <div className="cell-sub">{a.email}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className="badge badge-info">{a.code}</span></td>
                      <td style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{a.commission_rate}%</td>
                      <td>
                        <span style={{ background: 'var(--bg)', padding: '2px 8px', borderRadius: 10, fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {(a.assigned_products || []).length} product{(a.assigned_products || []).length !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{referredOrderCounts[a.code] ?? 0}</td>
                      <td><span className={STATUS_BADGE[a.status]}>{a.status}</span></td>
                      <td>
                        <RowMenu items={[
                          { label: 'View', action: () => setViewTarget(a) },
                          { label: 'Edit', action: () => router.push(`/storefront/affiliates/${a.id}`) },
                          ...(a.status === 'active' ? [{ label: 'Deactivate', action: () => updateMut.mutate({ id: a.id, updates: { status: 'inactive' } }) }] : []),
                          { label: 'Delete', action: () => setDeleteTarget(a), danger: true },
                        ]} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={affPagination.page} totalPages={affPagination.totalPages} total={affPagination.total} perPage={affPagination.perPage} onPageChange={affPagination.setPage} onPerPageChange={affPagination.setPerPage} />
          </div>

          {viewTarget && (
            <ViewModal title={viewTarget.id} subtitle={`${viewTarget.name} \u00b7 ${viewTarget.code}`} status={viewTarget.status === 'active' ? 'Approved' : 'Draft'} onClose={() => setViewTarget(null)} onEdit={() => { setViewTarget(null); router.push(`/storefront/affiliates/${viewTarget.id}`) }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
                <div>
                  <SectionLabel>Affiliate Details</SectionLabel>
                  <ViewRow label="Name" value={viewTarget.name} />
                  <ViewRow label="Email" value={viewTarget.email} />
                  <ViewRow label="Code" value={viewTarget.code} />
                  <ViewRow label="Commission" value={`${viewTarget.commission_rate}%`} accent />
                  <ViewRow label="Created" value={viewTarget.created_at} />
                </div>
                <div>
                  <SectionLabel>Status & Performance</SectionLabel>
                  <ViewRow label="Status" value="" badge={viewTarget.status === 'active' ? 'Approved' : 'Draft'} />
                  <ViewRow label="Referred Orders" value={referredOrderCounts[viewTarget.code] ?? 0} />
                </div>
              </div>
              <div style={{ marginTop: 20 }}>
                <SectionLabel>Assigned Products ({(viewTarget.assigned_products || []).length})</SectionLabel>
                {(viewTarget.assigned_products || []).length === 0 ? (
                  <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 8 }}>No products assigned</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10, marginTop: 10 }}>
                    {(viewTarget.assigned_products || []).map(pid => {
                      const p = catalogProducts.find(c => c.id === pid)
                      return (
                        <div key={pid} style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: 'var(--bg-card)' }}>
                          <div style={{ aspectRatio: '1', background: 'var(--bg)', overflow: 'hidden' }}>
                            {p?.main_image
                              ? <img src={p.main_image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--text-muted)' }}>No image</div>
                            }
                          </div>
                          <div style={{ padding: '6px 8px' }}>
                            <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p?.name ?? pid}</div>
                            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p?.pricing_type ?? '\u2014'}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </ViewModal>
          )}

          {deleteTarget && (
            <ConfirmModal
              title="Delete Affiliate"
              message={`Permanently delete ${deleteTarget.name} (${deleteTarget.code})? This action cannot be undone.`}
              confirmLabel="Delete"
              danger
              onConfirm={handleDelete}
              onCancel={() => setDeleteTarget(null)}
            />
          )}

          <BulkActionBar count={affBulk.selectedIds.size} total={affFiltered.length} onDeselectAll={affBulk.clearSelection} actions={[
            { label: 'Deactivate Selected', action: handleBulkDeactivate },
            { label: 'Delete Selected', action: handleBulkDelete, danger: true },
          ]} />
        </>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* ORDERS VIEW                                        */}
      {/* ═══════════════════════════════════════════════════ */}
      {topTab === 'Orders' && (
        <>
          <div className="finance-stats">
            <div className="stat-card">
              <div className="stat-card-header"><div className="stat-card-label"><OrderLinkIcon /> Total Referred</div><span className="stat-card-period">All time</span></div>
              <div className="stat-value" style={{ fontSize: 20 }}>{orders.length}<span className="stat-change-pos"><ArrowUpIcon /> {orders.length}</span></div>
              <div className="stat-vs">Orders via affiliate links</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-header"><div className="stat-card-label"><OrderLinkIcon /> Revenue</div></div>
              <div className="stat-value" style={{ fontSize: 20 }}>{fmt(totalOrdRevenue)}</div>
              <div className="stat-vs">From affiliate referrals</div>
            </div>
            {affiliateSummary.map(a => (
              <div key={a.code} className="stat-card">
                <div className="stat-card-header">
                  <div className="stat-card-label">
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>{a.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
                    {a.name}
                  </div>
                </div>
                <div className="stat-value" style={{ fontSize: 20 }}>{a.count} orders</div>
                <div className="stat-vs">{fmt(a.total)} total &middot; Code: {a.code}</div>
              </div>
            ))}
          </div>

          <div className="page-scroll">
            <div className="filter-row">
              <div className="filter-bar">
                {ordAffNames.map(name => (
                  <button key={name} className={`filter-tab${ordAffFilter === name ? ' active' : ''}`} onClick={() => { setOrdAffFilter(name); ordPagination.setPage(1) }}>{name}</button>
                ))}
              </div>
              <div className="filter-right">
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '6px 12px' }}>
                  <SearchIcon />
                  <input value={ordSearch} onChange={e => { setOrdSearch(e.target.value); ordPagination.setPage(1) }} placeholder="Search orders..." style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12.5, color: 'var(--text-primary)', width: 170 }} />
                </div>
              </div>
            </div>

            <div className="card">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}><BulkCheckbox checked={ordBulk.allPageSelected} indeterminate={!ordBulk.allPageSelected && ordBulk.somePageSelected} onChange={ordBulk.toggleAll} /></th>
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
                  {ordFiltered.length === 0 && <tr><td colSpan={9}><div className="empty-state">No affiliate orders found</div></td></tr>}
                  {ordPagination.paged.map(o => (
                    <tr key={o.id}>
                      <td><BulkCheckbox checked={ordBulk.selectedIds.has(o.id)} onChange={() => ordBulk.toggleSelect(o.id)} /></td>
                      <td>
                        <button onClick={() => setOrdViewTarget(o)} style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font)' }}>{o.id}</button>
                      </td>
                      <td><span style={{ fontSize: 12.5, color: 'var(--accent)', fontWeight: 500 }}>{o.order_id}</span></td>
                      <td><span className="cell-name">{o.customer_name}</span></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>{o.affiliate_name.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
                          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{o.affiliate_name}</span>
                        </div>
                      </td>
                      <td><span className="badge badge-info">{o.affiliate_code}</span></td>
                      <td style={{ textAlign: 'right', fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{fmt(o.order_total)}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{o.order_date}</td>
                      <td>
                        <RowMenu items={[
                          { label: 'View', action: () => setOrdViewTarget(o) },
                        ]} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={ordPagination.page} totalPages={ordPagination.totalPages} total={ordPagination.total} perPage={ordPagination.perPage} onPageChange={ordPagination.setPage} onPerPageChange={ordPagination.setPerPage} />
          </div>

          {ordViewTarget && (
            <ViewModal title={ordViewTarget.id} subtitle={`${ordViewTarget.order_id} \u00b7 ${ordViewTarget.customer_name}`} status="Active" onClose={() => setOrdViewTarget(null)}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
                <div>
                  <SectionLabel>Order</SectionLabel>
                  <ViewRow label="Order ID" value={ordViewTarget.order_id} accent />
                  <ViewRow label="Customer" value={ordViewTarget.customer_name} />
                  <ViewRow label="Order Total" value={fmt(ordViewTarget.order_total)} accent />
                  <ViewRow label="Date" value={ordViewTarget.order_date} />
                </div>
                <div>
                  <SectionLabel>Affiliate Attribution</SectionLabel>
                  <ViewRow label="Affiliate" value={ordViewTarget.affiliate_name} />
                  <ViewRow label="Code" value={ordViewTarget.affiliate_code} badge="Active" />
                </div>
              </div>
            </ViewModal>
          )}
          <BulkActionBar count={ordBulk.selectedIds.size} total={ordFiltered.length} onDeselectAll={ordBulk.clearSelection} actions={[
            { label: 'Export CSV', icon: <ExportIcon />, action: () => downloadCSV('affiliate-orders-selected', ordBulk.selectedItems, [{ key: 'id', label: 'ID' }, { key: 'order_id', label: 'Order ID' }, { key: 'customer_name', label: 'Customer' }, { key: 'affiliate_name', label: 'Affiliate' }, { key: 'affiliate_code', label: 'Code' }, { key: 'order_total', label: 'Total' }, { key: 'order_date', label: 'Date' }]) },
          ]} />
        </>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* PAYOUTS VIEW                                       */}
      {/* ═══════════════════════════════════════════════════ */}
      {topTab === 'Payouts' && (
        <div className="page-scroll">
          <div className="finance-stats">
            <div className="stat-card">
              <div className="stat-card-header"><div className="stat-card-label"><LinkIcon /> Total Earned</div></div>
              <div className="stat-value" style={{ fontSize: 20 }}>{fmt(Math.round(totalEarned * 100) / 100)}</div>
              <div className="stat-vs">Commission across all affiliates</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-header"><div className="stat-card-label"><LinkIcon /> Total Paid</div></div>
              <div className="stat-value" style={{ fontSize: 20, color: 'var(--positive)' }}>{fmt(Math.round(totalPaid * 100) / 100)}</div>
              <div className="stat-vs">{payoutRequests.filter(p => p.status === 'approved').length} payout{payoutRequests.filter(p => p.status === 'approved').length !== 1 ? 's' : ''} approved</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-header"><div className="stat-card-label"><LinkIcon /> Outstanding</div></div>
              <div className="stat-value" style={{ fontSize: 20, color: outstanding > 0 ? 'var(--warning-text, #b45309)' : 'var(--text-secondary)' }}>{fmt(Math.round(outstanding * 100) / 100)}</div>
              <div className="stat-vs">Pending commission payouts</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-header"><div className="stat-card-label"><LinkIcon /> Pending Requests</div></div>
              <div className="stat-value" style={{ fontSize: 20 }}>{pendingRequests.length}</div>
              <div className="stat-vs">Awaiting review</div>
            </div>
          </div>

          {/* Payout Requests Section */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                Payout Requests
                {pendingRequests.length > 0 && (
                  <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: 'rgba(234,179,8,0.12)', color: '#b45309' }}>{pendingRequests.length} pending</span>
                )}
              </div>
              <div className="filter-bar">
                <button className={`filter-tab${reqHistoryTab === 'pending' ? ' active' : ''}`} onClick={() => setReqHistoryTab('pending')}>Pending</button>
                <button className={`filter-tab${reqHistoryTab === 'all' ? ' active' : ''}`} onClick={() => setReqHistoryTab('all')}>All</button>
              </div>
            </div>

            {reqHistoryTab === 'pending' && (
              <>
                {pendingRequests.length === 0 ? (
                  <div className="card" style={{ padding: 20, textAlign: 'center' }}>
                    <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>No pending requests</span>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                    {pendingRequests.map(req => (
                      <div key={req.id} className="card" style={{ padding: 18 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{req.affiliate_name.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>{req.affiliate_name}</div>
                            <span className="badge badge-info" style={{ fontSize: 10 }}>{req.affiliate_code} &middot; {req.commission_rate}%</span>
                          </div>
                          <span style={{ padding: '3px 10px', borderRadius: 10, fontSize: 10.5, fontWeight: 600, background: 'rgba(234,179,8,0.12)', color: '#b45309', textTransform: 'uppercase' }}>Pending</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12, marginBottom: 14 }}>
                          <div>
                            <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>Orders</div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{req.order_ids.length}</div>
                          </div>
                          <div>
                            <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>Order Total</div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{fmt(req.order_total)}</div>
                          </div>
                          <div>
                            <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>Commission</div>
                            <div style={{ fontWeight: 600, color: 'var(--positive)' }}>{fmt(req.commission_amount)}</div>
                          </div>
                          <div>
                            <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>Requested</div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{req.created_at}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => setApproveTarget(req)} style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: 'none', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', background: 'rgba(34,197,94,0.1)', color: '#16a34a', fontFamily: 'var(--font)', transition: 'background 0.12s' }}>
                            Approve
                          </button>
                          <button onClick={() => { setRejectTarget(req); setRejectNotes('') }} style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: 'none', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontFamily: 'var(--font)', transition: 'background 0.12s' }}>
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {reqHistoryTab === 'all' && (
              <div className="card">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Ref #</th>
                      <th>Affiliate</th>
                      <th>Orders</th>
                      <th style={{ textAlign: 'right' }}>Commission</th>
                      <th>Requested</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payoutRequests.length === 0 && <tr><td colSpan={6}><div className="empty-state">No payout requests</div></td></tr>}
                    {payoutRequests.map(req => (
                      <tr key={req.id}>
                        <td style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{req.id}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>{req.affiliate_name.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
                            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{req.affiliate_name}</span>
                          </div>
                        </td>
                        <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{req.order_ids.length}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, fontSize: 13, color: 'var(--positive)' }}>{fmt(req.commission_amount)}</td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{req.created_at}</td>
                        <td>
                          <span className={`badge ${req.status === 'pending' ? 'badge-pending' : req.status === 'approved' ? 'badge-success' : 'badge-danger'}`}>{req.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {approveTarget && (
            <ConfirmModal
              title="Approve Payout Request"
              message={`Approve payout of ${fmt(approveTarget.commission_amount)} to ${approveTarget.affiliate_name} for ${approveTarget.order_ids.length} order${approveTarget.order_ids.length !== 1 ? 's' : ''} at ${approveTarget.commission_rate}% commission?`}
              confirmLabel="Confirm Paid"
              onConfirm={() => handleApprove(approveTarget)}
              onCancel={() => setApproveTarget(null)}
            />
          )}

          {rejectTarget && (
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', background: 'var(--modal-overlay)' }}
              onClick={() => setRejectTarget(null)}
            >
              <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', borderRadius: 16, padding: '28px 32px', width: '100%', maxWidth: 400, boxShadow: 'var(--shadow-modal)', margin: '0 16px' }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font)', marginBottom: 10 }}>Reject Payout Request</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, fontFamily: 'var(--font)', marginBottom: 16 }}>
                  Reject payout request of {fmt(rejectTarget.commission_amount)} from {rejectTarget.affiliate_name}?
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Admin Notes (optional)</label>
                  <textarea
                    value={rejectNotes}
                    onChange={e => setRejectNotes(e.target.value)}
                    placeholder="Reason for rejection..."
                    rows={3}
                    style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontFamily: 'var(--font)', background: 'var(--bg)', color: 'var(--text-primary)', resize: 'vertical', outline: 'none' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                  <button onClick={() => setRejectTarget(null)} style={{ padding: '8px 18px', borderRadius: 999, background: 'transparent', border: 'none', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', cursor: 'pointer', fontFamily: 'var(--font)' }}>Cancel</button>
                  <button
                    onClick={() => handleReject(rejectTarget)}
                    style={{ padding: '8px 20px', borderRadius: 999, background: 'rgba(239,68,68,0.1)', border: 'none', fontSize: 14, fontWeight: 500, color: '#ef4444', cursor: 'pointer', fontFamily: 'var(--font)' }}
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </MyStoreShell>
  )
}
