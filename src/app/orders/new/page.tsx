'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import SavingOverlay from '@/components/SavingOverlay'
import CustomSelect from '@/components/CustomSelect'
import DatePicker from '@/components/DatePicker'
import { createOrder as dbCreateOrder } from '@/lib/db/orders'
import { getCustomers, type DbCustomer } from '@/lib/db/customers'
import { getProducts, type DbProduct } from '@/lib/db/catalog'
import { getAgents } from '@/lib/db/agents'
import { calcBasePrice, applyModifiers } from '@/lib/option-pricing'
import { calcOrderTotals, type OrderItem } from '@/lib/order-store'
import { useShop } from '@/providers/shop-provider'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const BackIcon    = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>)
const PlusIcon    = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>)
const TrashIcon   = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>)
const EditIcon    = () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>)
const TruckIcon   = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>)
const BoxIcon     = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>)

const initials = (name: string) =>
  name.trim().split(/\s+/).map(w => w[0]?.toUpperCase() ?? '').slice(0, 2).join('')

const ACCENT_COLORS = ['#006AFF','var(--accent, #006AFF)','#7c3aed','#db2777','#ea580c','#0891b2']
const itemColor = (name: string) => ACCENT_COLORS[name.charCodeAt(0) % ACCENT_COLORS.length]

const SQFT_UNITS = [{ value: 'ft', label: 'ft' }, { value: 'in', label: 'in' }, { value: 'cm', label: 'cm' }, { value: 'm', label: 'm' }]

const fmt   = (n: number) => `RM ${n.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`
const today = () => new Date().toISOString().slice(0, 10)
const now   = () => new Date().toISOString().slice(0, 16).replace('T', ' ')
let _uid = 0
function uid(): string { return `oi-${Date.now()}-${++_uid}` }

// ── CatalogItem type (local bridge from DbProduct) ──────────────────────────

type ProductImage = { url: string; name?: string; type?: string }
type CatalogItem = {
  id: string; name: string; sku: string; status: string
  mainImage: ProductImage | null
  sizes?: any
  optionGroups?: any[]
  bulkVariant?: boolean
}

function dbProductToCatalogItem(p: DbProduct): CatalogItem {
  return {
    id: p.id, name: p.name, sku: p.sku, status: p.status,
    mainImage: p.main_image ? { url: p.main_image } : null,
    sizes: (p.sizes && Object.keys(p.sizes).length > 0) ? p.sizes : undefined,
    optionGroups: (p.option_groups && (p.option_groups as any[]).length > 0) ? p.option_groups as any[] : undefined,
    bulkVariant: p.bulk_variant,
  }
}

// ── Row & Config types ────────────────────────────────────────────────────────

type RowItem = {
  id: string
  catalogId: string
  name: string          // e.g. "Business Card (Standard) — Standard (85×54mm)"
  sku: string
  size: string          // selected size label
  optionSummary: string // "Gloss Lamination, Express (3 days)"
  qty: string
  unitPrice: string     // per-pc for volume, total for sqft
  isCustomSize: boolean
}

type ConfigState = {
  rowId: string | null   // null = new item
  item: CatalogItem
  size: string           // selected fixed size label or 'custom'
  qty: string
  qtyMode: 'preset' | 'custom'
  sel: Record<number, Set<number>>
  testW: string
  testH: string
  sizeUnit: string
}

// ── Price calculation (plain function, not a hook) ────────────────────────────

type PriceResult =
  | { ok: true;  total: number; perPc: number | null; label: string }
  | { ok: false; error: string }

