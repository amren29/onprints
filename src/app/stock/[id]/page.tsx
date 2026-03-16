'use client'

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import SavingOverlay from '@/components/SavingOverlay'
import ConfirmModal from '@/components/ConfirmModal'
import CustomSelect from '@/components/CustomSelect'
import { getStockItemById, updateStockItem, deleteStockItem, type DbStockItem } from '@/lib/db/inventory'
import { useShop } from '@/providers/shop-provider'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const BackIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>)

const STATUS_BADGE: Record<string, string> = { Healthy: 'badge badge-success', Low: 'badge badge-warning', Critical: 'badge badge-danger' }
const UNITS = ['Reams', 'Rolls', 'Sets', 'Packs', 'Sheets', 'Boxes', 'Cartridge', 'Units']

function StockBar({ current, reorder }: { current: number; reorder: number }) {
  const max   = Math.max(current, reorder * 3)
  const pct   = Math.min(100, Math.round((current / max) * 100))
  const color = current < reorder ? '#ef4444' : current < reorder * 1.8 ? '#f59e0b' : '#006AFF'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', minWidth: 32 }}>{current}</span>
    </div>
  )
}

type DraftItem = {
  name: string; sku: string; unit: string; supplier: string
  current_stock: number; reorder_level: number; notes: string; status: string
}

function itemToDraft(s: DbStockItem): DraftItem {
  return { name: s.name, sku: s.sku, unit: s.unit, supplier: s.supplier, current_stock: s.current_stock, reorder_level: s.reorder_level, notes: s.notes, status: s.status }
}

export default function StockDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { shopId } = useShop()
  const qc = useQueryClient()

  const { data: item, isLoading } = useQuery({
    queryKey: ['stock-item', shopId, id],
    queryFn: () => getStockItemById(shopId, id),
    enabled: !!shopId,
  })

  const [draft, setDraft]     = useState<DraftItem | null>(null)
  const [orig, setOrig]       = useState<DraftItem | null>(null)
  const [showDel, setShowDel] = useState(false)
  const [saving, setSaving] = useState(false)

  // Seed draft when item loads
  if (item && !draft) {
    const d = itemToDraft(item)
    setDraft(d)
    setOrig(d)
  }

  const updateMutation = useMutation({
    mutationFn: (updates: Parameters<typeof updateStockItem>[2]) => updateStockItem(shopId, id, updates),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stock-items', shopId] }); router.push('/stock?saved=1') },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteStockItem(shopId, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stock-items', shopId] }); router.push('/stock') },
  })

  if (isLoading) {
    return <AppShell><Link href="/stock" className="back-btn"><BackIcon /> Stock</Link><div className="empty-state" style={{ paddingTop: 80 }}>Loading...</div></AppShell>
  }

  if (!item) {
    return (
      <AppShell>
        <Link href="/stock" className="back-btn"><BackIcon /> Stock</Link>
        <div className="empty-state" style={{ paddingTop: 80 }}>Item not found</div>
      </AppShell>
    )
  }

  const field = <K extends keyof DraftItem>(key: K, value: DraftItem[K]) => {
    setDraft(prev => prev ? { ...prev, [key]: value } : prev)
  }

  const handleSave = async () => {
    if (!draft || !dirty || saving) return
    setSaving(true)
    updateMutation.mutate({
      name: draft.name, sku: draft.sku, unit: draft.unit, supplier: draft.supplier,
      current_stock: draft.current_stock, reorder_level: draft.reorder_level, notes: draft.notes,
    })
  }

  const handleDelete = () => {
    deleteMutation.mutate()
  }

  const d = draft ?? itemToDraft(item)
  const dirty = draft !== null && orig !== null && JSON.stringify(draft) !== JSON.stringify(orig)

  return (
    <AppShell>
      {saving && <SavingOverlay message="Saving changes…" />}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <Link href="/stock" className="back-btn"><BackIcon /> Stock</Link>
        <div className="page-actions">
          <button className="btn-secondary" onClick={() => setShowDel(true)} style={{ color: 'var(--negative)' }}>Delete</button>
          <Link href="/stock" className="btn-secondary" style={{ textDecoration: 'none' }}>Cancel</Link>
          <button className="btn-primary" onClick={handleSave} disabled={saving || !dirty} style={{ opacity: (saving || !dirty) ? 0.5 : 1 }}>Save Changes</button>
        </div>
      </div>

      {/* Header */}
      <div className="profile-card">
        <div className="profile-left">
          <div className="profile-avatar" style={{ fontSize: 11 }}>{d.sku.slice(0, 3)}</div>
          <div>
            <div className="profile-name">{d.name}</div>
            <div className="profile-meta"><span>{item.seq_id}</span><span>·</span><span>{d.sku}</span><span>·</span><span>{d.supplier}</span></div>
          </div>
        </div>
        <div className="profile-actions">
          <span className={STATUS_BADGE[d.status]}>{d.status}</span>
        </div>
      </div>

      {/* Stock level summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-label">Current Stock</div></div>
          <div className="stat-value" style={{ fontSize: 22 }}>{d.current_stock}</div>
          <div className="stat-vs">{d.unit} on hand</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-label">Reorder Level</div></div>
          <div className="stat-value" style={{ fontSize: 22 }}>{d.reorder_level}</div>
          <div className="stat-vs">Minimum threshold</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-label">Stock Level</div></div>
          <div style={{ padding: '8px 0' }}><StockBar current={d.current_stock} reorder={d.reorder_level} /></div>
          <div className="stat-vs">{d.status}</div>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-main">
          <div className="card">
            <div className="card-header"><div className="card-title">Item Details</div></div>
            {draft && (
              <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group"><label className="form-label">Name</label><input className="form-input" value={draft.name} onChange={e => field('name', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">SKU</label><input className="form-input" value={draft.sku} onChange={e => field('sku', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Unit</label><CustomSelect value={draft.unit} onChange={v => field('unit', v)} options={UNITS} /></div>
                <div className="form-group"><label className="form-label">Supplier</label><input className="form-input" value={draft.supplier} onChange={e => field('supplier', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Current Stock</label><input className="form-input" type="number" min={0} value={draft.current_stock} onChange={e => field('current_stock', Number(e.target.value))} /></div>
                <div className="form-group"><label className="form-label">Reorder Level</label><input className="form-input" type="number" min={0} value={draft.reorder_level} onChange={e => field('reorder_level', Number(e.target.value))} /></div>
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
        <ConfirmModal title={`Delete ${item.seq_id}?`} message={`This will permanently remove "${item.name}".`} confirmLabel="Delete Item" onConfirm={handleDelete} onCancel={() => setShowDel(false)} />
      )}
    </AppShell>
  )
}
