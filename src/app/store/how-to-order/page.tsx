'use client'

import { useState, useEffect } from 'react'
import Navbar from '@/components/store/Navbar'
import Footer from '@/components/store/Footer'
import { PageRenderer } from '@/components/store/sections'
import { type PageSection, DEFAULT_PAGE_SECTIONS } from '@/lib/store-builder'
import { useStore } from '@/providers/store-context'

export default function HowToOrderPage() {
  const { shopId } = useStore()
  const [sections, setSections] = useState<PageSection[]>([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const params = new URLSearchParams({ pageId: 'how-to-order' })
        if (shopId) params.set('shopId', shopId)
        const res = await fetch(`/api/store/pages?${params}`)
        const { page } = await res.json()
        if (!cancelled) {
          setSections((page?.sections as PageSection[]) ?? DEFAULT_PAGE_SECTIONS['how-to-order']())
        }
      } catch {
        if (!cancelled) setSections(DEFAULT_PAGE_SECTIONS['how-to-order']())
      }
    }
    load()
    return () => { cancelled = true }
  }, [shopId])

  return (
    <>
      <Navbar />
      <PageRenderer sections={sections} />
      <Footer />
    </>
  )
}
