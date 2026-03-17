'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/lib/store/auth-store'
import { CanvaDesign } from '@/types/store'

interface Props {
  isOpen: boolean
  onClose: () => void
  productSlug: string
  productName: string
  trimWidthMm: number
  trimHeightMm: number
  bleedMm: number
  /** Called when a design is selected for export with its image URL */
  onDesignExported: (imageUrl: string, designId: string) => void
}

type Tab = 'create' | 'my-designs'

export default function CanvaDesignPicker({
  isOpen,
  onClose,
  productSlug,
  productName,
  trimWidthMm,
  trimHeightMm,
  bleedMm,
  onDesignExported,
}: Props) {
  const canvaTokens = useAuthStore((s) => s.currentUser?.canvaTokens)
  const accessToken = canvaTokens?.accessToken || ''

  const [tab, setTab] = useState<Tab>('create')
  const [designs, setDesigns] = useState<CanvaDesign[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [continuation, setContinuation] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [exporting, setExporting] = useState<string | null>(null)
  const [error, setError] = useState('')

  // Fetch designs when "My Designs" tab is active
  const fetchDesigns = useCallback(async (query?: string, cont?: string) => {
    if (!accessToken) return
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (query) params.set('query', query)
      if (cont) params.set('continuation', cont)

      const res = await fetch(`/api/store/canva/designs?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) throw new Error('Failed to load designs')
      const data = await res.json()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items: CanvaDesign[] = (data.items || []).map((d: any) => ({
        id: d.id,
        title: d.title || 'Untitled',
        thumbnail: d.thumbnail,
        url: d.url || d.urls?.edit_url || '',
        created_at: d.created_at || '',
        updated_at: d.updated_at || '',
      }))

      if (cont) {
        setDesigns((prev) => [...prev, ...items])
      } else {
        setDesigns(items)
      }
      setContinuation(data.continuation || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load designs')
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  useEffect(() => {
    if (isOpen && tab === 'my-designs' && accessToken) {
      fetchDesigns()
    }
  }, [isOpen, tab, accessToken, fetchDesigns])

  // Handle search
  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setContinuation(null)
    fetchDesigns(searchQuery)
  }

  // Create new design
  async function handleCreateDesign() {
    if (!accessToken) return
    setCreating(true)
    setError('')
    try {
      const res = await fetch('/api/store/canva/designs/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          title: `${productName} - OnPrints`,
          widthMm: trimWidthMm,
          heightMm: trimHeightMm,
          bleedMm,
          slug: productSlug,
        }),
      })
      if (!res.ok) throw new Error('Failed to create design')
      const data = await res.json()

      // Get edit URL from response
      const editUrl = data.design?.urls?.edit_url || data.urls?.edit_url
      const designId = data.design?.id || data.id

      if (editUrl) {
        // Open Canva editor in new tab — when user is done, they'll manually return
        // or we can use the return URL mechanism
        const returnUrl = `${window.location.origin}/store/canva/return?designId=${designId}&slug=${productSlug}`
        window.open(`${editUrl}`, '_blank')

        // Show a message that user should return after editing
        onClose()

        // Also provide a direct link to the return page
        if (confirm('After you finish editing in Canva, click OK to export your design.')) {
          window.location.href = returnUrl
        }
      } else {
        throw new Error('No edit URL returned from Canva')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create design')
    } finally {
      setCreating(false)
    }
  }

  // Export an existing design
  async function handleExportDesign(designId: string) {
    if (!accessToken) return
    setExporting(designId)
    setError('')
    try {
      // Start export
      const exportRes = await fetch('/api/store/canva/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ designId, format: 'png' }),
      })
      if (!exportRes.ok) throw new Error('Failed to start export')
      const exportData = await exportRes.json()
      const exportJobId = exportData.job?.id || exportData.id

      // Poll for completion
      let attempts = 0
      while (attempts < 30) {
        await new Promise((r) => setTimeout(r, 2000))
        attempts++

        const pollRes = await fetch(`/api/store/canva/export?id=${exportJobId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        if (!pollRes.ok) throw new Error('Failed to poll export')
        const pollData = await pollRes.json()

        const jobStatus = pollData.job?.status || pollData.status
        if (jobStatus === 'completed') {
          const urls = pollData.job?.urls || pollData.urls || []
          const imageUrl = urls[0]
          if (imageUrl) {
            onDesignExported(imageUrl, designId)
            onClose()
            return
          }
          throw new Error('Export completed but no URL returned')
        }
        if (jobStatus === 'failed') {
          throw new Error('Export failed')
        }
      }
      throw new Error('Export timed out')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setExporting(null)
    }
  }

  if (!isOpen) return null

  const totalW = trimWidthMm + bleedMm * 2
  const totalH = trimHeightMm + bleedMm * 2

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Design with Canva</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {productName} — {totalW} x {totalH} mm (incl. bleed)
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setTab('create')}
            className={`flex-1 py-3 text-sm font-semibold border-b-2 transition ${
              tab === 'create'
                ? 'border-accent text-accent'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Create New
          </button>
          <button
            onClick={() => setTab('my-designs')}
            className={`flex-1 py-3 text-sm font-semibold border-b-2 transition ${
              tab === 'my-designs'
                ? 'border-accent text-accent'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            My Designs
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-start gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* ── Create New ──────────────── */}
          {tab === 'create' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#006AFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2"/>
                  <line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Create a New Design</h3>
              <p className="text-sm text-gray-500 mb-1">
                Opens Canva with the correct dimensions for <strong>{productName}</strong>
              </p>
              <p className="text-xs text-gray-400 mb-6">
                Canvas size: {totalW} x {totalH} mm ({Math.round((totalW / 25.4) * 300)} x {Math.round((totalH / 25.4) * 300)} px at 300 DPI)
              </p>

              <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto mb-6 text-xs">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="font-bold text-gray-800">Trim</div>
                  <div className="text-gray-500">{trimWidthMm} x {trimHeightMm}mm</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="font-bold text-gray-800">Bleed</div>
                  <div className="text-gray-500">{bleedMm}mm each side</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="font-bold text-gray-800">DPI</div>
                  <div className="text-gray-500">300</div>
                </div>
              </div>

              <button
                onClick={handleCreateDesign}
                disabled={creating}
                className="px-8 py-3 rounded-xl bg-accent text-white font-bold text-sm hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
              >
                {creating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
                    </svg>
                    Create in Canva
                  </>
                )}
              </button>
            </div>
          )}

          {/* ── My Designs ──────────────── */}
          {tab === 'my-designs' && (
            <div>
              {/* Search */}
              <form onSubmit={handleSearch} className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search your designs..."
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-accent"
                  />
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                  </svg>
                </div>
              </form>

              {/* Grid */}
              {loading && designs.length === 0 ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-3 border-accent/20 border-t-accent rounded-full animate-spin" />
                </div>
              ) : designs.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-gray-400">No designs found</p>
                  <p className="text-xs text-gray-400 mt-1">Create a new design or try a different search</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {designs.map((design) => (
                      <button
                        key={design.id}
                        onClick={() => handleExportDesign(design.id)}
                        disabled={!!exporting}
                        className="group relative bg-gray-50 rounded-xl overflow-hidden border border-gray-100 hover:border-accent/50 hover:shadow-md transition text-left disabled:opacity-50"
                      >
                        {/* Thumbnail */}
                        <div className="aspect-[4/3] bg-gray-100 overflow-hidden">
                          {design.thumbnail?.url ? (
                            <img
                              src={design.thumbnail.url}
                              alt={design.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-gray-300">
                                <rect width="18" height="18" x="3" y="3" rx="2"/>
                                <circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="p-2.5">
                          <p className="text-xs font-medium text-gray-800 truncate">{design.title}</p>
                        </div>

                        {/* Exporting overlay */}
                        {exporting === design.id && (
                          <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                            <div className="text-center">
                              <div className="w-6 h-6 border-2 border-accent/20 border-t-accent rounded-full animate-spin mx-auto mb-1" />
                              <p className="text-xs font-medium text-accent">Exporting...</p>
                            </div>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Load more */}
                  {continuation && (
                    <div className="text-center mt-4">
                      <button
                        onClick={() => fetchDesigns(searchQuery, continuation)}
                        disabled={loading}
                        className="text-sm text-accent font-semibold hover:underline disabled:opacity-50"
                      >
                        {loading ? 'Loading...' : 'Load more'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
