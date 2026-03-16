'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import ConfirmModal from '@/components/ConfirmModal'
import CustomSelect from '@/components/CustomSelect'
import { getMembershipRequestById, updateMembershipRequest, deleteMembershipRequest, getMemberships, type DbMembershipRequest } from '@/lib/db/memberships'
import { getStoreUserByEmail, activateStoreMembership, suspendStoreMembership, deactivateStoreMembership, deleteStoreMembership, completeStoreMembershipPurchases } from '@/lib/store/auth-store' // TODO: migrate to Supabase
import SavingOverlay from '@/components/SavingOverlay'
import { useShop } from '@/providers/shop-provider'
import { useQueryClient } from '@tanstack/react-query'

type MembershipRequest = DbMembershipRequest
const fmt = (n: number) => `RM ${(n ?? 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`

const BackIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
)
const STATUSES: string[] = ['pending', 'approved', 'rejected', 'suspended', 'inactive']
const PAYMENT_METHODS = [
  { value: 'online', label: 'Online' },
  { value: 'bank-transfer', label: 'Bank Transfer' },
]

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

export default function MembershipDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const { shopId } = useShop()
  const qc = useQueryClient()

  const [tiers, setTiers] = useState<{ id: string; name: string; price: number; discount_rate: number; duration_months: number }[]>([])
  const TIER_OPTIONS = tiers.map(t => ({ value: t.id, label: t.name, price: t.price, discountRate: t.discount_rate, durationMonths: t.duration_months }))

  const [req, setReq] = useState<MembershipRequest | null>(null)
  const [showDelete, setShowDelete] = useState(false)
  const [saving, setSaving] = useState(false)
  const origRef = useRef<MembershipRequest | null>(null)

  useEffect(() => {
    if (!shopId) return
    Promise.all([
      getMemberships(shopId),
      getMembershipRequestById(shopId, id),
    ]).then(([tierData, data]) => {
      setTiers(tierData)
      if (!data) { router.push('/membership-approvals'); return }
      setReq(data)
      origRef.current = { ...data }
    })
  }, [shopId, id, router])

  if (!req) return <AppShell><div style={{ padding: 40 }}>Loading…</div></AppShell>

  const updateField = (field: string, value: string | number) => {
    setReq(prev => prev ? { ...prev, [field]: value } : prev)
  }

  const handleTierChange = (tierId: string) => {
    const tier = TIER_OPTIONS.find(t => t.value === tierId)
    if (tier) setReq(prev => prev ? { ...prev, tier_id: tierId, tier_name: tier.label, price: tier.price } : prev)
  }

  const dirty = origRef.current !== null && JSON.stringify(req) !== JSON.stringify(origRef.current)

  const handleSave = async () => {
    if (!req || !dirty || saving) return
    setSaving(true)
    try {
      await updateMembershipRequest(shopId, id, {
        status: req.status,
        notes: req.notes,
        receipt_file: req.receipt_file,
      })

      // Sync status changes to auth-store
      if (req.customer_email && origRef.current && req.status !== origRef.current.status) {
        const tier = TIER_OPTIONS.find(t => t.value === req.tier_id)
        if (req.status === 'approved') {
          if (tier) {
            activateStoreMembership(req.customer_email, tier.value, tier.label, tier.discountRate, tier.durationMonths)
            completeStoreMembershipPurchases(req.customer_email, tier.value)
          }
        } else if (req.status === 'suspended') {
          suspendStoreMembership(req.customer_email)
        } else if (req.status === 'inactive') {
          deactivateStoreMembership(req.customer_email)
        }
      }

      qc.invalidateQueries({ queryKey: ['membershipRequests', shopId] })
      router.push('/membership-approvals?saved=1')
    } catch {
      setSaving(false)
    }
  }

  const handleDeleteMembership = async () => {
    if (req.customer_email) deleteStoreMembership(req.customer_email)
    await deleteMembershipRequest(shopId, id)
    qc.invalidateQueries({ queryKey: ['membershipRequests', shopId] })
    router.push('/membership-approvals')
  }

  return (
    <AppShell>
      {saving && <SavingOverlay message="Saving changes…" />}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <Link href="/membership-approvals" className="back-btn"><BackIcon /> Membership</Link>
        <div className="page-actions">
          <button className="btn-secondary" onClick={() => setShowDelete(true)} style={{ color: 'var(--negative)' }}>Delete</button>
          <Link href="/membership-approvals" className="btn-secondary" style={{ textDecoration: 'none' }}>Cancel</Link>
          <button className="btn-primary" onClick={handleSave} disabled={saving || !dirty} style={{ opacity: (saving || !dirty) ? 0.5 : 1 }}>Save Changes</button>
        </div>
      </div>

      <div className="page-scroll">
        {/* Profile card */}
        <div className="profile-card" style={{ marginBottom: 16 }}>
          <div className="profile-left">
            <div className="profile-avatar">{initials(req.customer_name || '?')}</div>
            <div>
              <div className="profile-name">{req.customer_name || '—'}</div>
              <div className="profile-meta">
                <span>{req.id}</span>
                <span>·</span>
                <span>{req.tier_name} Membership</span>
                <span>·</span>
                <span>{fmt(req.price)}</span>
              </div>
            </div>
          </div>
          <div className="profile-actions">
            <CustomSelect value={req.status} onChange={v => updateField('status', v)} options={STATUSES.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))} style={{ width: 130 }} />
          </div>
        </div>

        {/* Agent conflict warning */}
        {req.customer_email && getStoreUserByEmail(req.customer_email)?.role === 'agent' && (
          <div className="card" style={{ padding: '14px 20px', marginBottom: 16, background: 'rgba(239,68,68,0.05)', border: '1.5px solid rgba(239,68,68,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="badge badge-danger">Agent</span>
              <span style={{ fontSize: 12.5, color: 'var(--negative)', fontWeight: 500 }}>This customer is an agent — membership cannot be activated. Agent discount and membership are mutually exclusive.</span>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Customer Details</div>
            <div className="form-group">
              <label className="form-label">Customer Name</label>
              <input className="form-input" value={req.customer_name} onChange={e => updateField('customer_name', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Customer Email</label>
              <input className="form-input" type="email" value={req.customer_email} onChange={e => updateField('customer_email', e.target.value)} />
            </div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Membership Details</div>
            <div className="form-group">
              <label className="form-label">Tier</label>
              <CustomSelect value={req.tier_id} onChange={handleTierChange} options={TIER_OPTIONS.map(t => ({ value: t.value, label: `${t.label} (${fmt(t.price)})` }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Price (RM)</label>
              <input className="form-input" type="number" min={0} value={req.price} onChange={e => updateField('price', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <CustomSelect value={req.payment_method} onChange={v => updateField('payment_method', v)} options={PAYMENT_METHODS} />
            </div>
          </div>
        </div>

        {/* Receipt & Dates */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Receipt & Timeline</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Receipt Filename</label>
              <input className="form-input" value={req.receipt_file ?? ''} onChange={e => updateField('receipt_file', e.target.value)} placeholder="e.g. receipt.jpg" />
            </div>
            <div className="form-group">
              <label className="form-label">Submitted</label>
              <input className="form-input" value={req.created_at} onChange={e => updateField('created_at', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Reviewed</label>
              <input className="form-input" value={req.updated_at ?? ''} onChange={e => updateField('updated_at', e.target.value)} placeholder="Not reviewed yet" />
            </div>
          </div>

          {/* Receipt image preview */}
          {/* Receipt preview - receiptData was localStorage-only, removed in Supabase migration */}
        </div>
      </div>

      {showDelete && (
        <ConfirmModal
          title={`Delete ${req.id}?`}
          message={`This will permanently remove ${req.customer_name}'s ${req.tier_name} membership request and clear their membership from the store. This action cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={handleDeleteMembership}
          onCancel={() => setShowDelete(false)}
        />
      )}
    </AppShell>
  )
}
