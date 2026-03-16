'use client'
import { useState, useMemo, useRef, useEffect } from 'react'

type OptionDef = {
  groupName: string
  selectionType: 'single' | 'multi'
  displayType: 'radio' | 'dropdown' | 'image'
  options: { label: string; modifierType: 'add' | 'multiply'; modifierValue: number }[]
}
type VolumeTier = { minQty: number; unitPrice: number }

interface Props {
  groups: OptionDef[]
  volumeTiers: VolumeTier[]
}

type BuilderRow = {
  id: number
  qty: string
  selections: Record<number, number[]>
}

const modLabel = (o: { modifierType: string; modifierValue: number }) =>
  o.modifierValue !== 0
    ? ` (${o.modifierType === 'add' ? (o.modifierValue > 0 ? '+' : '') + o.modifierValue : '×' + o.modifierValue})`
    : ''

const Chevron = ({ open }: { open: boolean }) => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}><polyline points="6 9 12 15 18 9"/></svg>
)

const triggerStyle = (open: boolean, hasValue: boolean): React.CSSProperties => ({
  width: '100%', padding: '5px 8px', fontSize: 10.5, borderRadius: 6,
  border: `1.5px solid ${open ? '#006AFF' : '#e5e7eb'}`, background: '#fff',
  color: hasValue ? '#374151' : '#9ca3af',
  fontFamily: 'inherit', cursor: 'pointer', outline: 'none', textAlign: 'left',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4,
  transition: 'border-color .15s', boxSizing: 'border-box',
})

const panelStyle: React.CSSProperties = {
  position: 'absolute', top: 'calc(100% + 3px)', left: 0, width: '100%', zIndex: 30,
  background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8,
  boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: 180, overflowY: 'auto',
}

