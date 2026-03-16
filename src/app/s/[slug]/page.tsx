'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { type CatalogItem } from '@/lib/catalog-store'
import { type PageSection, type GlobalSettings, loadStorePage, loadProductMap, DEFAULT_GLOBAL, DEFAULT_SECTIONS } from '@/lib/store-builder'
import { getProducts, getCategories } from '@/lib/db/catalog'
import PreviewRenderer from '@/components/store-builder/PreviewRenderer'

// TODO: This page should resolve the shop by slug from the DB
// and load store pages/settings from the DB as well.
// For now, we load catalog from DB but keep store-builder localStorage for sections.

export default function PublicStorefront() {
  const params = useParams()
  const [sections, setSections] = useState<PageSection[]>(DEFAULT_SECTIONS)
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>(DEFAULT_GLOBAL)
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([])
  const [enabledMap, setEnabledMap] = useState<Record<string, boolean>>({})
  const [isMobile, setIsMobile] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Load store page config (still localStorage for now)
    const page = loadStorePage()
    setSections(page.pages?.homepage || page.sections || [])
    setGlobalSettings(page.globalSettings)
    setEnabledMap(loadProductMap())

    // TODO: Resolve shopId from slug param, then load products from DB
    // For now, use NEXT_PUBLIC_SHOP_ID as fallback
    const shopId = process.env.NEXT_PUBLIC_SHOP_ID ?? ''
    if (shopId) {
      Promise.all([
        getProducts(shopId),
        getCategories(shopId),
      ]).then(([products, categories]) => {
        const catMap = Object.fromEntries(categories.map(c => [c.id, c.name]))
        const items: CatalogItem[] = products.map(p => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          category: catMap[p.category_id ?? ''] ?? '',
          description: p.description,
          price: String(p.base_price ?? ''),
          pricingType: p.pricing_type as any,
          basePrice: String(p.base_price ?? ''),
          pricing: p.pricing as any,
          optionGroups: (p.option_groups ?? []) as any[],
          sizes: p.sizes as any,
          mainImage: p.main_image as any,
          variantImages: (p.variant_images ?? []) as any[],
          bulkVariant: p.bulk_variant,
          productInfo: p.product_info as any,
          status: p.status as any,
          visibility: 'published' as const,
          notes: p.notes,
        }))
        setCatalogItems(items)
        setReady(true)
      }).catch(() => {
        setReady(true)
      })
    } else {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  if (!ready) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Inter, sans-serif', color: '#9ca3af', fontSize: 14 }}>
      Loading...
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, overflowY: 'auto', background: '#fff' }}>
      <PreviewRenderer
        sections={sections}
        globalSettings={globalSettings}
        isMobile={isMobile}
        catalogItems={catalogItems}
        enabledMap={enabledMap}
        selectedSectionId={null}
        onSelectSection={() => {}}
        isPublic
      />
    </div>
  )
}
