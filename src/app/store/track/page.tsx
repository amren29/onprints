'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Navbar from '@/components/store/Navbar'
import Footer from '@/components/store/Footer'
import NewsletterCTA from '@/components/store/NewsletterCTA'
import { SectionRenderer } from '@/components/store/sections'
import { type PageSection, DEFAULT_PAGE_SECTIONS } from '@/lib/store-builder'
import { useStoreGlobal } from '@/hooks/useStoreGlobal'

type TrackStatus = 'received' | 'production' | 'quality' | 'shipped'

const STEPS: { id: TrackStatus; label: string; desc: string }[] = [
  { id: 'received',   label: 'Order Received',  desc: 'Order and payment confirmed' },
  { id: 'production', label: 'In Production',   desc: 'Your items are being printed' },
  { id: 'quality',    label: 'Quality Check',   desc: 'Inspecting before dispatch' },
  { id: 'shipped',    label: 'Shipped / Ready', desc: 'On its way or ready for pick-up' },
]

const STEP_ORDER: TrackStatus[] = ['received', 'production', 'quality', 'shipped']

function mapProductionToStep(production: string, status: string): TrackStatus | null {
  if (status === 'Cancelled') return null
  if (['Shipped', 'Delivered'].includes(production)) return 'shipped'
  if (production === 'Quality Check') return 'quality'
  if (production === 'In Progress') return 'production'
  return 'received'
}

export default function TrackPage() {
  return (
    <Suspense>
      <TrackContent />
    </Suspense>
  )
}

function TrackContent() {
  const searchParams = useSearchParams()
  const globalSettings = useStoreGlobal()
  const [sections, setSections] = useState<PageSection[]>([])
  const [orderId, setOrderId] = useState(searchParams.get('id') ?? '')
  const [result, setResult] = useState<{ status: TrackStatus; eta: string; customer: string; created: string; dueDate: string } | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [searched, setSearched] = useState(false)
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/store/pages?pageId=track')
        const { page } = await res.json()
        if (!cancelled) {
          setSections((page?.sections as PageSection[]) ?? DEFAULT_PAGE_SECTIONS.track())
        }
      } catch {
        if (!cancelled) setSections(DEFAULT_PAGE_SECTIONS.track())
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const id = searchParams.get('id')
    if (id) { setOrderId(id); doSearch(id) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function doSearch(id: string) {
    setSearching(true)
    try {
      const res = await fetch(`/api/store/track?orderId=${encodeURIComponent(id.trim().toUpperCase())}`)
      const { order } = await res.json()
      setSearched(true)
      if (order) {
        const step = mapProductionToStep(order.production, order.status)
        if (step) {
          const eta = order.due_date
            ? new Date(order.due_date).toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' })
            : 'To be confirmed'
          setResult({ status: step, eta, customer: order.customer_name, created: order.created_at, dueDate: order.due_date })
          setNotFound(false)
        } else {
          setResult(null)
          setNotFound(true)
        }
      } else {
        setResult(null)
        setNotFound(true)
      }
    } catch {
      setSearched(true)
      setResult(null)
      setNotFound(true)
    } finally {
      setSearching(false)
    }
  }

  function handleTrack() {
    if (!orderId.trim()) return
    doSearch(orderId.trim().toUpperCase())
  }

  const currentStepIdx = result ? STEP_ORDER.indexOf(result.status) : -1
  const heroSection = sections.find((s) => s.type === 'hero')

  return (
    <>
      <Navbar />
      {heroSection && <SectionRenderer section={heroSection} />}

      <main className="max-w-2xl mx-auto px-4 py-16">
        <div className="flex gap-3 max-w-md mx-auto mb-10">
          <input
            type="text"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleTrack()}
            placeholder="e.g. ORD-25134"
            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 font-mono font-bold text-sm focus:outline-none focus:border-accent"
          />
          <button onClick={handleTrack} disabled={searching} className="bg-accent text-white font-bold px-6 py-3 rounded-xl hover:opacity-90 transition disabled:opacity-50">
            {searching ? 'Searching...' : 'Track'}
          </button>
        </div>

        {searched && notFound && (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-6 text-center">
            <p className="font-semibold text-red-700 mb-1">Order not found</p>
            <p className="text-sm text-red-500">Check the order ID and try again, or contact us for help.</p>
          </div>
        )}

        {result && (
          <div className="rounded-2xl border border-gray-100 bg-white p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Order Number</p>
                <p className="text-xl font-bold text-accent">{orderId}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Est. Completion</p>
                <p className="text-sm font-semibold text-gray-700">{result.eta}</p>
              </div>
            </div>
            <ol className="relative border-l-2 border-gray-100 ml-3 space-y-6">
              {STEPS.map((step, i) => {
                const done = i <= currentStepIdx
                const current = i === currentStepIdx
                return (
                  <li key={step.id} className="ml-6">
                    <span className={`absolute -left-[11px] flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${done ? 'bg-accent border-accent' : 'bg-white border-gray-200'}`}>
                      {done && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                    </span>
                    <div>
                      <p className={`text-sm font-semibold ${done ? (current ? 'text-accent' : 'text-gray-900') : 'text-gray-300'}`}>
                        {step.label}
                        {current && <span className="ml-2 inline-flex items-center gap-1 text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded-full font-bold">● Current</span>}
                      </p>
                      <p className={`text-xs mt-0.5 ${done ? 'text-gray-500' : 'text-gray-300'}`}>{step.desc}</p>
                    </div>
                  </li>
                )
              })}
            </ol>
            <div className="mt-6 pt-5 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-400">Need help? Email us at <a href={`mailto:${globalSettings.contactEmail}`} className="text-accent hover:underline">{globalSettings.contactEmail}</a></p>
            </div>
          </div>
        )}
      </main>
      <NewsletterCTA />
      <Footer />
    </>
  )
}
