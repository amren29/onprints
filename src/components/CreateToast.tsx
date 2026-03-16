'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'

const CheckCircleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
)

const TOAST_CSS = `
@keyframes ctIn  { from { opacity: 0; transform: translateY(-28px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes ctOut { from { opacity: 1; transform: translateY(0) scale(1); } to { opacity: 0; transform: translateY(-80px) scale(0.92); } }
@keyframes ctBar { from { transform: scaleX(1); } to { transform: scaleX(0); } }
`

/**
 * Drop-in success toast. Add <CreateToast param="created" title="Customer created" /> to any list page.
 * The corresponding /new page should navigate to `?created=1` after saving.
 */
export default function CreateToast({ param = 'created', title, subtitle, basePath }: {
  param?: string
  title: string
  subtitle?: string
  basePath?: string
}) {
  const searchParams = useSearchParams()
  const [toast, setToast] = useState<'visible' | 'exiting' | null>(null)
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current) return
    if (searchParams.get(param) === '1') {
      fired.current = true
      if (basePath) window.history.replaceState({}, '', basePath)
      else {
        const url = new URL(window.location.href)
        url.searchParams.delete(param)
        window.history.replaceState({}, '', url.pathname + url.search)
      }
      setToast('visible')
      setTimeout(() => setToast('exiting'), 3000)
      setTimeout(() => setToast(null), 3400)
    }
  }, [searchParams, param, basePath])

  if (!toast) return <style suppressHydrationWarning>{TOAST_CSS}</style>

  return (
    <>
      <style suppressHydrationWarning>{TOAST_CSS}</style>
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 999,
        display: 'flex', justifyContent: 'center', paddingTop: 24,
        pointerEvents: 'none',
        animation: toast === 'exiting' ? 'ctOut 0.4s ease forwards' : 'ctIn 0.4s cubic-bezier(0.16,1,0.3,1) forwards',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '14px 24px', minWidth: 260,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ color: '#22c55e', display: 'flex', alignItems: 'center' }}><CheckCircleIcon /></div>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</div>
            {subtitle && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</div>}
          </div>
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
            background: '#22c55e', transformOrigin: 'left',
            animation: 'ctBar 3s linear forwards', borderRadius: '0 0 12px 12px',
          }} />
        </div>
      </div>
    </>
  )
}
