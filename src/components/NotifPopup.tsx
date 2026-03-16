'use client'

import { useEffect, useState, useCallback } from 'react'
import { NOTIF_NEW_EVENT, type Notification } from '@/lib/notification-store'
import { isInAppEnabled } from '@/lib/notif-prefs-store'

/* ── Icons ─────────────────────────────────────────── */
const BoardIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="11" rx="1"/><rect x="17" y="3" width="5" height="15" rx="1"/>
  </svg>
)
const BellIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
  </svg>
)
const CloseIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)

/* Source → icon + accent colour */
const SOURCE_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  prod_move: { icon: <BoardIcon />, color: '#2563eb', bg: 'rgba(37,99,235,0.1)' },
}
const DEFAULT_CONFIG = { icon: <BellIcon />, color: '#006AFF', bg: 'rgba(0,106,255,0.1)' }

type ToastItem = Notification & { key: number }

/* Inject keyframes once */
function injectStyles() {
  if (typeof window === 'undefined') return
  if (document.getElementById('__notif-popup-style')) return
  const style = document.createElement('style')
  style.id = '__notif-popup-style'
  style.textContent = `
    @keyframes notifSlideIn  { from { opacity:0; transform:translateX(calc(100% + 32px)); } to { opacity:1; transform:translateX(0); } }
    @keyframes notifSlideOut { from { opacity:1; transform:translateX(0); } to { opacity:0; transform:translateX(calc(100% + 32px)); } }
    .notif-popup-item { animation: notifSlideIn 0.32s cubic-bezier(0.34,1.1,0.64,1) forwards; }
    .notif-popup-item.leaving { animation: notifSlideOut 0.22s ease forwards; }
  `
  document.head.appendChild(style)
}

/* ── Source pref key mapping ─────────────────────────
   Maps notification source → the preferences key to check */
const SOURCE_PREF_KEY: Record<string, string> = {
  prod_move: 'prodMove',
}

function playBell() {
  if (typeof window === 'undefined') return
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.12)
    gain.gain.setValueAtTime(0.18, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.5)
    osc.onended = () => ctx.close()
  } catch {}
}

export default function NotifPopup() {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [leaving, setLeaving] = useState<Set<number>>(new Set())

  useEffect(() => { injectStyles() }, [])

  const dismiss = useCallback((key: number) => {
    setLeaving(prev => new Set(prev).add(key))
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.key !== key))
      setLeaving(prev => { const n = new Set(prev); n.delete(key); return n })
    }, 220)
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      const notif = (e as CustomEvent<Notification>).detail

      // Check if the in-app channel is enabled for this source
      const prefKey = notif.source ? SOURCE_PREF_KEY[notif.source] : undefined
      if (prefKey && !isInAppEnabled(prefKey)) return

      // Only show popup for specific sourced notifications
      if (!notif.source) return

      const key = Date.now()
      const item: ToastItem = { ...notif, key }
      setToasts(prev => [...prev, item].slice(-5)) // max 5 stacked
      playBell()

      // Auto-dismiss after 5s
      setTimeout(() => dismiss(key), 5000)
    }

    window.addEventListener(NOTIF_NEW_EVENT, handler)
    return () => window.removeEventListener(NOTIF_NEW_EVENT, handler)
  }, [dismiss])

  if (toasts.length === 0) return null

  return (
    <div style={{
      position: 'fixed',
      top: 'calc(var(--topbar-h) + 8px)',
      right: 20,
      zIndex: 9998,
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      alignItems: 'flex-end',
      pointerEvents: 'none',
    }}>
      {toasts.map(t => {
        const cfg = (t.source && SOURCE_CONFIG[t.source]) ? SOURCE_CONFIG[t.source] : DEFAULT_CONFIG
        const isLeaving = leaving.has(t.key)
        return (
          <div
            key={t.key}
            className={`notif-popup-item${isLeaving ? ' leaving' : ''}`}
            style={{
              pointerEvents: 'all',
              width: 240,
              background: 'var(--bg-card, #fff)',
              border: '1px solid var(--border, #f0f0f2)',
              borderRadius: 8,
              boxShadow: '0 4px 16px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 8px',
            }}
          >
            {/* Icon */}
            <div style={{
              width: 24, height: 24, borderRadius: 6, flexShrink: 0,
              background: cfg.bg, color: cfg.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {cfg.icon}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 650, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>
                {t.title}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.4, marginTop: 1 }}>
                {t.message}
              </div>
            </div>

            {/* Close */}
            <button
              onClick={() => dismiss(t.key)}
              style={{
                flexShrink: 0, width: 16, height: 16, borderRadius: 4,
                border: 'none', background: 'transparent',
                color: 'var(--text-muted)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--border)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <CloseIcon />
            </button>
          </div>
        )
      })}
    </div>
  )
}
