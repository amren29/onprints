'use client'

import { Suspense, useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
// TODO [Batch G]: Replace auth-store with Supabase store-users
import { useAuthStore } from '@/lib/store/auth-store'
import Navbar from '@/components/store/Navbar'
import { useStore } from '@/providers/store-context'

export default function CanvaReturnPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
        </div>
      </div>
    }>
      <CanvaReturnContent />
    </Suspense>
  )
}

function CanvaReturnContent() {
  const router = useRouter()
  const { basePath } = useStore()
  const searchParams = useSearchParams()
  const canvaTokens = useAuthStore((s) => s.currentUser?.canvaTokens)

  const [status, setStatus] = useState<'exporting' | 'error' | 'done'>('exporting')
  const [errorMsg, setErrorMsg] = useState('')
  const started = useRef(false)

  const designId = searchParams.get('designId')
  const slug = searchParams.get('slug') || ''

  useEffect(() => {
    if (started.current || !designId || !canvaTokens?.accessToken) return
    started.current = true

    async function exportAndRedirect() {
      try {
        const exportRes = await fetch('/api/store/canva/export', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${canvaTokens!.accessToken}`,
          },
          body: JSON.stringify({ designId, format: 'png' }),
        })
        if (!exportRes.ok) throw new Error('Failed to start export')
        const exportData = await exportRes.json()
        const exportJobId = exportData.job?.id || exportData.id

        let attempts = 0
        while (attempts < 30) {
          await new Promise((r) => setTimeout(r, 2000))
          attempts++

          const pollRes = await fetch(`/api/store/canva/export?id=${exportJobId}`, {
            headers: { Authorization: `Bearer ${canvaTokens!.accessToken}` },
          })
          if (!pollRes.ok) throw new Error('Failed to poll export')
          const pollData = await pollRes.json()

          const jobStatus = pollData.job?.status || pollData.status
          if (jobStatus === 'completed') {
            const urls = pollData.job?.urls || pollData.urls || []
            const imageUrl = urls[0]
            if (imageUrl && slug) {
              setStatus('done')
              router.push(`${basePath}/products/${slug}/proof?canvaImage=${encodeURIComponent(imageUrl)}&canvaDesignId=${designId}`)
              return
            }
            throw new Error('Export completed but no URL returned')
          }
          if (jobStatus === 'failed') {
            throw new Error('Export failed on Canva side')
          }
        }
        throw new Error('Export timed out')
      } catch (err) {
        setStatus('error')
        setErrorMsg(err instanceof Error ? err.message : 'Export failed')
      }
    }

    exportAndRedirect()
  }, [designId, canvaTokens, slug, router])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          {status === 'exporting' && (
            <>
              <div className="w-16 h-16 border-4 border-accent/20 border-t-accent rounded-full animate-spin mx-auto mb-6" />
              <h1 className="text-xl font-bold text-gray-900 mb-2">Exporting your design...</h1>
              <p className="text-sm text-gray-500">
                We&apos;re exporting your Canva design as a high-resolution image.
                This usually takes a few seconds.
              </p>
            </>
          )}

          {status === 'done' && (
            <>
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5"/>
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Export complete!</h1>
              <p className="text-sm text-gray-500">Redirecting to the proofing tool...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Export failed</h1>
              <p className="text-sm text-red-600 mb-6">{errorMsg}</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => { started.current = false; setStatus('exporting'); setErrorMsg('') }}
                  className="px-5 py-2.5 rounded-xl bg-accent text-white font-bold text-sm hover:opacity-90 transition"
                >
                  Try Again
                </button>
                <button
                  onClick={() => router.push(slug ? `${basePath}/products/${slug}` : `${basePath}/products`)}
                  className="px-5 py-2.5 rounded-xl border-2 border-gray-200 text-gray-700 font-bold text-sm hover:border-gray-400 transition"
                >
                  Back to Product
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
