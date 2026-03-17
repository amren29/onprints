'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import SavingOverlay from '@/components/SavingOverlay'
import { createCustomer, type DbCustomer } from '@/lib/db/customers'
import { useShop } from '@/providers/shop-provider'
import CustomSelect from '@/components/CustomSelect'

const BackIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>)

const CUSTOMER_TYPES = ['Corporate', 'Individual', 'Government', 'Non-Profit']
const STATUSES: DbCustomer['status'][] = ['Active', 'VIP', 'At Risk', 'Inactive']
const PAYMENT_TERMS = ['', 'COD', 'Net 7', 'Net 14', 'Net 30', 'Net 60']

export default function NewCustomerPage() {
  const router = useRouter()
  const { shopId } = useShop()
  const [saving, setSaving] = useState(false)
  const [tried, setTried] = useState(false)

  const [name, setName]               = useState('')
  const [company, setCompany]         = useState('')
  const [email, setEmail]             = useState('')
  const [phone, setPhone]             = useState('')
  const [billingAddress, setBilling]  = useState('')
  const [sstNo, setSstNo]             = useState('')
  const [customerType, setType]       = useState('Corporate')
  const [status, setStatus]           = useState<string>('Active')
  const [location, setLocation]       = useState('')
  const [paymentTerms, setTerms]      = useState('')
  const [creditLimit, setCredit]      = useState(0)
  const [notes, setNotes]             = useState('')

  const handleCreate = async () => {
    setTried(true)
    if (!shopId) { alert('Shop not ready. Please refresh the page.'); return }
    if (!name.trim() || saving) return
    setSaving(true)
    try {
      await createCustomer(shopId, {
        name,
        company,
        email,
        phone,
        billing_address: billingAddress,
        sst_no: sstNo,
        customer_type: customerType,
        status,
        location,
        payment_terms: paymentTerms,
        credit_limit: creditLimit,
        notes,
      })
      router.push('/customers?created=1')
    } catch (err) {
      console.error('Failed to create customer:', err)
      setSaving(false)
    }
  }

  return (
    <AppShell>
      {saving && <SavingOverlay message="Creating customer…" />}

      <div className="page-header">
        <Link href="/customers" className="back-btn"><BackIcon /> Customers</Link>
        <div className="page-actions">
          <Link href="/customers" className="btn-secondary" style={{ textDecoration: 'none' }}>Cancel</Link>
          <button className="btn-primary" onClick={handleCreate} disabled={saving} style={{ opacity: saving ? 0.6 : 1 }}>Save</button>
        </div>
      </div>

      <div className="page-scroll">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Contact Details</div>
            <div className="form-group"><label className="form-label">Name *</label><input className={`form-input${tried && !name.trim() ? ' error' : ''}`} value={name} onChange={e => setName(e.target.value)} placeholder="Full name" /></div>
            <div className="form-group"><label className="form-label">Company</label><input className="form-input" value={company} onChange={e => setCompany(e.target.value)} placeholder="Company name" /></div>
            <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" /></div>
            <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+60 12-345 6789" /></div>
            <div className="form-group"><label className="form-label">Location</label><input className="form-input" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Kuala Lumpur" /></div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Account Settings</div>
            <div className="form-group"><label className="form-label">Customer Type</label><CustomSelect value={customerType} onChange={setType} options={CUSTOMER_TYPES} /></div>
            <div className="form-group"><label className="form-label">Status</label><CustomSelect value={status} onChange={v => setStatus(v)} options={STATUSES} /></div>
            <div className="form-group"><label className="form-label">Payment Terms</label><CustomSelect value={paymentTerms} onChange={setTerms} options={[{value:'', label:'— Select —'}, ...PAYMENT_TERMS.filter(Boolean).map(t => ({value:t, label:t}))]} /></div>
            <div className="form-group"><label className="form-label">Credit Limit (RM)</label><input className="form-input" type="number" min={0} step={100} value={creditLimit} onChange={e => setCredit(Number(e.target.value))} /></div>
            <div className="form-group"><label className="form-label">SST No.</label><input className="form-input" value={sstNo} onChange={e => setSstNo(e.target.value)} placeholder="e.g. MY-200201012345" /></div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>Billing Address</div>
            <textarea className="form-input" rows={4} value={billingAddress} onChange={e => setBilling(e.target.value)} placeholder="Full billing address…" style={{ resize: 'vertical' }} />
          </div>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>Notes</div>
            <textarea className="form-input" rows={4} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Internal notes about this customer…" style={{ resize: 'vertical' }} />
          </div>
        </div>
      </div>
    </AppShell>
  )
}
