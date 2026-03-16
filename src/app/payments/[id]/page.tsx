'use client'

import { useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import ConfirmModal from '@/components/ConfirmModal'
import SavingOverlay from '@/components/SavingOverlay'
import type { DbPayment } from '@/lib/db/payments'
import CustomSelect from '@/components/CustomSelect'
import { useShop } from '@/providers/shop-provider'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const BackIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
)

type PaymentStatus = 'Captured' | 'Pending' | 'Failed'
const STATUSES: PaymentStatus[] = ['Captured', 'Pending', 'Failed']
const METHODS = ['Credit Card', 'Bank Transfer', 'Cash', 'Cheque', 'Online']
const STATUS_BADGE: Record<string, string> = { Captured: 'badge badge-success', Pending: 'badge badge-warning', Failed: 'badge badge-danger' }
function initials(name: string) { return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() }

export default function PaymentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const { shopId } = useShop()
  const qc = useQueryClient()

  const { data: pay, isLoading } = useQuery<DbPayment | null>({
    queryKey: ['payment', shopId, id],
    queryFn: async () => {
      const res = await fetch(`/api/payments?shopId=${shopId}`)
      if (!res.ok) throw new Error('Failed to load payment')
      const all: DbPayment[] = await res.json()
      return all.find(p => p.id === id) ?? null
    },
    enabled: !!shopId && !!id,
  })

  const updateMut = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const res = await fetch(`/api/payments?shopId=${shopId}&id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed to update') }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payment', shopId, id] })
      qc.invalidateQueries({ queryKey: ['payments', shopId] })
    },
    onError: (err: any) => {
      console.error('[updatePayment]', err)
      setSaving(false)
      alert('Failed to save: ' + (err?.message || 'Unknown error'))
    },
  })

  const deleteMut = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/payments?shopId=${shopId}&id=${id}`, { method: 'DELETE' })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed to delete') }
      return res.json()
    },
    onSuccess: () => router.push('/payments'),
    onError: (err: any) => {
      console.error('[deletePayment]', err)
      alert('Failed to delete: ' + (err?.message || 'Unknown error'))
    },
  })

  // Local draft state for editing
  const [draft, setDraft] = useState<Record<string, any> | null>(null)
  const [showDel, setShowDel] = useState(false)
  const [saving, setSaving] = useState(false)

  // Initialize draft from loaded data
  const currentPay = pay
  if (currentPay && !draft) {
    // initialize local draft on first load
    setTimeout(() => setDraft({
      client: currentPay.client,
      invoice_id: currentPay.invoice_id,
      ref: currentPay.ref,
      date: currentPay.date,
      method: currentPay.method,
      amount_due: currentPay.amount_due,
      amount_paid: currentPay.amount_paid,
      status: currentPay.status,
      notes: currentPay.notes,
    }), 0)
  }

  if (isLoading || !currentPay || !draft) {
    return <AppShell><div style={{ padding: 40 }}>Loading…</div></AppShell>
  }

  const updateField = (field: string, value: string | number) => {
    setDraft(prev => prev ? { ...prev, [field]: value } : prev)
  }

  const dirty = JSON.stringify(draft) !== JSON.stringify({
    client: currentPay.client,
    invoice_id: currentPay.invoice_id,
    ref: currentPay.ref,
    date: currentPay.date,
    method: currentPay.method,
    amount_due: currentPay.amount_due,
    amount_paid: currentPay.amount_paid,
    status: currentPay.status,
    notes: currentPay.notes,
  })

  const handleSave = () => {
    if (!draft || !dirty) return
    setSaving(true)
    updateMut.mutate({
      client: draft.client,
      invoice_id: draft.invoice_id,
      ref: draft.ref,
      date: draft.date,
      method: draft.method,
      amount_due: draft.amount_due,
      amount_paid: draft.amount_paid,
      status: draft.status,
      notes: draft.notes,
    }, {
      onSuccess: () => {
        setTimeout(() => router.push('/payments?saved=1'), 1500)
      },
    })
  }

  const handleDelete = () => {
    deleteMut.mutate()
  }

  return (
    <AppShell>
      {saving && <SavingOverlay message="Saving changes…" />}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <Link href="/payments" className="back-btn"><BackIcon /> Payments</Link>
        <div className="page-actions">
          <button className="btn-secondary" onClick={() => setShowDel(true)} style={{ color: 'var(--negative)' }}>Delete</button>
          <Link href="/payments" className="btn-secondary" style={{ textDecoration: 'none' }}>Cancel</Link>
          <button className="btn-primary" onClick={handleSave} disabled={saving || !dirty} style={{ opacity: (saving || !dirty) ? 0.5 : 1 }}>Save Changes</button>
        </div>
      </div>

      <div className="page-scroll">
        {/* Profile card */}
        <div className="profile-card" style={{ marginBottom: 16 }}>
          <div className="profile-left">
            <div className="profile-avatar">{initials(draft.client || '?')}</div>
            <div>
              <div className="profile-name">{draft.client || '—'}</div>
              <div className="profile-meta">
                <span>{draft.invoice_id || '—'}</span>
                <span>·</span>
                <span>{draft.method}</span>
                <span>·</span>
                <span>{draft.date}</span>
              </div>
            </div>
          </div>
          <div className="profile-actions">
            <CustomSelect value={draft.status} onChange={v => updateField('status', v)} options={STATUSES} style={{ width: 130 }} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Payment Info</div>
            <div className="form-group">
              <label className="form-label">Client</label>
              <input className="form-input" value={draft.client} onChange={e => updateField('client', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Invoice ID</label>
              <input className="form-input" value={draft.invoice_id} onChange={e => updateField('invoice_id', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Reference</label>
              <input className="form-input" value={draft.ref} onChange={e => updateField('ref', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-input" value={draft.date} onChange={e => updateField('date', e.target.value)} />
            </div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Amounts & Status</div>
            <div className="form-group">
              <label className="form-label">Method</label>
              <CustomSelect value={draft.method} onChange={v => updateField('method', v)} options={METHODS} />
            </div>
            <div className="form-group">
              <label className="form-label">Amount Due (RM)</label>
              <input className="form-input" type="number" min={0} step={0.01} value={draft.amount_due} onChange={e => updateField('amount_due', Number(e.target.value))} />
            </div>
            <div className="form-group">
              <label className="form-label">Amount Paid (RM)</label>
              <input className="form-input" type="number" min={0} step={0.01} value={draft.amount_paid} onChange={e => updateField('amount_paid', Number(e.target.value))} />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>Notes</div>
          <textarea
            className="form-input"
            rows={3}
            value={draft.notes}
            onChange={e => updateField('notes', e.target.value)}
            placeholder="Add internal notes…"
            style={{ resize: 'vertical' }}
          />
        </div>
      </div>

      {showDel && (
        <ConfirmModal
          title={`Delete ${currentPay.seq_id}?`}
          message={`This will permanently remove the payment record for ${currentPay.client}. This action cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setShowDel(false)}
        />
      )}
    </AppShell>
  )
}
