'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import MyStoreShell from '@/components/MyStoreShell'
import SavingOverlay from '@/components/SavingOverlay'
import { createCampaign } from '@/lib/db/campaigns'
import { useShop } from '@/providers/shop-provider'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import CustomSelect from '@/components/CustomSelect'
import DatePicker from '@/components/DatePicker'

const BackIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>)

const STATUS_OPTS = ['Active', 'Draft', 'Paused', 'Completed']
const TYPE_OPTS = ['Email', 'Push', 'Social', 'Referral', 'SMS']

export default function NewCampaignPage() {
  const router = useRouter()
  const { shopId } = useShop()
  const qc = useQueryClient()
  const [tried, setTried] = useState(false)

  const [name, setName]         = useState('')
  const [type, setType]         = useState('Email')
  const [status, setStatus]     = useState('Draft')
  const [date, setDate]         = useState(new Date().toISOString().slice(0, 10))
  const [reach, setReach]       = useState(0)
  const [discount, setDiscount] = useState('')
  const [audience, setAudience] = useState('')
  const [subject, setSubject]   = useState('')
  const [body, setBody]         = useState('')
  const [notes, setNotes]       = useState('')

  const createMut = useMutation({
    mutationFn: () => createCampaign(shopId, { name, type, status, date, reach, discount, audience, subject, body, notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns', shopId] })
      router.push('/storefront/marketing?created=1')
    },
    onError: (err: any) => {
      console.error('[createCampaign]', err)
      alert('Failed to save: ' + (err?.message || 'Unknown error'))
    },
  })

  const handleCreate = () => {
    setTried(true)
    if (!name.trim() || createMut.isPending) return
    createMut.mutate()
  }

  return (
    <MyStoreShell>
      {createMut.isPending && <SavingOverlay message="Creating campaign…" />}

      <div className="page-header">
        <Link href="/storefront/marketing" className="back-btn"><BackIcon /> Campaigns</Link>
        <div className="page-actions">
          <Link href="/storefront/marketing" className="btn-secondary" style={{ textDecoration: 'none' }}>Cancel</Link>
          <button className="btn-primary" onClick={handleCreate} disabled={createMut.isPending} style={{ opacity: createMut.isPending ? 0.6 : 1 }}>Save</button>
        </div>
      </div>

      <div className="page-scroll">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Campaign Info</div>
            <div className="form-group">
              <label className="form-label">Campaign Name <span style={{ color: 'var(--negative)' }}>*</span></label>
              <input className={`form-input${tried && !name.trim() ? ' error' : ''}`} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Raya 2026 Sale" />
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <CustomSelect value={type} onChange={v => setType(v)} options={TYPE_OPTS.map(t => ({ value: t, label: t }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <CustomSelect value={status} onChange={v => setStatus(v)} options={STATUS_OPTS.map(s => ({ value: s, label: s }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <DatePicker value={date} onChange={setDate} placeholder="Select date" />
            </div>
            <div className="form-group">
              <label className="form-label">Audience</label>
              <input className="form-input" value={audience} onChange={e => setAudience(e.target.value)} placeholder="e.g. All Customers" />
            </div>
            <div className="form-group">
              <label className="form-label">Linked Discount Code</label>
              <input className="form-input" value={discount} onChange={e => setDiscount(e.target.value.toUpperCase())} placeholder="e.g. RAYA20" style={{ fontFamily: 'monospace', fontWeight: 600 }} />
            </div>
            <div className="form-group">
              <label className="form-label">Reach (recipients)</label>
              <input className="form-input" type="number" min="0" value={reach} onChange={e => setReach(parseInt(e.target.value) || 0)} placeholder="0" />
            </div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Message</div>
            <div className="form-group">
              <label className="form-label">Subject / Title</label>
              <input className="form-input" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Email subject or push notification title" />
            </div>
            <div className="form-group">
              <label className="form-label">Body</label>
              <textarea className="form-input" rows={5} value={body} onChange={e => setBody(e.target.value)} placeholder="Campaign message body…" style={{ resize: 'vertical' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Internal Notes</label>
              <textarea className="form-input" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes for your team…" style={{ resize: 'vertical' }} />
            </div>
          </div>
        </div>
      </div>
    </MyStoreShell>
  )
}
