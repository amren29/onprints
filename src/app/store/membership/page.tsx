'use client'

import { useState, useEffect } from 'react'
import Navbar from '@/components/store/Navbar'
import Footer from '@/components/store/Footer'
import { PageRenderer } from '@/components/store/sections'
import { type PageSection, DEFAULT_PAGE_SECTIONS } from '@/lib/store-builder'
import { getStorePage } from '@/lib/db/storefront'

const SHOP_ID = process.env.NEXT_PUBLIC_SHOP_ID!

export default function MembershipPage() {
  const [sections, setSections] = useState<PageSection[]>([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const page = await getStorePage(SHOP_ID, 'membership')
        if (!cancelled) {
          setSections((page?.sections as PageSection[]) ?? DEFAULT_PAGE_SECTIONS.membership())
        }
      } catch {
        if (!cancelled) setSections(DEFAULT_PAGE_SECTIONS.membership())
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  return (
    <>
      <Navbar />
      <PageRenderer sections={sections} />
      <Footer />
    </>
  )
}