function computePrice(cfg: ConfigState): PriceResult {
  const { item } = cfg
  const sizes = item.sizes
  const isCustom = cfg.size === 'custom' || sizes?.mode === 'custom'

  if (sizes && (sizes.mode === 'fixed' || sizes.mode === 'both') && !isCustom && !cfg.size)
    return { ok: false, error: 'Select a size.' }

  let br: ReturnType<typeof calcBasePrice>

  if (isCustom) {
    const w = parseFloat(cfg.testW) || 0
    const h = parseFloat(cfg.testH) || 0
    if (!w || !h) return { ok: false, error: 'Enter width and height.' }
    if (!sizes?.sqft) return { ok: false, error: 'No custom size price configured.' }
    br = calcBasePrice('sqft', 1, {
      sqft: { pricePerSqft: sizes.sqft.pricePerSqft, minCharge: sizes.sqft.minCharge || 0 },
      width: w, height: h, unit: cfg.sizeUnit as 'ft' | 'in' | 'cm' | 'm',
    })
  } else {
    const qty = parseFloat(cfg.qty) || 0
    if (qty <= 0) return { ok: false, error: 'Enter a quantity.' }
    const sizeRow = sizes?.fixed.find((s: any) => s.label === cfg.size)
    const vt = (sizeRow?.volumeTiers ?? []).map((t: any) => ({
      minQty: parseInt(t.minQty) || 0,
      unitPrice: parseFloat(t.unitPrice) || 0,
    })).filter((t: any) => t.minQty > 0 && t.unitPrice > 0)
    if (!vt.length) return { ok: false, error: 'No pricing configured for this size.' }
    // Admin orders: allow any qty, use closest tier's unit price
    const sorted = [...vt].sort((a, b) => a.minQty - b.minQty)
    const tier = [...sorted].reverse().find(t => qty >= t.minQty) || sorted[0]
    br = { ok: true, price: tier.unitPrice * qty, label: `${qty} × RM ${tier.unitPrice.toFixed(2)}` }
  }

  if (!br.ok) return { ok: false, error: br.error }

  const selOpts: { modifierType: 'add' | 'multiply'; modifierValue: number }[] = []
  ;(item.optionGroups ?? []).forEach((g, gi) => {
    const sel = cfg.sel[gi]
    if (!sel) return
    g.options.forEach((o: any, oi: any) => {
      if (sel.has(oi)) selOpts.push({ modifierType: o.modifierType, modifierValue: o.modifierValue })
    })
  })

  const { finalTotal } = applyModifiers(br.price, selOpts)
  const qty = parseFloat(cfg.qty) || 1
  const perPc = isCustom ? null : finalTotal / qty
  return { ok: true, total: finalTotal, perPc, label: br.label }
}

