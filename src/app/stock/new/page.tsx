'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import SavingOverlay from '@/components/SavingOverlay'
import CustomSelect from '@/components/CustomSelect'
import { createStockItem } from '@/lib/db/inventory'
import { useShop } from '@/providers/shop-provider'

const BackIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>)

const UNITS = ['Reams', 'Rolls', 'Sets', 'Packs', 'Sheets', 'Boxes', 'Cartridge', 'Units']

export default function NewStockPage() {
  const router = useRouter()
  const { shopId } = useShop()
  const [saving, setSaving] = useState(false)
  const [tried, setTried] = useState(false)

  const [name, setName]               = useState('')
  const [sku, setSku]                 = useState('')
  const [unit, setUnit]               = useState('Reams')
  const [supplier, setSupplier]       = useState('')
  const [reorderLevel, setReorder]    = useState(10)
  const [currentStock, setCurrent]    = useState(0)
  const [notes, setNotes]             = useState('')

  const handleCreate = async () => {
    setTried(true)
    if (!name.trim() || saving) return
    setSaving(true)
    try {
      await createStockItem(shopId, { name, sku, unit, supplier, reorder_level: reorderLevel, current_stock: currentStock, notes })
      router.push('/stock?created=1')
    } catch { setSaving(false) }
  }

  return (
    <AppShell>
      {saving && <SavingOverlay message="Creating stock item…" />}

      <div className="page-header">
        <Link href="/stock" className="back-btn"><BackIcon /> Stock</Link>
        <div className="page-actions">
          <Link href="/stock" className="btn-secondary" style={{ textDecoration: 'none' }}>Cancel</Link>
          <button className="btn-primary" onClick={handleCreate} disabled={saving} style={{ opacity: saving ? 0.6 : 1 }}>Save</button>
        </div>
      </div>

      <div className="page-scroll">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Item Details</div>
            <div className="form-group"><label className="form-label">Name *</label><input className={`form-input${tried && !name.trim() ? ' error' : ''}`} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. A4 Glossy Paper 130gsm" /></div>
            <div className="form-group"><label className="form-label">SKU</label><input className="form-input" value={sku} onChange={e => setSku(e.target.value)} placeholder="e.g. PAP-A4-130G" /></div>
            <div className="form-group"><label className="form-label">Unit</label><CustomSelect value={unit} onChange={setUnit} options={UNITS} /></div>
            <div className="form-group"><label className="form-label">Supplier</label><input className="form-input" value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="e.g. PaperWorld Sdn" /></div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Stock Levels</div>
            <div className="form-group"><label className="form-label">Current Stock</label><input className="form-input" type="number" min={0} value={currentStock} onChange={e => setCurrent(Number(e.target.value))} /></div>
            <div className="form-group"><label className="form-label">Reorder Level</label><input className="form-input" type="number" min={0} value={reorderLevel} onChange={e => setReorder(Number(e.target.value))} /></div>
            <div className="form-group"><label className="form-label">Notes</label><textarea className="form-input" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Internal notes…" style={{ resize: 'vertical' }} /></div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
