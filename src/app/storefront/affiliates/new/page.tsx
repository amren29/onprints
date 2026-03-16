'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import MyStoreShell from '@/components/MyStoreShell'
import SavingOverlay from '@/components/SavingOverlay'
import CustomSelect from '@/components/CustomSelect'
import { createAffiliate } from '@/lib/db/affiliates'
import { getProducts, type DbProduct } from '@/lib/db/catalog'
import { useShop } from '@/providers/shop-provider'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const BackIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>)

export default function NewAffiliatePage() {
  const router = useRouter()
  const { shopId } = useShop()
  const qc = useQueryClient()
  const [tried, setTried] = useState(false)

  const { data: products = [] } = useQuery({
    queryKey: ['products', shopId],
    queryFn: () => getProducts(shopId),
    enabled: !!shopId,
    select: (data) => data.filter(p => p.status === 'Active'),
  })

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [commissionRate, setCommissionRate] = useState(10)
  const [status, setStatus] = useState<'active' | 'inactive'>('active')
  const [assignedProducts, setAssignedProducts] = useState<string[]>([])

  const createMut = useMutation({
    mutationFn: () => createAffiliate(shopId, {
      name,
      email,
      code,
      commission_rate: commissionRate,
      status,
      assigned_products: assignedProducts,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['affiliates', shopId] })
      router.push('/storefront/affiliates?created=1')
    },
  })

  const toggleProduct = (id: string) => {
    setAssignedProducts(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  const handleCreate = () => {
    setTried(true)
    if (!name.trim() || !code.trim() || createMut.isPending) return
    createMut.mutate()
  }

  return (
    <MyStoreShell>
      {createMut.isPending && <SavingOverlay message="Creating affiliate..." />}

      <div className="page-header">
        <Link href="/storefront/affiliates" className="back-btn"><BackIcon /> Affiliates</Link>
        <div className="page-actions">
          <Link href="/storefront/affiliates" className="btn-secondary" style={{ textDecoration: 'none' }}>Cancel</Link>
          <button className="btn-primary" onClick={handleCreate} disabled={createMut.isPending} style={{ opacity: createMut.isPending ? 0.6 : 1 }}>Save</button>
        </div>
      </div>

      <div className="page-scroll">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Affiliate Details</div>
            <div className="form-group">
              <label className="form-label">Name <span style={{ color: 'var(--negative)' }}>*</span></label>
              <input className={`form-input${tried && !name.trim() ? ' error' : ''}`} value={name} onChange={e => setName(e.target.value)} placeholder="Full name" />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Affiliate Code <span style={{ color: 'var(--negative)' }}>*</span></label>
              <input className={`form-input${tried && !code.trim() ? ' error' : ''}`} value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="e.g. SARAH" style={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.06em' }} />
            </div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Commission &amp; Status</div>
            <div className="form-group">
              <label className="form-label">Commission Rate (%)</label>
              <input className="form-input" type="number" min={0} max={100} value={commissionRate} onChange={e => setCommissionRate(parseFloat(e.target.value) || 0)} />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <CustomSelect value={status} onChange={v => setStatus(v as 'active' | 'inactive')} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Assigned Products</div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{assignedProducts.length} selected</span>
          </div>
          {products.length === 0 ? (
            <div className="empty-state">No active products in catalog</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
              {products.map(p => {
                const assigned = assignedProducts.includes(p.id)
                return (
                  <div key={p.id} style={{ border: `1.5px solid ${assigned ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 10, overflow: 'hidden', background: assigned ? 'color-mix(in srgb, var(--accent) 5%, var(--bg-card))' : 'var(--bg-card)', transition: 'border-color 0.15s' }}>
                    <div style={{ aspectRatio: '1', background: 'var(--bg)', overflow: 'hidden' }}>
                      {p.main_image ? (
                        <img src={p.main_image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 11 }}>No image</div>
                      )}
                    </div>
                    <div style={{ padding: '10px' }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.pricing_type}</div>
                      <button
                        onClick={() => toggleProduct(p.id)}
                        style={{ width: '100%', padding: '5px 0', borderRadius: 6, fontSize: 11.5, fontWeight: 600, fontFamily: 'var(--font)', cursor: 'pointer', border: assigned ? 'none' : '1.5px solid var(--accent)', background: assigned ? 'var(--accent)' : 'transparent', color: assigned ? '#fff' : 'var(--accent)', transition: 'all 0.15s' }}
                      >
                        {assigned ? 'Remove' : 'Add to Affiliate'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </MyStoreShell>
  )
}
