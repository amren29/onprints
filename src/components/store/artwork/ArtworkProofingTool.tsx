'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { PrintSpecs, ArtworkAnalysis } from '@/types/store'
import { analyzeArtwork, isPDFFile } from '@/lib/store/artwork-utils'
import ProofingCanvas from './ProofingCanvas'

const ACCEPTED_EXTS = '.jpg,.jpeg,.png,.pdf,.ai,.eps,.svg,.cdr,.zip,.rar'
const MAX_SIZE_MB = 50

interface Props {
  printSpecs: PrintSpecs
  productName: string
  onApprove: (file: File, analysis: ArtworkAnalysis, imageUrl: string, notes: string) => void
  onClose: () => void
}

type Step = 'upload' | 'proofing'

export default function ArtworkProofingTool({ printSpecs, productName, onApprove, onClose }: Props) {
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [imageUrl, setImageUrl] = useState('')
  const [analysis, setAnalysis] = useState<ArtworkAnalysis | null>(null)
  const [analysing, setAnalysing] = useState(false)
  const [error, setError] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)
  const [notes, setNotes] = useState('')
  const [overlays, setOverlays] = useState({ bleed: true, trim: true, safe: true })
  const [overrideWarning, setOverrideWarning] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Trap focus inside modal
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  async function processFile(f: File) {
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File too large. Maximum size is ${MAX_SIZE_MB}MB.`)
      return
    }
    setError('')
    setAnalysing(true)
    try {
      const { analysis: a, imageUrl: url } = await analyzeArtwork(f, printSpecs)
      setFile(f)
      setAnalysis(a)
      setImageUrl(url)
      setStep('proofing')
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
    setOverrideWarning(false)
  }

  function handleApprove() {
    if (!file || !analysis) return
    const hasBlockingWarnings = analysis.qualityRating === 'poor' && !overrideWarning
    if (hasBlockingWarnings) return
    onApprove(file, analysis, imageUrl, notes)
  }

  const hasBlockingWarning = analysis?.qualityRating === 'poor' && !overrideWarning

  return (
    // Backdrop
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-6 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">Upload Artwork</h2>
            <p className="text-sm text-gray-500">{productName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition p-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="p-6">
          {/* ── UPLOAD STEP ─────────────────────────────────── */}
          {step === 'upload' && (
            <div className="max-w-lg mx-auto">
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer ${
                  isDragOver
                    ? 'border-accent bg-accent/5 scale-[1.01]'
                    : 'border-gray-200 hover:border-accent/50 hover:bg-gray-50'
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="text-5xl mb-4">{analysing ? '⏳' : '📁'}</div>
                {analysing ? (
                  <p className="font-semibold text-gray-700">Analysing artwork…</p>
                ) : (
                  <>
                    <p className="font-semibold text-gray-800 mb-1">Drop your artwork here</p>
                    <p className="text-sm text-gray-500 mb-4">or click to browse</p>
                    <span className="inline-block bg-accent text-white text-sm font-bold px-5 py-2 rounded-xl">
                      Choose File
                    </span>
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

              {error && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Accepted formats */}
              <div className="mt-6 rounded-xl bg-gray-50 border border-gray-100 p-4 text-sm space-y-2">
                <div className="font-semibold text-gray-700 mb-1">Accepted formats</div>
                <div className="flex flex-wrap gap-2">
                  {['JPG', 'PNG', 'PDF', 'AI', 'EPS', 'PSD', 'CDR', 'ZIP'].map((f) => (
                    <span key={f} className="bg-white border border-gray-200 rounded-lg px-2 py-0.5 text-xs font-medium text-gray-600">{f}</span>
                  ))}
                </div>
                <div className="text-gray-500 text-xs">Max file size: {MAX_SIZE_MB}MB</div>
              </div>

              {/* Print spec reminder */}
              <div className="mt-4 rounded-xl bg-blue-50 border border-blue-100 p-4 text-sm">
                <div className="font-semibold text-blue-800 mb-1">Design specs for this product</div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-blue-700 text-xs">
                  <span>Trim size</span><span className="font-medium">{printSpecs.trimWidthMm}×{printSpecs.trimHeightMm}mm</span>
                  <span>Add bleed</span><span className="font-medium">{printSpecs.bleedMm}mm all sides</span>
                  <span>Safe area</span><span className="font-medium">{printSpecs.safeAreaMm}mm inward from trim</span>
                  <span>Min. DPI</span><span className="font-medium">{printSpecs.minDpi} DPI</span>
                  <span>Final file size</span><span className="font-medium">{printSpecs.trimWidthMm + printSpecs.bleedMm * 2}×{printSpecs.trimHeightMm + printSpecs.bleedMm * 2}mm</span>
                </div>
              </div>
            </div>
          )}

          {/* ── PROOFING STEP ────────────────────────────────── */}
          {step === 'proofing' && analysis && file && (
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Left — canvas */}
              <div className="flex-1 min-w-0">
                {/* Overlay toggle controls */}
                <div className="flex items-center gap-4 mb-3 flex-wrap">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Overlays</span>
                  {(
                    [
                      { key: 'bleed', label: 'Bleed', color: 'text-red-600 bg-red-50 border-red-200' },
                      { key: 'trim', label: 'Trim', color: 'text-blue-600 bg-blue-50 border-blue-200' },
                      { key: 'safe', label: 'Safe Area', color: 'text-green-600 bg-green-50 border-green-200' },
                    ] as const
                  ).map(({ key, label, color }) => (
                    <button
                      key={key}
                      onClick={() => setOverlays((o) => ({ ...o, [key]: !o[key] }))}
                      className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all ${
                        overlays[key] ? color : 'text-gray-400 bg-gray-50 border-gray-200'
                      }`}
                    >
                      {overlays[key] ? '● ' : '○ '}{label}
                    </button>
                  ))}
                </div>

                <ProofingCanvas
                  imageUrl={imageUrl}
                  printSpecs={printSpecs}
                  isPDF={isPDFFile(file)}
                />
              </div>

              {/* Right — panel */}
              <div className="lg:w-72 space-y-4 shrink-0">
                {/* Resolution panel */}
                <ResolutionPanel analysis={analysis} minDpi={printSpecs.minDpi} />

                {/* Warnings */}
                {analysis.warnings.length > 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
                    <div className="font-semibold text-amber-800 text-sm flex items-center gap-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                      </svg>
                      Warnings
                    </div>
                    {analysis.warnings.map((w, i) => (
                      <p key={i} className="text-xs text-amber-700 leading-relaxed">{w}</p>
                    ))}
                    {analysis.qualityRating === 'poor' && (
                      <label className="flex items-start gap-2 cursor-pointer mt-2">
                        <input
                          type="checkbox"
                          checked={overrideWarning}
                          onChange={(e) => setOverrideWarning(e.target.checked)}
                          className="mt-0.5 accent-amber-600"
                        />
                        <span className="text-xs text-amber-700">I understand the quality may be poor and wish to proceed anyway.</span>
                      </label>
                    )}
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Special Instructions (optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="e.g. Use Pantone 286 C for logo, bleed as shown…"
                    className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-accent resize-none"
                  />
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-2">
                  <button
                    onClick={handleApprove}
                    disabled={!!hasBlockingWarning}
                    className={`w-full py-3 rounded-xl font-bold text-sm transition ${
                      hasBlockingWarning
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-accent text-white hover:opacity-90'
                    }`}
                  >
                    Approve & Add to Cart
                  </button>
                  <button
                    onClick={handleReplace}
                    className="w-full py-2.5 rounded-xl font-semibold text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
                  >
                    Replace Artwork
                  </button>
                  {imageUrl && !isPDFFile(file) && (
                    <a
                      href={imageUrl}
                      download={`proof-${file.name}`}
                      className="block w-full py-2.5 rounded-xl font-semibold text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 transition text-center"
                    >
                      Download Proof
                    </a>
                  )}
                </div>

                {/* File info */}
                <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-xs text-gray-500 space-y-1">
                  <div className="flex justify-between"><span>File</span><span className="font-medium text-gray-700 truncate ml-2">{file.name}</span></div>
                  <div className="flex justify-between"><span>Size</span><span className="font-medium text-gray-700">{(file.size / 1024 / 1024).toFixed(2)} MB</span></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Resolution Panel ─────────────────────────────────────────────────────────

function ResolutionPanel({ analysis, minDpi }: { analysis: ArtworkAnalysis; minDpi: number }) {
  const isVector = analysis.qualityRating === 'vector'

  const ratingConfig = {
    excellent: { label: 'Print Ready', color: 'text-green-700 bg-green-50 border-green-200', bar: 'bg-green-500', width: '100%' },
    acceptable: { label: 'Acceptable', color: 'text-amber-700 bg-amber-50 border-amber-200', bar: 'bg-amber-500', width: '60%' },
    poor: { label: 'Low Resolution', color: 'text-red-700 bg-red-50 border-red-200', bar: 'bg-red-500', width: '25%' },
    vector: { label: 'Vector — Resolution Independent', color: 'text-blue-700 bg-blue-50 border-blue-200', bar: 'bg-blue-500', width: '100%' },
  }

  const cfg = ratingConfig[analysis.qualityRating]

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 space-y-3">
      <div className="font-semibold text-gray-700 text-sm">Artwork Analysis</div>

      {/* Quality badge */}
      <div className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${cfg.color}`}>
        {analysis.qualityRating === 'excellent' || isVector ? '✓' : '⚠'}
        {isVector ? 'Vector' : `${analysis.dpi} DPI`} — {cfg.label}
      </div>

      {/* Quality meter */}
      {!isVector && (
        <div>
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Poor</span><span>Acceptable</span><span>Excellent</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${cfg.bar}`}
              style={{ width: cfg.width }}
            />
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        {!isVector && (
          <>
            <span className="text-gray-500">Dimensions</span>
            <span className="font-medium text-gray-800">{analysis.widthPx}×{analysis.heightPx}px</span>
            <span className="text-gray-500">Effective DPI</span>
            <span className={`font-medium ${analysis.dpi >= minDpi ? 'text-green-700' : 'text-red-600'}`}>
              {analysis.dpi} DPI
            </span>
          </>
        )}
        <span className="text-gray-500">Format</span>
        <span className="font-medium text-gray-800">{analysis.fileFormat}</span>
        <span className="text-gray-500">Color Mode</span>
        <span className="font-medium text-gray-800">{analysis.colorMode}</span>
        {!isVector && (
          <>
            <span className="text-gray-500">Artwork size</span>
            <span className="font-medium text-gray-800">{analysis.dimensionsMm.width}×{analysis.dimensionsMm.height}mm</span>
          </>
        )}
      </div>

      {analysis.colorMode === 'RGB' && (
        <p className="text-xs text-gray-400 italic">ℹ CMYK preferred for offset printing. RGB will be converted during production.</p>
      )}
    </div>
  )
}
