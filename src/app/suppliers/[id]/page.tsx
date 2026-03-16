'use client'

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import ConfirmModal from '@/components/ConfirmModal'
import CustomSelect from '@/components/CustomSelect'
import { getSupplierById, updateSupplier, deleteSupplier, type DbSupplier } from '@/lib/db/inventory'
import { useShop } from '@/providers/shop-provider'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import SavingOverlay from '@/components/SavingOverlay'

const BackIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>)

const RATING_BADGE: Record<string, string> = { A: 'badge badge-success', B: 'badge badge-info', C: 'badge badge-warning' }
const RATINGS: DbSupplier['rating'][] = ['A', 'B', 'C']
const REGIONS = ['KL', 'Selangor', 'Penang', 'Johor', 'Sabah', 'Sarawak', 'Other']
const PAYMENT_TERMS = ['COD', 'PIA', 'Net 7', 'Net 15', 'Net 30', 'Net 45', 'Net 60']

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

type DraftSupplier = {
  name: string; contact_person: string; contact: string; phone: string
  region: string; rating: string; lead: string; payment_terms: string; address: string; notes: string
}

function supplierToDraft(s: DbSupplier): DraftSupplier {
  return { name: s.name, contact_person: s.contact_person, contact: s.contact, phone: s.phone, region: s.region, rating: s.rating, lead: s.lead, payment_terms: s.payment_terms, address: s.address, notes: s.notes }
}

export default function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { shopId } = useShop()
  const qc = useQueryClient()

  const { data: supplier, isLoading } = useQuery({
    queryKey: ['supplier', shopId, id],
    queryFn: () => getSupplierById(shopId, id),
    enabled: !!shopId,
  })

  const [draft, setDraft]       = useState<DraftSupplier | null>(null)
  const [orig, setOrig]         = useState<DraftSupplier | null>(null)
  const [showDel, setShowDel]   = useState(false)
  const [saving, setSaving]     = useState(false)

  if (supplier && !draft) {
    const d = supplierToDraft(supplier)
    setDraft(d)
    setOrig(d)
  }

  const updateMutation = useMutation({
    mutationFn: (updates: Parameters<typeof updateSupplier>[2]) => updateSupplier(shopId, id, updates),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers', shopId] }); router.push('/suppliers?saved=1') },
    onError: (err: any) => {
      console.error('[updateSupplier]', err)
      setSaving(false)
      alert('Failed to save: ' + (err?.message || 'Unknown error'))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteSupplier(shopId, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers', shopId] }); router.push('/suppliers') },
    onError: (err: any) => {
      console.error('[deleteSupplier]', err)
      alert('Failed to delete: ' + (err?.message || 'Unknown error'))
    },
  })

  if (isLoading) {
    return <AppShell><Link href="/suppliers" className="back-btn"><BackIcon /> Suppliers</Link><div className="empty-state" style={{ paddingTop: 80 }}>Loading...</div></AppShell>
  }

  if (!supplier) {
    return (
      <AppShell>
        <Link href="/suppliers" className="back-btn"><BackIcon /> Suppliers</Link>
        <div className="empty-state" style={{ paddingTop: 80 }}>Supplier not found</div>
      </AppShell>
    )
  }

  const field = <K extends keyof DraftSupplier>(key: K, value: DraftSupplier[K]) => {
    setDraft(prev => prev ? { ...prev, [key]: value } : prev)
  }

  const handleSave = () => {
    if (!draft || !dirty || saving) return
    setSaving(true)
    updateMutation.mutate({
      name: draft.name, contact_person: draft.contact_person, contact: draft.contact, phone: draft.phone,
      region: draft.region, rating: draft.rating, lead: draft.lead, payment_terms: draft.payment_terms, address: draft.address, notes: draft.notes,
    })
  }

  const handleDelete = () => {
    deleteMutation.mutate()
  }

  const d = draft ?? supplierToDraft(supplier)
  const dirty = draft !== null && orig !== null && JSON.stringify(draft) !== JSON.stringify(orig)

  return (
    <AppShell>
      {saving && <SavingOverlay message="Saving changes…" />}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <Link href="/suppliers" className="back-btn"><BackIcon /> Suppliers</Link>
        <div className="page-actions">
          <button className="btn-secondary" onClick={() => setShowDel(true)} style={{ color: 'var(--negative)' }}>Delete</button>
          <Link href="/suppliers" className="btn-secondary" style={{ textDecoration: 'none' }}>Cancel</Link>
          <button className="btn-primary" onClick={handleSave} disabled={saving || !dirty} style={{ opacity: (saving || !dirty) ? 0.5 : 1 }}>Save Changes</button>
        </div>
      </div>

      {/* Profile header */}
      <div className="profile-card">
        <div className="profile-left">
          <div className="profile-avatar">{initials(d.name)}</div>
          <div>
            <div className="profile-name">{d.name}</div>
            <div className="profile-meta">
              <span>{supplier.seq_id}</span>
              <span>·</span>
              <span>{d.region}</span>
              <span>·</span>
              <span>Lead: {d.lead}</span>
            </div>
          </div>
        </div>
        <div className="profile-actions">
          {draft && <CustomSelect value={draft.rating} onChange={v => field('rating', v as DbSupplier['rating'])} options={RATINGS} />}
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-label">Rating</div></div>
          <div className="stat-value" style={{ fontSize: 28 }}>{d.rating}</div>
          <div className="stat-vs"><span className={RATING_BADGE[d.rating]}>{d.rating}-Rated</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-label">Lead Time</div></div>
          <div className="stat-value" style={{ fontSize: 20 }}>{d.lead || '—'}</div>
          <div className="stat-vs">Delivery time</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-label">Payment Terms</div></div>
          <div className="stat-value" style={{ fontSize: 20 }}>{d.payment_terms || '—'}</div>
          <div className="stat-vs">Terms agreed</div>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-main">
          <div className="card">
            <div className="card-header"><div className="card-title">Contact Details</div></div>
            {draft && (
              <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group"><label className="form-label">Company Name</label><input className="form-input" value={draft.name} onChange={e => field('name', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Contact Person</label><input className="form-input" value={draft.contact_person} onChange={e => field('contact_person', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={draft.contact} onChange={e => field('contact', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={draft.phone} onChange={e => field('phone', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Region</label><CustomSelect value={draft.region} onChange={v => field('region', v)} options={REGIONS} /></div>
                <div className="form-group"><label className="form-label">Lead Time</label><input className="form-input" value={draft.lead} onChange={e => field('lead', e.target.value)} placeholder="e.g. 3 days" /></div>
                <div className="form-group"><label className="form-label">Payment Terms</label><CustomSelect value={draft.payment_terms} onChange={v => field('payment_terms', v)} options={PAYMENT_TERMS} /></div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Address</label><input className="form-input" value={draft.address} onChange={e => field('address', e.target.value)} /></div>
              </div>
            )}
          </div>
        </div>

        <div className="detail-side">
          <div className="card">
            <div className="card-header"><div className="card-title">Notes</div></div>
            <div style={{ padding: '14px 20px' }}>
              {draft && <textarea className="form-input" rows={5} value={draft.notes} onChange={e => field('notes', e.target.value)} placeholder="Add notes…" style={{ resize: 'vertical' }} />}
            </div>
          </div>
        </div>
      </div>

      {showDel && (
        <ConfirmModal title={`Delete ${supplier.name}?`} message="This will permanently remove this supplier. This action cannot be undone." confirmLabel="Delete Supplier" onConfirm={handleDelete} onCancel={() => setShowDel(false)} />
      )}
    </AppShell>
  )
}
