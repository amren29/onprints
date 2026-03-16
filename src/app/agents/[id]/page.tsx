'use client'

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import ConfirmModal from '@/components/ConfirmModal'
import CustomSelect from '@/components/CustomSelect'
import { getAgentById, updateAgent, deleteAgent, getWalletEntries, getTopupRequests, createTopupRequest, updateTopupRequest, deleteTopupRequest, type DbAgent, type DbWalletEntry, type DbTopupRequest } from '@/lib/db/agents'
import { useShop } from '@/providers/shop-provider'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import SavingOverlay from '@/components/SavingOverlay'
import { getStoreUserByEmail, approveStoreTopup, rejectStoreTopup, demoteStoreUserFromAgent, promoteStoreUserToAgent } from '@/lib/store/auth-store'
import type { User, AgentWalletEntry } from '@/types/store'
import { EditModal } from '@/components/ViewModal'
import RowMenu from '@/components/RowMenu'

/* ── ICONS ─────────────────────────────────────────── */
const BackIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
)
const TrashIcon = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>)
const PlusIcon = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>)

const STATUS_BADGE: Record<string, string> = {
  Active:    'badge badge-success',
  Suspended: 'badge badge-warning',
  Inactive:  'badge badge-pending',
}
const TOPUP_BADGE: Record<string, string> = {
  pending:  'badge badge-warning',
  approved: 'badge badge-success',
  rejected: 'badge badge-danger',
}
const STATUSES: DbAgent['status'][] = ['Active', 'Suspended', 'Inactive']

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

const fmtRM = (n: number) => `RM ${(n ?? 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`

type DraftAgent = {
  full_name: string; email: string; phone: string; region: string; status: string
  discount_rate: number; start_date: string; notes: string
}

function agentToDraft(a: DbAgent): DraftAgent {
  return { full_name: a.full_name, email: a.email, phone: a.phone, region: a.region, status: a.status, discount_rate: a.discount_rate, start_date: a.start_date, notes: a.notes }
}

