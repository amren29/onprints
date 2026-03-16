'use client'

import { useState, useRef, useCallback, useEffect, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Navbar from '@/components/store/Navbar'
import ProofingCanvas from '@/components/store/artwork/ProofingCanvas'
import { getStoreProductBySlug } from '@/lib/store/catalog-bridge'
import { ArtworkAnalysis, PrintSpecs, Product } from '@/types/store'
import { analyzeArtwork, isPDFFile } from '@/lib/store/artwork-utils'

const ACCEPTED_EXTS = '.jpg,.jpeg,.png,.pdf,.ai,.eps,.svg,.cdr,.zip,.rar'
const MAX_SIZE_MB = 50

const DEFAULT_PRINT_SPECS: PrintSpecs = {
  printMethod: 'digital',
  bleedMm: 3,
  safeAreaMm: 5,
  minDpi: 300,
  trimWidthMm: 210,
  trimHeightMm: 297,
}

type Step = 'upload' | 'finalize' | 'review'

export default function UploadPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const productSlug = searchParams.get('product') ?? ''
  const [product, setProduct] = useState<Product | null>(null)

  useEffect(() => {
    if (!productSlug) return
    let cancelled = false
    getStoreProductBySlug(productSlug).then(p => {
      if (!cancelled) setProduct(p)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [productSlug])

  const printSpecs = product?.printSpecs ?? DEFAULT_PRINT_SPECS
  const productName = product?.name ?? 'Your Product'
  const totalW = printSpecs.trimWidthMm + printSpecs.bleedMm * 2
  const totalH = printSpecs.trimHeightMm + printSpecs.bleedMm * 2

  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [artworkName, setArtworkName] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [analysis, setAnalysis] = useState<ArtworkAnalysis | null>(null)
  const [analysing, setAnalysing] = useState(false)
  const [error, setError] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)
  const [approved, setApproved] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function processFile(f: File) {
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File too large (${(f.size / 1024 / 1024).toFixed(1)}MB). Maximum size is ${MAX_SIZE_MB}MB.`)
      return
    }

    setError('')
    setAnalysing(true)
    if (!artworkName) setArtworkName(f.name.replace(/\.[^.]+$/, ''))

    try {
      const { analysis: a, imageUrl: url } = await analyzeArtwork(f, printSpecs)
      setFile(f)
      setAnalysis(a)
      setImageUrl(url)
      setStep('finalize')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process file.')
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
  }, [printSpecs])

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true) }
  const handleDragLeave = () => setIsDragOver(false)

  function handleReplace() {
    setStep('upload')
    setFile(null)
    setImageUrl('')
    setAnalysis(null)
    setError('')
  }

  function handleApprove() {
    setApproved(true)
    setTimeout(() => router.push('/store/cart'), 1500)
  }

  if (approved) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center mx-auto mb-6">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Artwork Approved</h1>
            <p className="text-gray-500">Redirecting to your cart...</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      {/* ═══ STEP 1: UPLOAD ═══ */}
      {step === 'upload' && (
        <>
          <div className="bg-white border-b border-gray-200">
            <div className="max-w-screen-xl mx-auto px-4 sm:px-8 py-4">
              <div className="flex items-center justify-between">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                  UPLOAD YOUR DESIGN <span className="text-base font-normal text-gray-500">({productName} — Order {orderId})</span>
                </h1>
                <button onClick={() => router.back()} className="text-sm text-accent hover:underline flex items-center gap-1">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                  Back
                </button>
              </div>
            </div>
          </div>

          <div className="max-w-screen-xl mx-auto px-4 sm:px-8 py-6 flex-1">
            <div className="grid lg:grid-cols-5 gap-8">
              <div className="lg:col-span-3 space-y-5">
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

                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className={`border-2 border-dashed rounded-xl p-8 sm:p-12 text-center transition-all cursor-pointer ${
                      isDragOver ? 'border-accent bg-accent/5 scale-[1.005]' : 'border-gray-200 hover:border-accent/50'
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {analysing ? (
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 border-4 border-accent/20 border-t-accent rounded-full animate-spin mb-4" />
                        <p className="font-semibold text-gray-700">Analysing artwork...</p>
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
                          Drag a file OR <span className="text-red-500 font-semibold">Select File</span>
                        </p>
                      </>
                    )}
                    <input ref={fileInputRef} type="file" accept={ACCEPTED_EXTS} onChange={handleFileChange} className="hidden" />
                  </div>

                  <p className="text-xs text-gray-400">{MAX_SIZE_MB}MB max file size</p>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-start gap-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
                        <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                      </svg>
                      <span>{error}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-xl border border-gray-200 p-5 text-sm space-y-4">
                  <p className="text-gray-600">
                    We will check your artwork based on <strong>3 elements (Bleed size, actual size & safe zone size)</strong>.
                  </p>
                  <div className="border-t border-gray-100 pt-4 space-y-3">
                    <div>
                      <div className="font-bold text-gray-800">Full Bleed Size</div>
                      <ul className="text-gray-600 mt-1 ml-4 list-disc"><li>{totalW} mm x {totalH} mm</li></ul>
                    </div>
                    <div>
                      <div className="font-bold text-gray-800">Product Trim Size</div>
                      <ul className="text-gray-600 mt-1 ml-4 list-disc"><li>{printSpecs.trimWidthMm} mm x {printSpecs.trimHeightMm} mm</li></ul>
                    </div>
                    <div>
                      <div className="font-bold text-gray-800">Safe Area</div>
                      <ul className="text-gray-600 mt-1 ml-4 list-disc"><li>{printSpecs.safeAreaMm} mm inward from trim</li></ul>
                    </div>
                    <div>
                      <div className="font-bold text-gray-800">Minimum DPI</div>
                      <ul className="text-gray-600 mt-1 ml-4 list-disc"><li>{printSpecs.minDpi} DPI</li></ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══ STEP 2: FINALIZE ═══ */}
      {step === 'finalize' && analysis && file && (
        <>
          <div className="bg-white border-b border-gray-200">
            <div className="max-w-screen-2xl mx-auto px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={handleReplace} className="text-gray-400 hover:text-gray-700 transition">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                </button>
                <span className="font-semibold text-gray-800 text-sm">{productName} — Order {orderId}</span>
              </div>
              <button
                onClick={() => setStep('review')}
                className="px-5 py-2 bg-accent text-white rounded-lg text-sm font-bold hover:opacity-90 transition flex items-center gap-1.5"
              >
                Continue
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col lg:flex-row">
            <div className="lg:w-64 shrink-0 bg-white border-r border-gray-200 p-5 space-y-5 overflow-y-auto">
              <div className="flex gap-3">
                <div className="w-3 h-3 rounded-full bg-red-500 mt-1 shrink-0" />
                <div>
                  <div className="font-bold text-gray-800 text-sm">Bleed Size</div>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">Extend background to this line to avoid white edges.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-3 h-3 rounded-full bg-blue-500 mt-1 shrink-0" />
                <div>
                  <div className="font-bold text-gray-800 text-sm">Cut Size</div>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">Where we aim to trim the product.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-3 h-3 rounded-full bg-green-500 mt-1 shrink-0" />
                <div>
                  <div className="font-bold text-gray-800 text-sm">Safe Zone</div>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">Keep important content within this line.</p>
                </div>
              </div>

              {analysis && (
                <div className="border-t border-gray-100 pt-4 space-y-2">
                  <QualityBadge analysis={analysis} />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 p-2 sm:p-4">
              <ProofingCanvas imageUrl={imageUrl} printSpecs={printSpecs} isPDF={isPDFFile(file)} />
            </div>
          </div>
        </>
      )}

      {/* ═══ STEP 3: REVIEW ═══ */}
      {step === 'review' && analysis && file && (
        <div className="flex-1 flex flex-col lg:flex-row max-w-screen-xl mx-auto w-full">
          <div className="flex-1 min-w-0 flex items-center justify-center p-6 sm:p-10 bg-gray-100">
            <div className="max-w-lg w-full">
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
            </div>
          </div>

          <div className="lg:w-96 shrink-0 bg-white border-l border-gray-200 p-6 sm:p-8 flex flex-col">
            <h2 className="text-xl font-bold text-accent mb-1">Product Design Review</h2>
            <p className="text-sm text-gray-600 mb-6">{productName} ({printSpecs.trimWidthMm} x {printSpecs.trimHeightMm})</p>

            <div className="border-t border-gray-200 pt-6 mb-6">
              <p className="text-sm text-gray-600 leading-relaxed">
                Kindly preview your work to ensure it meets your expectations. If everything looks perfect, you can proceed to complete the purchase.
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <QualityBadge analysis={analysis} />
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                <span className="text-gray-500">File</span>
                <span className="font-medium text-gray-700 truncate">{file.name}</span>
                <span className="text-gray-500">Size</span>
                <span className="font-medium text-gray-700">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                <span className="text-gray-500">Format</span>
                <span className="font-medium text-gray-700">{analysis.fileFormat}</span>
              </div>
            </div>

            <div className="mt-auto space-y-3">
              <button onClick={() => setStep('finalize')} className="w-full text-center text-sm text-accent hover:underline font-medium">Make Changes</button>
              <button
                onClick={handleApprove}
                className="w-full py-3.5 rounded-xl font-bold text-sm bg-gray-900 text-white hover:bg-gray-800 transition flex items-center justify-center gap-2"
              >
                Continue
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function QualityBadge({ analysis }: { analysis: ArtworkAnalysis }) {
  const isVector = analysis.qualityRating === 'vector'
  const config = {
    excellent: { label: 'Print Ready', color: 'text-green-700 bg-green-50 border-green-200', icon: '✓' },
    acceptable: { label: 'Medium — OK quality', color: 'text-amber-700 bg-amber-50 border-amber-200', icon: '!' },
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
