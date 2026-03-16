'use client'

import { useState, useEffect } from 'react'
import Navbar from '@/components/store/Navbar'
import Footer from '@/components/store/Footer'
import { PageRenderer } from '@/components/store/sections'
import { type PageSection, DEFAULT_PAGE_SECTIONS } from '@/lib/store-builder'
import { useStore } from '@/providers/store-context'

export default function FAQPage() {
  const { shopId } = useStore()
  const [sections, setSections] = useState<PageSection[]>([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const params = new URLSearchParams({ pageId: 'faq' })
        if (shopId) params.set('shopId', shopId)
        const res = await fetch(`/api/store/pages?${params}`)
        const { page } = await res.json()
        if (!cancelled) {
          setSections((page?.sections as PageSection[]) ?? DEFAULT_PAGE_SECTIONS.faq())
        }
      } catch {
        if (!cancelled) setSections(DEFAULT_PAGE_SECTIONS.faq())
      }
    }
    load()
    return () => { cancelled = true }
  }, [shopId])

  if (!sections.length) {
    return (
      <>
        <Navbar />
        <main className="flex-1 flex items-center justify-center min-h-[60vh]">
          <svg className="animate-spin text-accent" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity=".2"/><path d="M12 2a10 10 0 0110 10" strokeLinecap="round"/></svg>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Navbar />
      <PageRenderer sections={sections} />
      <Footer />
    </>
  )
}
