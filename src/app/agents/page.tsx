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
import { getAgents, updateAgent, deleteAgent, type DbAgent } from '@/lib/db/agents'
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
const AgentIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
  </svg>
)
const ArrowUpIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
  </svg>
)

const STATUS_BADGE: Record<string, string> = {
  Active:    'badge badge-success',
  Suspended: 'badge badge-warning',
  Inactive:  'badge badge-pending',
}

const TABS = ['All', 'Active', 'Suspended', 'Inactive']

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

function fmtMoney(n: number) {
  return `RM ${(n ?? 0).toLocaleString('en-MY', { minimumFractionDigits: 0 })}`
}

function buildAgentPrint(a: DbAgent): string {
  const [bg, color] = badgeColors(a.status)
  return docHeader('AGENT PROFILE', a.seq_id, a.status, bg, color) +
    section('Personal Details', fields2([
      { label: 'Full Name', value: a.full_name },
      { label: 'Region', value: a.region || '—' },
      { label: 'Email', value: a.email || '—' },
      { label: 'Phone', value: a.phone || '—' },
      { label: 'Start Date', value: a.start_date || '—' },
      { label: 'Status', value: a.status },
    ])) +
    section('Pricing', fields3([
      { label: 'Discount Rate', value: `${a.discount_rate ?? 0}%` },
    ])) +
    (a.notes ? section('Notes', textBlock(a.notes)) : '') +
    docFooter()
}

