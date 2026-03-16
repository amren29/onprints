'use client'

import { useEffect } from 'react'
import { useCartStore } from '@/lib/store/cart-store'
import { useAuthStore } from '@/lib/store/auth-store'
import { snapshotCart } from '@/lib/store/abandoned-cart-tracker'

/**
 * Invisible component that listens to cart changes
 * and saves snapshots for abandoned cart tracking.
 * Mount once in the store layout.
 */
export default function CartTracker() {
  const items = useCartStore(s => s.items)
  const currentUser = useAuthStore(s => s.currentUser)

  useEffect(() => {
    snapshotCart(
      items.map(i => ({
        name: i.name,
        qty: i.qty,
        unitPrice: i.unitPrice,
        total: i.total,
        optionSummary: i.optionSummary,
      })),
      currentUser ? { name: currentUser.name, email: currentUser.email } : null,
    )
  }, [items, currentUser])

  return null
}
