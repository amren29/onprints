'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import MyStoreShell from '@/components/MyStoreShell'
import SavingOverlay from '@/components/SavingOverlay'
import CustomSelect from '@/components/CustomSelect'
import { createBundle } from '@/lib/db/bundles'
import { useShop } from '@/providers/shop-provider'
import { useMutation, useQueryClient } from '@tanstack/react-query'

const BackIcon  = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>)
const TrashIcon = () => (<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>)

const STATUS_OPTS = ['Active', 'Draft', 'Paused']
const DISCOUNT_OPTS = ['percentage', 'fixed']

export default function NewBundlePage() {
  const router = useRouter()
  const { shopId } = useShop()
  const qc = useQueryClient()

  const [name, setName]               = useState('')
  const [description, setDescription] = useState('')
  const [items, setItems]             = useState<{ catalogId: string; name: string; qty: number }[]>([])
  const [discountType, setDiscountType]   = useState('percentage')
  const [discountValue, setDiscountValue] = useState(10)
  const [originalPrice, setOriginalPrice] = useState(0)
  const [status, setStatus]           = useState('Draft')
  const [featured, setFeatured]       = useState(false)
  const [tried, setTried]             = useState(false)
  const [iName, setIName]             = useState('')
  const [iQty, setIQty]               = useState(1)

  const createMut = useMutation({
    mutationFn: () => createBundle(shopId, {
      name, description, items, discount_type: discountType, discount_value: discountValue,
      original_price: originalPrice, status, featured,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bundles', shopId] })
      router.push('/storefront/bundles?created=1')
    },
  })

  const handleCreate = () => {
    setTried(true)
    if (!name.trim() || createMut.isPending) return
    createMut.mutate()
  }

  const addItem = () => {
    if (!iName.trim()) return
    setItems(prev => [...prev, { catalogId: '', name: iName, qty: iQty }])
    setIName(''); setIQty(1)
  }
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i))

  return (
    <MyStoreShell>
      {createMut.isPending && <SavingOverlay message="Creating bundle…" />}

      <div className="page-header">
        <Link href="/storefront/bundles" className="back-btn"><BackIcon /> Bundles</Link>
        <div className="page-actions">
          <Link href="/storefront/bundles" className="btn-secondary" style={{ textDecoration: 'none' }}>Cancel</Link>
          <button className="btn-primary" onClick={handleCreate} disabled={createMut.isPending} style={{ opacity: createMut.isPending ? 0.6 : 1 }}>Save</button>
        </div>
      </div>

      <div className="page-scroll">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Bundle Info</div>

            <div className="form-group">
              <label className="form-label">Bundle Name *</label>
              <input className={`form-input${tried && !name.trim() ? ' error' : ''}`} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Starter Print Pack" />
            </div>

            <div className="form-group">
              <label className="form-label">Discount Type</label>
              <CustomSelect
                value={discountType}
                onChange={v => setDiscountType(v)}
                options={DISCOUNT_OPTS.map(d => ({ value: d, label: d === 'percentage' ? 'Percentage (%)' : 'Fixed Amount (RM)' }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Discount Value</label>
              <input className="form-input" type="number" min={0} step={0.01} value={discountValue} onChange={e => setDiscountValue(Number(e.target.value))} />
            </div>

            <div className="form-group">
              <label className="form-label">Original Price RM</label>
              <input className="form-input" type="number" min={0} step={0.01} value={originalPrice} onChange={e => setOriginalPrice(Number(e.target.value))} />
            </div>

            <div className="form-group">
              <label className="form-label">Status</label>
              <CustomSelect value={status} onChange={v => setStatus(v)} options={STATUS_OPTS} />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-input" rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="Short description of the bundle…" style={{ resize: 'vertical' }} />
            </div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Bundle Items &amp; Options</div>

            {items.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                {items.map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '7px 10px', marginBottom: 6,
                    background: 'var(--bg)', borderRadius: 'var(--r-md)',
                    border: '1px solid var(--border)', fontSize: 12.5,
                  }}>
                    <span style={{ color: 'var(--text-primary)' }}>{item.name} <span style={{ color: 'var(--text-muted)' }}>&times; {item.qty}</span></span>
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
                        padding: 4, borderRadius: 4,
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <label className="form-label">Product Name</label>
                <input className="form-input" value={iName} onChange={e => setIName(e.target.value)} placeholder="e.g. Business Card" />
              </div>
              <div style={{ width: 70 }}>
                <label className="form-label">Qty</label>
                <input className="form-input" type="number" min={1} value={iQty} onChange={e => setIQty(Number(e.target.value))} />
              </div>
              <button
                type="button"
                onClick={addItem}
                className="btn-secondary"
                style={{ whiteSpace: 'nowrap', marginBottom: 0 }}
              >
                + Add
              </button>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--text-primary)', cursor: 'pointer' }}>
              <input type="checkbox" checked={featured} onChange={e => setFeatured(e.target.checked)} />
              Feature this bundle on the homepage
            </label>
          </div>
        </div>
      </div>
    </MyStoreShell>
  )
}
