'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Navbar from '@/components/store/Navbar'
import Footer from '@/components/store/Footer'
import { SectionRenderer } from '@/components/store/sections'
import { type PageSection, DEFAULT_PAGE_SECTIONS } from '@/lib/store-builder'
import { type DbBundle } from '@/lib/db/bundles'
import { type DbProduct } from '@/lib/db/catalog'
import { useCartStore } from '@/lib/store/cart-store'
import { useStore } from '@/providers/store-context'
import { formatMYR } from '@/lib/store/pricing-engine'

export default function BundlesPage() {
  const [sections, setSections] = useState<PageSection[]>([])
  const [bundles, setBundles] = useState<DbBundle[]>([])
  const [catalogProducts, setCatalogProducts] = useState<DbProduct[]>([])
  const addItem = useCartStore((s) => s.addItem)
  const [addedId, setAddedId] = useState<string | null>(null)
  const { shopId, basePath } = useStore()

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const params = new URLSearchParams()
        if (shopId) params.set('shopId', shopId)
        const [pageRes, bundlesRes] = await Promise.all([
          fetch(`/api/store/pages?pageId=bundles&${params}`),
          fetch(`/api/store/bundles?${params}`),
        ])
        const { page } = await pageRes.json()
        const { bundles: dbBundles, products: prods } = await bundlesRes.json()
        if (!cancelled) {
          setSections((page?.sections as PageSection[]) ?? DEFAULT_PAGE_SECTIONS.bundles())
          setBundles((dbBundles ?? []).filter((b: DbBundle) => b.status === 'Active'))
          setCatalogProducts(prods ?? [])
        }
      } catch {
        if (!cancelled) setSections(DEFAULT_PAGE_SECTIONS.bundles())
      }
    }
    load()
    return () => { cancelled = true }
  }, [shopId])

  /** Calculate original price dynamically from catalog items instead of stored value */
  function getOriginalPrice(bundle: DbBundle): number {
    let total = 0
    let allFound = true
    const items = bundle.items as any[]
    for (const item of items) {
      const cat = catalogProducts.find(c => c.id === item.catalogId)
      if (cat) {
        const firstTier = (cat.sizes as any)?.fixed?.[0]?.volumeTiers?.[0]
        const unitPrice = firstTier?.unitPrice ?? 0
        total += unitPrice * item.qty
      } else {
        allFound = false
      }
    }
    // Fall back to stored originalPrice if any catalog item is missing
    return allFound && total > 0 ? total : bundle.original_price
  }

  function getBundlePrice(bundle: DbBundle) {
    const original = getOriginalPrice(bundle)
    const discount = bundle.discount_type === 'percentage' ? original * (bundle.discount_value / 100) : bundle.discount_value
    return Math.max(0, original - discount)
  }

  function handleAddToCart(bundle: DbBundle) {
    const bundlePrice = getBundlePrice(bundle)
    const items = bundle.items as any[]
    addItem({
      id: `bundle-${bundle.id}-${Date.now()}`,
      productId: bundle.id,
      name: bundle.name,
      slug: bundle.id.toLowerCase(),
      qty: 1,
      unitPrice: bundlePrice,
      total: bundlePrice,
      selectedSpecs: {},
      optionSummary: items.map((i: any) => `${i.name} x${i.qty}`).join(', '),
      artworkOption: '',
      artworkFileName: '',
    })
    setAddedId(bundle.id)
    setTimeout(() => setAddedId(null), 2000)
  }

  // Render hero from builder, then hardcoded bundle cards
  const heroSection = sections.find((s) => s.type === 'hero')

  return (
    <>
      <Navbar />
      {heroSection && <SectionRenderer section={heroSection} />}

      <main className="max-w-screen-xl mx-auto px-4 sm:px-8 py-10">
        {bundles.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 mb-4">No active bundles at the moment.</p>
            <Link href={`${basePath}/products`} className="text-accent font-semibold hover:underline">Browse Products</Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bundles.map((bundle) => {
              const originalPrice = getOriginalPrice(bundle)
              const bundlePrice = getBundlePrice(bundle)
              const savings = originalPrice - bundlePrice
              const items = bundle.items as any[]
              return (
                <div key={bundle.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="bg-accent/5 px-6 pt-6 pb-4">
                    <div className="flex items-start justify-between mb-2">
                      <h2 className="text-lg font-bold text-gray-900">{bundle.name}</h2>
                      {bundle.featured && <span className="text-[10px] font-bold bg-accent text-white px-2 py-0.5 rounded-full shrink-0">Featured</span>}
                    </div>
                    <p className="text-sm text-gray-500 leading-relaxed">{bundle.description}</p>
                  </div>
                  <div className="px-6 py-4">
                    <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Includes</div>
                    <ul className="space-y-2">
                      {items.map((item: any, i: number) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent shrink-0"><polyline points="20 6 9 17 4 12" /></svg>
                          <span>{item.name}</span>
                          <span className="text-gray-400">x{item.qty}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="px-6 pb-6">
                    <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 mb-4">
                      <div className="flex items-end justify-between">
                        <div>
                          <div className="text-xs text-gray-400 line-through">{formatMYR(originalPrice)}</div>
                          <div className="text-2xl font-bold text-accent">{formatMYR(bundlePrice)}</div>
                        </div>
                        <span className="inline-block bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full">Save {formatMYR(savings)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddToCart(bundle)}
                      className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${addedId === bundle.id ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-accent text-white hover:opacity-90'}`}
                    >
                      {addedId === bundle.id ? 'Added to Cart' : 'Add Bundle to Cart'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
      <Footer />
    </>
  )
}
