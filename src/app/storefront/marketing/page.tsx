'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import MyStoreShell from '@/components/MyStoreShell'
import CreateToast from '@/components/CreateToast'
import ConfirmModal from '@/components/ConfirmModal'
import RowMenu from '@/components/RowMenu'
import { getCampaigns, deleteCampaign, type DbCampaign } from '@/lib/db/campaigns'
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

/* ── Helpers ───────────────────────────────────────── */
const TABS = ['All', 'Active', 'Draft', 'Paused', 'Completed']

function statusBadge(s: string) {
  if (s === 'Active')    return 'badge badge-success'
  if (s === 'Completed') return 'badge badge-info'
  if (s === 'Paused')    return 'badge badge-danger'
  return 'badge badge-pending'
}
function typeBadge(t: string) {
  if (t === 'Email')    return 'badge badge-info'
  if (t === 'Push')     return 'badge badge-neutral'
  if (t === 'Social')   return 'badge badge-warning'
  if (t === 'Referral') return 'badge badge-success'
  return 'badge badge-pending'
}
function fmtReach(r: number) {
  return r === 0 ? '—' : r.toLocaleString()
}

/* ════════════════════════════════════════════════════ */
export default function MarketingPage() {
  const router = useRouter()
  const { shopId } = useShop()
  const qc = useQueryClient()

  const { data: rows = [] } = useQuery({
    queryKey: ['campaigns', shopId],
    queryFn: () => getCampaigns(shopId),
    enabled: !!shopId,
  })

  const [search, setSearch]     = useState('')
  const [tab, setTab]           = useState('All')
  const [delId, setDelId]       = useState<string | null>(null)

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteCampaign(shopId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns', shopId] }),
  })

  /* ── Filtering ── */
  const visible = rows.filter(c => {
    if (tab !== 'All' && c.status !== tab) return false
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.audience.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  /* ── Stats ── */
  const totalReach = rows.reduce((s, c) => s + c.reach, 0)

  const handleDelete = () => {
    if (delId) { deleteMut.mutate(delId); setDelId(null) }
  }

  return (
    <MyStoreShell>
      <CreateToast param="created" title="Campaign created successfully" subtitle="The new campaign has been added" basePath="/storefront/marketing" />
      <CreateToast param="saved" title="Campaign updated successfully" subtitle="Changes have been saved" basePath="/storefront/marketing" />

      <div className="page-header">
        <div>
          <div className="page-title">Marketing Campaigns</div>
          <div className="page-subtitle">Manage campaigns and promotions for the online store</div>
        </div>
        <div className="page-actions">
          <Link href="/storefront/marketing/new" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
            <PlusIcon /> New Campaign
          </Link>
        </div>
      </div>

      <div className="page-scroll">
        <div className="finance-stats">
          <div className="stat-card">
            <div className="stat-card-header"><div className="stat-card-label">Total Campaigns</div></div>
            <div className="stat-value">{rows.length}</div>
            <div className="stat-vs">{rows.filter(c => c.status === 'Active').length} active</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-header"><div className="stat-card-label">Active</div></div>
            <div className="stat-value" style={{ color: '#16a34a' }}>{rows.filter(c => c.status === 'Active').length}</div>
            <div className="stat-vs">Running now</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-header"><div className="stat-card-label">Draft</div></div>
            <div className="stat-value" style={{ color: '#d97706' }}>{rows.filter(c => c.status === 'Draft').length}</div>
            <div className="stat-vs">In preparation</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-header"><div className="stat-card-label">Total Reach</div></div>
            <div className="stat-value" style={{ color: 'var(--purple-text)' }}>{totalReach > 0 ? totalReach.toLocaleString() : '0'}</div>
            <div className="stat-vs">Total recipients</div>
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
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search campaigns…"
                style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12.5, color: 'var(--text-primary)', width: 180 }} />
            </div>
          </div>
        </div>

        <div className="card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Type</th>
                <th>Status</th>
                <th>Start Date</th>
                <th>Reach</th>
                <th>Discount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr><td colSpan={7}><div className="empty-state">No campaigns found</div></td></tr>
              )}
              {visible.map(c => (
                <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/storefront/marketing/${c.id}`)}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</div>
                    {c.audience && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.audience}</div>}
                  </td>
                  <td><span className={typeBadge(c.type)}>{c.type}</span></td>
                  <td><span className={statusBadge(c.status)}>{c.status}</span></td>
                  <td style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{c.date}</td>
                  <td style={{ fontSize: 12.5, fontWeight: c.reach > 0 ? 600 : 400, color: c.reach > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {fmtReach(c.reach)}
                  </td>
                  <td>
                    {c.discount
                      ? <code style={{ fontSize: 11.5, color: 'var(--accent)', background: 'var(--accent)10', padding: '2px 7px', borderRadius: 4, fontWeight: 700 }}>{c.discount}</code>
                      : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                    }
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <RowMenu items={[
                      { label: 'Edit',   action: () => router.push(`/storefront/marketing/${c.id}`) },
                      { label: 'Delete', action: () => setDelId(c.id), danger: true },
                    ]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {delId && (
        <ConfirmModal
          title="Delete Campaign"
          message={`Permanently delete "${rows.find(c => c.id === delId)?.name ?? 'this campaign'}"? This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDelId(null)}
        />
      )}
    </MyStoreShell>
  )
}
