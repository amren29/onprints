'use client'

import { useState, useRef, useCallback, useMemo, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import { getStoreProductBySlug } from '@/lib/store/catalog-bridge'
import { calculatePrice } from '@/lib/store/pricing-engine'
import { ArtworkAnalysis, PrintSpecs, Product } from '@/types/store'
import { analyzeArtwork, isPDFFile } from '@/lib/store/artwork-utils'
import { useCartStore } from '@/lib/store/cart-store'
// TODO [Batch G]: Replace auth-store with Supabase store-users
import { useAuthStore } from '@/lib/store/auth-store'
import { useCanvaTokensFromCookie } from '@/lib/store/use-canva-tokens'
import Navbar from '@/components/store/Navbar'
import ProofingCanvas from '@/components/store/artwork/ProofingCanvas'
import CanvaDesignPicker from '@/components/store/canva/CanvaDesignPicker'
import { useStore } from '@/providers/store-context'

const ACCEPTED_EXTS = '.jpg,.jpeg,.png,.pdf,.ai,.eps,.svg,.cdr,.zip,.rar'
const MAX_SIZE_MB = 50

type Step = 'upload' | 'finalize' | 'review'

// ── Standard paper sizes in mm ───────────────────────────────────────────────
const PAPER_SIZES: Record<string, { w: number; h: number }> = {
  A6: { w: 105, h: 148 }, A5: { w: 148, h: 210 }, A4: { w: 210, h: 297 },
  A3: { w: 297, h: 420 }, A2: { w: 420, h: 594 }, A1: { w: 594, h: 841 },
  DL: { w: 210, h: 99 },
}

/**
 * Parse a size string like '90×54mm', 'A5 (148×210mm)', 'Small (25×30cm)',
 * '1×2m', or 'A4' into { w, h } in mm. Returns null if unparsable.
 */
function parseSizeMm(sizeStr: string): { w: number; h: number } | null {
  // Try WxH with units: '90×54mm', '148×210mm', '25×30cm', '1×2m'
  const dimRegex = /(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)\s*(mm|cm|m)\b/i
  const match = sizeStr.match(dimRegex)
  if (match) {
    let w = parseFloat(match[1])
    let h = parseFloat(match[2])
    const unit = match[3].toLowerCase()
    if (unit === 'cm') { w *= 10; h *= 10 }
    else if (unit === 'm') { w *= 1000; h *= 1000 }
    return { w, h }
  }

  // Try bare WxH without unit (assume mm): '90×54'
  const bareRegex = /(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)/
  const bareMatch = sizeStr.match(bareRegex)
  if (bareMatch) {
    return { w: parseFloat(bareMatch[1]), h: parseFloat(bareMatch[2]) }
  }

  // Try standard paper size names: 'A4', 'A5 Bi-fold', etc.
  for (const [name, size] of Object.entries(PAPER_SIZES)) {
    if (sizeStr.toUpperCase().includes(name)) return size
  }

  return null
}

export default function ProofPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const searchParams = useSearchParams()
  const { basePath } = useStore()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const p = await getStoreProductBySlug(slug)
        if (!cancelled) setProduct(p)
      } catch {}
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-500 mb-2">Product not found</p>
            <Link href={`${basePath}/products`} className="text-accent hover:underline">Browse Products</Link>
          </div>
        </div>
      </div>
    )
  }

  // Collect all spec values from URL search params
  const initialSpecs: Record<string, string> = {}
  for (const spec of product.specs) {
    const val = searchParams.get(spec.key)
    if (typeof val === 'string' && spec.options.includes(val)) {
      initialSpecs[spec.key] = val
    }
  }

  const canvaImage = searchParams.get('canvaImage') ?? undefined
  const canvaDesignId = searchParams.get('canvaDesignId') ?? undefined
  const qtyParam = searchParams.get('qty')
  const initialQty = qtyParam ? Number(qtyParam) : product.quantities[0]

  return (
    <ProofPageContent
      slug={product.slug}
      productName={product.name}
      printSpecs={product.printSpecs}
      productId={product.id}
      product={product}
      specs={product.specs}
      initialSpecs={initialSpecs}
      initialQty={initialQty}
      canvaImage={canvaImage}
      canvaDesignId={canvaDesignId}
    />
  )
}

