'use client'

import { Fragment, useState, useCallback, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Product } from '@/types/store'
import { calculatePrice, formatMYR } from '@/lib/store/pricing-engine'
import { useCartStore } from '@/lib/store/cart-store'
import { useAuthStore } from '@/lib/store/auth-store'
import { useCanvaTokensFromCookie } from '@/lib/store/use-canva-tokens'
import { getStoreProducts, getStoreCategories } from '@/lib/store/catalog-bridge'
import NewsletterCTA from '@/components/store/NewsletterCTA'
import AnimateIn from '@/components/store/AnimateIn'
import CanvaDesignPicker from '@/components/store/canva/CanvaDesignPicker'
import StorefrontVariantBuilder, { type VariantBuilderHandle, type BulkCalc } from '@/components/store/product/StorefrontVariantBuilder'
import { getReviews, createReview, initReviewData, type Review } from '@/lib/review-store'
import { initCatalogData, getCatalogItems, type CatalogItem } from '@/lib/catalog-store'

/* ── Review Form Component ─────────────────────────────────────── */
function ReviewForm({ productName, userName, onSubmitted }: { productName: string; userName: string; onSubmitted: () => void }) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [text, setText] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
        <p className="text-sm font-semibold text-green-700">Thank you for your review!</p>
        <p className="text-xs text-green-600 mt-1">Your review has been submitted and will be visible once approved.</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 rounded-2xl p-5">
      <h3 className="font-semibold text-gray-800 text-sm mb-3">Write a Review</h3>

      {/* Star rating */}
      <div className="mb-3">
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Rating</label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => { setRating(star); setError('') }}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="p-0.5"
            >
              <svg
                className={`w-6 h-6 transition-colors ${star <= (hoverRating || rating) ? 'text-yellow-400' : 'text-gray-300'}`}
                viewBox="0 0 24 24"
                fill={star <= (hoverRating || rating) ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </button>
          ))}
        </div>
      </div>

      {/* Review text */}
      <div className="mb-3">
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Your Review</label>
        <textarea
          value={text}
          onChange={(e) => { setText(e.target.value); setError('') }}
          placeholder="Share your experience with this product..."
          rows={3}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent transition placeholder:text-gray-300 resize-none"
        />
      </div>

      {error && (
        <p className="text-xs text-red-500 mb-3">{error}</p>
      )}

      <button
        onClick={() => {
          if (rating === 0) { setError('Please select a rating'); return }
          if (!text.trim()) { setError('Please write a review'); return }
          createReview({
            name: userName,
            company: '',
            product: productName,
            rating,
            text: text.trim(),
            status: 'Pending',
            pinned: false,
            date: new Date().toISOString().split('T')[0],
          })
          setSubmitted(true)
          onSubmitted()
        }}
        className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-accent text-white hover:opacity-90 transition"
      >
        Submit Review
      </button>
    </div>
  )
}

/** Thumbnail images for related products */
const PRODUCT_IMAGES: Record<string, string> = {
  'business-cards-standard': 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=400&fit=crop&crop=center',
  'pvc-id-cards': 'https://images.unsplash.com/photo-1578670812003-60745e2c2ea9?w=400&h=400&fit=crop&crop=center',
  flyers: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400&h=400&fit=crop&crop=center',
  brochures: 'https://images.unsplash.com/photo-1572025442646-866d16c84a54?w=400&h=400&fit=crop&crop=center',
  posters: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=400&fit=crop&crop=center',
  banners: 'https://images.unsplash.com/photo-1588412079929-790b9f593d8e?w=400&h=400&fit=crop&crop=center',
  bunting: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=400&h=400&fit=crop&crop=center',
  letterheads: 'https://images.unsplash.com/photo-1568205612837-017257d2310a?w=400&h=400&fit=crop&crop=center',
  notepads: 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=400&h=400&fit=crop&crop=center',
  'sticker-labels': 'https://images.unsplash.com/photo-1635405074683-96d6921a2a68?w=400&h=400&fit=crop&crop=center',
  'acrylic-signage': 'https://images.unsplash.com/photo-1563906267088-b029e7101114?w=400&h=400&fit=crop&crop=center',
  'rubber-stamps': 'https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?w=400&h=400&fit=crop&crop=center',
  'name-tags': 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=400&fit=crop&crop=center',
  'event-tickets': 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&h=400&fit=crop&crop=center',
  mugs: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400&h=400&fit=crop&crop=center',
  'non-woven-bags': 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=400&h=400&fit=crop&crop=center',
  'document-printing': 'https://images.unsplash.com/photo-1568219656418-15c329312bf1?w=400&h=400&fit=crop&crop=center',
}

