'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/store/Navbar'
import Footer from '@/components/store/Footer'
import CategoryIcon from '@/components/store/CategoryIcon'
import AnimateIn from '@/components/store/AnimateIn'
import NewsletterCTA from '@/components/store/NewsletterCTA'
import type { Product } from '@/types/store'
import { dbProductToProduct } from '@/lib/store/catalog-bridge'

export default function ProductsPage() {
  const searchParams = useSearchParams()
  const query = searchParams.get('q')?.trim().toLowerCase() || ''
  const activeCat = searchParams.get('cat') || ''

  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<{ id: string; label: string; description: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/store/products')
        if (!res.ok) throw new Error('Failed to fetch products')
        const { products, categories: cats } = await res.json()

        const catMap = new Map((cats || []).map((c: any) => [c.id, c.name]))
        const converted = (products || [])
          .filter((p: any) => p.status === 'Active' && p.visibility === 'published')
          .map((p: any) => dbProductToProduct(p, catMap.get(p.category_id ?? '') ?? ''))

        if (!cancelled) {
          setAllProducts(converted)
          // Build category list from products
          const seen = new Set<string>()
          const catList: { id: string; label: string; description: string }[] = []
          converted.forEach((p: Product) => {
            if (!seen.has(p.category)) {
              seen.add(p.category)
              catList.push({ id: p.category, label: p.category.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), description: '' })
            }
          })
          setCategories(catList)
        }
      } catch (err) {
        console.error('[Store Products] Failed to load:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const activeProducts = allProducts.filter((p) => p.isActive)

  let filteredProducts = query
    ? activeProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.category.replace('-', ' ').toLowerCase().includes(query)
      )
    : activeProducts

  if (activeCat) {
    filteredProducts = filteredProducts.filter((p) => p.category === activeCat)
  }

  const activeCategoryLabel = activeCat
    ? categories.find((c) => c.id === activeCat)?.label
    : null

  if (loading) {
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
      <main className="max-w-screen-xl mx-auto px-8 py-10">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link href="/store" className="hover:text-accent transition">Home</Link>
          <span>/</span>
          {activeCat ? (
            <>
              <Link href="/store/products" className="hover:text-accent transition">Products</Link>
              <span>/</span>
              <span className="text-gray-700 font-medium">{activeCategoryLabel}</span>
            </>
          ) : (
            <span className="text-gray-700 font-medium">Products</span>
          )}
        </div>

        <div className="flex gap-10">
          {/* ── Sidebar ──────────────────────────── */}
          <aside className="hidden lg:block w-60 shrink-0 sticky top-28 self-start">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Product Category</h2>
            <nav className="flex flex-col">
              <Link
                href="/store/products"
                className={`py-2.5 px-3 text-sm font-medium rounded-lg transition ${
                  !activeCat
                    ? 'text-accent bg-accent/5'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                All Products
              </Link>
              {categories.map((cat) => {
                const count = activeProducts.filter((p) => p.category === cat.id).length
                if (count === 0) return null
                return (
                  <Link
                    key={cat.id}
                    href={`/store/products?cat=${cat.id}`}
                    className={`py-2.5 px-3 text-sm font-medium rounded-lg transition flex items-center justify-between ${
                      activeCat === cat.id
                        ? 'text-accent bg-accent/5'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span className="text-xs text-gray-400">{count}</span>
                  </Link>
                )
              })}
            </nav>
          </aside>

          {/* ── Main content ─────────────────────── */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                {query
                  ? `Results for "${searchParams.get('q')}"`
                  : activeCategoryLabel || 'All Products'}
              </h1>
              <p className="text-gray-500 text-sm">
                {query
                  ? `${filteredProducts.length} product${filteredProducts.length !== 1 ? 's' : ''} found`
                  : `${filteredProducts.length} products`}
              </p>
              {query && (
                <Link href="/store/products" className="text-sm text-accent font-medium hover:underline mt-2 inline-block">
                  Clear search
                </Link>
              )}
            </div>

            {/* Product grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredProducts.map((product, i) => (
                <AnimateIn key={product.id} delay={i * 60} animation="fade-up">
                <Link
                  href={`/store/products/${product.slug}`}
                  className="group"
                >
                  <div className="aspect-square rounded-xl overflow-hidden bg-gray-100 mb-3">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <CategoryIcon category={product.category} size={48} className="text-gray-300 group-hover:text-accent/40 transition" />
                      </div>
                    )}
                  </div>
                  <h3 className="font-medium text-gray-900 text-sm group-hover:text-accent transition leading-tight">
                    {product.name}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">{product.description}</p>
                  <span className="text-xs font-semibold text-accent mt-2 inline-block">
                    {product.pricingMatrix.default[0]?.unitPrice > 0
                      ? `From RM ${product.pricingMatrix.default[0].unitPrice.toFixed(2)}/pc`
                      : 'Get a quote'}
                  </span>
                </Link>
                </AnimateIn>
              ))}
            </div>

            {/* Empty state */}
            {filteredProducts.length === 0 && (
              <div className="text-center py-20">
                <svg className="mx-auto mb-4 text-gray-300" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <p className="text-gray-400 text-lg font-medium mb-2">No products found</p>
                <p className="text-gray-300 text-sm mb-4">Try a different search term</p>
                <Link href="/store/products" className="text-accent text-sm font-semibold hover:underline">
                  Browse all products
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
      <NewsletterCTA />
      <Footer />
    </>
  )
}
