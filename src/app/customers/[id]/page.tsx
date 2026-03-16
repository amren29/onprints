'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import ConfirmModal from '@/components/ConfirmModal'
import CustomSelect from '@/components/CustomSelect'
import { getCustomerById, updateCustomer, deleteCustomer, type DbCustomer } from '@/lib/db/customers'
import { useShop } from '@/providers/shop-provider'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAgents as dbGetAgents, createAgent as dbCreateAgent } from '@/lib/db/agents'
import { getStoreUserByEmail, promoteStoreUserToAgent } from '@/lib/store/auth-store'
import SavingOverlay from '@/components/SavingOverlay'

/* ── ICONS ─────────────────────────────────────────── */
const BackIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
)
const TrashIcon = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>)
const MapPinIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
)

const STATUS_BADGE: Record<string, string> = {
  VIP:      'badge badge-success',
  Active:   'badge badge-info',
  'At Risk':'badge badge-warning',
  Inactive: 'badge badge-pending',
}

const CUSTOMER_TYPES = ['Corporate', 'Individual', 'Government', 'Non-Profit']
const STATUSES: DbCustomer['status'][] = ['Active', 'VIP', 'At Risk', 'Inactive']
const PAYMENT_TERMS = ['COD', 'Net 7', 'Net 14', 'Net 30', 'Net 60']

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

function fmtMoney(n: number) {
  return `RM ${(n ?? 0).toLocaleString('en-MY', { minimumFractionDigits: 0 })}`
}

/* Draft type mirrors DbCustomer fields we allow editing */
type Draft = {
  name: string
  company: string
  email: string
  phone: string
  billing_address: string
  sst_no: string
  customer_type: string
  status: string
  location: string
  payment_terms: string
  credit_limit: number
  notes: string
}