/* ── Single-select dropdown ─────────────────────────────────────────────── */
function SingleDropdown({ options, selected, onChange }: {
  options: OptionDef['options']
  selected: number | null
  onChange: (index: number | null) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const label = selected != null ? options[selected]?.label : null

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={triggerStyle(open, label != null)}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{label ?? '—'}</span>
        <Chevron open={open} />
      </button>
      {open && (
        <div style={panelStyle}>
          {options.map((o, oi) => {
            const active = oi === selected
            return (
              <button key={oi} type="button" onMouseDown={e => e.preventDefault()}
                onClick={() => { onChange(active ? null : oi); setOpen(false) }}
                style={{
                  display: 'block', width: '100%', padding: '6px 10px', textAlign: 'left', fontSize: 10.5,
                  fontFamily: 'inherit', border: 'none', cursor: 'pointer',
                  color: active ? '#006AFF' : '#374151', fontWeight: active ? 600 : 400,
                  background: active ? 'rgba(0,106,255,0.06)' : 'transparent',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#f9fafb' }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = active ? 'rgba(0,106,255,0.06)' : 'transparent' }}
              >{o.label}{modLabel(o)}</button>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Multi-select dropdown ──────────────────────────────────────────────── */
function MultiDropdown({ options, selected, onChange }: {
  options: OptionDef['options']
  selected: number[]
  onChange: (indices: number[]) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const toggle = (oi: number) => {
    const next = selected.includes(oi) ? selected.filter(i => i !== oi) : [...selected, oi]
    onChange(next)
  }

  const label = selected.length > 0
    ? selected.map(i => options[i]?.label).filter(Boolean).join(', ')
    : null

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={triggerStyle(open, label != null)}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{label ?? '—'}</span>
        <Chevron open={open} />
      </button>
      {open && (
        <div style={panelStyle}>
          {options.map((o, oi) => {
            const checked = selected.includes(oi)
            return (
              <button key={oi} type="button" onMouseDown={e => e.preventDefault()}
                onClick={() => toggle(oi)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                  padding: '6px 10px', textAlign: 'left', fontSize: 10.5,
                  fontFamily: 'inherit', border: 'none', cursor: 'pointer',
                  color: checked ? '#006AFF' : '#374151', fontWeight: checked ? 600 : 400,
                  background: checked ? 'rgba(0,106,255,0.06)' : 'transparent',
                }}
                onMouseEnter={e => { if (!checked) e.currentTarget.style.background = '#f9fafb' }}
                onMouseLeave={e => { if (!checked) e.currentTarget.style.background = checked ? 'rgba(0,106,255,0.06)' : 'transparent' }}
              >
                <span style={{
                  width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                  border: checked ? '1.5px solid #006AFF' : '1.5px solid #d1d5db',
                  background: checked ? '#006AFF' : '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {checked && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                </span>
                <span>{o.label}{modLabel(o)}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Main component ─────────────────────────────────────────────────────── */
export default function BulkVariantBuilder({ groups, volumeTiers }: Props) {
  const [rows, setRows] = useState<BuilderRow[]>([{ id: 1, qty: '', selections: {} }])
  const nextId = useRef(2)

  const addRow = () => setRows(p => [...p, { id: nextId.current++, qty: '', selections: {} }])
  const dupRow = (src: BuilderRow) => setRows(p => [...p, {
    id: nextId.current++, qty: src.qty,
    selections: Object.fromEntries(Object.entries(src.selections).map(([k, v]) => [k, [...v]])),
  }])
  const removeRow = (id: number) => setRows(p => p.length > 1 ? p.filter(r => r.id !== id) : p)
  const updateQty = (id: number, qty: string) => setRows(p => p.map(r => r.id === id ? { ...r, qty } : r))

  const setSel = (id: number, gi: number, indices: number[]) =>
    setRows(p => p.map(r => r.id === id ? { ...r, selections: { ...r.selections, [gi]: indices } } : r))

  const calc = useMemo(() => {
    const totalQty = rows.reduce((s, r) => s + (parseInt(r.qty) || 0), 0)

    const sorted = [...volumeTiers].sort((a, b) => a.minQty - b.minQty)
    let tier = sorted[0] ?? null
    for (const t of sorted) {
      if (totalQty >= t.minQty) tier = t
      else break
    }

    const rowCalcs = rows.map(row => {
      const qty = parseInt(row.qty) || 0
      let addTotal = 0
      let multTotal = 1.0

      for (const [giStr, indices] of Object.entries(row.selections)) {
        const gi = Number(giStr)
        for (const oi of indices) {
          const opt = groups[gi]?.options[oi]
          if (!opt) continue
          if (opt.modifierType === 'add') addTotal += opt.modifierValue
          else if (opt.modifierType === 'multiply') multTotal *= opt.modifierValue
        }
      }

      const base = tier ? tier.unitPrice : 0
      const unitPrice = parseFloat(((base + addTotal) * multTotal).toFixed(2))
      const rowTotal = parseFloat((unitPrice * qty).toFixed(2))

      return { qty, unitPrice, rowTotal }
    })

    const grandTotal = rowCalcs.reduce((s, r) => s + r.rowTotal, 0)
    return { totalQty, tier, rowCalcs, grandTotal }
  }, [rows, groups, volumeTiers])

  if (groups.length === 0 || volumeTiers.length === 0) {
    return <div style={{ fontSize: 11, color: '#9ca3af', padding: '10px 0' }}>Add option groups and volume tiers to use the variant builder.</div>
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: '#374151' }}>
          Variant Builder
          {calc.totalQty > 0 && (
            <span style={{ fontWeight: 500, color: '#6b7280', marginLeft: 6, fontSize: 10 }}>
              {calc.totalQty.toLocaleString()} pcs
              {calc.tier && <> &middot; RM {calc.tier.unitPrice.toFixed(2)} base</>}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={addRow}
          style={{
            padding: '4px 10px', fontSize: 10, fontWeight: 600, borderRadius: 6,
            border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151',
            cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 3,
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Row
        </button>
      </div>

      {/* Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map((row, ri) => {
          const rc = calc.rowCalcs[ri]
          return (
            <div key={row.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 12px' }}>
              {/* Row header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#374151' }}>Row {ri + 1}</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button type="button" onClick={() => dupRow(row)} title="Duplicate row" style={{
                    width: 20, height: 20, borderRadius: 4, border: '1px solid #e5e7eb', background: '#fff',
                    color: '#6b7280', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                  </button>
                  {rows.length > 1 && (
                    <button type="button" onClick={() => removeRow(row.id)} title="Remove row" style={{
                      width: 20, height: 20, borderRadius: 4, border: 'none', background: 'rgba(239,68,68,0.08)',
                      color: '#ef4444', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', lineHeight: 1,
                    }}>×</button>
                  )}
                </div>
              </div>

              {/* Qty + options grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {/* Qty */}
                <div>
                  <div style={{ fontSize: 9, color: '#6b7280', marginBottom: 3, fontWeight: 600 }}>Qty</div>
                  <input
                    type="number"
                    min="1"
                    value={row.qty}
                    onChange={e => updateQty(row.id, e.target.value)}
                    placeholder="0"
                    style={{
                      width: '100%', padding: '5px 8px', fontSize: 11, borderRadius: 6,
                      border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151',
                      fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#006AFF' }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb' }}
                  />
                </div>

                {/* Option group controls */}
                {groups.map((g, gi) => {
                  const sel = row.selections[gi] ?? []
                  // multiply modifiers always use dropdown (need to see values)
                  const hasMultiply = g.options.some(o => o.modifierType === 'multiply')
                  const useDropdown = hasMultiply || g.displayType === 'dropdown' || g.displayType === 'image'

                  return (
                    <div key={gi} style={!useDropdown ? { gridColumn: 'span 3' } : undefined}>
                      <div style={{ fontSize: 9, color: '#6b7280', marginBottom: 3, fontWeight: 600 }}>{g.groupName}</div>
                      {useDropdown ? (
                        g.selectionType === 'multi' ? (
                          <MultiDropdown options={g.options} selected={sel} onChange={indices => setSel(row.id, gi, indices)} />
                        ) : (
                          <SingleDropdown options={g.options} selected={sel.length > 0 ? sel[0] : null} onChange={idx => setSel(row.id, gi, idx != null ? [idx] : [])} />
                        )
                      ) : (
                        /* Radio / Checkbox → pill buttons */
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {g.options.map((o, oi) => {
                            const active = sel.includes(oi)
                            return (
                              <button key={oi} type="button"
                                onClick={() => {
                                  if (g.selectionType === 'multi') {
                                    setSel(row.id, gi, active ? sel.filter(i => i !== oi) : [...sel, oi])
                                  } else {
                                    setSel(row.id, gi, active ? [] : [oi])
                                  }
                                }}
                                style={{
                                  padding: '4px 10px', borderRadius: 14, fontSize: 10, fontWeight: 500,
                                  cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit', lineHeight: 1.4,
                                  border: active ? '1.5px solid #006AFF' : '1.5px solid #e5e7eb',
                                  background: active ? '#006AFF' : '#fff',
                                  color: active ? '#fff' : '#374151',
                                }}
                              >
                                {o.label}{o.modifierValue !== 0 ? ` ${o.modifierType === 'add' ? (o.modifierValue > 0 ? '+' : '') + o.modifierValue : '×' + o.modifierValue}` : ''}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Row pricing */}
              {rc && rc.qty > 0 && (
                <div style={{
                  display: 'flex', justifyContent: 'flex-end', alignItems: 'baseline', gap: 8,
                  marginTop: 8, paddingTop: 6, borderTop: '1px dashed #e5e7eb',
                }}>
                  <span style={{ fontSize: 10, color: '#6b7280' }}>
                    RM {rc.unitPrice.toFixed(2)}/pc × {rc.qty}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#111' }}>
                    = RM {rc.rowTotal.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Grand total */}
      {calc.totalQty > 0 && calc.grandTotal > 0 && (
        <div style={{ marginTop: 10, background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 9.5, color: '#6b7280', marginBottom: 2 }}>Total quantity</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#111' }}>{calc.totalQty.toLocaleString()} pcs</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 9.5, color: '#6b7280', marginBottom: 2 }}>Grand Total</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#006AFF' }}>
                RM {calc.grandTotal.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
          {calc.tier && (
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, color: '#6b7280' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                Volume tier: {calc.totalQty.toLocaleString()}+ pcs at RM {calc.tier.unitPrice.toFixed(2)}/pc base
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, color: '#6b7280' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                Estimated production: 3–5 working days
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
