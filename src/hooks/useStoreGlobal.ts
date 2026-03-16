'use client'

import { useState, useEffect } from 'react'
import { type GlobalSettings, DEFAULT_GLOBAL } from '@/lib/store-builder'
import { getStorePage } from '@/lib/db/storefront'

const SHOP_ID = process.env.NEXT_PUBLIC_SHOP_ID!

export function useStoreGlobal(): GlobalSettings {
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULT_GLOBAL)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        // Fetch any page — globals are the same across all pages for this shop
        const page = await getStorePage(SHOP_ID, 'homepage')
        if (!cancelled && page?.globals) {
          setSettings({ ...DEFAULT_GLOBAL, ...(page.globals as Partial<GlobalSettings>) })
        }
      } catch {
        // Fall back to defaults on error
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  return settings
}
