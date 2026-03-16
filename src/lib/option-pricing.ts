// ── Types ──────────────────────────────────────────────────────────────────

export type PricingTier = {
  minQty:    number
  maxQty:    number
  unitPrice: number
}

export type VolumeTier = {
  minQty:    number
  unitPrice: number
}

export type SqftPricing = {
  pricePerSqft: number
  minCharge?:   number
}

export type OptionValue = {
  label:         string
  modifierType:  'add' | 'multiply'
  modifierValue: number
  imageUrl?:     string   // used when group displayType = 'image'
}

export type OptionGroup = {
  groupName:     string
  selectionType: 'single' | 'multi'
  displayType?:  'radio' | 'dropdown' | 'image'  // how options render on storefront
  required:      boolean
  options:       OptionValue[]
  helpText?:     string   // tooltip/popup help content shown on storefront
  previewImage?: string   // image shown above options on storefront
}

// ── Unit conversion ────────────────────────────────────────────────────────

export function toSqft(w: number, h: number, unit: 'ft' | 'in' | 'cm' | 'm'): number {
  switch (unit) {
    case 'ft': return w * h
    case 'in': return (w * h) / 144
    case 'cm': return (w * h) / 929.0304
    case 'm':  return w * h * 10.7639
    default:   return w * h
  }
}

// ── Base price calculation ─────────────────────────────────────────────────

export type BasePriceResult =
  | { ok: true;  price: number; label: string }
  | { ok: false; error: string }

export function calcBasePrice(
  pricingType: string,
  qty:         number,
  opts: {
    basePrice?:   string
    tiers?:       PricingTier[]
    volumeTiers?: VolumeTier[]
    sqft?:        SqftPricing
    width?:       number
    height?:      number
    unit?:        'ft' | 'in' | 'cm' | 'm'
  }
): BasePriceResult {
  switch (pricingType) {
    case 'fixed': {
      const p = parseFloat(opts.basePrice || '0') || 0
      return { ok: true, price: p, label: `RM ${p.toFixed(2)}` }
    }
    case 'tier': {
      const tiers = opts.tiers || []
      const m = tiers.find(t => qty >= t.minQty && qty <= t.maxQty)
      if (!m) return { ok: false, error: `No matching tier for qty ${qty}.` }
      const price = m.unitPrice * qty
      return { ok: true, price, label: `${qty} × RM ${m.unitPrice.toFixed(2)} (range ${m.minQty}–${m.maxQty})` }
    }
    case 'volume': {
      const sorted = [...(opts.volumeTiers || [])].sort((a, b) => a.minQty - b.minQty)
      if (!sorted.length || qty < sorted[0].minQty)
        return { ok: false, error: `Qty ${qty} below minimum (${sorted[0]?.minQty ?? '?'}).` }
      const m = [...sorted].reverse().find(r => qty >= r.minQty)!
      const price = m.unitPrice * qty
      return { ok: true, price, label: `${qty} × RM ${m.unitPrice.toFixed(2)} (min ${m.minQty})` }
    }
    case 'sqft': {
      const s = opts.sqft || { pricePerSqft: 0 }
      const area  = toSqft(opts.width || 0, opts.height || 0, opts.unit || 'ft')
      const raw   = area * s.pricePerSqft
      const price = (s.minCharge && s.minCharge > 0) ? Math.max(raw, s.minCharge) : raw
      return {
        ok: true, price,
        label: `${area.toFixed(2)} sqft × RM ${s.pricePerSqft.toFixed(2)}` +
               (s.minCharge && s.minCharge > 0 ? ` (min RM ${s.minCharge.toFixed(2)})` : ''),
      }
    }
    default:
      return { ok: false, error: 'Unknown pricing type.' }
  }
}

// ── Modifier application ───────────────────────────────────────────────────

export function applyModifiers(
  basePrice: number,
  opts: Array<{ modifierType: 'add' | 'multiply'; modifierValue: number }>
): { addTotal: number; multTotal: number; finalTotal: number } {
  let addTotal = 0, multTotal = 1
  for (const o of opts) {
    if (o.modifierType === 'add') addTotal += o.modifierValue
    else multTotal *= o.modifierValue
  }
  return { addTotal, multTotal, finalTotal: (basePrice + addTotal) * multTotal }
}

// ── Full compute with option groups + selections ───────────────────────────

export function computeOptionPrice(
  basePrice:    number,
  optionGroups: OptionGroup[] | undefined,
  selections:   Record<string, string | string[]>
): number {
  if (!optionGroups) return basePrice
  let addSum = 0, multiplyProduct = 1
  for (const group of optionGroups) {
    const selected = selections[group.groupName]
    if (!selected) continue
    const labels = Array.isArray(selected) ? selected : [selected]
    for (const label of labels) {
      const opt = group.options.find(o => o.label === label)
      if (!opt) continue
      if (opt.modifierType === 'add') addSum += opt.modifierValue
      else multiplyProduct *= opt.modifierValue
    }
  }
  return (basePrice + addSum) * multiplyProduct
}
