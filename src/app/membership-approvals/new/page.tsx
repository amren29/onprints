'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import SavingOverlay from '@/components/SavingOverlay'
import CustomSelect from '@/components/CustomSelect'
import { createMembershipRequest, getMemberships } from '@/lib/db/memberships'
import { useShop } from '@/providers/shop-provider'
import { useQuery, useQueryClient } from '@tanstack/react-query'

const fmt = (n: number) => `RM ${(n ?? 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`

const BackIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>)

export default function NewMembershipPage() {
  const router = useRouter()
  const { shopId } = useShop()
  const qc = useQueryClient()

  const { data: tiers = [] } = useQuery({
    queryKey: ['memberships', shopId],
    queryFn: () => getMemberships(shopId),
    enabled: !!shopId,
  })
  const TIER_OPTIONS = tiers.map(t => ({ value: t.id, label: t.name, price: t.price }))
  const [saving, setSaving] = useState(false)
  const [tried, setTried] = useState(false)

  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [tierId, setTierId] = useState('')
  const [tierName, setTierName] = useState('')
  const [price, setPrice] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'bank-transfer'>('online')
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [receiptFileName, setReceiptFileName] = useState('')

  const handleTierChange = (val: string) => {
    const tier = TIER_OPTIONS.find(t => t.value === val)
    if (tier) { setTierId(val); setTierName(tier.label); setPrice(tier.price) }
  }

  const handleCreate = async () => {
    setTried(true)
    if (!customerName.trim() || !tierId || saving) return
    setSaving(true)
    try {
      await createMembershipRequest(shopId, {
        customer_name: customerName,
        customer_email: customerEmail,
        tier_id: tierId,
        tier_name: tierName,
        price,
        payment_method: paymentMethod,
        status,
        receipt_file: receiptFileName || '',
      })
      qc.invalidateQueries({ queryKey: ['membershipRequests', shopId] })
      router.push('/membership-approvals?created=1')
    } catch {
      setSaving(false)
    }
  }

  return (
    <AppShell>
      {saving && <SavingOverlay message="Creating membership request…" />}

      <div className="page-header">
        <Link href="/membership-approvals" className="back-btn"><BackIcon /> Membership</Link>
        <div className="page-actions">
          <Link href="/membership-approvals" className="btn-secondary" style={{ textDecoration: 'none' }}>Cancel</Link>
          <button className="btn-primary" onClick={handleCreate} disabled={saving} style={{ opacity: saving ? 0.6 : 1 }}>Save</button>
        </div>
      </div>

      <div className="page-scroll">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Customer Details</div>
            <div className="form-group">
              <label className="form-label">Customer Name <span style={{ color: 'var(--negative)' }}>*</span></label>
              <input className={`form-input${tried && !customerName.trim() ? ' error' : ''}`} value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Full name" />
            </div>
            <div className="form-group">
              <label className="form-label">Customer Email</label>
              <input className="form-input" type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="email@example.com" />
            </div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Membership Details</div>
            <div className="form-group">
              <label className="form-label">Tier <span style={{ color: 'var(--negative)' }}>*</span></label>
              <CustomSelect value={tierId} onChange={handleTierChange} options={TIER_OPTIONS.map(t => ({ value: t.value, label: `${t.label} (${fmt(t.price)})` }))} placeholder="Select tier" error={tried && !tierId} />
            </div>
            <div className="form-group">
              <label className="form-label">Price (RM)</label>
              <input className="form-input" type="number" min={0} value={price} onChange={e => setPrice(parseFloat(e.target.value) || 0)} />
            </div>
            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <CustomSelect value={paymentMethod} onChange={v => setPaymentMethod(v as 'online' | 'bank-transfer')} options={[{ value: 'online', label: 'Online' }, { value: 'bank-transfer', label: 'Bank Transfer' }]} />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <CustomSelect value={status} onChange={v => setStatus(v as 'pending' | 'approved' | 'rejected')} options={[{ value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }]} />
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Receipt</div>
          <div className="form-group">
            <label className="form-label">Receipt Filename (optional)</label>
            <input className="form-input" value={receiptFileName} onChange={e => setReceiptFileName(e.target.value)} placeholder="e.g. receipt.jpg" />
          </div>
        </div>
      </div>
    </AppShell>
  )
}
