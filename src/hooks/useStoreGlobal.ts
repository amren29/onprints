'use client'

import { useState, useEffect } from 'react'
import { type GlobalSettings, DEFAULT_GLOBAL } from '@/lib/store-builder'

export function useStoreGlobal(): GlobalSettings {
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULT_GLOBAL)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/store/pages?pageId=homepage')
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
  }, [])

  return settings
}
