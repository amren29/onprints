'use client'

import { useState, useEffect } from 'react'
import { type GlobalSettings, DEFAULT_GLOBAL } from '@/lib/store-builder'
import { useStore } from '@/providers/store-context'

export function useStoreGlobal(): GlobalSettings {
  const { shopId } = useStore()
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULT_GLOBAL)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const params = new URLSearchParams({ pageId: 'homepage' })
        if (shopId) params.set('shopId', shopId)
        const res = await fetch(`/api/store/pages?${params}`)
        const { page } = await res.json()
        if (!cancelled && page?.globals) {
          setSettings({ ...DEFAULT_GLOBAL, ...(page.globals as Partial<GlobalSettings>) })
        }
      } catch {
        // Fall back to defaults on error
      }
    }
    load()
    return () => { cancelled = true }
  }, [shopId])

  return settings
}
