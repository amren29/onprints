export const TAX_CONFIG = {
  sstEnabled: true,
  sstRate: 6,
  sstRegistrationNo: '',
  taxLabel: 'SST',
  taxInclusive: false,
  applyToShipping: false,
}

export type TaxBreakdown = {
  subtotal: number
  shippingCost: number
  taxableAmount: number
  sstRate: number
  sstAmount: number
  grandTotal: number
}

export function calculateTax(
  subtotal: number,
  shippingCost: number
): TaxBreakdown {
  const { sstEnabled, sstRate, applyToShipping } = TAX_CONFIG

  const taxableAmount = applyToShipping
    ? subtotal + shippingCost
    : subtotal

  const sstAmount = sstEnabled
    ? parseFloat((taxableAmount * (sstRate / 100)).toFixed(2))
    : 0

  const grandTotal = parseFloat((subtotal + shippingCost + sstAmount).toFixed(2))

  return {
    subtotal,
    shippingCost,
    taxableAmount,
    sstRate: sstEnabled ? sstRate : 0,
    sstAmount,
    grandTotal,
  }
}
