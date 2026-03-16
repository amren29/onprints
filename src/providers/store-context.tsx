'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

interface StoreContextValue {
  shopId: string
  slug: string
  basePath: string
  shop: { id: string; slug: string; name: string } | null
  isLoading: boolean
}

const StoreContext = createContext<StoreContextValue>({
  shopId: '',
  slug: '',
  basePath: '/store',
  shop: null,
  isLoading: true,
})

export function useStore() {
  return useContext(StoreContext)
}

interface StoreProviderProps {
  children: ReactNode
  slug?: string
  mode?: 'slug' | 'legacy'
}

export function StoreProvider({ children, slug, mode }: StoreProviderProps) {
  const isLegacy = mode === 'legacy' || !slug
  const [shop, setShop] = useState<{ id: string; slug: string; name: string } | null>(null)
  const [isLoading, setIsLoading] = useState(!isLegacy)

  useEffect(() => {
    if (isLegacy) {
      // Legacy mode: use NEXT_PUBLIC_SHOP_ID
      setShop({ id: process.env.NEXT_PUBLIC_SHOP_ID || '', slug: '', name: '' })
      setIsLoading(false)
      return
    }

    // Slug mode: resolve shop by slug
    let cancelled = false
    async function resolve() {
      try {
        const res = await fetch(`/api/s/${slug}/resolve`)
        if (!res.ok) throw new Error('Shop not found')
        const { shop: resolved } = await res.json()
        if (!cancelled) {
          setShop(resolved)
          setIsLoading(false)
        }
      } catch {
        if (!cancelled) {
          setShop(null)
          setIsLoading(false)
        }
      }
    }
    resolve()
    return () => { cancelled = true }
  }, [slug, isLegacy])

  const shopId = shop?.id || (isLegacy ? (process.env.NEXT_PUBLIC_SHOP_ID || '') : '')
  const basePath = isLegacy ? '/store' : `/s/${slug}`

  return (
    <StoreContext.Provider value={{ shopId, slug: slug || '', basePath, shop, isLoading }}>
      {children}
    </StoreContext.Provider>
  )
}