/** Placeholder images per product slug — main + variants */
const PRODUCT_GALLERY: Record<string, string[]> = {
  'business-cards-standard': [
    'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800&h=800&fit=crop&crop=center',
    'https://images.unsplash.com/photo-1572025442646-866d16c84a54?w=800&h=800&fit=crop&crop=center',
    'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=800&h=800&fit=crop&crop=center',
    'https://images.unsplash.com/photo-1568205612837-017257d2310a?w=800&h=800&fit=crop&crop=center',
  ],
  'pvc-id-cards': [
    'https://images.unsplash.com/photo-1578670812003-60745e2c2ea9?w=800&h=800&fit=crop&crop=center',
    'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800&h=800&fit=crop&crop=center',
  ],
  flyers: [
    'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=800&h=800&fit=crop&crop=center',
    'https://images.unsplash.com/photo-1572025442646-866d16c84a54?w=800&h=800&fit=crop&crop=center',
    'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&h=800&fit=crop&crop=center',
  ],
  brochures: [
    'https://images.unsplash.com/photo-1572025442646-866d16c84a54?w=800&h=800&fit=crop&crop=center',
    'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=800&h=800&fit=crop&crop=center',
  ],
  posters: [
    'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&h=800&fit=crop&crop=center',
    'https://images.unsplash.com/photo-1588412079929-790b9f593d8e?w=800&h=800&fit=crop&crop=center',
  ],
  banners: [
    'https://images.unsplash.com/photo-1588412079929-790b9f593d8e?w=800&h=800&fit=crop&crop=center',
    'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&h=800&fit=crop&crop=center',
  ],
  bunting: [
    'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=800&h=800&fit=crop&crop=center',
  ],
  letterheads: [
    'https://images.unsplash.com/photo-1568205612837-017257d2310a?w=800&h=800&fit=crop&crop=center',
  ],
  notepads: [
    'https://images.unsplash.com/photo-1517842645767-c639042777db?w=800&h=800&fit=crop&crop=center',
  ],
  'sticker-labels': [
    'https://images.unsplash.com/photo-1635405074683-96d6921a2a68?w=800&h=800&fit=crop&crop=center',
  ],
  'acrylic-signage': [
    'https://images.unsplash.com/photo-1563906267088-b029e7101114?w=800&h=800&fit=crop&crop=center',
  ],
  'rubber-stamps': [
    'https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?w=800&h=800&fit=crop&crop=center',
  ],
  'name-tags': [
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=800&fit=crop&crop=center',
  ],
  'event-tickets': [
    'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&h=800&fit=crop&crop=center',
  ],
  mugs: [
    'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800&h=800&fit=crop&crop=center',
  ],
  'non-woven-bags': [
    'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=800&h=800&fit=crop&crop=center',
  ],
  'document-printing': [
    'https://images.unsplash.com/photo-1568219656418-15c329312bf1?w=800&h=800&fit=crop&crop=center',
  ],
}

const INFO_TABS = [
  'Product Overview',
  'Reviews',
  'Print Spec & Artwork',
  'Process Duration',
  'How to Order',
  'Delivery & Collection',
] as const

/* ── Custom dropdown for store (replaces native <select>) ─────────── */
function StoreDropdown({ value, onChange, options, className }: {
  value: string | number
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find(o => o.value === String(value))

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className={`relative ${className ?? ''}`}>
      <button type="button" onClick={() => setOpen(o => !o)}
        className={`w-full px-3 py-2.5 rounded-xl text-sm font-medium border bg-white text-gray-700 text-left flex items-center justify-between gap-2 transition cursor-pointer focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent ${open ? 'border-accent ring-1 ring-accent' : 'border-gray-200 hover:border-gray-300'}`}
      >
        <span className="truncate" title={selected?.label}>{selected?.label ?? '— Select —'}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 w-full mt-1 z-30 bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
          {options.map(o => (
            <button key={o.value} type="button" onMouseDown={e => e.preventDefault()} onClick={() => { onChange(o.value); setOpen(false) }}
              className={`block w-full px-3 py-2 text-left text-sm transition ${o.value === String(value) ? 'text-accent font-semibold bg-accent/5' : 'text-gray-700 hover:bg-gray-50'}`}
            >{o.label}</button>
          ))}
        </div>
      )}
    </div>
  )
}

interface Props {
  product: Product
}