function ProofPageContent({
  slug,
  productName,
  printSpecs,
  productId,
  product,
  specs,
  initialSpecs,
  initialQty,
  canvaImage,
  canvaDesignId,
}: {
  slug: string
  productName: string
  printSpecs: PrintSpecs
  productId: string
  product: Product
  specs: { key: string; label: string; options: string[]; default: string }[]
  initialSpecs: Record<string, string>
  initialQty: number
  canvaImage?: string
  canvaDesignId?: string
}) {
  const router = useRouter()
  const { basePath } = useStore()
  const addItem = useCartStore((s) => s.addItem)
  const currentUser = useAuthStore((s) => s.currentUser)
  const addSavedArtwork = useAuthStore((s) => s.addSavedArtwork)

  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [artworkName, setArtworkName] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [analysis, setAnalysis] = useState<ArtworkAnalysis | null>(null)
  const [analysing, setAnalysing] = useState(false)
  const [error, setError] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)
  const [savedToLibrary, setSavedToLibrary] = useState(false)
  const [canvaPickerOpen, setCanvaPickerOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Pick up Canva tokens from cookie after OAuth redirect
  useCanvaTokensFromCookie()

  // Size spec from product (if available)
  const sizeSpec = specs.find((s) => s.key === 'size')
  const [selectedSize, setSelectedSize] = useState(initialSpecs.size || sizeSpec?.default || '')

  // Compute active printSpecs based on selected size
  const activePrintSpecs: PrintSpecs = useMemo(() => {
    if (!selectedSize) return printSpecs
    const parsed = parseSizeMm(selectedSize)
    if (!parsed) return printSpecs
    return {
      ...printSpecs,
      trimWidthMm: parsed.w,
      trimHeightMm: parsed.h,
    }
  }, [selectedSize, printSpecs])

  const totalW = activePrintSpecs.trimWidthMm + activePrintSpecs.bleedMm * 2
  const totalH = activePrintSpecs.trimHeightMm + activePrintSpecs.bleedMm * 2

  // Auto-load Canva exported image if provided via URL params
  const canvaLoaded = useRef(false)
  useEffect(() => {
    if (canvaImage && !canvaLoaded.current) {
      canvaLoaded.current = true
      setImageUrl(canvaImage)
      setArtworkName(canvaDesignId ? `Canva Design (${canvaDesignId})` : 'Canva Design')
      setAnalysis({
        widthPx: 0,
        heightPx: 0,
        dpi: 300,
        colorMode: 'RGB',
        fileFormat: 'PNG',
        dimensionsMm: { width: activePrintSpecs.trimWidthMm, height: activePrintSpecs.trimHeightMm },
        qualityRating: 'excellent',
        warnings: [],
      })
      setFile(new File([], canvaDesignId ? `canva-${canvaDesignId}.png` : 'canva-design.png', { type: 'image/png' }))
      setStep('finalize')
    }
  }, [canvaImage, canvaDesignId, activePrintSpecs])

  async function processFile(f: File) {
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File too large (${(f.size / 1024 / 1024).toFixed(1)}MB). Maximum size is ${MAX_SIZE_MB}MB.`)
      return
    }

    const validTypes = ['image/jpeg', 'image/png', 'application/pdf']
    const validExts = /\.(jpg|jpeg|png|pdf|ai|eps|svg|cdr|zip|rar)$/i
    if (!validTypes.includes(f.type) && !validExts.test(f.name)) {
      setError(`Unsupported format "${f.name.split('.').pop()}". Accepted: JPG, PNG, PDF, AI, EPS, SVG, CDR, ZIP.`)
      return
    }

    setError('')
    setAnalysing(true)
    if (!artworkName) setArtworkName(f.name.replace(/\.[^.]+$/, ''))

    try {
      const { analysis: a, imageUrl: url } = await analyzeArtwork(f, activePrintSpecs)
      setFile(f)
      setAnalysis(a)
      setImageUrl(url)
      setStep('finalize')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process file. The image may be corrupted.')
    } finally {
      setAnalysing(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) processFile(f)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) processFile(f)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePrintSpecs])

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true) }
  const handleDragLeave = () => setIsDragOver(false)

  function handleReplace() {
    setStep('upload')
    setFile(null)
    setImageUrl('')
    setAnalysis(null)
    setError('')
    setSavedToLibrary(false)
  }

  function handleContinueToReview() {
    setStep('review')
  }

  function handleMakeChanges() {
    setStep('finalize')
  }

  // Build full selected specs: merge URL params + current size selection
  const allSelectedSpecs: Record<string, string> = useMemo(() => {
    const result = { ...initialSpecs }
    if (selectedSize) result.size = selectedSize
    return result
  }, [initialSpecs, selectedSize])

  function handleAddToCart() {
    if (!file) return
    const summary = Object.values(allSelectedSpecs).filter(Boolean).join(' · ')

    // Calculate correct pricing using the product's pricing engine
    const currentUser = useAuthStore.getState().currentUser
    const effectiveDiscount = currentUser?.role === 'agent' && currentUser.discountRate
      ? currentUser.discountRate
      : currentUser?.membership && (currentUser.membership.status ?? 'active') === 'active' && new Date(currentUser.membership.expiryDate) > new Date()
        ? currentUser.membership.discountRate
        : null
    const { unitPrice, totalPrice } = calculatePrice(product, allSelectedSpecs, initialQty, effectiveDiscount ?? undefined)

    addItem({
      id: `${productId}-${Date.now()}`,
      productId,
      name: productName,
      slug,
      qty: initialQty,
      unitPrice,
      total: totalPrice,
      selectedSpecs: allSelectedSpecs,
      optionSummary: summary,
      artworkOption: 'upload',
      artworkFileName: file.name,
      artworkUrl: imageUrl,
    })
    router.push(`${basePath}/cart`)
  }

  const canvaConfigured = !!process.env.NEXT_PUBLIC_CANVA_CLIENT_ID

  function handleCanvaImport() {
    // Fallback to deep-link if Canva API not configured
    if (!canvaConfigured) {
      const w = activePrintSpecs.trimWidthMm + activePrintSpecs.bleedMm * 2
      const h = activePrintSpecs.trimHeightMm + activePrintSpecs.bleedMm * 2
      window.open(`https://www.canva.com/design/create?width=${w}&height=${h}&units=mm`, '_blank', 'noopener,noreferrer')
      return
    }
    if (!currentUser) {
      window.location.href = `${basePath}/auth/signin?returnTo=${basePath}/products/${slug}/proof`
      return
    }
    if (!currentUser.canvaTokens?.accessToken || currentUser.canvaTokens.expiresAt < Date.now()) {
      window.location.href = `/api/store/canva/authorize?returnTo=${basePath}/products/${slug}/proof`
      return
    }
    setCanvaPickerOpen(true)
  }

  function handleCanvaDesignExported(canvaImgUrl: string, designId: string) {
    setImageUrl(canvaImgUrl)
    setArtworkName(`Canva Design (${designId})`)
    setAnalysis({
      widthPx: 0,
      heightPx: 0,
      dpi: 300,
      colorMode: 'RGB',
      fileFormat: 'PNG',
      dimensionsMm: { width: activePrintSpecs.trimWidthMm, height: activePrintSpecs.trimHeightMm },
      qualityRating: 'excellent',
      warnings: [],
    })
    setFile(new File([], `canva-${designId}.png`, { type: 'image/png' }))
    setStep('finalize')
  }

  function handleSaveToLibrary() {
    if (!file || !currentUser) return
    addSavedArtwork({
      id: `art_${Date.now()}`,
      fileName: file.name,
      fileSize: file.size,
      imageUrl,
      uploadedAt: new Date().toISOString(),
      productSlug: slug,
    })
    setSavedToLibrary(true)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* STEP 1: UPLOAD                                                        */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {step === 'upload' && (
        <>
          {/* Header */}
          <div className="bg-white border-b border-gray-200">
            <div className="max-w-screen-xl mx-auto px-4 sm:px-8 py-4">
              <nav className="text-xs text-gray-400 mb-2 flex items-center gap-1.5">
                <Link href={`${basePath}/products`} className="hover:text-accent transition">Products</Link>
                <span>&gt;</span>
                <Link href={`${basePath}/products/${slug}`} className="hover:text-accent transition">{productName}</Link>
                <span>&gt;</span>
                <span className="text-gray-700 font-medium">Upload Artwork</span>
              </nav>
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                    UPLOAD YOUR DESIGN <span className="text-base font-normal text-gray-500">({productName})</span>
                  </h1>
                  {/* Show carried-over specs */}
                  {Object.keys(initialSpecs).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      {specs.filter(s => initialSpecs[s.key]).map(s => (
                        <span key={s.key} className="inline-flex items-center gap-1 text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full">
                          <span className="font-medium">{s.label}:</span> {initialSpecs[s.key]}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <Link
                  href={`${basePath}/products/${slug}`}
                  className="text-sm text-accent hover:underline flex items-center gap-1"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m15 18-6-6 6-6"/>
                  </svg>
                  Back
                </Link>
              </div>
            </div>
          </div>

          <div className="max-w-screen-xl mx-auto px-4 sm:px-8 py-6 flex-1">
            <div className="grid lg:grid-cols-5 gap-8">
              {/* Left column: Upload form */}
              <div className="lg:col-span-3 space-y-5">
                {/* Size selector */}
                {sizeSpec && (
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-gray-700">Please choose your size</label>
                      <select
                        value={selectedSize}
                        onChange={(e) => setSelectedSize(e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                      >
                        {sizeSpec.options.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center justify-end mt-2">
                      <button className="text-sm text-accent hover:underline flex items-center gap-1">
                        Supported Format
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                )}

                {/* Artwork name + upload */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">Artwork Name</label>
                    <input
                      type="text"
                      value={artworkName}
                      onChange={(e) => setArtworkName(e.target.value)}
                      placeholder="Enter artwork name..."
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-accent"
                    />
                  </div>

                  {/* Drop zone */}
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className={`border-2 border-dashed rounded-xl p-8 sm:p-12 text-center transition-all cursor-pointer ${
                      isDragOver
                        ? 'border-accent bg-accent/5 scale-[1.005]'
                        : 'border-gray-200 hover:border-accent/50'
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {analysing ? (
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 border-4 border-accent/20 border-t-accent rounded-full animate-spin mb-4" />
                        <p className="font-semibold text-gray-700">Analysing artwork...</p>
                        <p className="text-sm text-gray-400 mt-1">Checking resolution, dimensions & print readiness</p>
                      </div>
                    ) : (
                      <>
                        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                          </svg>
                        </div>
                        <p className="font-medium text-gray-700 mb-0.5">{productName}</p>
                        <p className="text-sm text-gray-500">
                          Drag a file OR <span className="text-red-500 font-semibold cursor-pointer">Select File</span>
                        </p>
                      </>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ACCEPTED_EXTS}
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>

                  <p className="text-xs text-gray-400">{MAX_SIZE_MB}MB max file size</p>

                  {/* Import from Canva */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 border-t border-gray-200" />
                    <span className="text-xs text-gray-400">or</span>
                    <div className="flex-1 border-t border-gray-200" />
                  </div>
                  <button
                    onClick={handleCanvaImport}
                    className="w-full py-3 rounded-xl border-2 border-[#7B2FBE] text-[#7B2FBE] font-bold text-sm hover:bg-[#7B2FBE] hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
                    </svg>
                    Import from Canva
                  </button>

                  {/* Error */}
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-start gap-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
                        <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                      </svg>
                      <span>{error}</span>
                    </div>
                  )}
                </div>

                {/* Add to Cart button */}
                <div className="flex justify-end">
                  <button
                    disabled={!file}
                    className="px-8 py-3 rounded-xl font-bold text-sm bg-gray-900 text-white hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition flex items-center gap-2"
                  >
                    Add to Cart
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Right column: Description / Guidelines */}
              <div className="lg:col-span-2 space-y-6">
                {/* Warning banner */}
                <div className="bg-yellow-300 border-2 border-yellow-600 rounded-xl p-4 text-center">
                  <p className="font-bold text-gray-900 text-sm leading-snug">
                    DOWNLOAD & USE OUR TEMPLATE IF YOU WISH TO UPLOAD DESIGN.
                  </p>
                  <p className="text-xs text-gray-800 mt-1">
                    Failing to do so will lead to delay in your production completion days.
                  </p>
                </div>

                {/* Guidelines */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 text-sm space-y-4">
                  <p className="text-gray-600">
                    Please download and use our template or refer to our size for designing and uploading your artwork.
                    Failing to do so will lead to delay in your production completion days.
                  </p>
                  <p className="text-gray-600">
                    We will check your artwork based on <strong>3 elements (Bleed size, actual size & safe zone size)</strong>.
                    We reserve the rights to reject any given artwork that do not follow our printing specification, and you will need to re-upload the modified artwork again for us.
                  </p>
                  <p className="text-gray-600">
                    Please also check and refer to our <strong className="text-accent">artwork guidelines</strong> for better understanding.
                  </p>

                  <div className="border-t border-gray-100 pt-4 space-y-3">
                    <div>
                      <div className="font-bold text-gray-800">Full Bleed Size (starting document size)</div>
                      <ul className="text-gray-600 mt-1 ml-4 list-disc">
                        <li>{totalW} mm x {totalH} mm</li>
                      </ul>
                    </div>
                    <div>
                      <div className="font-bold text-gray-800">Product Trim Size (final size after cutting)</div>
                      <ul className="text-gray-600 mt-1 ml-4 list-disc">
                        <li>{activePrintSpecs.trimWidthMm} mm x {activePrintSpecs.trimHeightMm} mm</li>
                      </ul>
                    </div>
                    <div>
                      <div className="font-bold text-gray-800">Safe Area</div>
                      <ul className="text-gray-600 mt-1 ml-4 list-disc">
                        <li>{activePrintSpecs.safeAreaMm} mm inward from trim on all sides</li>
                      </ul>
                    </div>
                    <div>
                      <div className="font-bold text-gray-800">Minimum DPI</div>
                      <ul className="text-gray-600 mt-1 ml-4 list-disc">
                        <li>{activePrintSpecs.minDpi} DPI</li>
                      </ul>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-4 text-xs text-gray-500 space-y-1">
                    <p><strong>Note:</strong></p>
                    <ul className="list-disc ml-4 space-y-0.5">
                      <li>Finished artwork should use the full bleed dimensions for best results.</li>
                      <li>Keep important content within the safe area.</li>
                      <li>Accepted formats: JPG, PNG, PDF, AI, EPS, PSD, CDR</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* STEP 2: FINALIZE (Canvas Editor)                                      */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {step === 'finalize' && analysis && file && (
        <>
          {/* Thin header */}
          <div className="bg-white border-b border-gray-200">
            <div className="max-w-screen-2xl mx-auto px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={handleReplace} className="text-gray-400 hover:text-gray-700 transition">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m15 18-6-6 6-6"/>
                  </svg>
                </button>
                <span className="font-semibold text-gray-800 text-sm">{productName}</span>
              </div>
              <button
                onClick={handleContinueToReview}
                className="px-5 py-2 bg-accent text-white rounded-lg text-sm font-bold hover:opacity-90 transition flex items-center gap-1.5"
              >
                Continue
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                </svg>
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col lg:flex-row">
            {/* Left sidebar — Guide legend */}
            <div className="lg:w-64 shrink-0 bg-white border-r border-gray-200 p-5 space-y-5 overflow-y-auto">
              {/* Bleed Size */}
              <div className="flex gap-3">
                <div className="w-3 h-3 rounded-full bg-red-500 mt-1 shrink-0" />
                <div>
                  <div className="font-bold text-gray-800 text-sm">Bleed Size</div>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    Extend background color or artwork to this line to avoid any white edges from the trimming process.
                  </p>
                </div>
              </div>

              {/* Cut Size */}
              <div className="flex gap-3">
                <div className="w-3 h-3 rounded-full bg-blue-500 mt-1 shrink-0" />
                <div>
                  <div className="font-bold text-gray-800 text-sm">Cut Size</div>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    This is where we aim to trim the product. The actual line can vary due to the trimming process.
                  </p>
                </div>
              </div>

              {/* Safe Zone */}
              <div className="flex gap-3">
                <div className="w-3 h-3 rounded-full bg-green-500 mt-1 shrink-0" />
                <div>
                  <div className="font-bold text-gray-800 text-sm">Safe Zone Size</div>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    Keep text and important imagery within this line to ensure it does not get cut off during trimming.
                  </p>
                </div>
              </div>

              {/* Visual guide diagram */}
              <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                <svg viewBox="0 0 140 100" className="w-full" fill="none">
                  {/* Bleed */}
                  <rect x="5" y="5" width="130" height="90" stroke="#dc2626" strokeWidth="1.5" strokeDasharray="4 3" fill="rgba(220,38,38,0.03)" rx="2" />
                  {/* Trim */}
                  <rect x="15" y="15" width="110" height="70" stroke="#2563eb" strokeWidth="1.5" strokeDasharray="6 3" fill="none" rx="1" />
                  {/* Safe */}
                  <rect x="25" y="25" width="90" height="50" stroke="#16a34a" strokeWidth="1" strokeDasharray="3 3" fill="rgba(22,163,74,0.03)" rx="1" />
                  {/* Labels */}
                  <circle cx="8" cy="98" r="3" fill="#dc2626" />
                  <circle cx="8" cy="55" r="3" fill="#2563eb" />
                  <circle cx="28" cy="78" r="3" fill="#16a34a" />
                </svg>
              </div>

              {/* Quality indicators */}
              {analysis && (
                <div className="border-t border-gray-100 pt-4 space-y-2">
                  <QualityBadge analysis={analysis} />
                  {analysis.warnings.length > 0 && (
                    <div className="space-y-1">
                      {analysis.warnings.map((w, i) => (
                        <p key={i} className="text-xs text-amber-700 leading-relaxed flex items-start gap-1">
                          <span className="text-amber-500 mt-0.5">!</span> {w}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Canvas area */}
            <div className="flex-1 min-w-0 p-2 sm:p-4">
              <ProofingCanvas
                imageUrl={imageUrl}
                printSpecs={activePrintSpecs}
                isPDF={isPDFFile(file)}
              />
            </div>
          </div>
        </>
      )}

      {/* Canva Design Picker Modal */}
      <CanvaDesignPicker
        isOpen={canvaPickerOpen}
        onClose={() => setCanvaPickerOpen(false)}
        productSlug={slug}
        productName={productName}
        trimWidthMm={activePrintSpecs.trimWidthMm}
        trimHeightMm={activePrintSpecs.trimHeightMm}
        bleedMm={activePrintSpecs.bleedMm}
        onDesignExported={handleCanvaDesignExported}
      />

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* STEP 3: REVIEW                                                        */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {step === 'review' && analysis && file && (
        <div className="flex-1 flex flex-col lg:flex-row max-w-screen-xl mx-auto w-full">
          {/* Left — artwork preview */}
          <div className="flex-1 min-w-0 flex items-center justify-center p-6 sm:p-10 bg-gray-100">
            <div className="relative max-w-lg w-full">
              {/* Shadow mockup */}
              <div className="bg-white rounded-lg shadow-xl overflow-hidden">
                {imageUrl && !isPDFFile(file) ? (
                  <img src={imageUrl} alt="Artwork preview" className="w-full h-auto" />
                ) : (
                  <div className="aspect-square flex items-center justify-center bg-gray-50">
                    <div className="text-center">
                      <div className="text-5xl mb-3">📄</div>
                      <p className="text-sm text-gray-500">{file.name}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Thumbnail strip */}
              <div className="flex justify-center mt-6">
                <div className="border-2 border-accent rounded-lg overflow-hidden w-16 h-16 bg-white">
                  {imageUrl && !isPDFFile(file) ? (
                    <img src={imageUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-lg">📄</div>
                  )}
                </div>
                <p className="text-xs text-gray-500 ml-2 self-end">{productName}</p>
              </div>
            </div>
          </div>

          {/* Right — review panel */}
          <div className="lg:w-96 shrink-0 bg-white border-l border-gray-200 p-6 sm:p-8 flex flex-col">
            <h2 className="text-xl font-bold text-accent mb-1">Product Design Review</h2>
            <p className="text-sm text-gray-600 mb-6">
              {productName} ({activePrintSpecs.trimWidthMm} x {activePrintSpecs.trimHeightMm})
            </p>

            <div className="border-t border-gray-200 pt-6 mb-6">
              <p className="text-sm text-gray-600 leading-relaxed">
                Kindly preview your work to ensure it meets your expectations. If everything looks perfect, you can proceed to complete the purchase.
              </p>
            </div>

            {/* Analysis summary */}
            <div className="space-y-3 mb-6">
              <QualityBadge analysis={analysis} />

              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                <span className="text-gray-500">File</span>
                <span className="font-medium text-gray-700 truncate">{file.name}</span>
                <span className="text-gray-500">Size</span>
                <span className="font-medium text-gray-700">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                <span className="text-gray-500">Format</span>
                <span className="font-medium text-gray-700">{analysis.fileFormat}</span>
                {analysis.qualityRating !== 'vector' && (
                  <>
                    <span className="text-gray-500">Dimensions</span>
                    <span className="font-medium text-gray-700">{analysis.widthPx} x {analysis.heightPx} px</span>
                    <span className="text-gray-500">DPI</span>
                    <span className={`font-medium ${analysis.dpi >= activePrintSpecs.minDpi ? 'text-green-700' : 'text-red-600'}`}>{analysis.dpi}</span>
                  </>
                )}
              </div>

              {analysis.warnings.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  {analysis.warnings.map((w, i) => (
                    <p key={i} className="text-xs text-amber-700 leading-relaxed">{w}</p>
                  ))}
                </div>
              )}
            </div>

            {/* Save to library */}
            {currentUser && (
              <button
                onClick={handleSaveToLibrary}
                disabled={savedToLibrary}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold border transition mb-3 ${
                  savedToLibrary
                    ? 'border-green-300 bg-green-50 text-green-700'
                    : 'border-accent/30 text-accent hover:bg-accent/5'
                }`}
              >
                {savedToLibrary ? 'Saved to Library' : 'Save to Artwork Library'}
              </button>
            )}

            <div className="mt-auto space-y-3">
              <button
                onClick={handleMakeChanges}
                className="w-full text-center text-sm text-accent hover:underline font-medium"
              >
                Make Changes
              </button>
              <button
                onClick={handleAddToCart}
                className="w-full py-3.5 rounded-xl font-bold text-sm bg-gray-900 text-white hover:bg-gray-800 transition flex items-center justify-center gap-2"
              >
                Continue
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Quality badge ─────────────────────────────────────────────────────────────

function QualityBadge({ analysis }: { analysis: ArtworkAnalysis }) {
  const isVector = analysis.qualityRating === 'vector'
  const config = {
    excellent: { label: 'Print Ready', color: 'text-green-700 bg-green-50 border-green-200', icon: '✓' },
    acceptable: { label: 'Medium — OK quality, may be affected in large format', color: 'text-amber-700 bg-amber-50 border-amber-200', icon: '!' },
    poor: { label: 'Low — will be affected when printed', color: 'text-red-700 bg-red-50 border-red-200', icon: '!' },
    vector: { label: 'Vector — Resolution Independent', color: 'text-blue-700 bg-blue-50 border-blue-200', icon: '✓' },
  }
  const cfg = config[analysis.qualityRating]

  return (
    <div className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-full border ${cfg.color}`}>
      <span className="w-4 h-4 rounded-full bg-current flex items-center justify-center text-white text-[10px] opacity-80">{cfg.icon}</span>
      {!isVector && <span>{analysis.dpi} DPI</span>}
      <span>— {cfg.label}</span>
    </div>
  )
}
