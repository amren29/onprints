'use client'

import { useState, useEffect } from 'react'
import { useParams, notFound } from 'next/navigation'
import Navbar from '@/components/store/Navbar'
import Footer from '@/components/store/Footer'
import ProductDetail from '@/components/store/product/ProductDetail'
import { getStoreProductBySlug } from '@/lib/store/catalog-bridge'
import { useStore } from '@/providers/store-context'
import type { Product } from '@/types/store'

export default function SlugProductDetailPage() {
  const params = useParams()
  const productSlug = params.productSlug as string
  const { shopId } = useStore()

  const [product, setProduct] = useState<Product | null>(null)
  const [notFoundState, setNotFoundState] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const match = await getStoreProductBySlug(productSlug, shopId || undefined)
        if (!cancelled) {
          if (match) {
            setProduct(match)
          } else {
            setNotFoundState(true)
          }
        }
      } catch {
        if (!cancelled) setNotFoundState(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [productSlug, shopId])

  if (notFoundState) notFound()
  if (loading || !product) return (
    <>
      <Navbar />
      <main className="flex-1 flex items-center justify-center min-h-[60vh]">
        <svg className="animate-spin text-accent" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity=".2"/><path d="M12 2a10 10 0 0110 10" strokeLinecap="round"/></svg>
      </main>
      <Footer />
    </>
  )

  return (
    <>
      <Navbar />
      <ProductDetail product={product} />
      <Footer />
    </>
  )
}