function emptyConfig(item: CatalogItem, rowId: string | null = null): ConfigState {
  return { rowId, item, size: '', qty: '100', qtyMode: 'preset', sel: {}, testW: '', testH: '', sizeUnit: 'ft' }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function NewOrderPage() {
  const router = useRouter()
  const { shopId } = useShop()
  const qc = useQueryClient()

  const { data: dbProducts = [] } = useQuery({
    queryKey: ['products', shopId],
    queryFn: () => getProducts(shopId),
    enabled: !!shopId,
  })
  const catalogItems = dbProducts.filter(p => p.status === 'Active').map(dbProductToCatalogItem)

  const { data: dbAgents = [] } = useQuery({
    queryKey: ['agents', shopId],
    queryFn: () => getAgents(shopId),
    enabled: !!shopId,
  })
  const agentNames = dbAgents.filter(a => a.status === 'Active').map(a => a.full_name)

  const { data: customers = [] } = useQuery({
    queryKey: ['customers', shopId],
    queryFn: () => getCustomers(shopId),
    enabled: !!shopId,
  })

  const createMut = useMutation({
    mutationFn: (data: Parameters<typeof dbCreateOrder>[1]) => dbCreateOrder(shopId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders', shopId] }); router.push('/orders?created=1') },
    onError: (err: any) => {
      console.error('[createOrder]', err)
      setSaving(false)
      alert('Failed to save: ' + (err?.message || 'Unknown error'))
    },
  })

  const [saving,   setSaving]   = useState(false)
  const [tried,    setTried]    = useState(false)
  const [customer, setCustomer] = useState('')
  const [custSel,  setCustSel]  = useState('')
  const [agent,    setAgent]    = useState('')
  const [dueDate,  setDueDate]  = useState('')
  const [delivery, setDelivery] = useState<'Delivery' | 'Self-Pickup'>('Self-Pickup')
  const [address,  setAddress]  = useState('')
  const [notes,    setNotes]    = useState('')
  const [originalFiles, setOriginalFiles] = useState<{ id: string; type: 'file' | 'link'; name: string; url?: string }[]>([])
  const [rows,     setRows]     = useState<RowItem[]>([])
  const [config,   setConfig]   = useState<ConfigState | null>(null)

  // Financial state
  const [discount, setDiscount]         = useState(0)
  const [discountType, setDiscountType] = useState<'rm' | 'percent'>('rm')
  const [sstEnabled, setSstEnabled]     = useState(true)
  const [sstRate, setSstRate]           = useState(6)
  const [rounding, setRounding]         = useState(0)
  const [shippingCost, setShippingCost] = useState(0)

  // ── Config modal helpers ──────────────────────────────────────────────────

  const openAdd = () => {
    if (!catalogItems.length) return
    setConfig(emptyConfig(catalogItems[0]))
  }

  const openEdit = (row: RowItem) => {
    const item = catalogItems.find(c => c.id === row.catalogId)
    if (!item) return
    setConfig({ ...emptyConfig(item, row.id), size: row.size, qty: row.qty })
  }

  const switchItem = (id: string) => {
    const item = catalogItems.find(c => c.id === id)
    if (!item) return
    setConfig(prev => prev ? emptyConfig(item, prev.rowId) : null)
  }

  const toggleSel = (gi: number, oi: number, single: boolean) =>
    setConfig(prev => {
      if (!prev) return null
      const cur = prev.sel[gi] ? new Set(prev.sel[gi]) : new Set<number>()
      if (single) return { ...prev, sel: { ...prev.sel, [gi]: cur.has(oi) ? new Set<number>() : new Set([oi]) } }
      if (cur.has(oi)) cur.delete(oi); else cur.add(oi)
      return { ...prev, sel: { ...prev.sel, [gi]: new Set(cur) } }
    })

  const confirmConfig = () => {
    if (!config) return
    const price = computePrice(config)
    if (!price.ok) return

    const { item } = config
    const isCustom = config.size === 'custom' || item.sizes?.mode === 'custom'
    const qty = isCustom ? 1 : parseFloat(config.qty) || 1

    const optLabels = (item.optionGroups ?? []).flatMap((g, gi) => {
      const sel = config.sel[gi]
      if (!sel?.size) return []
      return g.options.filter((_: any, oi: any) => sel.has(oi)).map((o: any) => o.label)
    })

    const nameParts = [item.name]
    if (config.size && config.size !== 'custom') nameParts.push(config.size)
    if (isCustom && config.testW && config.testH) nameParts.push(`${config.testW}×${config.testH} ${config.sizeUnit}`)

    const unitPrice = price.perPc != null ? price.perPc : price.total

    const newRow: RowItem = {
      id: config.rowId ?? uid(),
      catalogId: item.id,
      name: nameParts.join(' — '),
      sku: item.sku,
      size: config.size,
      optionSummary: optLabels.join(', '),
      qty: String(qty),
      unitPrice: unitPrice.toFixed(4),
      isCustomSize: isCustom,
    }

    if (config.rowId) setRows(p => p.map(r => r.id === config.rowId ? newRow : r))
    else              setRows(p => [...p, newRow])
    setConfig(null)
  }

  // ── Totals ────────────────────────────────────────────────────────────────

  const parsedItems: OrderItem[] = rows.map(r => ({
    id: r.id, name: r.name, sku: r.sku,
    qty: Number(r.qty) || 0, unitPrice: Number(r.unitPrice) || 0,
    total: (Number(r.qty) || 0) * (Number(r.unitPrice) || 0),
    optionSummary: r.optionSummary || undefined,
  }))
  const t = calcOrderTotals({ items: parsedItems, discount, discountType, sstEnabled, sstRate, rounding, shippingCost })
  const subtotal   = t.subtotal
  const grandTotal = t.grandTotal

  const canCreate = customer.trim() && dueDate && rows.length > 0

  const handleCreate = () => {
    setTried(true)
    if (!canCreate || saving) return
    setSaving(true)
    setTimeout(() => {
      const items: OrderItem[] = rows.map(r => {
        const qty = Number(r.qty) || 0
        const up  = Number(r.unitPrice) || 0
        return { id: uid(), name: r.name, sku: r.sku, qty, unitPrice: up, total: qty * up, optionSummary: r.optionSummary || undefined }
      })
      createMut.mutate({
        customer_id: custSel || null,
        customer_name: customer,
        agent_name: agent,
        status: 'Pending',
        production: 'Queued',
        due_date: dueDate,
        delivery_method: delivery,
        delivery_address: delivery === 'Delivery' ? address : '—',
        notes,
        source: 'manual',
        items,
        payments: [],
        original_files: originalFiles.length > 0 ? originalFiles : [],
        timeline: [{ id: uid(), date: now(), event: 'Order created', by: agent || 'Admin' }],
        discount,
        discount_type: discountType,
        sst_enabled: sstEnabled,
        sst_rate: sstRate,
        sst_amount: t.sstAmt,
        rounding,
        shipping_cost: shippingCost,
        subtotal: t.subtotal,
        grand_total: t.grandTotal,
        currency: 'MYR',
      })
    }, 1500)
  }

  // ── Config price (derived for modal) ─────────────────────────────────────

  const cfgPrice = config ? computePrice(config) : null
  const cfgSizeRow = config ? (config.item.sizes?.fixed.find((s: any) => s.label === config.size) ?? null) : null
  const isCustomMode = config ? (config.size === 'custom' || config.item.sizes?.mode === 'custom') : false

  // ── Render ────────────────────────────────────────────────────────────────

  const selectedCustomer = customers.find(c => c.id === custSel)

  return (
    <AppShell>
      {saving && <SavingOverlay message="Creating order…" />}
      {/* ── Page header ── */}
      <div className="page-header">
        <div>
          <Link href="/orders" className="back-btn"><BackIcon /> Orders</Link>
          <h1 className="page-title" style={{ marginTop: 6 }}>New Order</h1>
        </div>
      </div>

      <div className="page-scroll">
        <div className="detail-grid" style={{ gap: 16 }}>

          {/* ── LEFT ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* ── Customer & Agent ── */}
            <div className="card" style={{ padding: '20px 24px' }}>
              <div style={{ fontSize: 13, fontWeight: 650, color: 'var(--text-primary)', marginBottom: 18 }}>Customer & Agent</div>

              {/* Customer selected hero */}
              {selectedCustomer && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg)', borderRadius: 10, padding: '10px 14px', marginBottom: 14, border: '1px solid var(--border)' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                    {initials(selectedCustomer.name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedCustomer.name}</div>
                    {selectedCustomer.company && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{selectedCustomer.company}</div>}
                  </div>
                  <button onClick={() => { setCustSel(''); setCustomer('') }}
                    style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>✕</button>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Customer <span style={{ color: '#ef4444' }}>*</span></label>
                  <CustomSelect
                    value={custSel}
                    onChange={v => { setCustSel(v); const c = customers.find(x => x.id === v); if (c) setCustomer(c.name) }}
                    placeholder="— Select customer —"
                    options={customers.map(c => ({ value: c.id, label: c.name + (c.company ? ` · ${c.company}` : '') }))}
                    error={tried && !custSel}
                  />
                  {!custSel && (
                    <input className="form-input" style={{ marginTop: 6 }} value={customer}
                      onChange={e => setCustomer(e.target.value)} placeholder="Or type name manually…" />
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Assigned Agent</label>
                  <CustomSelect value={agent} onChange={setAgent} placeholder="— Select agent —"
                    options={agentNames.map(a => ({ value: a, label: a }))} />
                </div>
              </div>
            </div>

            {/* ── Schedule & Delivery ── */}
            <div className="card" style={{ padding: '20px 24px' }}>
              <div style={{ fontSize: 13, fontWeight: 650, color: 'var(--text-primary)', marginBottom: 18 }}>Schedule & Delivery</div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Due Date <span style={{ color: '#ef4444' }}>*</span></label>
                  <DatePicker value={dueDate} onChange={setDueDate} placeholder="Select due date" error={tried && !dueDate} />
                </div>

                <div className="form-group">
                  <label className="form-label">Delivery Method</label>
                  {/* Toggle pills */}
                  <div style={{ display: 'flex', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 9, padding: 3, gap: 2 }}>
                    {(['Self-Pickup', 'Delivery'] as const).map(opt => (
                      <button key={opt} onClick={() => setDelivery(opt)}
                        style={{
                          flex: 1, padding: '6px 8px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          background: delivery === opt ? 'var(--bg-card)' : 'transparent',
                          color: delivery === opt ? 'var(--text-primary)' : 'var(--text-muted)',
                          boxShadow: delivery === opt ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
                          transition: 'all 0.15s',
                        }}>
                        {opt === 'Delivery' ? <TruckIcon /> : <BoxIcon />}
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {delivery === 'Delivery' && (
                <div className="form-group" style={{ marginTop: 12 }}>
                  <label className="form-label">Delivery Address</label>
                  <textarea className="form-input" rows={2} value={address} onChange={e => setAddress(e.target.value)}
                    placeholder="Street, city, postcode…" style={{ resize: 'vertical' }} />
                </div>
              )}
            </div>

            {/* ── Order Items ── */}
            <div className="card" style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 650, color: 'var(--text-primary)' }}>Order Items</span>
                  {rows.length > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 700, background: 'var(--accent)', color: '#fff', borderRadius: 20, padding: '1px 8px' }}>
                      {rows.length}
                    </span>
                  )}
                </div>
                <button className="btn-primary" style={{ fontSize: 12, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6 }} onClick={openAdd}>
                  <PlusIcon /> Add Item
                </button>
              </div>

              {rows.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                  <div style={{ width: 48, height: 48, background: 'var(--bg)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: 'var(--border-strong)' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 001.99 1.61h9.72a2 2 0 001.99-1.61L23 6H6"/></svg>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>No items yet</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Click <strong style={{ color: 'var(--accent)' }}>Add Item</strong> to select products from the catalog</div>
                </div>
              ) : (
                <>
                  <table className="data-table" style={{ marginBottom: 0 }}>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th style={{ textAlign: 'right', width: 64 }}>Qty</th>
                        <th style={{ textAlign: 'right', width: 110 }}>Unit Price</th>
                        <th style={{ textAlign: 'right', width: 110 }}>Total</th>
                        <th style={{ width: 52 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(row => {
                        const qty   = Number(row.qty) || 0
                        const up    = Number(row.unitPrice) || 0
                        const color = itemColor(row.name)
                        return (
                          <tr key={row.id}>
                            <td style={{ paddingLeft: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                <div style={{ width: 32, height: 32, borderRadius: 8, background: color + '1a', color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>
                                  {initials(row.name)}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.3 }}>{row.name}</div>
                                  {row.optionSummary && (
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{row.optionSummary}</div>
                                  )}
                                  <div style={{ fontSize: 11, color: 'var(--border-strong)', fontFamily: 'monospace', marginTop: 1 }}>{row.sku}</div>
                                </div>
                              </div>
                            </td>
                            <td style={{ textAlign: 'right', fontSize: 13, fontWeight: 600 }}>{row.qty}</td>
                            <td style={{ textAlign: 'right', fontSize: 13, color: 'var(--text-secondary)' }}>{fmt(up)}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{fmt(qty * up)}</td>
                            <td>
                              <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                                <button className="btn-ghost" style={{ padding: 5, borderRadius: 7, color: 'var(--text-muted)' }} onClick={() => openEdit(row)} title="Edit">
                                  <EditIcon />
                                </button>
                                <button className="btn-ghost" style={{ padding: 5, borderRadius: 7, color: 'var(--negative)' }} onClick={() => setRows(p => p.filter(r => r.id !== row.id))}>
                                  <TrashIcon />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>

                  {/* Financial Summary */}
                  <div style={{ borderTop: '1px solid var(--border)', marginTop: 4, paddingTop: 14 }}>
                    {/* Subtotal */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 48, padding: '4px 0', fontSize: 12.5 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Subtotal</span>
                      <span style={{ color: 'var(--text-secondary)', minWidth: 110, textAlign: 'right' }}>{fmt(subtotal)}</span>
                    </div>

                    {/* Discount */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', justifyContent: 'flex-end' }}>
                      <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Discount</label>
                      <input className="form-input" type="number" min={0} value={discount}
                        onChange={e => setDiscount(Number(e.target.value))}
                        style={{ width: 70, fontSize: 12, padding: '4px 8px' }} />
                      <CustomSelect
                        value={discountType}
                        onChange={v => setDiscountType(v as 'rm' | 'percent')}
                        options={[{ value: 'rm', label: 'RM' }, { value: 'percent', label: '%' }]}
                        style={{ fontSize: 12, padding: '4px 8px', width: 70, minHeight: 0, height: 28 }}
                      />
                    </div>

                    {/* SST Toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', justifyContent: 'flex-end' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                        <input type="checkbox" checked={sstEnabled} onChange={e => setSstEnabled(e.target.checked)} />
                        SST
                      </label>
                      {sstEnabled && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <input className="form-input" type="number" min={0} step={0.5} value={sstRate}
                            onChange={e => setSstRate(Number(e.target.value))}
                            style={{ width: 50, fontSize: 12, padding: '4px 8px' }} />
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>%</span>
                        </div>
                      )}
                    </div>

                    {/* Shipping */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', justifyContent: 'flex-end' }}>
                      <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Shipping</label>
                      <input className="form-input" type="number" min={0} value={shippingCost}
                        onChange={e => setShippingCost(Number(e.target.value))}
                        style={{ width: 70, fontSize: 12, padding: '4px 8px' }} />
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>RM</span>
                    </div>

                    {/* Rounding */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', justifyContent: 'flex-end' }}>
                      <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Rounding</label>
                      <input className="form-input" type="number" step={0.01} value={rounding}
                        onChange={e => setRounding(Number(e.target.value))}
                        style={{ width: 70, fontSize: 12, padding: '4px 8px' }} />
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>RM</span>
                    </div>

                    {/* Totals Breakdown */}
                    <div style={{ borderTop: '1px solid var(--border)', marginTop: 6, paddingTop: 8 }}>
                      {t.discountAmt > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 48, padding: '4px 0', fontSize: 12.5 }}>
                          <span style={{ color: 'var(--text-muted)' }}>Discount</span>
                          <span style={{ color: 'var(--negative)', minWidth: 110, textAlign: 'right' }}>−{fmt(t.discountAmt)}</span>
                        </div>
                      )}
                      {sstEnabled && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 48, padding: '4px 0', fontSize: 12.5 }}>
                          <span style={{ color: 'var(--text-muted)' }}>SST ({sstRate}%)</span>
                          <span style={{ minWidth: 110, textAlign: 'right' }}>{fmt(t.sstAmt)}</span>
                        </div>
                      )}
                      {shippingCost > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 48, padding: '4px 0', fontSize: 12.5 }}>
                          <span style={{ color: 'var(--text-muted)' }}>Shipping</span>
                          <span style={{ minWidth: 110, textAlign: 'right' }}>{fmt(shippingCost)}</span>
                        </div>
                      )}
                      {rounding !== 0 && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 48, padding: '4px 0', fontSize: 12.5 }}>
                          <span style={{ color: 'var(--text-muted)' }}>Rounding</span>
                          <span style={{ minWidth: 110, textAlign: 'right' }}>{rounding > 0 ? '+' : ''}{fmt(rounding)}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 48, paddingTop: 6, borderTop: '1.5px solid var(--border)', marginTop: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Grand Total</span>
                        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent)', minWidth: 110, textAlign: 'right' }}>{fmt(grandTotal)}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* ── Notes ── */}
            <div className="card" style={{ padding: '20px 24px' }}>
              <div style={{ fontSize: 13, fontWeight: 650, color: 'var(--text-primary)', marginBottom: 14 }}>Internal Notes</div>
              <textarea className="form-input" rows={3} value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Add notes visible to your team only…" style={{ resize: 'vertical' }} />
            </div>

            {/* ── Original Files ── */}
            <div className="card" style={{ padding: '20px 24px' }}>
              <div style={{ fontSize: 13, fontWeight: 650, color: 'var(--text-primary)', marginBottom: 14 }}>Original Files</div>
              <div style={{ border: '1.5px dashed var(--border)', borderRadius: 10, padding: '16px 20px' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>All file types &middot; Max 500MB</div>
                {originalFiles.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                    {originalFiles.map(f => (
                      <div key={f.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg)', borderRadius: 8, padding: '8px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: f.type === 'link' ? 'var(--accent)' : 'var(--text-secondary)', background: f.type === 'link' ? 'rgba(0,106,255,0.08)' : 'var(--bg-card)', padding: '2px 8px', borderRadius: 4, flexShrink: 0 }}>
                            {f.type === 'link' ? 'LINK' : 'FILE'}
                          </span>
                          <span style={{ fontSize: 12.5, color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {f.name}
                          </span>
                        </div>
                        <button onClick={() => setOriginalFiles(prev => prev.filter(x => x.id !== f.id))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, padding: '2px 4px', flexShrink: 0 }}>
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
                    <span>+ Add File</span>
                    <input type="file" multiple style={{ display: 'none' }} onChange={e => {
                      const files = e.target.files
                      if (!files) return
                      Promise.all(Array.from(files).map(file => new Promise<{ id: string; type: 'file'; name: string; url: string }>(resolve => {
                        const reader = new FileReader()
                        reader.onload = () => resolve({ id: uid(), type: 'file', name: file.name, url: reader.result as string })
                        reader.readAsDataURL(file)
                      }))).then(newFiles => setOriginalFiles(prev => [...prev, ...newFiles]))
                      e.target.value = ''
                    }} />
                  </label>
                  <button onClick={() => {
                    const url = prompt('Paste a link (Google Drive, Dropbox, etc.)')
                    if (!url?.trim()) return
                    let name = url.trim()
                    try { name = new URL(url).hostname + new URL(url).pathname.slice(0, 30) } catch {}
                    setOriginalFiles(prev => [...prev, { id: uid(), type: 'link', name, url: url.trim() }])
                  }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
                    + Add Link
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT sidebar ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 0 }}>

            {/* Order summary card */}
            <div className="card" style={{ padding: '20px 22px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 16 }}>Order Summary</div>

              {/* Customer chip */}
              <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 12px', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Customer</span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', textAlign: 'right', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {customer || <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>—</span>}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Due</span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: dueDate ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {dueDate || '—'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Delivery</span>
                  <span style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)', fontWeight: 500 }}>
                    {delivery === 'Delivery' ? <TruckIcon /> : <BoxIcon />} {delivery}
                  </span>
                </div>
              </div>

              {/* Line items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Items</span>
                  <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', fontWeight: 500 }}>{rows.length} item{rows.length !== 1 ? 's' : ''}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Subtotal</span>
                  <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{fmt(subtotal)}</span>
                </div>
                {sstEnabled && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>SST ({sstRate}%)</span>
                    <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{fmt(t.sstAmt)}</span>
                  </div>
                )}
                {shippingCost > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Shipping</span>
                    <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{fmt(shippingCost)}</span>
                  </div>
                )}
              </div>

              <div style={{ margin: '14px 0', height: 1, background: 'var(--border)' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Total</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)', letterSpacing: '-0.02em' }}>{fmt(grandTotal)}</span>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                className="btn-primary"
                style={{ justifyContent: 'center', fontSize: 13.5, padding: '11px 0', opacity: saving ? 0.6 : 1 }}
                onClick={handleCreate}
                disabled={saving}
              >
                Save
              </button>
              <Link href="/orders" style={{ display: 'block' }}>
                <button className="btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: 13 }}>Discard</button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Product Configurator Modal ── */}
      {config && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setConfig(null) }}
        >
          <div style={{ background: 'var(--bg-card)', borderRadius: 14, width: 520, maxWidth: '100%', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column' }}>

            {/* Modal header */}
            <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
                {config.rowId ? 'Edit Item' : 'Add Item'}
              </div>
              <CustomSelect
                value={config.item.id}
                onChange={switchItem}
                options={catalogItems.map(c => ({ value: c.id, label: `${c.name}  ·  ${c.sku}` }))}
              />
            </div>

            {/* Modal body */}
            <div style={{ padding: '16px 24px 24px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>

              {/* Product image */}
              {config.item.mainImage && (
                <div style={{ borderRadius: 10, overflow: 'hidden', height: 130, background: 'var(--bg)', flexShrink: 0 }}>
                  <img src={config.item.mainImage!.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={config.item.name} />
                </div>
              )}

              {/* Sizes */}
              {config.item.sizes && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Size</div>
                  {(config.item.sizes.mode === 'fixed' || config.item.sizes.mode === 'both') && (
                    <CustomSelect
                      value={config.size}
                      onChange={v => setConfig(p => p ? { ...p, size: v, qty: '100', qtyMode: 'preset' } : null)}
                      options={[
                        { value: '', label: '— Select size —' },
                        ...config.item.sizes.fixed.filter((s: any) => s.label).map((s: any) => ({
                          value: s.label,
                          label: `${s.label}${s.width && s.height ? ` (${s.width}×${s.height} ${s.unit})` : ''}`,
                        })),
                        ...(config.item.sizes.mode === 'both' ? [{ value: 'custom', label: 'Custom Size' }] : []),
                      ]}
                    />
                  )}
                  {(config.item.sizes.mode === 'custom' || config.size === 'custom') && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: config.size === 'custom' ? 10 : 0 }}>
                      <input className="form-input" type="number" min="0" step="0.1" placeholder="Width"
                        value={config.testW} onChange={e => setConfig(p => p ? { ...p, testW: e.target.value } : null)} style={{ width: 90 }} />
                      <span style={{ color: 'var(--text-muted)' }}>×</span>
                      <input className="form-input" type="number" min="0" step="0.1" placeholder="Height"
                        value={config.testH} onChange={e => setConfig(p => p ? { ...p, testH: e.target.value } : null)} style={{ width: 90 }} />
                      <CustomSelect value={config.sizeUnit} onChange={v => setConfig(p => p ? { ...p, sizeUnit: v } : null)} options={SQFT_UNITS} />
                    </div>
                  )}
                </div>
              )}

              {/* Quantity — only for non-custom */}
              {!isCustomMode && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                    Quantity
                    {cfgSizeRow && <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--accent)', marginLeft: 8 }}>pricing for {cfgSizeRow.label}</span>}
                  </div>
                  <CustomSelect
                    value={config.qtyMode === 'custom' ? 'custom' : config.qty}
                    onChange={v => {
                      if (v === 'custom') setConfig(p => p ? { ...p, qtyMode: 'custom', qty: '1' } : null)
                      else setConfig(p => p ? { ...p, qtyMode: 'preset', qty: v } : null)
                    }}
                    options={[
                      ...(cfgSizeRow?.volumeTiers ?? []).filter((t: any) => t.minQty).map((t: any) => ({
                        value: String(t.minQty),
                        label: String(t.minQty),
                      })),
                      { value: 'custom', label: 'Custom Qty' },
                    ]}
                  />
                  {config.qtyMode === 'custom' && (
                    <input className="form-input" type="number" min="1" value={config.qty}
                      onChange={e => setConfig(p => p ? { ...p, qty: e.target.value } : null)}
                      placeholder="Enter quantity"
                      style={{ width: 180, marginTop: 10, fontWeight: 600 }} />
                  )}
                </div>
              )}

              {/* Option groups */}
              {(config.item.optionGroups ?? []).length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {config.item.optionGroups!.map((g, gi) => (
                    <div key={gi}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                        {g.groupName}
                        {g.required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
                      </div>
                      {g.displayType === 'dropdown' ? (
                        <CustomSelect
                          value={config.sel[gi] ? String([...config.sel[gi]][0] ?? '') : ''}
                          onChange={v => { const idx = Number(v); setConfig(p => p ? { ...p, sel: { ...p.sel, [gi]: isNaN(idx) ? new Set() : new Set([idx]) } } : null) }}
                          options={[{ value: '', label: `— Select ${g.groupName} —` }, ...g.options.map((o: any, oi: any) => ({ value: String(oi), label: o.label }))]}
                        />
                      ) : (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {g.options.map((o: any, oi: any) => {
                            const sel = !!(config.sel[gi]?.has(oi))
                            return (
                              <button key={oi} onClick={() => toggleSel(gi, oi, g.selectionType === 'single')}
                                style={{ padding: '6px 14px', borderRadius: 20, border: `1.5px solid ${sel ? 'var(--accent)' : 'var(--border)'}`, background: sel ? 'var(--accent)' : 'var(--bg-card)', color: sel ? '#fff' : 'var(--text-primary)', fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s' }}>
                                {o.label}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Price display */}
              {cfgPrice && (
                cfgPrice.ok ? (
                  <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent)', lineHeight: 1 }}>
                        {fmt(cfgPrice.total)}
                      </div>
                      {cfgPrice.perPc != null && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                          {fmt(cfgPrice.perPc)}/pc
                        </div>
                      )}
                    </div>
                    {!isCustomMode && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'right' }}>
                        {config.qty} pc{Number(config.qty) !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: 12.5, color: '#ef4444', background: 'rgba(239,68,68,0.1)', borderRadius: 8, padding: '10px 12px' }}>
                    {cfgPrice.error}
                  </div>
                )
              )}

              {/* Confirm */}
              <button className="btn-primary" onClick={confirmConfig} disabled={!cfgPrice?.ok}
                style={{ justifyContent: 'center', opacity: cfgPrice?.ok ? 1 : 0.35, pointerEvents: cfgPrice?.ok ? 'auto' : 'none' }}>
                {config.rowId ? 'Update Item' : 'Add to Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
