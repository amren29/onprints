'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import MyStoreShell from '@/components/MyStoreShell'
import SavingOverlay from '@/components/SavingOverlay'
import { getReviewById, updateReview } from '@/lib/db/reviews'
import { useShop } from '@/providers/shop-provider'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import CustomSelect from '@/components/CustomSelect'
import DatePicker from '@/components/DatePicker'

const BackIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>)

const STATUS_OPTS = ['Pending', 'Approved', 'Rejected']
const RATING_OPTS = [5, 4, 3, 2, 1]

export default function EditReviewPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const { shopId } = useShop()
  const qc = useQueryClient()

  const { data: review, isLoading } = useQuery({
    queryKey: ['reviews', shopId, id],
    queryFn: () => getReviewById(shopId, id),
    enabled: !!shopId && !!id,
  })

  const [name, setName]       = useState('')
  const [company, setCompany] = useState('')
  const [product, setProduct] = useState('')
  const [rating, setRating]   = useState(5)
  const [text, setText]       = useState('')
  const [status, setStatus]   = useState('Pending')
  const [pinned, setPinned]   = useState(false)
  const [date, setDate]       = useState(new Date().toISOString().slice(0, 10))
  const [tried, setTried]     = useState(false)
  const [hydrated, setHydrated] = useState(false)

  if (review && !hydrated) {
    setName(review.customer_name)
    setCompany(review.company)
    setProduct(review.product)
    setRating(review.rating)
    setText(review.comment)
    setStatus(review.status)
    setPinned(review.pinned)
    setDate(review.date)
    setHydrated(true)
  }

  const updateMut = useMutation({
    mutationFn: () => updateReview(shopId, id, {
      customer_name: name, company, product, rating, comment: text, status, pinned, date,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reviews', shopId] })
      router.push('/storefront/reviews?saved=1')
    },
  })

  const handleSave = () => {
    setTried(true)
    if (!name.trim() || updateMut.isPending) return
    updateMut.mutate()
  }

  if (!isLoading && !review) {
    return (
      <MyStoreShell>
        <Link href="/storefront/reviews" className="back-btn"><BackIcon /> Reviews</Link>
        <div className="empty-state" style={{ paddingTop: 80 }}>Review not found</div>
      </MyStoreShell>
    )
  }

  return (
    <MyStoreShell>
      {updateMut.isPending && <SavingOverlay message="Saving changes…" />}

      <div className="page-header">
        <Link href="/storefront/reviews" className="back-btn"><BackIcon /> Reviews</Link>
        <div className="page-actions">
          <Link href="/storefront/reviews" className="btn-secondary" style={{ textDecoration: 'none' }}>Cancel</Link>
          <button className="btn-primary" onClick={handleSave} disabled={updateMut.isPending} style={{ opacity: updateMut.isPending ? 0.6 : 1 }}>Save</button>
        </div>
      </div>

      <div className="page-scroll">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Reviewer Info</div>
            <div className="form-group">
              <label className="form-label">Name <span style={{ color: 'var(--negative)' }}>*</span></label>
              <input className={`form-input${tried && !name.trim() ? ' error' : ''}`} value={name} onChange={e => setName(e.target.value)} placeholder="Customer name" />
            </div>
            <div className="form-group">
              <label className="form-label">Company</label>
              <input className="form-input" value={company} onChange={e => setCompany(e.target.value)} placeholder="Optional" />
            </div>
            <div className="form-group">
              <label className="form-label">Product / Service</label>
              <input className="form-input" value={product} onChange={e => setProduct(e.target.value)} placeholder="e.g. Business Cards" />
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <DatePicker value={date} onChange={setDate} placeholder="Select date" />
            </div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Review Details</div>
            <div className="form-group">
              <label className="form-label">Rating</label>
              <CustomSelect
                value={String(rating)}
                onChange={v => setRating(parseInt(v))}
                options={RATING_OPTS.map(r => ({ value: String(r), label: `${r} Star${r !== 1 ? 's' : ''}` }))}
              />
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
              <label className="form-label">Review Text</label>
              <textarea className="form-input" rows={5} value={text} onChange={e => setText(e.target.value)} placeholder="Customer's review…" style={{ resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" id="pinned" checked={pinned} onChange={e => setPinned(e.target.checked)} style={{ width: 15, height: 15, accentColor: 'var(--accent)', cursor: 'pointer' }} />
              <label htmlFor="pinned" style={{ fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer' }}>Pin to top of reviews section</label>
            </div>
          </div>
        </div>
      </div>
    </MyStoreShell>
  )
}
