'use client'

import { useState, useMemo, useRef, useEffect, useImperativeHandle, forwardRef } from 'react'
import type { Product, VariantRow, CartItem } from '@/types/store'
import { formatMYR } from '@/lib/store/pricing-engine'

export interface BulkCalc {
  totalQty: number
  grandTotal: number
  tier: { qty: number; unitPrice: number } | null
}

export interface VariantBuilderHandle {
  buildCartItem: () => CartItem | null
  calc: BulkCalc
}

interface Props {
  product: Product
  discount: number
  onCalcChange?: (calc: BulkCalc) => void
}

type BuilderRow = {
  id: number
  qty: string
  selections: Record<string, string> // groupName → selected option label
}

/* ── Dropdown (storefront-styled) ────────────────────────────────────────── */
function VariantDropdown({ options, value, onChange, placeholder }: {
  options: string[]
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className={`w-full px-3 py-2 rounded-xl text-sm font-medium border bg-white text-left flex items-center justify-between gap-2 transition cursor-pointer ${open ? 'border-accent ring-1 ring-accent' : 'border-gray-200 hover:border-gray-300'} ${value ? 'text-gray-700' : 'text-gray-400'}`}
      >
        <span className="truncate">{value || placeholder || '— Select —'}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 w-full mt-1 z-30 bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
          {options.map(opt => (
            <button key={opt} type="button" onMouseDown={e => e.preventDefault()} onClick={() => { onChange(opt); setOpen(false) }}
              className={`block w-full px-3 py-2 text-left text-sm transition ${opt === value ? 'text-accent font-semibold bg-accent/5' : 'text-gray-700 hover:bg-gray-50'}`}
            >{opt}</button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Main component ──────────────────────────────────────────────────────── */
const StorefrontVariantBuilder = forwardRef<VariantBuilderHandle, Props>(function StorefrontVariantBuilder({ product, discount, onCalcChange }, ref) {
  const groups = product.bulkOptionGroups || []
  const tiers = product.bulkVolumeTiers || []
  const [rows, setRows] = useState<BuilderRow[]>([{ id: 1, qty: '1', selections: {} }])
  const nextId = useRef(2)

  const addRow = () => setRows(p => [...p, { id: nextId.current++, qty: '1', selections: {} }])
  const dupRow = (src: BuilderRow) => setRows(p => [...p, { id: nextId.current++, qty: src.qty, selections: { ...src.selections } }])
  const removeRow = (id: number) => setRows(p => p.length > 1 ? p.filter(r => r.id !== id) : p)
  const updateQty = (id: number, qty: string) => setRows(p => p.map(r => r.id === id ? { ...r, qty } : r))
  const setSel = (id: number, groupName: string, value: string) =>
    setRows(p => p.map(r => r.id === id ? { ...r, selections: { ...r.selections, [groupName]: value } } : r))

  const calc = useMemo(() => {
    const totalQty = rows.reduce((s, r) => s + (parseInt(r.qty) || 0), 0)

    // Find active volume tier based on total qty
    const sorted = [...tiers].sort((a, b) => a.qty - b.qty)
    let tier = sorted[0] ?? null
    for (const t of sorted) {
      if (totalQty >= t.qty) tier = t
      else break
    }

    const rowCalcs = rows.map(row => {
      const qty = parseInt(row.qty) || 0
      let addTotal = 0
      let multTotal = 1.0

      for (const g of groups) {
        const selected = row.selections[g.groupName]
        if (!selected) continue
        const opt = g.options.find(o => o.label === selected)
        if (!opt) continue
        if (opt.modifierType === 'add') addTotal += opt.modifierValue
        else if (opt.modifierType === 'multiply') multTotal *= opt.modifierValue
      }

      const base = tier ? tier.unitPrice : 0
      let unitPrice = parseFloat(((base + addTotal) * multTotal).toFixed(2))
      if (discount > 0) unitPrice = parseFloat((unitPrice * (1 - discount)).toFixed(2))
      const rowTotal = parseFloat((unitPrice * qty).toFixed(2))

      // Build option summary
      const summary = groups.map(g => row.selections[g.groupName]).filter(Boolean).join(' · ')

      return { qty, unitPrice, rowTotal, summary, selections: row.selections }
    })

    const grandTotal = rowCalcs.reduce((s, r) => s + r.rowTotal, 0)
    return { totalQty, tier, rowCalcs, grandTotal }
  }, [rows, groups, tiers, discount])

  // Notify parent of calc changes
  useEffect(() => {
    onCalcChange?.({ totalQty: calc.totalQty, grandTotal: calc.grandTotal, tier: calc.tier })
  }, [calc.totalQty, calc.grandTotal, calc.tier, onCalcChange])

  // Expose buildCartItem via ref
  useImperativeHandle(ref, () => ({
    buildCartItem() {
      if (calc.totalQty <= 0) return null

      const variantRows: VariantRow[] = rows
        .map((row, i) => {
          const rc = calc.rowCalcs[i]
          if (!rc || rc.qty <= 0) return null
          return {
            id: `vr_${Date.now()}_${i}`,
            qty: rc.qty,
            selectedSpecs: { ...row.selections },
            optionSummary: rc.summary,
            unitPrice: rc.unitPrice,
            rowTotal: rc.rowTotal,
          }
        })
        .filter((r): r is VariantRow => r !== null)

      return {
        id: `bulk_${product.id}_${Date.now()}`,
        productId: product.id,
        name: product.name,
        slug: product.slug,
        qty: calc.totalQty,
        unitPrice: 0,
        total: calc.grandTotal,
        selectedSpecs: {},
        optionSummary: `${variantRows.length} variant${variantRows.length > 1 ? 's' : ''} · ${calc.totalQty.toLocaleString()} pcs total`,
        artworkOption: '',
        artworkFileName: '',
        bulkVariant: true,
        variantRows,
      }
    },
    calc: { totalQty: calc.totalQty, grandTotal: calc.grandTotal, tier: calc.tier },
  }), [calc, rows, product, discount])

  if (groups.length === 0 || tiers.length === 0) {
    return <p className="text-sm text-gray-400 py-4">Volume tiers and options are not configured for this product.</p>
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Configure Your Order</h3>
          {calc.totalQty > 0 && (
            <p className="text-xs text-gray-500 mt-0.5">
              {calc.totalQty.toLocaleString()} pcs total
              {calc.tier && <> · {formatMYR(calc.tier.unitPrice)}/pc base</>}
            </p>
          )}
        </div>
        <button type="button" onClick={addRow}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 bg-white text-gray-700 hover:border-gray-300 transition"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Row
        </button>
      </div>

      {/* Volume tiers reference */}
      <div className="flex flex-wrap gap-2 mb-4">
        {tiers.sort((a, b) => a.qty - b.qty).map((t, i) => {
          const isActive = calc.tier && calc.tier.qty === t.qty
          return (
            <span key={i} className={`text-xs px-2.5 py-1 rounded-full font-medium transition ${isActive ? 'bg-accent text-white' : 'bg-gray-100 text-gray-500'}`}>
              {t.qty}+ pcs: {formatMYR(t.unitPrice)}/pc
            </span>
          )
        })}
      </div>

      {/* Rows */}
      <div className="space-y-3">
        {rows.map((row, ri) => {
          const rc = calc.rowCalcs[ri]
          return (
            <div key={row.id} className="rounded-xl border border-gray-200 bg-white p-4">
              {/* Row header */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-gray-700">Row {ri + 1}</span>
                <div className="flex gap-1.5">
                  <button type="button" onClick={() => dupRow(row)} title="Duplicate row"
                    className="w-7 h-7 rounded-lg border border-gray-200 bg-white text-gray-500 flex items-center justify-center hover:border-gray-300 transition"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                  </button>
                  {rows.length > 1 && (
                    <button type="button" onClick={() => removeRow(row.id)} title="Remove row"
                      className="w-7 h-7 rounded-lg bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-100 transition"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Qty + option selectors */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {/* Qty */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Qty</label>
                  <input
                    type="number" min="1" value={row.qty}
                    onChange={e => updateQty(row.id, e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl text-sm border border-gray-200 bg-white text-gray-700 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition"
                  />
                </div>

                {/* Option groups */}
                {groups.map(g => (
                  <div key={g.groupName} className={g.displayType === 'radio' ? 'col-span-2 sm:col-span-3' : ''}>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">{g.groupName}</label>
                    {g.displayType === 'radio' ? (
                      <div className="flex flex-wrap gap-2">
                        {g.options.map(o => {
                          const active = row.selections[g.groupName] === o.label
                          return (
                            <button key={o.label} type="button"
                              onClick={() => setSel(row.id, g.groupName, active ? '' : o.label)}
                              className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                                active
                                  ? 'bg-accent text-white border-accent'
                                  : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                              }`}
                            >
                              {o.label}
                            </button>
                          )
                        })}
                      </div>
                    ) : (
                      <VariantDropdown
                        options={g.options.map(o => o.label)}
                        value={row.selections[g.groupName] || ''}
                        onChange={v => setSel(row.id, g.groupName, v)}
                        placeholder={`Select ${g.groupName}`}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Row pricing */}
              {rc && rc.qty > 0 && (
                <div className="flex items-baseline justify-end gap-2 mt-3 pt-3 border-t border-dashed border-gray-200">
                  <span className="text-xs text-gray-500">
                    {formatMYR(rc.unitPrice)}/pc × {rc.qty.toLocaleString()}
                  </span>
                  <span className="text-sm font-bold text-gray-900">
                    = {formatMYR(rc.rowTotal)}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
})

export default StorefrontVariantBuilder
