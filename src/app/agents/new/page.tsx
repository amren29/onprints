'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import SavingOverlay from '@/components/SavingOverlay'
import { createAgent, type DbAgent } from '@/lib/db/agents'
import { useShop } from '@/providers/shop-provider'
import CustomSelect from '@/components/CustomSelect'

const BackIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>)

const STATUSES: DbAgent['status'][] = ['Active', 'Suspended', 'Inactive']

export default function NewAgentPage() {
  const router = useRouter()
  const { shopId } = useShop()
  const [saving, setSaving] = useState(false)
  const [tried, setTried] = useState(false)

  const [fullName, setName]               = useState('')
  const [email, setEmail]                 = useState('')
  const [phone, setPhone]                 = useState('')
  const [region, setRegion]               = useState('')
  const [status, setStatus]               = useState<DbAgent['status']>('Active')
  const [discountRate, setDiscountRate]   = useState(0)
  const [startDate, setStartDate]         = useState('')
  const [notes, setNotes]                 = useState('')

  const handleCreate = async () => {
    setTried(true)
    if (!fullName.trim() || saving) return
    setSaving(true)
    try {
      await createAgent(shopId, {
        full_name: fullName, email, phone, region, status,
        discount_rate: discountRate,
        payment_method: '', bank_name: '', bank_account_name: '', bank_account_number: '',
        start_date: startDate || new Date().toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }),
        notes,
      })
      router.push('/agents?created=1')
    } catch { setSaving(false) }
  }

  return (
    <AppShell>
      {saving && <SavingOverlay message="Creating agent…" />}

      <div className="page-header">
        <Link href="/agents" className="back-btn"><BackIcon /> Agents</Link>
        <div className="page-actions">
          <Link href="/agents" className="btn-secondary" style={{ textDecoration: 'none' }}>Cancel</Link>
          <button className="btn-primary" onClick={handleCreate} disabled={saving} style={{ opacity: saving ? 0.6 : 1 }}>Save</button>
        </div>
      </div>

      <div className="page-scroll">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Personal Info</div>
            <div className="form-group"><label className="form-label">Full Name *</label><input className={`form-input${tried && !fullName.trim() ? ' error' : ''}`} value={fullName} onChange={e => setName(e.target.value)} placeholder="Full name" /></div>
            <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="agent@saasprint.io" /></div>
            <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+60 12-345 6789" /></div>
            <div className="form-group"><label className="form-label">Region</label><input className="form-input" value={region} onChange={e => setRegion(e.target.value)} placeholder="e.g. KL Central" /></div>
            <div className="form-group"><label className="form-label">Start Date</label><input className="form-input" value={startDate} onChange={e => setStartDate(e.target.value)} placeholder="e.g. Mar 1, 2026" /></div>
            <div className="form-group"><label className="form-label">Status</label><CustomSelect value={status} onChange={v => setStatus(v as DbAgent['status'])} options={STATUSES} /></div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Pricing & Payment</div>
            <div className="form-group">
              <label className="form-label">Discount Rate (%)</label>
              <input className="form-input" type="number" min={0} max={100} step={1} value={discountRate} onChange={e => setDiscountRate(Number(e.target.value))} />
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Agent gets this % off retail pricing</div>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>Notes</div>
          <textarea className="form-input" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Internal notes about this agent…" style={{ resize: 'vertical' }} />
        </div>
      </div>
    </AppShell>
  )
}