function customerToDraft(c: DbCustomer): Draft {
  return {
    name: c.name,
    company: c.company,
    email: c.email,
    phone: c.phone,
    billing_address: c.billing_address,
    sst_no: c.sst_no,
    customer_type: c.customer_type,
    status: c.status,
    location: c.location,
    payment_terms: c.payment_terms,
    credit_limit: c.credit_limit,
    notes: c.notes,
  }
}

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { shopId } = useShop()
  const qc = useQueryClient()

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customers', shopId, id],
    queryFn: () => getCustomerById(shopId, id),
    enabled: !!shopId && !!id,
  })

  const [draft, setDraft] = useState<Draft | null>(null)
  const [showDel, setShowDel] = useState(false)
  const [saving, setSaving] = useState(false)

  /* ── Promote to Agent state ── */
  const [matchingAgentId, setMatchingAgentId] = useState<string | null>(null)
  const [showPromote, setShowPromote] = useState(false)
  const [promoteDiscount, setPromoteDiscount] = useState(10)
  const [promoteRegion, setPromoteRegion] = useState('')
  const [promoteToast, setPromoteToast] = useState(false)

  // Initialize draft when customer data arrives from query
  useEffect(() => {
    if (customer) {
      setDraft(customerToDraft(customer))

      // Check if customer already has matching agent in DB
      if (shopId) {
        dbGetAgents(shopId).then(agents => {
          const match = agents.find(a => a.email.trim().toLowerCase() === customer.email.trim().toLowerCase())
          setMatchingAgentId(match?.id ?? null)
        }).catch(() => {})
      }
    }
  }, [customer])

  const updateMutation = useMutation({
    mutationFn: (updates: Partial<Draft>) => updateCustomer(shopId, id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers', shopId] })
      router.push('/customers?saved=1')
    },
    onError: (err) => {
      console.error('Failed to update customer:', err)
      setSaving(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteCustomer(shopId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers', shopId] })
      router.push('/customers')
    },
    onError: (err: any) => {
      console.error('[deleteCustomer]', err)
      alert('Failed to delete: ' + (err?.message || 'Unknown error'))
    },
  })

  if (isLoading) {
    return (
      <AppShell>
        <Link href="/customers" className="back-btn"><BackIcon /> Customers</Link>
        <div className="empty-state" style={{ paddingTop: 80 }}>Loading...</div>
      </AppShell>
    )
  }

  if (!customer) {
    return (
      <AppShell>
        <Link href="/customers" className="back-btn"><BackIcon /> Customers</Link>
        <div className="empty-state" style={{ paddingTop: 80 }}>Customer not found</div>
      </AppShell>
    )
  }

  const field = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft(prev => prev ? { ...prev, [key]: value } : prev)
  }

  const d = draft ?? customerToDraft(customer)
  const dirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(customerToDraft(customer))

  const handleSave = async () => {
    if (!draft || !dirty || saving) return
    setSaving(true)
    updateMutation.mutate(draft)
  }

  const handleDelete = () => {
    deleteMutation.mutate()
  }

  const handlePromote = async () => {
    const nowStr = new Date().toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
    try {
      const agent = await dbCreateAgent(shopId, {
        full_name: d.name,
        email: d.email,
        phone: d.phone,
        region: promoteRegion,
        status: 'Active',
        discount_rate: promoteDiscount,
        payment_method: '',
        bank_name: '',
        bank_account_name: '',
        bank_account_number: '',
        start_date: nowStr,
        notes: `Promoted from customer on ${nowStr}`,
      })

      // Update auth-store if customer has a store account
      const storeUser = getStoreUserByEmail(d.email)
      if (storeUser) {
        promoteStoreUserToAgent(d.email, promoteDiscount / 100)
      }

      // Update customer notes
      const noteAddition = `\nPromoted to Agent on ${nowStr}`
      const updatedNotes = (d.notes || '') + noteAddition
      setDraft(prev => prev ? { ...prev, notes: updatedNotes } : prev)
      updateCustomer(shopId, customer.id, { notes: updatedNotes })

      setMatchingAgentId(agent.id)
      setShowPromote(false)
      setPromoteToast(true)
      setTimeout(() => setPromoteToast(false), 3000)
    } catch (err) {
      console.error('Failed to promote customer to agent:', err)
    }
  }

  const storeUserForDelete = getStoreUserByEmail(d.email)
  const isAgent = !!matchingAgentId
  const hasActiveMembership = !!(storeUserForDelete?.membership && (storeUserForDelete.membership.status ?? 'active') === 'active' && new Date(storeUserForDelete.membership.expiryDate) > new Date())
  const canDelete = !isAgent && !hasActiveMembership

  const joinDateDisplay = customer.created_at
    ? new Date(customer.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—'

  return (
    <AppShell>
      {saving && <SavingOverlay message="Saving changes…" />}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <Link href="/customers" className="back-btn"><BackIcon /> Customers</Link>
        <div className="page-actions">
          <button className="btn-secondary" onClick={() => setShowDel(true)} disabled={!canDelete} title={!canDelete ? (isAgent ? 'Remove agent record first' : 'Cancel membership first') : undefined} style={{ color: 'var(--negative)', opacity: canDelete ? 1 : 0.4, cursor: canDelete ? 'pointer' : 'not-allowed' }}>Delete</button>
          <Link href="/customers" className="btn-secondary" style={{ textDecoration: 'none' }}>Cancel</Link>
          <button className="btn-primary" onClick={handleSave} disabled={saving || !dirty} style={{ opacity: (saving || !dirty) ? 0.5 : 1 }}>Save Changes</button>
        </div>
      </div>

      <div className="page-scroll">
      {/* Profile header */}
      <div className="profile-card">
        <div className="profile-left">
          <div className="profile-avatar">{initials(d.name)}</div>
          <div>
            <div className="profile-name">{d.name}</div>
            <div className="profile-meta">
              <span>{d.company || '—'}</span>
              {d.location && <>
                <span>·</span>
                <MapPinIcon />
                <span>{d.location}</span>
              </>}
              <span>·</span>
              <span>Since {joinDateDisplay}</span>
            </div>
          </div>
        </div>
        <div className="profile-actions">
          {draft && <CustomSelect value={draft.status} onChange={v => field('status', v)} options={STATUSES} />}
        </div>
      </div>

      <div className="detail-grid">
        {/* Left — main */}
        <div className="detail-main">
          <div className="card">
            <div className="card-header"><div className="card-title">Account Details</div></div>
            {draft && (
              <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group"><label className="form-label">Name</label><input className="form-input" value={draft.name} onChange={e => field('name', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Company</label><input className="form-input" value={draft.company} onChange={e => field('company', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={draft.email} onChange={e => field('email', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={draft.phone} onChange={e => field('phone', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Location</label><input className="form-input" value={draft.location || ''} onChange={e => field('location', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">SST No.</label><input className="form-input" value={draft.sst_no} onChange={e => field('sst_no', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Customer Type</label><CustomSelect value={draft.customer_type} onChange={v => field('customer_type', v)} options={CUSTOMER_TYPES} /></div>
                <div className="form-group"><label className="form-label">Payment Terms</label><CustomSelect value={draft.payment_terms || ''} onChange={v => field('payment_terms', v)} options={[{value:'', label:'— Select —'}, ...PAYMENT_TERMS.map(t => ({value:t, label:t}))]} /></div>
                <div className="form-group"><label className="form-label">Credit Limit (RM)</label><input className="form-input" type="number" min={0} step={100} value={draft.credit_limit || 0} onChange={e => field('credit_limit', Number(e.target.value))} /></div>
                <div></div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Billing Address</label><textarea className="form-input" rows={2} value={draft.billing_address} onChange={e => field('billing_address', e.target.value)} style={{ resize: 'vertical' }} /></div>
              </div>
            )}
          </div>
        </div>

        {/* Right — sidebar */}
        <div className="detail-side">
          <div className="card">
            <div className="card-header"><div className="card-title">Summary</div></div>
            <div style={{ padding: '4px 0' }}>
              {[
                { label: 'Total Orders',  value: '0' },
                { label: 'Total Spent',   value: fmtMoney(0) },
                { label: 'Customer Type', value: d.customer_type || '—' },
              ].map(item => (
                <div key={item.label} className="commission-bar">
                  <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{item.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title">Notes</div></div>
            <div style={{ padding: '14px 20px' }}>
              {draft && <textarea className="form-input" rows={4} value={draft.notes} onChange={e => field('notes', e.target.value)} placeholder="Add notes…" style={{ resize: 'vertical' }} />}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title">Quick Links</div></div>
            <div style={{ padding: '4px 0' }}>
              {[
                { label: 'View Orders',     href: '/orders' },
                { label: 'View Payments',   href: '/payments' },
              ].map(link => (
                <Link key={link.href} href={link.href}>
                  <div className="commission-bar" style={{ cursor: 'pointer' }}>
                    <span style={{ fontSize: 12.5, color: 'var(--accent)', fontWeight: 500 }}>{link.label}</span>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Store Account */}
          {(() => {
            const su = getStoreUserByEmail(d.email)
            return (
              <div className="card">
                <div className="card-header"><div className="card-title">Store Account</div></div>
                <div style={{ padding: '14px 20px' }}>
                  {su ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="badge badge-success">Registered</span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Has store login</span>
                      </div>
                      <div style={{ display: 'grid', gap: 6 }}>
                        {[
                          { label: 'Role', value: su.role === 'agent' ? 'Agent' : 'Customer' },
                          { label: 'Joined', value: su.createdAt ? new Date(su.createdAt).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' },
                        ].map(r => (
                          <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                            <span style={{ color: 'var(--text-muted)' }}>{r.label}</span>
                            <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{r.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="badge badge-pending">Guest</span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No store account</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })()}

          {/* Agent Status / Promote */}
          <div className="card">
            <div className="card-header"><div className="card-title">Agent Status</div></div>
            <div style={{ padding: '14px 20px' }}>
              {matchingAgentId ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="badge badge-success">Agent</span>
                    <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>This customer is an agent</span>
                  </div>
                  <Link href={`/agents/${matchingAgentId}`} style={{ fontSize: 12.5, color: 'var(--accent)', fontWeight: 500, textDecoration: 'none' }}>
                    View
                  </Link>
                </div>
              ) : (() => {
                const su = getStoreUserByEmail(d.email)
                const hasActiveMembership = su?.membership && (su.membership.status ?? 'active') === 'active' && new Date(su.membership.expiryDate) > new Date()
                if (!su) return (
                  <div style={{ background: 'rgba(100,116,139,0.06)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>No Store Account</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>This customer checked out as a guest and has no login account. They need to register at the store first before they can be promoted to agent.</div>
                  </div>
                )
                return hasActiveMembership ? (
                  <div style={{ background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.15)', borderRadius: 10, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--warning-text, #d97706)' }}>Active Membership — {su?.membership?.tierName}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Cannot promote to agent while membership is active. Deactivate or cancel their membership first.</div>
                  </div>
                ) : (
                  <button className="btn-primary" style={{ width: '100%', fontSize: 12.5 }} onClick={() => setShowPromote(true)}>
                    Promote to Agent
                  </button>
                )
              })()}
            </div>
          </div>
        </div>
      </div>
      </div>

      {showDel && (
        <ConfirmModal
          title={`Delete ${customer.name}?`}
          message="This will permanently remove this customer. This action cannot be undone."
          confirmLabel="Delete Customer"
          onConfirm={handleDelete}
          onCancel={() => setShowDel(false)}
        />
      )}

      {/* Promote to Agent modal */}
      {showPromote && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 500,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            background: 'var(--modal-overlay)',
          }}
          onClick={() => setShowPromote(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-card)', borderRadius: 16, padding: '28px 32px',
              width: '100%', maxWidth: 440, boxShadow: 'var(--shadow-modal)', margin: '0 16px',
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font)', marginBottom: 16 }}>
              Promote to Agent
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 18 }}>
              This will create an Agent record for <strong>{d.name}</strong> ({d.email}).
              {getStoreUserByEmail(d.email) ? ' Their store account will also be upgraded to agent role.' : ' They do not have a store account yet — one can be created via the agent registration link.'}
            </div>
            <div style={{ display: 'grid', gap: 14, marginBottom: 24 }}>
              <div className="form-group">
                <label className="form-label">Discount Rate (%)</label>
                <input className="form-input" type="number" min={0} max={100} value={promoteDiscount} onChange={e => setPromoteDiscount(Number(e.target.value))} />
              </div>
              <div className="form-group">
                <label className="form-label">Region</label>
                <input className="form-input" value={promoteRegion} onChange={e => setPromoteRegion(e.target.value)} placeholder="e.g. Kuala Lumpur" />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
              <button
                onClick={() => setShowPromote(false)}
                style={{ padding: '8px 18px', borderRadius: 999, background: 'transparent', border: 'none', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', cursor: 'pointer', fontFamily: 'var(--font)' }}
              >
                Cancel
              </button>
              <button
                onClick={handlePromote}
                style={{ padding: '8px 20px', borderRadius: 999, background: 'rgba(0,106,255,0.1)', border: 'none', fontSize: 14, fontWeight: 500, color: 'var(--accent, #006AFF)', cursor: 'pointer', fontFamily: 'var(--font)', transition: 'background 0.12s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,106,255,0.18)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,106,255,0.1)' }}
              >
                Promote
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Promote success toast */}
      {promoteToast && (
        <>
        <style>{`@keyframes ctIn { from { opacity: 0; transform: translateY(-28px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }`}</style>
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          display: 'flex', justifyContent: 'center', paddingTop: 24,
          pointerEvents: 'none',
          animation: 'ctIn 0.4s cubic-bezier(0.16,1,0.3,1) forwards',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '14px 24px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>Agent record created for {d.name}</span>
          </div>
        </div>
        </>
      )}
    </AppShell>
  )
}
