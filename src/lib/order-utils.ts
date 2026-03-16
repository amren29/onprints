/**
 * Pure utility functions extracted from order-store.ts
 * so the store file can eventually be deleted while
 * pages that only need these helpers keep working.
 */

import type { OrderItem } from '@/lib/order-store'

// ── Unique-id helper ──────────────────────────────────────────────────────
let _uid = 0
export function uid(): string { return `oi-${Date.now()}-${++_uid}` }

// ── Financial helpers ─────────────────────────────────────────────────────

export function calcOrderTotals(o: {
  items: OrderItem[]
  discount: number
  discountType: 'rm' | 'percent'
  sstEnabled: boolean
  sstRate: number
  rounding: number
  shippingCost: number
}) {
  const subtotal = o.items.reduce((s, i) => s + i.total, 0)
  const discountAmt = o.discountType === 'percent'
    ? subtotal * (o.discount / 100)
    : o.discount
  const afterDiscount = subtotal - discountAmt
  const sstAmt = o.sstEnabled
    ? parseFloat((afterDiscount * (o.sstRate / 100)).toFixed(2))
    : 0
  const beforeRounding = afterDiscount + sstAmt + o.shippingCost
  const grandTotal = parseFloat((beforeRounding + o.rounding).toFixed(2))

  return { subtotal, discountAmt, afterDiscount, sstAmt, grandTotal }
}
