'use client'

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { getUserShop, createShop } from '@/lib/db/shops'

interface ShopContext {
  shopId: string
  role: string
  shop: any
  isLoading: boolean
  error: string
}

const ShopCtx = createContext<ShopContext>({
  shopId: '',
  role: '',
  shop: null,
  isLoading: true,
  error: '',
})

export function ShopProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ShopContext>({
    shopId: '',
    role: '',
    shop: null,
    isLoading: true,
    error: '',
  })

  const initRef = useRef(false)

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    // Skip server action calls on store pages (they use NEXT_PUBLIC_SHOP_ID instead)
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/store')) {
      setState(s => ({ ...s, isLoading: false }))
      return
    }

    async function init(retries = 3) {
      try {
        const result = await getUserShop()
        if (result) {
          console.log('[ShopProvider] Found shop:', result.shopId)
          setState({
            shopId: result.shopId,
            role: result.role,
            shop: result.shop,
            isLoading: false,
            error: '',
          })
          return
        }

        // No shop found — try to auto-create
        console.log('[ShopProvider] No shop found, creating...')
        const created = await createShop({ name: 'My Print Shop' })
        if (created.error) {
          // Auth session may not be ready yet after registration — retry
          if (created.error === 'Not authenticated' && retries > 0) {
            console.log(`[ShopProvider] Auth not ready, retrying in 1s... (${retries} left)`)
            await new Promise(r => setTimeout(r, 1000))
            return init(retries - 1)
          }
          console.error('[ShopProvider] Failed to create shop:', created.error)
          setState((s) => ({ ...s, isLoading: false, error: `Shop creation failed: ${created.error}` }))
          return
        }
        if (created.shop) {
          console.log('[ShopProvider] Created shop:', created.shop.id)
          setState({
            shopId: created.shop.id,
            role: 'owner',
            shop: created.shop,
            isLoading: false,
            error: '',
          })
        }
      } catch (err) {
        console.error('[ShopProvider] Error:', err)
        setState((s) => ({ ...s, isLoading: false, error: `Shop init failed: ${err instanceof Error ? err.message : String(err)}` }))
      }
    }
    init()
  }, [])

  return <ShopCtx.Provider value={state}>{children}</ShopCtx.Provider>
}

export function useShop() {
  return useContext(ShopCtx)
}
