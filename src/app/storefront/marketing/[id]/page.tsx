'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import MyStoreShell from '@/components/MyStoreShell'
import SavingOverlay from '@/components/SavingOverlay'
import { getCampaignById, updateCampaign } from '@/lib/db/campaigns'
import { useShop } from '@/providers/shop-provider'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import CustomSelect from '@/components/CustomSelect'
import DatePicker from '@/components/DatePicker'

const BackIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>)

const STATUS_OPTS = ['Active', 'Draft', 'Paused', 'Completed']
const TYPE_OPTS = ['Email', 'Push', 'Social', 'Referral', 'SMS']

export default function EditCampaignPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const { shopId } = useShop()
  const qc = useQueryClient()

  const { data: campaign, isLoading } = useQuery({
    queryKey: ['campaigns', shopId, id],
    queryFn: () => getCampaignById(shopId, id),
    enabled: !!shopId && !!id,
  })

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
  const [tried, setTried]       = useState(false)
  const [hydrated, setHydrated] = useState(false)

  if (campaign && !hydrated) {
    setName(campaign.name)
    setType(campaign.type)
    setStatus(campaign.status)
    setDate(campaign.date)
    setReach(campaign.reach)
    setDiscount(campaign.discount)
    setAudience(campaign.audience)
    setSubject(campaign.subject)
    setBody(campaign.body)
    setNotes(campaign.notes)
    setHydrated(true)
  }

  const updateMut = useMutation({
    mutationFn: () => updateCampaign(shopId, id, { name, type, status, date, reach, discount, audience, subject, body, notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns', shopId] })
      router.push('/storefront/marketing?saved=1')
    },
  })

  if (!isLoading && !campaign) {
    return (
      <MyStoreShell>
        <div className="page-header">
          <Link href="/storefront/marketing" className="back-btn"><BackIcon /> Campaigns</Link>
        </div>
        <div className="empty-state" style={{ paddingTop: 80 }}>Campaign not found</div>
      </MyStoreShell>
    )
  }

  const handleSave = () => {
    setTried(true)
    if (!name.trim() || updateMut.isPending) return
    updateMut.mutate()
  }

  return (
    <MyStoreShell>
      {updateMut.isPending && <SavingOverlay message="Saving changes…" />}

      <div className="page-header">
        <Link href="/storefront/marketing" className="back-btn"><BackIcon /> Campaigns</Link>
        <div className="page-actions">
          <Link href="/storefront/marketing" className="btn-secondary" style={{ textDecoration: 'none' }}>Cancel</Link>
          <button className="btn-primary" onClick={handleSave} disabled={updateMut.isPending} style={{ opacity: updateMut.isPending ? 0.6 : 1 }}>Save</button>
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
