'use client'

import { useEffect, useRef } from 'react'
import { useCartStore } from '@/lib/store/cart-store'
import { useAuthStore } from '@/lib/store/auth-store'
import { useStore } from '@/providers/store-context'
import { upsertAbandonedCart, deleteAbandonedCartBySession } from '@/lib/db/storefront'

const SESSION_KEY = 'onprints_cart_session_id'

function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  let id = sessionStorage.getItem(SESSION_KEY)
  if (!id) {
    id = `cart_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    sessionStorage.setItem(SESSION_KEY, id)
  }
  return id
}

/**
 * Invisible component that listens to cart changes
 * and saves snapshots to Supabase for abandoned cart tracking.
 * Mount once in the store layout.
 */
export default function CartTracker() {
  const items = useCartStore(s => s.items)
  const currentUser = useAuthStore(s => s.currentUser)
  const { shopId } = useStore()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!shopId) return

    // Debounce to avoid excessive writes on rapid cart changes
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const sessionId = getSessionId()
      if (!sessionId) return

      if (items.length === 0) {
        // Cart empty — remove from abandoned carts
        deleteAbandonedCartBySession(shopId, sessionId).catch(() => {})
        return
      }

      upsertAbandonedCart(shopId, {
        session_id: sessionId,
        customer_name: currentUser?.name || 'Guest',
        customer_email: currentUser?.email || '',
        is_guest: !currentUser,
        items: items.map(i => ({
          name: i.name,
          qty: i.qty,
          unitPrice: i.unitPrice,
          total: i.total,
          optionSummary: i.optionSummary,
        })),
        total_value: items.reduce((s, i) => s + i.total, 0),
        item_count: items.reduce((s, i) => s + i.qty, 0),
      }).catch(err => {
        console.warn('[CartTracker] Failed to sync:', err?.message)
      })
    }, 2000) // 2s debounce

    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [items, currentUser, shopId])

  return null
}
