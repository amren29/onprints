'use client'

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { getUserShop, createShop } from '@/lib/db/shops'

interface ShopContext {
  shopId: string
  role: string
  shop: any
  isLoading: boolean
}

const ShopCtx = createContext<ShopContext>({
  shopId: '',
  role: '',
  shop: null,
  isLoading: true,
})

export function ShopProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ShopContext>({
    shopId: '',
    role: '',
    shop: null,
    isLoading: true,
  })

  const initRef = useRef(false)

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    async function init() {
      try {
        const result = await getUserShop()
        if (result) {
          console.log('[ShopProvider] Found shop:', result.shopId)
          setState({
            shopId: result.shopId,
            role: result.role,
            shop: result.shop,
            isLoading: false,
          })
          return
        }

        // No shop found — try to auto-create
        console.log('[ShopProvider] No shop found, creating...')
        const created = await createShop({ name: 'My Print Shop' })
        if (created.error) {
          console.error('[ShopProvider] Failed to create shop:', created.error)
          setState((s) => ({ ...s, isLoading: false }))
          return
        }
        if (created.shop) {
          console.log('[ShopProvider] Created shop:', created.shop.id)
          setState({
            shopId: created.shop.id,
            role: 'owner',
            shop: created.shop,
            isLoading: false,
          })
        }
      } catch (err) {
        console.error('[ShopProvider] Error:', err)
        setState((s) => ({ ...s, isLoading: false }))
      }
    }
    init()
  }, [])

  return <ShopCtx.Provider value={state}>{children}</ShopCtx.Provider>
}

export function useShop() {
  return useContext(ShopCtx)
}
