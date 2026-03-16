'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

/* ── Icons ───────────────────────────────────────────── */
const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)
const LinkIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
  </svg>
)
const WhatsAppIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
)
const EmailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
  </svg>
)
const TelegramIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
)
const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

const PrintIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 6 2 18 2 18 9"/>
    <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
    <rect x="6" y="14" width="12" height="8"/>
  </svg>
)
const DownloadIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
)

/* ── Share Modal ──────────────────────────────────────── */
interface ShareModalProps {
  title: string
  shareText: string
  shareUrl: string
  onClose: () => void
  onPrint?: () => void
}

export default function ShareModal({ title, shareText, shareUrl, onClose, onPrint }: ShareModalProps) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [copied, setCopied]   = useState(false)

  useEffect(() => { setMounted(true); requestAnimationFrame(() => setVisible(true)) }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') smoothClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const smoothClose = () => { setVisible(false); setTimeout(onClose, 180) }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* fallback */ }
  }

  const encoded   = encodeURIComponent(shareText)
  const encodedUrl = encodeURIComponent(shareUrl)

  const channels = [
    {
      label: 'Copy Link',
      icon: copied ? <CheckIcon /> : <LinkIcon />,
      color: '#006AFF',
      bg: '#006AFF14',
      action: copyLink,
      subtitle: copied ? 'Copied!' : 'Copy to clipboard',
    },
    {
      label: 'WhatsApp',
      icon: <WhatsAppIcon />,
      color: '#006AFF',
      bg: '#006AFF14',
      action: () => window.open(`https://wa.me/?text=${encoded}%20${encodedUrl}`, '_blank'),
      subtitle: 'Send via WhatsApp',
    },
    {
      label: 'Email',
      icon: <EmailIcon />,
      color: 'var(--accent, #006AFF)',
      bg: '#2563eb14',
      action: () => window.open(`mailto:?subject=${encodeURIComponent(title)}&body=${encoded}%0A${encodedUrl}`),
      subtitle: 'Send via email',
    },
    {
      label: 'Telegram',
      icon: <TelegramIcon />,
      color: '#0088cc',
      bg: '#0088cc14',
      action: () => window.open(`https://t.me/share/url?url=${encodedUrl}&text=${encoded}`, '_blank'),
      subtitle: 'Send via Telegram',
    },
    ...(onPrint ? [{
      label: 'Print / PDF',
      icon: <PrintIcon />,
      color: '#6b7280',
      bg: '#6b728014',
      action: () => { onPrint(); smoothClose() },
      subtitle: 'Print or save as PDF',
    }] : []),
  ]

  const modal = (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        background: 'var(--modal-overlay)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.18s ease',
      }}
      onClick={smoothClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-card, white)',
          borderRadius: 16,
          width: '100%',
          maxWidth: 400,
          boxShadow: 'var(--shadow-modal)',
          margin: '0 20px',
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.98)',
          transition: 'transform 0.2s ease, opacity 0.2s ease',
          opacity: visible ? 1 : 0,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid var(--border, #e5e7eb)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font)' }}>
            Share
          </span>
          <button
            onClick={smoothClose}
            style={{
              padding: 6, borderRadius: 8, background: 'transparent', border: 'none',
              cursor: 'pointer', color: 'var(--text-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'color 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            <CloseIcon />
          </button>
        </div>

        {/* Document info */}
        <div style={{ padding: '16px 24px', background: 'var(--bg, #f5f5f7)', borderBottom: '1px solid var(--border, #e5e7eb)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{title}</div>
          <div style={{
            fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden',
            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{shareUrl}</div>
        </div>

        {/* Share channels — horizontal */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '20px 16px 24px', flexWrap: 'wrap' }}>
          {channels.map(ch => (
            <button
              key={ch.label}
              onClick={ch.action}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                width: 68, padding: '12px 4px 8px', textAlign: 'center',
                border: 'none', background: 'transparent', cursor: 'pointer',
                borderRadius: 12, fontFamily: 'var(--font)',
                transition: 'background 0.12s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg, #f5f5f7)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: ch.bg, color: ch.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {ch.icon}
              </div>
              <div style={{ fontSize: 10.5, fontWeight: 500, color: 'var(--text-secondary)', lineHeight: 1.25, whiteSpace: 'nowrap' }}>{ch.label}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  if (!mounted) return null
  return createPortal(modal, document.body)
}