export default function ProductDetail({ product }: Props) {
  const router = useRouter()
  const addItem = useCartStore((s) => s.addItem)
  const currentUser = useAuthStore((s) => s.currentUser)

  const [selectedSpecs, setSelectedSpecs] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const spec of product.specs) init[spec.key] = spec.default
    return init
  })
  const [selectedQty, setSelectedQty] = useState(product.quantities[0])
  const [addedToCart, setAddedToCart] = useState(false)
  const [activeImageIdx, setActiveImageIdx] = useState(0)
  const [customW, setCustomW] = useState('')
  const [customH, setCustomH] = useState('')
  const [customUnit, setCustomUnit] = useState<'ft' | 'in' | 'cm' | 'm'>('ft')
  const [activeTab, setActiveTab] = useState<(typeof INFO_TABS)[number]>('Product Overview')
  const [canvaPickerOpen, setCanvaPickerOpen] = useState(false)

  // Bulk variant builder ref + calc state
  const variantBuilderRef = useRef<VariantBuilderHandle>(null)
  const [bulkCalc, setBulkCalc] = useState<BulkCalc>({ totalQty: 0, grandTotal: 0, tier: null })
  const handleBulkCalcChange = useCallback((c: BulkCalc) => setBulkCalc(c), [])

  // Load approved reviews for this product
  const [reviews, setReviews] = useState<Review[]>([])
  const [catalogInfo, setCatalogInfo] = useState<CatalogItem['productInfo'] | null>(null)
  const [categoryLabel, setCategoryLabel] = useState('')
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([])
  useEffect(() => {
    initReviewData()
    const all = getReviews()
    const productName = product.name.toLowerCase()
    const approved = all.filter(
      (r) => r.status === 'Approved' && productName.includes(r.product.toLowerCase()),
    )
    setReviews(approved)
    // Load product info from catalog store
    initCatalogData()
    const catalogItems = getCatalogItems()
    const match = catalogItems.find(c => c.name.toLowerCase() === product.name.toLowerCase())
    if (match?.productInfo) setCatalogInfo(match.productInfo)
    // Load category info and related products (async)
    getStoreCategories().then(cats => {
      const cat = cats.find((c) => c.id === product.category)
      if (cat) setCategoryLabel(cat.label)
    }).catch(() => {})
    getStoreProducts().then(prods => {
      setRelatedProducts(prods.filter((p) => p.category === product.category && p.id !== product.id && p.isActive).slice(0, 4))
    }).catch(() => {})
  }, [product.name, product.category, product.id])

  const avgRating = useMemo(() => {
    if (reviews.length === 0) return 0
    return parseFloat((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1))
  }, [reviews])

  // Pick up Canva tokens from cookie after OAuth redirect
  useCanvaTokensFromCookie()

  const gallery = PRODUCT_GALLERY[product.slug] || []

  // Effective discount: agent discountRate or membership discountRate, whichever is higher
  const agentDiscount = currentUser?.discountRate ?? 0
  const memberDiscount = (currentUser?.membership && (currentUser.membership.status ?? 'active') === 'active' && new Date(currentUser.membership.expiryDate) > new Date())
    ? currentUser.membership.discountRate : 0
  const effectiveDiscount = Math.max(agentDiscount, memberDiscount)
  const discountSource: 'agent' | 'member' | null =
    effectiveDiscount > 0
      ? (agentDiscount >= memberDiscount ? 'agent' : 'member')
      : null

  const isCustomSize = selectedSpecs.size === 'Custom Size' || product.sizeMode === 'custom'
  const standardPrice = calculatePrice(product, selectedSpecs, selectedQty, effectiveDiscount)

  // Custom size sqft pricing override
  const customSizePrice = (() => {
    if (!isCustomSize || !product.sqftPricing) return null
    const w = parseFloat(customW) || 0
    const h = parseFloat(customH) || 0
    if (w <= 0 || h <= 0) return null
    const toSqft = (ww: number, hh: number, u: string) => {
      const factors: Record<string, number> = { ft: 1, in: 1 / 144, cm: 1 / 929.0304, m: 10.7639 }
      return ww * hh * (factors[u] || 1)
    }
    const area = toSqft(w, h, customUnit)
    const raw = area * product.sqftPricing.pricePerSqft
    let up = (product.sqftPricing.minCharge && product.sqftPricing.minCharge > 0) ? Math.max(raw, product.sqftPricing.minCharge) : raw
    if (effectiveDiscount > 0) up = up * (1 - effectiveDiscount)
    return { unitPrice: parseFloat(up.toFixed(2)), totalPrice: parseFloat((up * selectedQty).toFixed(2)) }
  })()

  const unitPrice = customSizePrice?.unitPrice ?? standardPrice.unitPrice
  const totalPrice = customSizePrice?.totalPrice ?? standardPrice.totalPrice
  const productionDays = standardPrice.productionDays
  const discountRate = standardPrice.discountRate

  const categoryInfo = categoryLabel ? { label: categoryLabel } : null
  const optionSummary = Object.entries(selectedSpecs).map(([, v]) => v).filter(v => v !== 'Custom Size').concat(isCustomSize && customW && customH ? [`${customW}×${customH}${customUnit}`] : []).join(' · ')

  const handleSpecChange = useCallback((key: string, value: string) => {
    setSelectedSpecs((prev) => ({ ...prev, [key]: value }))
  }, [])

  function buildCartItem(artworkFileName = '', artworkUrl = '', artworkOption: 'upload' | 'canva' | '' = '') {
    return {
      id: `${product.id}-${Date.now()}`,
      productId: product.id,
      name: product.name,
      slug: product.slug,
      qty: selectedQty,
      unitPrice,
      total: totalPrice,
      selectedSpecs,
      optionSummary,
      artworkOption,
      artworkFileName,
      artworkUrl,
    }
  }

  function handleAddToCart() {
    addItem(buildCartItem())
    setAddedToCart(true)
    setTimeout(() => setAddedToCart(false), 2000)
  }

  function handleAddToCartAndCheckout() {
    addItem(buildCartItem())
    router.push('/store/cart')
  }

  const canvaConfigured = !!process.env.NEXT_PUBLIC_CANVA_CLIENT_ID

  function getCanvaDeepLink() {
    const w = product.printSpecs.trimWidthMm + product.printSpecs.bleedMm * 2
    const h = product.printSpecs.trimHeightMm + product.printSpecs.bleedMm * 2
    return `https://www.canva.com/design/create?width=${w}&height=${h}&units=mm`
  }

  function handleCanvaClick() {
    // Fallback to deep-link if Canva API not configured
    if (!canvaConfigured) {
      window.open(getCanvaDeepLink(), '_blank', 'noopener,noreferrer')
      return
    }
    if (!currentUser) {
      router.push(`/store/auth/signin?returnTo=/store/products/${product.slug}`)
      return
    }
    if (!currentUser.canvaTokens?.accessToken || currentUser.canvaTokens.expiresAt < Date.now()) {
      window.location.href = `/api/store/canva/authorize?returnTo=/store/products/${product.slug}`
      return
    }
    setCanvaPickerOpen(true)
  }

  function handleCanvaDesignExported(imageUrl: string, designId: string) {
    router.push(`/store/products/${product.slug}/proof?canvaImage=${encodeURIComponent(imageUrl)}&canvaDesignId=${designId}`)
  }

  return (
    <>
      <main className="max-w-screen-xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-400 mb-6 flex items-center gap-2">
          <Link href="/store/products" className="hover:text-accent transition">Products</Link>
          <span>/</span>
          <Link href={`/store/products?cat=${product.category}`} className="hover:text-accent transition">
            {categoryInfo?.label ?? product.category}
          </Link>
          <span>/</span>
          <span className="text-gray-700 font-medium">{product.name}</span>
        </nav>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* ── Left — Image gallery ──────────────────── */}
          <AnimateIn animation="fade-in">
          <div>
            {/* Main image */}
            <div className="aspect-square rounded-xl overflow-hidden bg-gray-100 mb-4">
              {gallery.length > 0 ? (
                <img
                  src={gallery[activeImageIdx]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300">
                    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                    <circle cx="9" cy="9" r="2" />
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                  </svg>
                </div>
              )}
            </div>

            {/* Thumbnail row */}
            {gallery.length > 1 && (
              <div className="flex gap-3">
                {gallery.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImageIdx(i)}
                    className={`w-20 h-20 rounded-lg overflow-hidden border-2 transition ${
                      activeImageIdx === i ? 'border-accent' : 'border-transparent hover:border-gray-300'
                    }`}
                  >
                    <img src={img} alt={`${product.name} variant ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          </AnimateIn>

          {/* ── Right — Configurator ─────────────────── */}
          <AnimateIn animation="slide-right" delay={100}>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{product.name}</h1>
            <p className="text-gray-500 text-sm mb-6">{product.description}</p>

            {product.bulkVariant ? (
              <StorefrontVariantBuilder
                ref={variantBuilderRef}
                product={product}
                discount={effectiveDiscount}
                onCalcChange={handleBulkCalcChange}
              />
            ) : (<>
            {/* Spec selectors — standard products only */}
            <div className="space-y-5 mb-6">
              {/* Custom size only mode — show W×H inputs first */}
              {product.sizeMode === 'custom' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Custom Size</label>
                  <div className="flex items-center gap-2">
                    <input type="number" placeholder="Width" value={customW} onChange={e => setCustomW(e.target.value)} min="0" step="0.1" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent" />
                    <span className="text-gray-400 font-semibold text-sm">×</span>
                    <input type="number" placeholder="Height" value={customH} onChange={e => setCustomH(e.target.value)} min="0" step="0.1" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent" />
                    <select value={customUnit} onChange={e => setCustomUnit(e.target.value as typeof customUnit)} className="px-2 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent">
                      <option value="ft">ft</option><option value="in">in</option><option value="cm">cm</option><option value="m">m</option>
                    </select>
                  </div>
                </div>
              )}
              {product.specs.length === 0 ? (
                /* No specs — show quantity */
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity</label>
                  <StoreDropdown
                    value={String(selectedQty)}
                    onChange={(v) => setSelectedQty(Number(v))}
                    options={product.quantities.map(qty => ({ value: String(qty), label: `${qty.toLocaleString()}` }))}
                  />
                </div>
              ) : (
                product.specs.map((spec, specIdx) => (
                  <Fragment key={spec.key}>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">{spec.label}</label>
                      {spec.displayType === 'dropdown' ? (
                        <>
                        <StoreDropdown
                          value={selectedSpecs[spec.key]}
                          onChange={(v) => handleSpecChange(spec.key, v)}
                          options={spec.options.map(opt => ({ value: opt, label: opt }))}
                        />
                        {/* Show custom size inputs when "Custom Size" selected in both mode */}
                        {spec.key === 'size' && selectedSpecs.size === 'Custom Size' && (
                          <div className="flex items-center gap-2 mt-3">
                            <input type="number" placeholder="Width" value={customW} onChange={e => setCustomW(e.target.value)} min="0" step="0.1" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent" />
                            <span className="text-gray-400 font-semibold text-sm">×</span>
                            <input type="number" placeholder="Height" value={customH} onChange={e => setCustomH(e.target.value)} min="0" step="0.1" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent" />
                            <select value={customUnit} onChange={e => setCustomUnit(e.target.value as typeof customUnit)} className="px-2 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent">
                              <option value="ft">ft</option><option value="in">in</option><option value="cm">cm</option><option value="m">m</option>
                            </select>
                          </div>
                        )}
                        </>
                      ) : spec.displayType === 'image' ? (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {spec.options.map((opt) => {
                            const imgSrc = spec.optionImages?.[opt]
                            const isSelected = selectedSpecs[spec.key] === opt
                            return (
                              <button
                                key={opt}
                                onClick={() => handleSpecChange(spec.key, opt)}
                                className={`relative rounded-xl border-2 overflow-hidden transition-all ${
                                  isSelected
                                    ? 'border-accent ring-2 ring-accent/30'
                                    : 'border-gray-200 hover:border-gray-400'
                                }`}
                              >
                                <div className="aspect-square bg-gray-100">
                                  {imgSrc ? (
                                    <img src={imgSrc} alt={opt} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">?</div>
                                  )}
                                </div>
                                <div className={`text-xs font-medium p-1.5 text-center truncate ${
                                  isSelected ? 'text-accent' : 'text-gray-600'
                                }`}>
                                  {opt}
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {spec.options.map((opt) => (
                            <button
                              key={opt}
                              onClick={() => handleSpecChange(spec.key, opt)}
                              className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                                selectedSpecs[spec.key] === opt
                                  ? 'bg-accent text-white border-accent'
                                  : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Quantity — right after the first spec (Size) */}
                    {specIdx === 0 && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity</label>
                        <StoreDropdown
                          value={String(selectedQty)}
                          onChange={(v) => setSelectedQty(Number(v))}
                          options={product.quantities.map(qty => ({ value: String(qty), label: `${qty.toLocaleString()}` }))}
                        />
                      </div>
                    )}
                  </Fragment>
                ))
              )}
            </div>

            {/* Price display — standard products */}
            <div className="rounded-2xl bg-gray-50 border border-gray-200 p-5 mb-6">
              {discountRate > 0 && (
                <span className="inline-block bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full mb-3">
                  {discountSource === 'agent' ? 'Agent Price' : 'Member Price'} — {Math.round(discountRate * 100)}% off
                </span>
              )}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-1">
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">Unit price</div>
                  <div className="text-3xl font-extrabold text-gray-900">
                    {formatMYR(unitPrice)}<span className="text-sm font-normal text-gray-400">/pc</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500 mb-0.5">Total ({selectedQty.toLocaleString()})</div>
                  <div className="text-xl font-extrabold text-accent">{formatMYR(totalPrice)}</div>
                </div>
              </div>
              <div className="border-t border-gray-200 pt-3 mt-3 flex items-center gap-2 text-xs text-gray-500">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                Estimated production: {product.processDuration || `${productionDays}–${productionDays + 2} working days`}
              </div>
              {discountSource === 'agent' && (
                <p className="text-[11px] text-gray-400 mt-2">Agent price requires sufficient wallet balance at checkout</p>
              )}
            </div>
            </>)}

            {/* Price display — bulk variant products */}
            {product.bulkVariant && (
            <div className="rounded-2xl bg-gray-50 border border-gray-200 p-5 mb-6 mt-6">
              {effectiveDiscount > 0 && (
                <span className="inline-block bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full mb-3">
                  {discountSource === 'agent' ? 'Agent Price' : 'Member Price'} — {Math.round(effectiveDiscount * 100)}% off
                </span>
              )}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-1">
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">Total quantity</div>
                  <div className="text-3xl font-extrabold text-gray-900">
                    {bulkCalc.totalQty > 0 ? <>{bulkCalc.totalQty.toLocaleString()}<span className="text-sm font-normal text-gray-400"> pcs</span></> : <span className="text-gray-300">0 pcs</span>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500 mb-0.5">Grand Total</div>
                  <div className="text-xl font-extrabold text-accent">{formatMYR(bulkCalc.grandTotal)}</div>
                </div>
              </div>
              <div className="border-t border-gray-200 pt-3 mt-3 space-y-1.5">
                {bulkCalc.tier ? (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                    Volume tier: {bulkCalc.totalQty.toLocaleString()}+ pcs at {formatMYR(bulkCalc.tier.unitPrice)}/pc base
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">Enter quantity above to see pricing</p>
                )}
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  Estimated production: {product.processDuration || '3–5 working days'}
                </div>
              </div>
            </div>
            )}

            {/* Artwork options */}
            <div className="mb-6">
              <div className="text-sm font-semibold text-gray-700 mb-3">Artwork</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link
                  href={`/store/products/${product.slug}/proof?${new URLSearchParams({ ...selectedSpecs, qty: String(selectedQty) }).toString()}`}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold text-xs sm:text-sm hover:border-gray-400 hover:bg-gray-50 transition-all"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  Upload Your Design
                </Link>
                <button
                  onClick={handleCanvaClick}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold text-xs sm:text-sm hover:border-gray-400 hover:bg-gray-50 transition-all"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
                  </svg>
                  Design with Canva
                </button>
                <Link
                  href="/store/contact?subject=Request+Design"
                  className="flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold text-xs sm:text-sm hover:border-gray-400 hover:bg-gray-50 transition-all"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
                  </svg>
                  Request Design
                </Link>
                <a
                  href={`https://wa.me/60123456789?text=${encodeURIComponent(`Hi, I'd like to send my artwork for ${product.name} (${optionSummary}).`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold text-xs sm:text-sm hover:border-gray-400 hover:bg-gray-50 transition-all"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                  Send via WhatsApp
                </a>
              </div>
              <p className="text-xs text-gray-400 mt-2">You can also add to cart now and upload artwork later.</p>
            </div>

            {/* Add to Cart / Buy Now — standard products */}
            {!product.bulkVariant && (
            <div className="flex gap-3">
              <button
                onClick={handleAddToCart}
                className={`flex-1 py-3.5 rounded-xl font-bold text-sm border-2 transition-all ${
                  addedToCart
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 bg-white text-gray-900 hover:border-gray-400'
                }`}
              >
                {addedToCart ? 'Added to Cart' : 'Add to Cart'}
              </button>
              <button
                onClick={handleAddToCartAndCheckout}
                className="flex-[1.3] py-3.5 rounded-xl font-bold text-sm bg-accent text-white hover:opacity-90 transition"
              >
                Buy Now
              </button>
            </div>
            )}

            {/* Add to Cart / Buy Now — bulk variant products */}
            {product.bulkVariant && (
            <div className="flex gap-3">
              <button
                onClick={() => {
                  const item = variantBuilderRef.current?.buildCartItem()
                  if (!item) return
                  addItem(item)
                  setAddedToCart(true)
                  setTimeout(() => setAddedToCart(false), 2000)
                }}
                className={`flex-1 py-3.5 rounded-xl font-bold text-sm border-2 transition-all ${
                  addedToCart
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 bg-white text-gray-900 hover:border-gray-400'
                }`}
              >
                {addedToCart ? 'Added to Cart' : 'Add to Cart'}
              </button>
              <button
                onClick={() => {
                  const item = variantBuilderRef.current?.buildCartItem()
                  if (!item) return
                  addItem(item)
                  router.push('/store/cart')
                }}
                className="flex-[1.3] py-3.5 rounded-xl font-bold text-sm bg-accent text-white hover:opacity-90 transition"
              >
                Buy Now
              </button>
            </div>
            )}
          </div>
          </AnimateIn>
        </div>

        {/* ── Tabbed info section ──────────────────────── */}
        <AnimateIn animation="fade-up">
        <section className="mt-16">
          {/* Tab buttons */}
          <div className="flex border-b border-gray-200 overflow-x-auto scrollbar-hide">
            {INFO_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 sm:px-5 py-3 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 transition shrink-0 ${
                  activeTab === tab
                    ? 'border-accent text-accent'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="py-8 text-sm text-gray-600 leading-relaxed">
            {activeTab === 'Product Overview' && (
              catalogInfo?.overview ? (
                <div className="text-gray-600 leading-relaxed whitespace-pre-line">{catalogInfo.overview}</div>
              ) : (
              <div>
                <p className="text-gray-500 mb-4">{product.description}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-2">
                  {product.specs.map((spec) => (
                    <div key={spec.key} className="flex items-baseline gap-2 py-1.5 border-b border-gray-100">
                      <span className="font-medium text-gray-800 text-sm whitespace-nowrap">{spec.label}:</span>
                      <span className="text-gray-500 text-sm">{spec.options.join(', ')}</span>
                    </div>
                  ))}
                  <div className="flex items-baseline gap-2 py-1.5 border-b border-gray-100">
                    <span className="font-medium text-gray-800 text-sm whitespace-nowrap">Quantities:</span>
                    <span className="text-gray-500 text-sm">{product.quantities[0]} – {product.quantities[product.quantities.length - 1]}</span>
                  </div>
                </div>
              </div>
              )
            )}

            {activeTab === 'Reviews' && (
              <div className="space-y-6">
                {/* Write a review form (logged-in users only) */}
                {currentUser ? (
                  <ReviewForm productName={product.name} userName={currentUser.name} onSubmitted={() => {
                    const all = getReviews()
                    const productName = product.name.toLowerCase()
                    setReviews(all.filter(r => r.status === 'Approved' && productName.includes(r.product.toLowerCase())))
                  }} />
                ) : (
                  <div className="bg-gray-50 rounded-2xl p-4 text-center">
                    <p className="text-sm text-gray-500">
                      <Link href="/store/login" className="text-accent font-semibold hover:underline">Sign in</Link> to write a review.
                    </p>
                  </div>
                )}

                {/* Existing reviews */}
                {reviews.length > 0 && (
                  <>
                    <div className="flex items-center gap-4 mb-2">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg key={star} className={`w-5 h-5 ${star <= Math.round(avgRating) ? 'text-yellow-400' : 'text-gray-200'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                        ))}
                      </div>
                      <span className="text-sm text-gray-500">{avgRating} out of 5 ({reviews.length} review{reviews.length !== 1 ? 's' : ''})</span>
                    </div>

                    {reviews.map((review) => (
                      <div key={review.id} className="border-b border-gray-100 pb-5 last:border-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent font-semibold text-sm">{review.name[0]}</div>
                            <div>
                              <div className="font-medium text-gray-800 text-sm">{review.name}{review.company ? <span className="text-gray-400 font-normal"> — {review.company}</span> : null}</div>
                              <div className="text-xs text-gray-400">{review.date}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <svg key={star} className={`w-3.5 h-3.5 ${star <= review.rating ? 'text-yellow-400' : 'text-gray-200'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                            ))}
                          </div>
                        </div>
                        <p className="text-gray-500 text-sm">{review.text}</p>
                      </div>
                    ))}
                  </>
                )}

                {reviews.length === 0 && !currentUser && (
                  <p className="text-gray-400 text-sm">No reviews yet for this product.</p>
                )}
                {reviews.length === 0 && currentUser && (
                  <p className="text-gray-400 text-sm">Be the first to review this product.</p>
                )}
              </div>
            )}

            {activeTab === 'Print Spec & Artwork' && (
              (catalogInfo?.printSpec || catalogInfo?.artworkGuidelines) ? (
                <div className="grid md:grid-cols-2 gap-8">
                  {catalogInfo.printSpec && (
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                        Print Specifications
                      </h3>
                      <div className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{catalogInfo.printSpec}</div>
                    </div>
                  )}
                  {catalogInfo.artworkGuidelines && (
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                        Artwork Guidelines
                      </h3>
                      <div className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{catalogInfo.artworkGuidelines}</div>
                    </div>
                  )}
                </div>
              ) :
              <div className="space-y-6">
                {/* Three columns: Document Setup | Print Requirements | Artwork Guidelines */}
                <div className="grid md:grid-cols-3 gap-6">
                  {/* Document setup */}
                  <div>
                    <div className="font-semibold text-gray-800 mb-3">Document Setup</div>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-accent mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                        <span>Trim size: <strong>{product.printSpecs.trimWidthMm} x {product.printSpecs.trimHeightMm} mm</strong></span>
                      </li>
                      <li className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-accent mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                        <span>Document size (with bleed): <strong>{product.printSpecs.trimWidthMm + product.printSpecs.bleedMm * 2} x {product.printSpecs.trimHeightMm + product.printSpecs.bleedMm * 2} mm</strong></span>
                      </li>
                      <li className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-accent mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                        <span>Bleed: <strong>{product.printSpecs.bleedMm} mm</strong> all sides</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-accent mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                        <span>Safe area: <strong>{product.printSpecs.safeAreaMm} mm</strong> inward from trim</span>
                      </li>
                      {product.templateUrl && (
                        <li className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-accent mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                          </svg>
                          <a href={product.templateUrl} download className="text-accent hover:underline">Download Template</a>
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* Print requirements */}
                  <div>
                    <div className="font-semibold text-gray-800 mb-3">Print Requirements</div>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-accent mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                        <span>Min. resolution: <strong>{product.printSpecs.minDpi} DPI</strong></span>
                      </li>
                      <li className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-accent mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                        <span>Color mode: <strong>CMYK</strong></span>
                      </li>
                      <li className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-accent mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                        <span>Accepted formats: <strong>PDF, AI, PSD, PNG, JPG</strong></span>
                      </li>
                      <li className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-accent mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                        <span>Fonts: <strong>Convert to outlines</strong></span>
                      </li>
                    </ul>
                  </div>

                  {/* Artwork guidelines */}
                  <div>
                    <div className="font-semibold text-gray-800 mb-3">Artwork Guidelines</div>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-accent mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                        <span>Submit files in PDF, AI, PSD, or high-resolution JPEG/PNG</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-accent mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                        <span>Ensure minimum <strong>{product.printSpecs.minDpi} DPI</strong> resolution</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-accent mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                        <span>Include <strong>{product.printSpecs.bleedMm} mm bleed</strong> on all sides</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-accent mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                        <span>Keep content within <strong>safe area</strong> ({product.printSpecs.safeAreaMm} mm from trim)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-accent mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                        <span>Use <strong>CMYK</strong> color mode</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-accent mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                        <span>Convert all fonts to outlines/curves</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Process Duration' && (
              catalogInfo?.processDuration ? (
                <div className="text-gray-600 leading-relaxed whitespace-pre-line">{catalogInfo.processDuration}</div>
              ) :
              <div className="space-y-4">
                <p>Our standard production timeline for <strong>{product.name}</strong>:</p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-accent mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                    <span><strong>Artwork Verification</strong> — 1 working day. We review your submitted artwork for print readiness.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-accent mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                    <span><strong>Production</strong> — {productionDays}–{productionDays + 2} working days. Printing and finishing processes.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-accent mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                    <span><strong>Quality Check & Packing</strong> — 1 working day. Final inspection and secure packaging.</span>
                  </li>
                </ul>
                <p className="text-gray-400 text-xs mt-4">* Timeline starts after artwork approval. Rush orders may be available — contact us for details.</p>
              </div>
            )}

            {activeTab === 'How to Order' && (
              catalogInfo?.howToOrder ? (
                <div className="text-gray-600 leading-relaxed whitespace-pre-line">{catalogInfo.howToOrder}</div>
              ) :
              <div className="space-y-4">
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-accent mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                    <span><strong>Configure Your Product</strong> — Select your preferred material, finishing, size, and quantity above.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-accent mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                    <span><strong>Upload Your Artwork</strong> — Upload your design file or create one using Canva. Our proofing tool will check bleed, trim, and resolution.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-accent mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                    <span><strong>Add to Cart & Checkout</strong> — Review your order, fill in delivery details, and complete payment.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-accent mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                    <span><strong>We Print & Deliver</strong> — Our team reviews your artwork, prints it, and ships it to you or prepares for self-collection.</span>
                  </li>
                </ul>
              </div>
            )}

            {activeTab === 'Delivery & Collection' && (
              catalogInfo?.delivery ? (
                <div className="text-gray-600 leading-relaxed whitespace-pre-line">{catalogInfo.delivery}</div>
              ) :
              <div className="space-y-4">
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-accent mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                    <span><strong>Self Pick-Up</strong> — Collect your order from our facility in Kuala Lumpur. You will be notified via SMS/email when your order is ready.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-accent mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                    <span><strong>Delivery — Peninsular Malaysia</strong> — Standard delivery within 1–3 working days after production is complete. Shipping fees are calculated at checkout based on weight and location.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-accent mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                    <span><strong>East Malaysia & International</strong> — Delivery to Sabah, Sarawak, and international destinations is available. Please contact us for a shipping quote.</span>
                  </li>
                </ul>
                <p className="text-gray-400 text-xs mt-4">* Delivery timeline is separate from production duration. Combined timeline = production + delivery days.</p>
              </div>
            )}
          </div>
        </section>
        </AnimateIn>

        {/* ── Related Products ──────────────────────── */}
        {(() => {
          if (relatedProducts.length === 0) return null
          return (
            <section className="mt-16">
              <h2 className="text-lg font-bold text-gray-900 mb-6">Related Products</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {relatedProducts.map((p) => (
                  <Link key={p.id} href={`/store/products/${p.slug}`} className="group">
                    <div className="aspect-square rounded-xl overflow-hidden bg-gray-100 mb-3">
                      {PRODUCT_IMAGES[p.slug] ? (
                        <img src={PRODUCT_IMAGES[p.slug]} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300">
                            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <h3 className="font-medium text-gray-900 text-sm group-hover:text-accent transition leading-tight">{p.name}</h3>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">{p.description}</p>
                    <span className="text-xs font-semibold text-accent mt-2 inline-block">
                      From RM {p.pricingMatrix.default[0].unitPrice.toFixed(2)}/pc
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )
        })()}
      </main>

      <NewsletterCTA />

      {/* Canva Design Picker Modal */}
      <CanvaDesignPicker
        isOpen={canvaPickerOpen}
        onClose={() => setCanvaPickerOpen(false)}
        productSlug={product.slug}
        productName={product.name}
        trimWidthMm={product.printSpecs.trimWidthMm}
        trimHeightMm={product.printSpecs.trimHeightMm}
        bleedMm={product.printSpecs.bleedMm}
        onDesignExported={handleCanvaDesignExported}
      />
    </>
  )
}
