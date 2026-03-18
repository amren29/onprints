'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  initNotifications, getNotifications, getUnreadCount,
  markRead, markAllRead, deleteNotification,
  NOTIF_CHANGE_EVENT, type Notification,
} from '@/lib/notification-store'
import SearchPalette from './SearchPalette'

const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
)

const MoonIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
  </svg>
)

const SunIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
)

const BellIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
  </svg>
)

const CloseIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)

/* ── Type icon configs ─────────────────────────────── */
const TYPE_CFG: Record<Notification['type'], { color: string; icon: React.ReactNode }> = {
  info:    { color: 'var(--accent, #006AFF)', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg> },
  success: { color: 'var(--accent)', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> },
  warning: { color: 'var(--warning)', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> },
  danger:  { color: 'var(--negative)', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> },
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export default function Topbar() {
  const [darkMode, setDarkMode] = useState(false)
  const [themeReady, setThemeReady] = useState(false)
  const [open, setOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const router = useRouter()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const isDark = localStorage.getItem('sp-theme') === 'dark'
    setDarkMode(isDark)
    setThemeReady(true)
  }, [])

  const reload = useCallback(() => {
    setNotifications(getNotifications())
    setUnreadCount(getUnreadCount())
  }, [])

  useEffect(() => {
    initNotifications()
    reload()
  }, [reload])

  // Reactive: listen for same-tab + cross-tab notification changes
  useEffect(() => {
    const handler = () => reload()
    const storageHandler = (e: StorageEvent) => {
      if (e.key === 'notif.items') reload()
    }
    window.addEventListener(NOTIF_CHANGE_EVENT, handler)
    window.addEventListener('storage', storageHandler)
    return () => {
      window.removeEventListener(NOTIF_CHANGE_EVENT, handler)
      window.removeEventListener('storage', storageHandler)
    }
  }, [reload])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // ⌘K / ⌘F → open palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey && (e.key === 'k' || e.key === 'f')) {
        e.preventDefault()
        setPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const toggleTheme = () => {
    const next = !darkMode
    setDarkMode(next)
    document.documentElement.setAttribute('data-theme', next ? 'dark' : '')
    localStorage.setItem('sp-theme', next ? 'dark' : 'light')
  }

  const handleClick = (n: Notification) => {
    if (!n.read) { markRead(n.id); reload() }
    if (n.link) { setOpen(false); router.push(n.link) }
  }

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    deleteNotification(id)
    reload()
  }

  const handleMarkAllRead = () => {
    markAllRead()
    reload()
  }

  return (
    <header className="topbar">
      {paletteOpen && <SearchPalette onClose={() => setPaletteOpen(false)} />}
      <div className="topbar-search" onClick={() => setPaletteOpen(true)}>
        <span className="topbar-search-icon"><SearchIcon /></span>
        <span className="topbar-search-text">Search</span>
        <span className="topbar-kbd">⌘ + K</span>
      </div>
      <div className="topbar-spacer" />
<button className="topbar-btn" onClick={toggleTheme} style={{ width: 34, padding: '6px', justifyContent: 'center' }} title="Toggle dark mode">
        {themeReady ? (darkMode ? <SunIcon /> : <MoonIcon />) : <MoonIcon />}
      </button>

      {/* ── Bell + Dropdown ── */}
      <div ref={panelRef} style={{ position: 'relative' }}>
        <button
          className="topbar-btn"
          onClick={() => { setOpen(v => !v); if (!open) reload() }}
          style={{ width: 34, padding: '6px', justifyContent: 'center', position: 'relative' }}
        >
          <BellIcon />
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: -4, right: -4,
              minWidth: 16, height: 16, borderRadius: 8,
              background: 'var(--danger-text)', color: '#fff',
              fontSize: 9, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 4px',
              border: '2px solid var(--bg-card)',
              lineHeight: 1,
            }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {open && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0,
            width: 'min(380px, calc(100vw - 24px))', maxHeight: 480,
            background: 'var(--bg-card, #fff)',
            border: '1px solid var(--border, #e5e7eb)',
            borderRadius: 14,
            boxShadow: '0 16px 48px rgba(15,23,42,0.14), 0 4px 12px rgba(15,23,42,0.06)',
            zIndex: 500,
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            fontFamily: 'var(--font)',
          }}>
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 16px 10px',
              borderBottom: '1px solid var(--border, #e5e7eb)',
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 650, color: 'var(--text-primary)' }}>Notifications</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                  {unreadCount === 0 ? 'All caught up' : `${unreadCount} unread`}
                </div>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  style={{
                    fontSize: 11.5, fontWeight: 500, color: 'var(--accent, #006AFF)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: 'var(--font)', padding: '4px 8px', borderRadius: 6,
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg, #f0f0f3)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
              {notifications.length === 0 ? (
                <div style={{
                  textAlign: 'center', padding: '40px 20px',
                  color: 'var(--text-muted)', fontSize: 13,
                }}>
                  No notifications
                </div>
              ) : (
                notifications.map(n => {
                  const cfg = TYPE_CFG[n.type]
                  return (
                    <div
                      key={n.id}
                      onClick={() => handleClick(n)}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 10,
                        padding: '12px 16px',
                        cursor: n.link ? 'pointer' : 'default',
                        borderBottom: '1px solid var(--border, #e5e7eb)',
                        background: n.read ? 'transparent' : 'var(--bg, #f8f9fa)',
                        transition: 'background 0.12s',
                      }}
                      onMouseEnter={e => {
                        if (n.read) e.currentTarget.style.background = 'var(--bg, #f8f9fa)'
                      }}
                      onMouseLeave={e => {
                        if (n.read) e.currentTarget.style.background = 'transparent'
                      }}
                    >
                      {/* Icon */}
                      <div style={{
                        width: 30, height: 30, borderRadius: 8,
                        background: cfg.color + '14', color: cfg.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, marginTop: 1,
                      }}>
                        {cfg.icon}
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {!n.read && (
                            <span style={{
                              width: 6, height: 6, borderRadius: '50%',
                              background: 'var(--accent, #006AFF)', flexShrink: 0,
                            }} />
                          )}
                          <span style={{
                            fontSize: 12.5, fontWeight: n.read ? 500 : 600,
                            color: 'var(--text-primary)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {n.title}
                          </span>
                        </div>
                        <p style={{
                          fontSize: 11.5, color: 'var(--text-muted)',
                          margin: '3px 0 0', lineHeight: 1.45,
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}>
                          {n.message}
                        </p>
                        <span style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 3, display: 'inline-block' }}>
                          {relativeTime(n.time)}
                        </span>
                      </div>

                      {/* Delete */}
                      <button
                        onClick={e => handleDelete(e, n.id)}
                        title="Dismiss"
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          width: 22, height: 22, borderRadius: 5,
                          background: 'transparent', border: 'none',
                          color: 'var(--text-muted)', cursor: 'pointer',
                          flexShrink: 0, marginTop: 2, opacity: 0.5,
                          transition: 'opacity 0.12s, background 0.12s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'var(--danger-bg)' }}
                        onMouseLeave={e => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.background = 'transparent' }}
                      >
                        <CloseIcon />
                      </button>
                    </div>
                  )
                })
              )}
            </div>

            {/* Footer — View all */}
            <div style={{ borderTop: '1px solid var(--border, #e5e7eb)', padding: '10px 16px' }}>
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                style={{
                  display: 'block', textAlign: 'center', fontSize: 12.5, fontWeight: 600,
                  color: 'var(--accent, #006AFF)', textDecoration: 'none', padding: '6px',
                  borderRadius: 8, transition: 'background 0.12s',
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => { e.currentTarget.style.background = 'rgba(0,106,255,0.07)' }}
                onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => { e.currentTarget.style.background = 'transparent' }}
              >
                View all notifications →
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
