'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import SavingOverlay from '@/components/SavingOverlay'
import CustomSelect from '@/components/CustomSelect'
import { createSupplier, type DbSupplier } from '@/lib/db/inventory'
import { useShop } from '@/providers/shop-provider'

const BackIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>)

const RATINGS: DbSupplier['rating'][] = ['A', 'B', 'C']
const REGIONS = ['KL', 'Selangor', 'Penang', 'Johor', 'Sabah', 'Sarawak', 'Other']
const PAYMENT_TERMS = ['COD', 'PIA', 'Net 7', 'Net 15', 'Net 30', 'Net 45', 'Net 60']

export default function NewSupplierPage() {
  const router = useRouter()
  const { shopId } = useShop()
  const [saving, setSaving] = useState(false)
  const [tried, setTried] = useState(false)

  const [name, setName]                   = useState('')
  const [contactPerson, setContact]       = useState('')
  const [email, setEmail]                 = useState('')
  const [phone, setPhone]                 = useState('')
  const [region, setRegion]               = useState('KL')
  const [rating, setRating]               = useState<DbSupplier['rating']>('A')
  const [lead, setLead]                   = useState('')
  const [paymentTerms, setTerms]          = useState('Net 30')
  const [address, setAddress]             = useState('')
  const [notes, setNotes]                 = useState('')

  const handleCreate = async () => {
    setTried(true)
    if (!name.trim() || saving) return
    setSaving(true)
    try {
      await createSupplier(shopId, { name, contact_person: contactPerson, contact: email, phone, region, rating, lead, payment_terms: paymentTerms, address, notes })
      router.push('/suppliers?created=1')
    } catch { setSaving(false) }
  }

  return (
    <AppShell>
      {saving && <SavingOverlay message="Creating supplier…" />}

      <div className="page-header">
        <Link href="/suppliers" className="back-btn"><BackIcon /> Suppliers</Link>
        <div className="page-actions">
          <Link href="/suppliers" className="btn-secondary" style={{ textDecoration: 'none' }}>Cancel</Link>
          <button className="btn-primary" onClick={handleCreate} disabled={saving} style={{ opacity: saving ? 0.6 : 1 }}>Save</button>
        </div>
      </div>

      <div className="page-scroll">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Contact Details</div>
            <div className="form-group"><label className="form-label">Company Name *</label><input className={`form-input${tried && !name.trim() ? ' error' : ''}`} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. PaperWorld Sdn" /></div>
            <div className="form-group"><label className="form-label">Contact Person</label><input className="form-input" value={contactPerson} onChange={e => setContact(e.target.value)} placeholder="Full name" /></div>
            <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="contact@supplier.com" /></div>
            <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+60 3-XXXX XXXX" /></div>
            <div className="form-group"><label className="form-label">Region</label><CustomSelect value={region} onChange={setRegion} options={REGIONS} /></div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Terms & Rating</div>
            <div className="form-group"><label className="form-label">Rating</label><CustomSelect value={rating} onChange={v => setRating(v as DbSupplier['rating'])} options={RATINGS} /></div>
            <div className="form-group"><label className="form-label">Lead Time</label><input className="form-input" value={lead} onChange={e => setLead(e.target.value)} placeholder="e.g. 3 days" /></div>
            <div className="form-group"><label className="form-label">Payment Terms</label><CustomSelect value={paymentTerms} onChange={setTerms} options={PAYMENT_TERMS} /></div>
            <div className="form-group"><label className="form-label">Address</label><textarea className="form-input" rows={3} value={address} onChange={e => setAddress(e.target.value)} placeholder="Full address…" style={{ resize: 'vertical' }} /></div>
          </div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>Notes</div>
          <textarea className="form-input" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Internal notes about this supplier…" style={{ resize: 'vertical' }} />
        </div>
      </div>
    </AppShell>
  )
}
