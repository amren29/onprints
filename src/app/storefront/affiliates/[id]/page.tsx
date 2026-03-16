'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import MyStoreShell from '@/components/MyStoreShell'
import SavingOverlay from '@/components/SavingOverlay'
import ConfirmModal from '@/components/ConfirmModal'
import CustomSelect from '@/components/CustomSelect'
import { getAffiliateById, updateAffiliate, deleteAffiliate, getAffiliateOrdersByAffiliate, type DbAffiliate, type DbAffiliateOrder } from '@/lib/db/affiliates'
import { getPayoutRequests, type DbPayoutRequest } from '@/lib/db/affiliates'
import { getProducts, type DbProduct } from '@/lib/db/catalog'
import { useShop } from '@/providers/shop-provider'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const BackIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
)

const STATUS_BADGE: Record<string, string> = {
  active: 'badge badge-success',
  inactive: 'badge badge-pending',
}

function fmt(n: number) {
  return `RM ${(n ?? 0).toLocaleString('en-MY', { minimumFractionDigits: 0 })}`
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

export default function AffiliateDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const { shopId } = useShop()
  const qc = useQueryClient()

  const { data: affiliate, isLoading } = useQuery({
    queryKey: ['affiliates', shopId, id],
    queryFn: () => getAffiliateById(shopId, id),
    enabled: !!shopId && !!id,
  })

  const { data: orders = [] } = useQuery({
    queryKey: ['affiliate-orders', shopId, id],
    queryFn: () => getAffiliateOrdersByAffiliate(shopId, id),
    enabled: !!shopId && !!id,
  })

  const { data: allPayouts = [] } = useQuery({
    queryKey: ['payout-requests', shopId],
    queryFn: () => getPayoutRequests(shopId),
    enabled: !!shopId,
  })

  const { data: catalogProducts = [] } = useQuery({
    queryKey: ['products', shopId],
    queryFn: () => getProducts(shopId),
    enabled: !!shopId,
    select: (data) => data.filter(p => p.status === 'Active'),
  })

  const payouts = allPayouts.filter(p => p.affiliate_code === affiliate?.code)

  const [showDelete, setShowDelete] = useState(false)
  const [tried, setTried] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [commissionRate, setCommissionRate] = useState(0)
  const [status, setStatus] = useState('active')
  const [assignedProducts, setAssignedProducts] = useState<string[]>([])

  // Hydrate form from affiliate data
  if (affiliate && !hydrated) {
    setName(affiliate.name)
    setEmail(affiliate.email)
    setCode(affiliate.code)
    setCommissionRate(affiliate.commission_rate)
    setStatus(affiliate.status)
    setAssignedProducts(affiliate.assigned_products || [])
    setHydrated(true)
  }

  const updateMut = useMutation({
    mutationFn: () => updateAffiliate(shopId, id, {
      name,
      email,
      code,
      commission_rate: commissionRate,
      status,
      assigned_products: assignedProducts,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['affiliates', shopId] })
      router.push('/storefront/affiliates?saved=1')
    },
    onError: (err: any) => {
      console.error('[updateAffiliate]', err)
      alert('Failed to save: ' + (err?.message || 'Unknown error'))
    },
  })

  const deleteMut = useMutation({
    mutationFn: () => deleteAffiliate(shopId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['affiliates', shopId] })
      router.push('/storefront/affiliates')
    },
    onError: (err: any) => {
      console.error('[deleteAffiliate]', err)
      alert('Failed to delete: ' + (err?.message || 'Unknown error'))
    },
  })

  if (!isLoading && !affiliate) {
    return (
      <MyStoreShell>
        <div className="page-header">
          <Link href="/storefront/affiliates" className="back-btn"><BackIcon /> Affiliates</Link>
        </div>
        <div className="empty-state" style={{ paddingTop: 80 }}>Affiliate not found</div>
      </MyStoreShell>
    )
  }

  if (!affiliate) return <MyStoreShell><div style={{ padding: 40 }}>Loading...</div></MyStoreShell>

  const toggleProduct = (pid: string) => {
    setAssignedProducts(prev =>
      prev.includes(pid) ? prev.filter(s => s !== pid) : [...prev, pid]
    )
  }

  const handleSave = () => {
    setTried(true)
    if (!name.trim() || updateMut.isPending) return
    updateMut.mutate()
  }

  const handleDelete = () => {
    deleteMut.mutate()
  }

  const totalReferred = orders.length
  const totalRevenue = orders.reduce((s, o) => s + o.order_total, 0)
  const totalPaid = payouts.reduce((s, p) => s + p.commission_amount, 0)
  const totalEarned = orders.reduce((s, o) => s + o.order_total * (commissionRate / 100), 0)

  return (
    <MyStoreShell>
      {updateMut.isPending && <SavingOverlay message="Saving changes..." />}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <Link href="/storefront/affiliates" className="back-btn"><BackIcon /> Affiliates</Link>
        <div className="page-actions">
          <button className="btn-secondary" onClick={() => setShowDelete(true)} style={{ color: 'var(--negative)' }}>Delete</button>
          <Link href="/storefront/affiliates" className="btn-secondary" style={{ textDecoration: 'none' }}>Cancel</Link>
          <button className="btn-primary" onClick={handleSave}>Save Changes</button>
        </div>
      </div>

      <div className="page-scroll">
        {/* Profile card */}
        <div className="profile-card" style={{ marginBottom: 16 }}>
          <div className="profile-left">
            <div className="profile-avatar">{initials(name || '?')}</div>
            <div>
              <div className="profile-name">{name || '\u2014'}</div>
              <div className="profile-meta">
                <span>{affiliate.id}</span>
                <span>&middot;</span>
                <span>{code}</span>
                <span>&middot;</span>
                <span>{commissionRate}% Commission</span>
              </div>
            </div>
          </div>
          <span className={STATUS_BADGE[status] || 'badge badge-pending'}>{status}</span>
        </div>

        {/* Stat cards */}
        <div className="finance-stats" style={{ marginBottom: 16 }}>
          <div className="stat-card">
            <div className="stat-card-label">Referred Orders</div>
            <div className="stat-value" style={{ fontSize: 18 }}>{totalReferred}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Order Revenue</div>
            <div className="stat-value" style={{ fontSize: 18 }}>{fmt(totalRevenue)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Total Earned</div>
            <div className="stat-value" style={{ fontSize: 18 }}>{fmt(Math.round(totalEarned * 100) / 100)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Total Paid</div>
            <div className="stat-value" style={{ fontSize: 18, color: 'var(--positive)' }}>{fmt(Math.round(totalPaid * 100) / 100)}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          {/* Affiliate Details */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Affiliate Details</div>
            <div className="form-group">
              <label className="form-label">Name <span style={{ color: 'var(--negative)' }}>*</span></label>
              <input className={`form-input${tried && !name.trim() ? ' error' : ''}`} value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Affiliate Code</label>
              <input className="form-input" value={code} onChange={e => setCode(e.target.value.toUpperCase())} />
            </div>
            <div className="form-group">
              <label className="form-label">Created</label>
              <input className="form-input" value={affiliate.created_at} readOnly style={{ opacity: 0.7 }} />
            </div>
          </div>

          {/* Commission & Status */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Commission & Status</div>
            <div className="form-group">
              <label className="form-label">Commission Rate (%)</label>
              <input className="form-input" type="number" min={0} max={100} value={commissionRate} onChange={e => setCommissionRate(parseFloat(e.target.value) || 0)} />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <CustomSelect value={status} onChange={v => setStatus(v)} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
            </div>
          </div>
        </div>

        {/* Assigned Products */}
        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Assigned Products</div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{assignedProducts.length} selected</span>
          </div>
          {catalogProducts.length === 0 ? (
            <div className="empty-state">No active products in catalog</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
              {catalogProducts.map(p => {
                const assigned = assignedProducts.includes(p.id)
                return (
                  <div key={p.id} style={{ border: `1.5px solid ${assigned ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 10, overflow: 'hidden', background: assigned ? 'color-mix(in srgb, var(--accent) 5%, var(--bg-card))' : 'var(--bg-card)', transition: 'border-color 0.15s' }}>
                    <div style={{ aspectRatio: '1', background: 'var(--bg)', overflow: 'hidden' }}>
                      {p.main_image ? (
                        <img src={p.main_image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 11 }}>
                          No image
                        </div>
                      )}
                    </div>
                    <div style={{ padding: '10px 10px 10px' }}>
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

        {/* Referred Orders */}
        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Referred Orders</div>
          {orders.length === 0 ? (
            <div className="empty-state">No referred orders yet</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ref #</th>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 600, fontSize: 13 }}>{o.id}</td>
                    <td><span style={{ fontSize: 12.5, color: 'var(--accent)', fontWeight: 500 }}>{o.order_id}</span></td>
                    <td style={{ fontSize: 13 }}>{o.customer_name}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, fontSize: 13 }}>{fmt(o.order_total)}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{o.order_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Payout History */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Payout History</div>
          {payouts.length === 0 ? (
            <div className="empty-state">No payouts yet</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ref #</th>
                  <th>Rate</th>
                  <th>Orders</th>
                  <th style={{ textAlign: 'right' }}>Order Total</th>
                  <th style={{ textAlign: 'right' }}>Commission</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600, fontSize: 13 }}>{p.id}</td>
                    <td style={{ fontSize: 13 }}>{p.commission_rate}%</td>
                    <td style={{ fontSize: 13 }}>{p.order_ids.length}</td>
                    <td style={{ textAlign: 'right', fontSize: 13 }}>{fmt(p.order_total)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, fontSize: 13, color: 'var(--positive)' }}>{fmt(p.commission_amount)}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showDelete && (
        <ConfirmModal
          title={`Delete ${affiliate.id}?`}
          message={`This will permanently remove ${name} (${code}). This action cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
        />
      )}
    </MyStoreShell>
  )
}
