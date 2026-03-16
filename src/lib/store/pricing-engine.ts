import { Product, QuantityTier } from '@/types/store'

export function calculatePrice(
  product: Product,
  selectedSpecs: Record<string, string>,
  qty: number,
  discountRate?: number,
  tierQty?: number
): { unitPrice: number; totalPrice: number; productionDays: number; discountRate: number } {
  // Find the right quantity tier — use size-specific matrix if available
  const sizeKey = selectedSpecs.size
  const tiers: QuantityTier[] =
    (sizeKey && product.pricingMatrix[sizeKey]) || (product.pricingMatrix.default ?? [])

  // Find the tier that matches the qty (exact match or nearest lower)
  let tier = tiers[0]
  for (const t of tiers) {
    if ((tierQty ?? qty) >= t.qty) tier = t
    else break
  }

  // Apply option modifiers from catalog data
  let addTotal = 0
  let multTotal = 1.0
  const mods = product.optionModifiers
  if (mods) {
    for (const [key, value] of Object.entries(selectedSpecs)) {
      if (key === 'size') continue // size pricing handled via pricingMatrix
      const mod = mods[value]
      if (mod) {
        if (mod.modifierType === 'add') addTotal += mod.modifierValue
        else if (mod.modifierType === 'multiply') multTotal *= mod.modifierValue
      }
    }
  }

  let unitPrice = parseFloat(((tier.unitPrice + addTotal) * multTotal).toFixed(2))

  const effectiveDiscount = discountRate && discountRate > 0 ? discountRate : 0
  if (effectiveDiscount > 0) {
    unitPrice = parseFloat((unitPrice * (1 - effectiveDiscount)).toFixed(2))
  }

  const totalPrice = parseFloat((unitPrice * qty).toFixed(2))

  return { unitPrice, totalPrice, productionDays: tier.productionDays, discountRate: effectiveDiscount }
}

export function formatMYR(amount: number): string {
  return `RM ${amount.toFixed(2)}`
}
