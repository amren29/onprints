'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import MyStoreShell from '@/components/MyStoreShell'
import SavingOverlay from '@/components/SavingOverlay'
import { getDiscountById, updateDiscount } from '@/lib/db/discounts'
import { useShop } from '@/providers/shop-provider'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import CustomSelect from '@/components/CustomSelect'
import DatePicker from '@/components/DatePicker'

const BackIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>)

const STATUS_OPTS = ['Active', 'Draft', 'Expired']
const TYPE_OPTS = ['percentage', 'fixed']

export default function EditDiscountPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const { shopId } = useShop()
  const qc = useQueryClient()

  const { data: disc, isLoading } = useQuery({
    queryKey: ['discounts', shopId, id],
    queryFn: () => getDiscountById(shopId, id),
    enabled: !!shopId && !!id,
  })

  const [code, setCode]           = useState('')
  const [type, setType]           = useState('percentage')
  const [value, setValue]         = useState(0)
  const [minOrder, setMinOrder]   = useState(0)
  const [usageLimit, setUsageLimit] = useState(0)
  const [expiry, setExpiry]       = useState('')
  const [status, setStatus]       = useState('Active')
  const [notes, setNotes]         = useState('')
  const [tried, setTried]         = useState(false)
  const [hydrated, setHydrated]   = useState(false)

  // Hydrate form when data loads
  if (disc && !hydrated) {
    setCode(disc.code)
    setType(disc.type)
    setValue(disc.value)
    setMinOrder(disc.min_order)
    setUsageLimit(disc.max_uses)
    setExpiry(disc.expiry)
    setStatus(disc.status)
    setNotes(disc.notes)
    setHydrated(true)
  }

  const updateMut = useMutation({
    mutationFn: () => updateDiscount(shopId, id, {
      code, type, value, min_order: minOrder, max_uses: usageLimit, expiry, status, notes,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['discounts', shopId] })
      router.push('/storefront/discounts?saved=1')
    },
    onError: (err: any) => {
      console.error('[updateDiscount]', err)
      alert('Failed to save: ' + (err?.message || 'Unknown error'))
    },
  })

  if (!isLoading && !disc) {
    return (
      <MyStoreShell>
        <Link href="/storefront/discounts" className="back-btn"><BackIcon /> Discounts</Link>
        <div className="empty-state" style={{ paddingTop: 80 }}>Discount not found</div>
      </MyStoreShell>
    )
  }

  const handleSave = () => {
    setTried(true)
    if (!code.trim() || updateMut.isPending) return
    updateMut.mutate()
  }

  return (
    <MyStoreShell>
      {updateMut.isPending && <SavingOverlay message="Saving changes…" />}

      <div className="page-header">
        <Link href="/storefront/discounts" className="back-btn"><BackIcon /> Discounts</Link>
        <div className="page-actions">
          <Link href="/storefront/discounts" className="btn-secondary" style={{ textDecoration: 'none' }}>Cancel</Link>
          <button className="btn-primary" onClick={handleSave} disabled={updateMut.isPending} style={{ opacity: updateMut.isPending ? 0.6 : 1 }}>Save</button>
        </div>
      </div>

      <div className="page-scroll">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Code &amp; Type</div>
            <div className="form-group">
              <label className="form-label">Code <span style={{ color: 'var(--negative)' }}>*</span></label>
              <input className={`form-input${tried && !code.trim() ? ' error' : ''}`} value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="e.g. RAYA20" style={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.06em' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <CustomSelect
                value={type}
                onChange={v => setType(v)}
                options={TYPE_OPTS.map(t => ({ value: t, label: t === 'percentage' ? 'Percentage (%)' : 'Fixed Amount (RM)' }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Value</label>
              <input className="form-input" type="number" min="0" value={value} onChange={e => setValue(parseFloat(e.target.value) || 0)} placeholder={type === 'percentage' ? 'e.g. 20' : 'e.g. 50'} />
            </div>
            <div className="form-group">
              <label className="form-label">Min Order Amount (RM)</label>
              <input className="form-input" type="number" min="0" value={minOrder} onChange={e => setMinOrder(parseFloat(e.target.value) || 0)} placeholder="0 = no minimum" />
            </div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Usage &amp; Validity</div>
            <div className="form-group">
              <label className="form-label">Usage Limit</label>
              <input className="form-input" type="number" min="0" value={usageLimit} onChange={e => setUsageLimit(parseInt(e.target.value) || 0)} placeholder="0 = unlimited" />
            </div>
            <div className="form-group">
              <label className="form-label">Expiry Date</label>
              <DatePicker value={expiry} onChange={setExpiry} placeholder="Select expiry date" />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <CustomSelect
                value={status}
                onChange={v => setStatus(v)}
                options={STATUS_OPTS.map(s => ({ value: s, label: s }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-input" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Internal notes about this code" style={{ resize: 'vertical' }} />
            </div>
          </div>
        </div>
      </div>
    </MyStoreShell>
  )
}
