'use client'

import { useState } from 'react'
import MyStoreShell from '@/components/MyStoreShell'
import ConfirmModal from '@/components/ConfirmModal'
import RowMenu from '@/components/RowMenu'
import { getMemberships, createMembership, updateMembership, deleteMembership, type DbMembership } from '@/lib/db/memberships'
import { useShop } from '@/providers/shop-provider'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

/* ── Icons ─────────────────────────────────────────── */
const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)
const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)

function fmt(n: number) {
  return `RM ${(n ?? 0).toLocaleString('en-MY', { minimumFractionDigits: 0 })}`
}

interface TierForm {
  name: string
  price: string
  discountRate: string
  durationMonths: string
  description: string
}

const emptyForm: TierForm = { name: '', price: '', discountRate: '', durationMonths: '12', description: '' }

/* ════════════════════════════════════════════════════ */
export default function MembershipPage() {
  const { shopId } = useShop()
  const qc = useQueryClient()

  const { data: tiers = [] } = useQuery({
    queryKey: ['memberships', shopId],
    queryFn: () => getMemberships(shopId),
    enabled: !!shopId,
  })

  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<TierForm>(emptyForm)
  const [tried, setTried] = useState(false)
  const [delId, setDelId] = useState<string | null>(null)

  const createMut = useMutation({
    mutationFn: (data: Parameters<typeof createMembership>[1]) => createMembership(shopId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['memberships', shopId] }),
    onError: (err: any) => {
      console.error('[createMembership]', err)
      alert('Failed to create: ' + (err?.message || 'Unknown error'))
    },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof updateMembership>[2] }) => updateMembership(shopId, id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['memberships', shopId] }),
    onError: (err: any) => {
      console.error('[updateMembership]', err)
      alert('Failed to update: ' + (err?.message || 'Unknown error'))
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteMembership(shopId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['memberships', shopId] }),
    onError: (err: any) => {
      console.error('[deleteMembership]', err)
      alert('Failed to delete: ' + (err?.message || 'Unknown error'))
    },
  })

  const openAdd = () => {
    setEditId(null)
    setForm(emptyForm)
    setTried(false)
    setModalOpen(true)
  }

  const openEdit = (tier: DbMembership) => {
    setEditId(tier.id)
    setForm({
      name: tier.name,
      price: tier.price.toString(),
      discountRate: tier.discount_rate.toString(),
      durationMonths: tier.duration_months.toString(),
      description: tier.description || '',
    })
    setTried(false)
    setModalOpen(true)
  }

  const handleSave = () => {
    setTried(true)
    if (!form.name.trim() || !form.price || !form.discountRate || !form.durationMonths) return

    const data = {
      name: form.name.trim(),
      price: parseFloat(form.price) || 0,
      discount_rate: parseFloat(form.discountRate) || 0,
      duration_months: parseInt(form.durationMonths) || 12,
      description: form.description.trim(),
    }

    if (editId) {
      updateMut.mutate({ id: editId, updates: data })
    } else {
      createMut.mutate(data)
    }

    setModalOpen(false)
  }

  const handleDelete = () => {
    if (delId) {
      deleteMut.mutate(delId)
      setDelId(null)
    }
  }

  return (
    <MyStoreShell>
      <div className="page-header">
        <div>
          <div className="page-title">Membership Tiers</div>
          <div className="page-subtitle">Manage membership plans customers can purchase for order discounts</div>
        </div>
        <div className="page-actions">
          <button className="btn-primary" onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <PlusIcon /> New Tier
          </button>
        </div>
      </div>

      <div className="page-scroll">
        {/* Stats */}
        <div className="finance-stats">
          <div className="stat-card">
            <div className="stat-card-header"><div className="stat-card-label">Total Tiers</div></div>
            <div className="stat-value">{tiers.length}</div>
            <div className="stat-vs">membership plans</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-header"><div className="stat-card-label">Lowest Price</div></div>
            <div className="stat-value" style={{ color: '#16a34a' }}>{tiers.length > 0 ? fmt(Math.min(...tiers.map(t => t.price))) : '—'}</div>
            <div className="stat-vs">entry tier</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-header"><div className="stat-card-label">Highest Price</div></div>
            <div className="stat-value" style={{ color: 'var(--purple-text)' }}>{tiers.length > 0 ? fmt(Math.max(...tiers.map(t => t.price))) : '—'}</div>
            <div className="stat-vs">premium tier</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-header"><div className="stat-card-label">Max Discount</div></div>
            <div className="stat-value" style={{ color: '#d97706' }}>{tiers.length > 0 ? `${Math.max(...tiers.map(t => t.discount_rate))}%` : '—'}</div>
            <div className="stat-vs">best savings</div>
          </div>
        </div>

        {/* Table */}
        <div className="card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tier Name</th>
                <th>Price</th>
                <th>Discount</th>
                <th>Duration</th>
                <th>Description</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tiers.length === 0 && (
                <tr><td colSpan={6}><div className="empty-state">No membership tiers yet. Click &quot;New Tier&quot; to create one.</div></td></tr>
              )}
              {tiers.map(t => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{t.name}</td>
                  <td style={{ fontWeight: 600, fontSize: 13, color: 'var(--accent)' }}>{fmt(t.price)}</td>
                  <td style={{ fontWeight: 600, fontSize: 13 }}>{t.discount_rate}%</td>
                  <td style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{t.duration_months} months</td>
                  <td style={{ fontSize: 12.5, color: 'var(--text-secondary)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description || '—'}</td>
                  <td onClick={e => e.stopPropagation()}>
                    <RowMenu items={[
                      { label: 'Edit', action: () => openEdit(t) },
                      { label: 'Delete', action: () => setDelId(t.id), danger: true },
                    ]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add/Edit Modal ── */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <div className="modal-title">{editId ? 'Edit Tier' : 'New Membership Tier'}</div>
              <button className="modal-close" onClick={() => setModalOpen(false)}><CloseIcon /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Tier Name <span style={{ color: 'var(--negative)' }}>*</span></label>
                <input className={`form-input${tried && !form.name.trim() ? ' error' : ''}`} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Gold" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Price (RM) <span style={{ color: 'var(--negative)' }}>*</span></label>
                  <input className={`form-input${tried && !form.price ? ' error' : ''}`} type="number" min={0} value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="e.g. 999" />
                </div>
                <div className="form-group">
                  <label className="form-label">Discount Rate (%) <span style={{ color: 'var(--negative)' }}>*</span></label>
                  <input className={`form-input${tried && !form.discountRate ? ' error' : ''}`} type="number" min={0} max={100} value={form.discountRate} onChange={e => setForm(f => ({ ...f, discountRate: e.target.value }))} placeholder="e.g. 20" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Duration (months) <span style={{ color: 'var(--negative)' }}>*</span></label>
                <input className={`form-input${tried && !form.durationMonths ? ' error' : ''}`} type="number" min={1} value={form.durationMonths} onChange={e => setForm(f => ({ ...f, durationMonths: e.target.value }))} placeholder="e.g. 12" />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-input" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description of this tier" style={{ resize: 'vertical' }} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSave}>{editId ? 'Save Changes' : 'Create Tier'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Delete ── */}
      {delId && (
        <ConfirmModal
          title="Delete Membership Tier"
          message={`Permanently delete "${tiers.find(t => t.id === delId)?.name ?? 'this tier'}"? Existing members with this tier will not be affected.`}
          onConfirm={handleDelete}
          onCancel={() => setDelId(null)}
        />
      )}
    </MyStoreShell>
  )
}
