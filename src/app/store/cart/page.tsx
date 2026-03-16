'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/store/Navbar'
import Footer from '@/components/store/Footer'
import { useCartStore } from '@/lib/store/cart-store'
import { formatMYR } from '@/lib/store/pricing-engine'
import { TAX_CONFIG } from '@/config/store/tax'
import { getStoreProductBySlug } from '@/lib/store/catalog-bridge'
import { fetchStoreSettings, type StoreSettings, DEFAULTS as SETTINGS_DEFAULTS } from '@/lib/store-settings-store'
import type { Product } from '@/types/store'

export default function CartPage() {
  const { items, removeItem, updateQty } = useCartStore()
  const router = useRouter()
  const [expandedBulk, setExpandedBulk] = useState<Set<string>>(new Set())
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(SETTINGS_DEFAULTS)
  const [productCache, setProductCache] = useState<Record<string, Product | null>>({})

  // Load store settings from Supabase
  useEffect(() => {
    fetchStoreSettings().then(setStoreSettings).catch(() => {})
  }, [])

  // Load products for Canva links
  useEffect(() => {
    const slugsToLoad = items
      .filter(item => !item.artworkFileName && !item.bulkVariant && !productCache[item.slug])
      .map(item => item.slug)
    if (slugsToLoad.length === 0) return

    Promise.all(
      slugsToLoad.map(async slug => {
        const p = await getStoreProductBySlug(slug)
        return [slug, p] as const
      })
    ).then(results => {
      const newCache = { ...productCache }
      for (const [slug, product] of results) {
        newCache[slug] = product
      }
      setProductCache(newCache)
    }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items])

  const subtotal = items.reduce((sum, i) => sum + i.total, 0)

  const toggleBulk = (id: string) => {
    setExpandedBulk(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (!items.length) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center text-gray-400">
            <p className="text-lg font-semibold text-gray-500 mb-2">Your cart is empty</p>
            <p className="text-sm mb-6">Add some products to get started.</p>
            <Link href="/store/products" className="inline-block bg-accent text-white font-bold px-6 py-3 rounded-xl hover:opacity-90 transition">
              Browse Products
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto px-4 py-10 w-full">
        <div className="grid lg:grid-cols-[1fr_320px] gap-8 overflow-hidden">
          {/* Items */}
          <div className="space-y-4 min-w-0">
            {items.map((item) => (
              <div key={item.id} className="rounded-2xl border border-gray-100 bg-white p-5 flex gap-4">
                {/* Icon */}
                <div className="w-16 h-16 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 text-gray-300">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect width="12" height="8" x="6" y="14" /></svg>
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/store/products/${item.slug}`} className="font-semibold text-gray-900 hover:text-accent transition text-sm leading-tight">
                      {item.name}
                    </Link>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-gray-300 hover:text-red-400 transition shrink-0"
                      aria-label="Remove item"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                      </svg>
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 break-words">{item.optionSummary}</p>

                  {/* Bulk variant breakdown */}
                  {item.bulkVariant && item.variantRows && item.variantRows.length > 0 ? (
                    <>
                      <button
                        onClick={() => toggleBulk(item.id)}
                        className="flex items-center gap-1 mt-2 text-xs font-medium text-accent hover:text-accent/80 transition"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                          className={`transition-transform ${expandedBulk.has(item.id) ? 'rotate-90' : ''}`}
                        ><polyline points="9 18 15 12 9 6"/></svg>
                        {expandedBulk.has(item.id) ? 'Hide' : 'View'} breakdown
                      </button>
                      {expandedBulk.has(item.id) && (
                        <div className="mt-2 rounded-lg border border-gray-100 bg-gray-50 divide-y divide-gray-100">
                          {item.variantRows.map((vr) => (
                            <div key={vr.id} className="flex items-center justify-between px-3 py-2 text-xs">
                              <span className="text-gray-700">
                                <span className="font-semibold">{vr.qty}</span> × {vr.optionSummary}
                              </span>
                              <span className="text-gray-600 shrink-0 ml-2">
                                {formatMYR(vr.unitPrice)}/pc = <span className="font-semibold">{formatMYR(vr.rowTotal)}</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-3">
                        <Link href={`/store/products/${item.slug}`} className="text-xs text-accent hover:underline">Edit variants</Link>
                        <div className="text-right">
                          <div className="font-bold text-gray-900">{formatMYR(item.total)}</div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Artwork status */}
                      {item.artworkFileName ? (
                        <span className="inline-flex items-center gap-1 mt-1.5 text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          {item.artworkFileName}
                        </span>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <Link
                            href={`/store/products/${item.slug}/proof?${new URLSearchParams(item.selectedSpecs).toString()}`}
                            className="inline-flex items-center gap-1.5 text-xs font-medium bg-accent/10 text-accent px-3 py-1.5 rounded-lg hover:bg-accent/20 transition"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                            </svg>
                            Upload File
                          </Link>
                          {(() => {
                            const product = productCache[item.slug]
                            if (!product) return null
                            const ps = product.printSpecs
                            return (
                              <a
                                href={`https://www.canva.com/design/create?width=${ps.trimWidthMm + ps.bleedMm * 2}&height=${ps.trimHeightMm + ps.bleedMm * 2}&units=mm`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs font-medium bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg hover:bg-purple-100 transition"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
                                </svg>
                                Design with Canva
                              </a>
                            )
                          })()}
                          <Link
                            href="/store/contact?subject=Request+Design"
                            className="inline-flex items-center gap-1.5 text-xs font-medium bg-orange-50 text-orange-700 px-3 py-1.5 rounded-lg hover:bg-orange-100 transition"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
                            </svg>
                            Request Design
                          </Link>
                          <a
                            href={`https://wa.me/${storeSettings.whatsapp}?text=${encodeURIComponent(`Hi, I'd like to send my artwork for ${item.name} (${item.optionSummary}).`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-medium bg-green-50 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-100 transition"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                            Send via WhatsApp
                          </a>
                        </div>
                      )}

                      {/* Qty + price row */}
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-500">Qty</label>
                          <select
                            value={item.qty}
                            onChange={(e) => updateQty(item.id, Number(e.target.value))}
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                          >
                            {Array.from({ length: 99 }, (_, i) => i + 1).map((n) => (
                              <option key={n} value={n}>{n}</option>
                            ))}
                          </select>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-400">{formatMYR(item.unitPrice)}/pc</div>
                          <div className="font-bold text-gray-900">{formatMYR(item.total)}</div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="h-fit">
            <div className="rounded-2xl border border-gray-100 bg-white p-5">
              <h2 className="font-bold text-gray-900 mb-4">Order Summary</h2>
              <div className="space-y-2 text-sm mb-4">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between text-gray-600">
                    <span className="truncate pr-2">{item.name} ×{item.qty.toLocaleString()}</span>
                    <span className="shrink-0">{formatMYR(item.total)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 pt-3 mb-5">
                <div className="flex justify-between font-bold text-gray-900">
                  <span>Subtotal</span>
                  <span>{formatMYR(subtotal)}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Shipping calculated at checkout
                  {TAX_CONFIG.sstEnabled && <> · {TAX_CONFIG.taxLabel} ({TAX_CONFIG.sstRate}%) will be added</>}
                </p>
              </div>
              <button
                onClick={() => router.push('/store/checkout')}
                className="w-full bg-accent text-white font-bold py-3 rounded-xl hover:opacity-90 transition"
              >
                Proceed to Checkout
              </button>
              <Link href="/store/products" className="block text-center text-sm text-gray-400 hover:text-accent transition mt-3">
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