export default function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { shopId } = useShop()
  const qc = useQueryClient()

  const { data: agent, isLoading } = useQuery({
    queryKey: ['agent', shopId, id],
    queryFn: () => getAgentById(shopId, id),
    enabled: !!shopId,
  })

  const { data: walletEntries = [] } = useQuery({
    queryKey: ['wallet-entries', shopId, id],
    queryFn: () => getWalletEntries(shopId, id),
    enabled: !!shopId,
  })

  const { data: allTopups = [] } = useQuery({
    queryKey: ['topup-requests', shopId],
    queryFn: () => getTopupRequests(shopId),
    enabled: !!shopId,
  })

  const [draft, setDraft] = useState<DraftAgent | null>(null)
  const [orig, setOrig]   = useState<DraftAgent | null>(null)
  const [showDel, setShowDel] = useState(false)
  const [saving, setSaving] = useState(false)

  if (agent && !draft) {
    const d = agentToDraft(agent)
    setDraft(d)
    setOrig(d)
  }

  /* ── Store wallet (auth-store bridge) ── */
  const [storeUser, setStoreUser] = useState<User | null>(null)
  const [storeApproveTarget, setStoreApproveTarget] = useState<AgentWalletEntry | null>(null)
  const [storeRejectTarget, setStoreRejectTarget] = useState<AgentWalletEntry | null>(null)
  const [storeLoaded, setStoreLoaded] = useState(false)

  if (agent && !storeLoaded) {
    setStoreUser(getStoreUserByEmail(agent.email))
    setStoreLoaded(true)
  }

  /* ── Topup state ── */
  const topups = allTopups.filter(r => agent && r.agent_email === agent.email)

  const [topupApproveTarget, setTopupApproveTarget] = useState<DbTopupRequest | null>(null)
  const [topupRejectTarget, setTopupRejectTarget] = useState<DbTopupRequest | null>(null)
  const [topupDeleteTarget, setTopupDeleteTarget] = useState<DbTopupRequest | null>(null)
  const [topupIsCreating, setTopupIsCreating] = useState(false)
  const [topupEditTarget, setTopupEditTarget] = useState<DbTopupRequest | null>(null)
  const [topupForm, setTopupForm] = useState({ amount: 0, paymentMethod: 'online' as 'online' | 'bank-transfer', receiptFileName: '' })
  const [topupSaving, setTopupSaving] = useState(false)

  const updateMutation = useMutation({
    mutationFn: (updates: Parameters<typeof updateAgent>[2]) => updateAgent(shopId, id, updates),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agents', shopId] }); router.push('/agents?saved=1') },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteAgent(shopId, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agents', shopId] }); router.push('/agents') },
  })

  const topupUpdateMutation = useMutation({
    mutationFn: ({ tId, updates }: { tId: string; updates: Parameters<typeof updateTopupRequest>[2] }) => updateTopupRequest(shopId, tId, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['topup-requests', shopId] }),
  })

  const topupDeleteMutation = useMutation({
    mutationFn: (tId: string) => deleteTopupRequest(shopId, tId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['topup-requests', shopId] }),
  })

  const topupCreateMutation = useMutation({
    mutationFn: (input: Parameters<typeof createTopupRequest>[1]) => createTopupRequest(shopId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['topup-requests', shopId] }),
  })

  if (isLoading) {
    return <AppShell><Link href="/agents" className="back-btn"><BackIcon /> Agents</Link><div className="empty-state" style={{ paddingTop: 80 }}>Loading...</div></AppShell>
  }

  if (!agent) {
    return (
      <AppShell>
        <Link href="/agents" className="back-btn"><BackIcon /> Agents</Link>
        <div className="empty-state" style={{ paddingTop: 80 }}>Agent not found</div>
      </AppShell>
    )
  }

  const field = <K extends keyof DraftAgent>(key: K, value: DraftAgent[K]) => {
    setDraft(prev => prev ? { ...prev, [key]: value } : prev)
  }

  const handleSave = () => {
    if (!draft || !dirty || saving) return
    setSaving(true)

    // Sync status to auth-store: suspend/inactive -> demote, active -> re-promote
    if (draft.status !== agent.status) {
      if (draft.status === 'Suspended' || draft.status === 'Inactive') {
        demoteStoreUserFromAgent(agent.email)
      } else if (draft.status === 'Active' && (agent.status === 'Suspended' || agent.status === 'Inactive')) {
        promoteStoreUserToAgent(agent.email, storeDiscountRate || 0)
      }
    }

    updateMutation.mutate({
      full_name: draft.full_name, email: draft.email, phone: draft.phone, region: draft.region,
      status: draft.status, discount_rate: draft.discount_rate, start_date: draft.start_date, notes: draft.notes,
    })
  }

  const handleDelete = () => {
    demoteStoreUserFromAgent(agent.email)
    deleteMutation.mutate()
  }

  const nowStr = () => new Date().toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })

  const handleTopupApprove = () => {
    if (!topupApproveTarget) return
    topupUpdateMutation.mutate({ tId: topupApproveTarget.id, updates: { status: 'approved', reviewed_at: nowStr() } })
    setTopupApproveTarget(null)
  }
  const handleTopupReject = () => {
    if (!topupRejectTarget) return
    topupUpdateMutation.mutate({ tId: topupRejectTarget.id, updates: { status: 'rejected', reviewed_at: nowStr() } })
    setTopupRejectTarget(null)
  }
  const handleTopupDelete = () => {
    if (!topupDeleteTarget) return
    topupDeleteMutation.mutate(topupDeleteTarget.id)
    setTopupDeleteTarget(null)
  }
  const openTopupCreate = () => {
    setTopupForm({ amount: 0, paymentMethod: 'online', receiptFileName: '' })
    setTopupEditTarget(null)
    setTopupIsCreating(true)
  }
  const openTopupEdit = (r: DbTopupRequest) => {
    setTopupForm({ amount: r.amount, paymentMethod: r.payment_method as 'online' | 'bank-transfer', receiptFileName: r.receipt_file ?? '' })
    setTopupEditTarget(r)
    setTopupIsCreating(true)
  }
  const handleTopupSave = () => {
    setTopupSaving(true)
    if (topupEditTarget) {
      topupUpdateMutation.mutate({ tId: topupEditTarget.id, updates: { status: 'pending', reviewed_at: '' } })
    } else {
      topupCreateMutation.mutate({ agent_name: agent.full_name, agent_email: agent.email, amount: topupForm.amount, payment_method: topupForm.paymentMethod, receipt_file: topupForm.receiptFileName || undefined, submitted_at: nowStr() })
    }
    setTimeout(() => { setTopupSaving(false); setTopupIsCreating(false); setTopupEditTarget(null) }, 400)
  }

  /* ── Store wallet approve/reject ── */
  const handleStoreApprove = () => {
    if (!storeApproveTarget) return
    approveStoreTopup(agent.email, storeApproveTarget.id)
    setStoreUser(getStoreUserByEmail(agent.email))
    setStoreApproveTarget(null)
  }
  const handleStoreReject = () => {
    if (!storeRejectTarget) return
    rejectStoreTopup(agent.email, storeRejectTarget.id)
    setStoreUser(getStoreUserByEmail(agent.email))
    setStoreRejectTarget(null)
  }

  const storeWalletEntries = storeUser?.walletEntries ?? []
  const storeWalletBalance = storeUser?.walletBalance ?? 0
  const storeDiscountRate = storeUser?.discountRate ?? 0
  const storePendingEntries = storeWalletEntries.filter(e => e.status === 'pending')

  const topupPendingAmt = topups.filter(r => r.status === 'pending').reduce((s, r) => s + r.amount, 0)
  const topupApprovedAmt = topups.filter(r => r.status === 'approved').reduce((s, r) => s + r.amount, 0)

  const walletCredits = walletEntries.filter(e => e.type === 'credit').reduce((s, e) => s + e.amount, 0)
  const walletDebits = walletEntries.filter(e => e.type === 'debit').reduce((s, e) => s + e.amount, 0)
  const walletBalance = walletEntries.length > 0 ? walletEntries[0].balance : 0

  const d = draft ?? agentToDraft(agent)
  const dirty = draft !== null && orig !== null && JSON.stringify(draft) !== JSON.stringify(orig)


  return (
    <AppShell>
      {saving && <SavingOverlay message="Saving changes…" />}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <Link href="/agents" className="back-btn"><BackIcon /> Agents</Link>
        <div className="page-actions">
          <button className="btn-secondary" onClick={() => setShowDel(true)} style={{ color: 'var(--negative)' }}>Delete</button>
          <Link href="/agents" className="btn-secondary" style={{ textDecoration: 'none' }}>Cancel</Link>
          <button className="btn-primary" onClick={handleSave} disabled={saving || !dirty} style={{ opacity: (saving || !dirty) ? 0.5 : 1 }}>Save Changes</button>
        </div>
      </div>

      <div className="page-scroll">
        {/* Profile header */}
        <div className="profile-card" style={{ marginBottom: 16 }}>
          <div className="profile-left">
            <div className="profile-avatar">{initials(d.full_name)}</div>
            <div>
              <div className="profile-name">{d.full_name}</div>
              <div className="profile-meta">
                <span>{agent.seq_id}</span>
                <span>·</span>
                <span>{d.region}</span>
                <span>·</span>
                <span>Since {d.start_date}</span>
              </div>
            </div>
          </div>
          <div className="profile-actions">
            {draft && <CustomSelect value={draft.status} onChange={v => field('status', v as DbAgent['status'])} options={STATUSES} style={{ width: 130 }} />}
          </div>
        </div>

        {/* Summary stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
          <div className="stat-card">
            <div className="stat-card-header"><div className="stat-card-label">Wallet Balance</div></div>
            <div className="stat-value" style={{ fontSize: 20, color: 'var(--accent)' }}>{fmtRM(walletBalance)}</div>
            <div className="stat-vs">{fmtRM(walletCredits)} in · {fmtRM(walletDebits)} out</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-header"><div className="stat-card-label">Topup Pending</div></div>
            <div className="stat-value" style={{ fontSize: 20, color: 'var(--warning)' }}>{fmtRM(topupPendingAmt)}</div>
            <div className="stat-vs">{topups.filter(r => r.status === 'pending').length} pending</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-header"><div className="stat-card-label">Topup Approved</div></div>
            <div className="stat-value" style={{ fontSize: 20, color: 'var(--positive)' }}>{fmtRM(topupApprovedAmt)}</div>
            <div className="stat-vs">{topups.filter(r => r.status === 'approved').length} approved</div>
          </div>
        </div>

        {/* Store Wallet (auth-store bridge) */}
        {storeUser && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
            <div className="stat-card">
              <div className="stat-card-header"><div className="stat-card-label">Store Wallet</div></div>
              <div className="stat-value" style={{ fontSize: 20, color: 'var(--accent)' }}>{fmtRM(storeWalletBalance)}</div>
              <div className="stat-vs">Linked store account</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-header"><div className="stat-card-label">Discount Rate</div></div>
              <div className="stat-value" style={{ fontSize: 20, color: 'var(--text-primary)' }}>{Math.round(storeDiscountRate * 100)}%</div>
              <div className="stat-vs">Agent pricing discount</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-header"><div className="stat-card-label">Pending Topups</div></div>
              <div className="stat-value" style={{ fontSize: 20, color: storePendingEntries.length > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                {storePendingEntries.length}
              </div>
              <div className="stat-vs">{fmtRM(storePendingEntries.reduce((s, e) => s + e.amount, 0))} awaiting</div>
            </div>
          </div>
        )}

        {/* Contact + Pricing */}
        {draft && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14 }}>Contact</div>
              <div className="form-group"><label className="form-label">Full Name</label><input className="form-input" value={draft.full_name} onChange={e => field('full_name', e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={draft.email} onChange={e => field('email', e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={draft.phone} onChange={e => field('phone', e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Region</label><input className="form-input" value={draft.region} onChange={e => field('region', e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Start Date</label><input className="form-input" value={draft.start_date} onChange={e => field('start_date', e.target.value)} /></div>
            </div>

            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14 }}>Pricing</div>
              <div className="form-group">
                <label className="form-label">Discount Rate (%)</label>
                <input className="form-input" type="number" min={0} max={100} step={1} value={draft.discount_rate} onChange={e => field('discount_rate', Number(e.target.value))} />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Agent gets this % off retail pricing</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '18px 0 10px' }}>Notes</div>
              <textarea className="form-input" rows={3} value={draft.notes} onChange={e => field('notes', e.target.value)} placeholder="Add notes…" style={{ resize: 'vertical' }} />
            </div>
          </div>
        )}

        {/* Wallet History */}
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-header">
            <div className="card-title">Wallet History</div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Date</th>
                <th>Category</th>
                <th>Description</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th style={{ textAlign: 'right' }}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {walletEntries.length === 0 && (
                <tr><td colSpan={6}><div className="empty-state">No wallet transactions</div></td></tr>
              )}
              {walletEntries.map(e => (
                <tr key={e.id}>
                  <td style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{e.id}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{e.date}</td>
                  <td><span className={`badge ${e.type === 'credit' ? 'badge-success' : 'badge-danger'}`}>{e.category}</span></td>
                  <td style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{e.description}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, fontSize: 13, color: e.type === 'credit' ? 'var(--positive)' : '#ef4444' }}>
                    {e.type === 'credit' ? '+' : '-'}{fmtRM(e.amount)}
                  </td>
                  <td style={{ textAlign: 'right', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{fmtRM(e.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Wallet Topups */}
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="card-title">Wallet Topups</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                {topups.length} request{topups.length !== 1 ? 's' : ''} · Pending: {fmtRM(topupPendingAmt)} · Approved: {fmtRM(topupApprovedAmt)}
              </div>
            </div>
            <button className="btn-primary" style={{ fontSize: 12, padding: '5px 12px' }} onClick={openTopupCreate}><PlusIcon /> New Topup</button>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Ref #</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th>Method</th>
                <th>Receipt</th>
                <th>Submitted</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {topups.length === 0 && (
                <tr><td colSpan={7}><div className="empty-state">No topup requests</div></td></tr>
              )}
              {topups.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{r.id}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, fontSize: 13, color: 'var(--positive)' }}>+{fmtRM(r.amount)}</td>
                  <td style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{r.payment_method === 'bank-transfer' ? 'Bank Transfer' : 'Online'}</td>
                  <td>{r.receipt_file ? <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}>{r.receipt_file}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.submitted_at}</td>
                  <td><span className={TOPUP_BADGE[r.status]}>{r.status}</span></td>
                  <td>
                    <RowMenu items={[
                      { label: 'Edit', action: () => openTopupEdit(r) },
                      ...(r.status === 'pending' ? [
                        { label: 'Approve', action: () => setTopupApproveTarget(r) },
                        { label: 'Reject', action: () => setTopupRejectTarget(r), danger: true },
                      ] : []),
                      { label: 'Delete', action: () => setTopupDeleteTarget(r), danger: true },
                    ]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Store Wallet History (from auth-store) */}
        {storeUser && (
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-header">
              <div className="card-title">Store Wallet History</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                From store account ({storeUser.email}) · Balance: {fmtRM(storeWalletBalance)}
              </div>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th style={{ textAlign: 'right' }}>Balance</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {storeWalletEntries.length === 0 && (
                  <tr><td colSpan={8}><div className="empty-state">No store wallet transactions</div></td></tr>
                )}
                {storeWalletEntries.map(e => (
                  <tr key={e.id}>
                    <td style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{e.id}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{e.date}</td>
                    <td><span className={`badge ${e.type === 'credit' ? 'badge-success' : 'badge-danger'}`}>{e.category}</span></td>
                    <td style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{e.description}</td>
                    <td><span className={`badge ${e.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>{e.status}</span></td>
                    <td style={{ textAlign: 'right', fontWeight: 600, fontSize: 13, color: e.type === 'credit' ? 'var(--positive)' : '#ef4444' }}>
                      {e.type === 'credit' ? '+' : '-'}{fmtRM(e.amount)}
                    </td>
                    <td style={{ textAlign: 'right', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{fmtRM(e.balance)}</td>
                    <td>
                      {e.status === 'pending' && (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn-primary" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => setStoreApproveTarget(e)}>Approve</button>
                          <button className="btn-secondary" style={{ fontSize: 11, padding: '3px 8px', color: 'var(--negative)' }} onClick={() => setStoreRejectTarget(e)}>Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showDel && (
        <ConfirmModal
          title={`Delete ${agent.full_name}?`}
          message="This will permanently remove this agent. This action cannot be undone."
          confirmLabel="Delete Agent"
          onConfirm={handleDelete}
          onCancel={() => setShowDel(false)}
        />
      )}

      {/* Topup Create/Edit modal */}
      {topupIsCreating && (
        <EditModal title={topupEditTarget ? `Edit ${topupEditTarget.id}` : 'New Topup Request'} onClose={() => { setTopupIsCreating(false); setTopupEditTarget(null) }} onSave={handleTopupSave} saving={topupSaving}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <label className="form-group form-label">
              Amount (RM)
              <input className="form-input" type="number" min={0} value={topupForm.amount} onChange={e => setTopupForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} />
            </label>
            <div className="form-group form-label">
              Payment Method
              <CustomSelect value={topupForm.paymentMethod} onChange={v => setTopupForm(f => ({ ...f, paymentMethod: v as 'online' | 'bank-transfer' }))} options={[{ value: 'online', label: 'Online Payment' }, { value: 'bank-transfer', label: 'Bank Transfer' }]} />
            </div>
            <label className="form-group form-label">
              Receipt Filename (optional)
              <input className="form-input" value={topupForm.receiptFileName} onChange={e => setTopupForm(f => ({ ...f, receiptFileName: e.target.value }))} placeholder="e.g. receipt.jpg" />
            </label>
          </div>
        </EditModal>
      )}

      {/* Topup approve confirm */}
      {topupApproveTarget && (
        <ConfirmModal
          title="Approve Wallet Top-up"
          message={`Approve ${agent.full_name}'s wallet top-up of ${fmtRM(topupApproveTarget.amount)}? This will credit their wallet balance.`}
          confirmLabel="Approve"
          danger={false}
          onConfirm={handleTopupApprove}
          onCancel={() => setTopupApproveTarget(null)}
        />
      )}

      {/* Topup reject confirm */}
      {topupRejectTarget && (
        <ConfirmModal
          title="Reject Top-up Request"
          message={`Reject ${agent.full_name}'s top-up of ${fmtRM(topupRejectTarget.amount)}? This cannot be undone.`}
          confirmLabel="Reject"
          danger
          onConfirm={handleTopupReject}
          onCancel={() => setTopupRejectTarget(null)}
        />
      )}

      {/* Topup delete confirm */}
      {topupDeleteTarget && (
        <ConfirmModal
          title="Delete Topup Request"
          message={`Permanently delete topup request ${topupDeleteTarget.id} (${fmtRM(topupDeleteTarget.amount)})? This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={handleTopupDelete}
          onCancel={() => setTopupDeleteTarget(null)}
        />
      )}

      {/* Store wallet approve confirm */}
      {storeApproveTarget && (
        <ConfirmModal
          title="Approve Store Wallet Top-up"
          message={`Approve store wallet top-up of ${fmtRM(storeApproveTarget.amount)} for ${agent.full_name}? This will credit their store wallet balance.`}
          confirmLabel="Approve"
          danger={false}
          onConfirm={handleStoreApprove}
          onCancel={() => setStoreApproveTarget(null)}
        />
      )}

      {/* Store wallet reject confirm */}
      {storeRejectTarget && (
        <ConfirmModal
          title="Reject Store Wallet Top-up"
          message={`Reject store wallet top-up of ${fmtRM(storeRejectTarget.amount)} for ${agent.full_name}? This will remove the entry.`}
          confirmLabel="Reject"
          danger
          onConfirm={handleStoreReject}
          onCancel={() => setStoreRejectTarget(null)}
        />
      )}

    </AppShell>
  )
}