export default function AgentsPage() {
  const router = useRouter()
  const { shopId } = useShop()
  const qc = useQueryClient()

  const { data: agents = [] } = useQuery({
    queryKey: ['agents', shopId],
    queryFn: () => getAgents(shopId),
    enabled: !!shopId,
  })

  const [tab, setTab]           = useState('All')
  const [search, setSearch]     = useState('')

  const [delTarget, setDelTarget]   = useState<DbAgent | null>(null)
  const [viewTarget, setViewTarget] = useState<DbAgent | null>(null)
  const [shareTarget, setShareTarget] = useState<DbAgent | null>(null)
  const [showRegLink, setShowRegLink] = useState(false)
  const [regLinkCopied, setRegLinkCopied] = useState(false)

  const AGENT_STATUSES: DbAgent['status'][] = ['Active', 'Suspended', 'Inactive']

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateAgent(shopId, id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agents', shopId] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAgent(shopId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agents', shopId] }),
  })

  const handleStatusChange = (a: DbAgent, newStatus: string) => {
    statusMutation.mutate({ id: a.id, status: newStatus })
  }

  const filtered = agents.filter(a => {
    if (tab !== 'All' && a.status !== tab) return false
    if (search && !a.full_name.toLowerCase().includes(search.toLowerCase()) &&
        !a.email.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })
  const { page, perPage, totalPages, paged, setPage, setPerPage, total: totalFiltered } = usePagination(filtered)
  const bulk = useBulkSelect(paged, filtered)

  const active    = agents.filter(a => a.status === 'Active').length
  const suspended = agents.filter(a => a.status === 'Suspended').length
  const avgDiscount = agents.length ? Math.round(agents.reduce((s, a) => s + (a.discount_rate ?? 0), 0) / agents.length) : 0

  const handleDelete = () => {
    if (!delTarget) return
    deleteMutation.mutate(delTarget.id)
    setDelTarget(null)
  }

  return (
    <AppShell>
      <CreateToast param="created" title="Agent created successfully" subtitle="The new agent has been added to your list" basePath="/agents" />
      <CreateToast param="saved" title="Agent updated successfully" subtitle="Changes have been saved" basePath="/agents" />
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">Agents</div>
          <div className="page-subtitle">{agents.length} agents registered</div>
        </div>
        <div className="page-actions">
          <DateRangePicker />
          <button className="topbar-btn" onClick={() => downloadCSV('agents', filtered, [{ key: 'seq_id', label: 'ID' }, { key: 'full_name', label: 'Name' }, { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' }, { key: 'region', label: 'Region' }, { key: 'status', label: 'Status' }, { key: 'discount_rate', label: 'Discount Rate (%)' }])}>
            <ExportIcon />
            <span>Export</span>
          </button>
          <button className="topbar-btn" onClick={() => setShowRegLink(true)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
            <span>Registration Link</span>
          </button>
          <Link href="/agents/new" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <PlusIcon /> New Agent
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="finance-stats">
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-label"><AgentIcon /> Total Agents</div></div>
          <div className="stat-value">{agents.length}</div>
          <div className="stat-vs">Across all regions</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-label"><AgentIcon /> Active</div></div>
          <div className="stat-value">{active}<span className="stat-change-pos"><ArrowUpIcon /> 1</span></div>
          <div className="stat-vs">Currently selling</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-label"><AgentIcon /> Suspended</div></div>
          <div className="stat-value" style={{ color: 'var(--warning)' }}>{suspended}</div>
          <div className="stat-vs">Pending review</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-label"><AgentIcon /> Avg. Discount</div>
          </div>
          <div className="stat-value">{avgDiscount}%</div>
          <div className="stat-vs">Average discount rate</div>
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
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search agents…"
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
                <th>Agent</th>
                <th>Contact</th>
                <th>Region</th>
                <th>Discount</th>
                <th>Start Date</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={9}><div className="empty-state">No agents found</div></td></tr>
              )}
              {paged.map(a => (
                <tr key={a.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/agents/${a.id}`)}>
                  <td onClick={e => e.stopPropagation()}><BulkCheckbox checked={bulk.selectedIds.has(a.id)} onChange={() => bulk.toggleSelect(a.id)} /></td>
                  <td>
                    <div className="td-with-icon">
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: a.status === 'Active' ? 'var(--accent)' : 'var(--border-strong)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                        {initials(a.full_name)}
                      </div>
                      <div>
                        <button className="cell-name" onClick={e => { e.stopPropagation(); setViewTarget(a) }} style={{ color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600, fontSize: 13, fontFamily: 'var(--font)' }}>{a.full_name}</button>
                        <div className="cell-sub">{a.seq_id}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: 12.5 }}>{a.email}</div>
                    <div className="cell-sub">{a.phone}</div>
                  </td>
                  <td style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{a.region}</td>
                  <td>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>
                      {a.discount_rate ?? 0}%
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{a.start_date}</td>
                  <td><StatusSelect value={a.status} onChange={(v) => handleStatusChange(a, v)} options={AGENT_STATUSES} /></td>
                  <td onClick={e => e.stopPropagation()}>
                    <RowMenu items={[
                      { label: 'View',   action: () => setViewTarget(a) },
                      { label: 'Edit',   action: () => router.push(`/agents/${a.id}`) },
                      { label: 'Share',  action: () => setShareTarget(a) },
                      { label: 'Delete', action: () => setDelTarget(a), danger: true },
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
        { label: 'Export CSV', icon: <ExportIcon />, action: () => downloadCSV('agents-selected', bulk.selectedItems, [{ key: 'seq_id', label: 'ID' }, { key: 'full_name', label: 'Name' }, { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' }, { key: 'region', label: 'Region' }, { key: 'status', label: 'Status' }, { key: 'discount_rate', label: 'Discount Rate (%)' }]) },
        { label: 'Delete', action: () => bulk.setBulkDelOpen(true), danger: true },
      ]} />
      {bulk.bulkDelOpen && <ConfirmModal title={`Delete ${bulk.selectedIds.size} agents?`} message="This will permanently remove all selected agents. This cannot be undone." confirmLabel="Delete All" onConfirm={async () => { await Promise.all(bulk.selectedItems.map(a => deleteAgent(shopId, a.id))); bulk.clearSelection(); bulk.setBulkDelOpen(false); qc.invalidateQueries({ queryKey: ['agents', shopId] }) }} onCancel={() => bulk.setBulkDelOpen(false)} />}

      {viewTarget && (
        <ViewModal
          title={viewTarget.full_name}
          subtitle={`${viewTarget.region} · ${viewTarget.seq_id}`}
          status={viewTarget.status}
          onClose={() => setViewTarget(null)}
          onEdit={() => { setViewTarget(null); router.push(`/agents/${viewTarget.id}`) }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
            <div>
              <SectionLabel>Personal Details</SectionLabel>
              <ViewRow label="Full Name" value={viewTarget.full_name} />
              <ViewRow label="Email" value={viewTarget.email || '—'} />
              <ViewRow label="Phone" value={viewTarget.phone || '—'} />
              <ViewRow label="Region" value={viewTarget.region || '—'} />
              <ViewRow label="Start Date" value={viewTarget.start_date || '—'} />
              <ViewRow label="Status" value="" badge={viewTarget.status} />
            </div>
            <div>
              <SectionLabel>Pricing</SectionLabel>
              <ViewRow label="Discount Rate" value={`${viewTarget.discount_rate ?? 0}%`} accent />
            </div>
          </div>
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
          title={`Delete ${delTarget.full_name}?`}
          message="This will permanently remove this agent. This action cannot be undone."
          confirmLabel="Delete Agent"
          onConfirm={handleDelete}
          onCancel={() => setDelTarget(null)}
        />
      )}

      {shareTarget && <ShareModal title={`Agent ${shareTarget.seq_id} — ${shareTarget.full_name}`} shareText={`Agent ${shareTarget.full_name} (${shareTarget.region}) — ${shareTarget.discount_rate ?? 0}% discount`} shareUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/agents/${shareTarget.id}`} onClose={() => setShareTarget(null)} onPrint={() => printDocument(`Agent ${shareTarget.seq_id}`, buildAgentPrint(shareTarget))} />}

      {/* Registration Link Modal */}
      {showRegLink && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', background: 'var(--modal-overlay)' }}
          onClick={() => { setShowRegLink(false); setRegLinkCopied(false) }}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', borderRadius: 16, padding: '28px 32px', width: '100%', maxWidth: 480, boxShadow: 'var(--shadow-modal)', margin: '0 16px' }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font)', marginBottom: 10 }}>
              Agent Registration Link
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 16 }}>
              Share this link with prospective agents. They can register directly as an agent partner.
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                readOnly
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/store/auth/signup/agent`}
                style={{ flex: 1, fontSize: 12.5, padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-primary)', fontFamily: 'var(--font)' }}
                onClick={e => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/store/auth/signup/agent`)
                  setRegLinkCopied(true)
                  setTimeout(() => setRegLinkCopied(false), 2000)
                }}
                style={{ padding: '10px 18px', borderRadius: 10, background: regLinkCopied ? 'rgba(34,197,94,0.1)' : 'rgba(0,106,255,0.1)', border: 'none', fontSize: 13, fontWeight: 500, color: regLinkCopied ? '#22c55e' : 'var(--accent, #006AFF)', cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap', transition: 'background 0.12s' }}
              >
                {regLinkCopied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button
                onClick={() => { setShowRegLink(false); setRegLinkCopied(false) }}
                style={{ padding: '8px 18px', borderRadius: 999, background: 'transparent', border: 'none', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', cursor: 'pointer', fontFamily: 'var(--font)' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
