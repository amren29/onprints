'use client'
import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel  = 'Cancel',
  danger       = true,
  onConfirm,
  onCancel,
}: Props) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setMounted(true)
    requestAnimationFrame(() => setVisible(true))
  }, [])

  const smoothClose = useCallback((cb: () => void) => {
    setVisible(false)
    setTimeout(cb, 200)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') smoothClose(onCancel) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel, smoothClose])

  const modal = (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        background: 'var(--modal-overlay)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.2s ease',
      }}
      onClick={() => smoothClose(onCancel)}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)',
          borderRadius: 16,
          padding: '28px 32px',
          width: '100%',
          maxWidth: 400,
          boxShadow: 'var(--shadow-modal)',
          margin: '0 16px',
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.98)',
          opacity: visible ? 1 : 0,
          transition: 'transform 0.2s ease, opacity 0.2s ease',
        }}
      >
        {/* Title */}
        <div style={{
          fontSize: 16, fontWeight: 600, color: 'var(--text-primary)',
          fontFamily: 'var(--font)', marginBottom: message ? 10 : 24,
        }}>
          {title}
        </div>

        {/* Message */}
        {message && (
          <div style={{
            fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5,
            fontFamily: 'var(--font)', marginBottom: 24,
          }}>
            {message}
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={() => smoothClose(onCancel)}
            style={{
              padding: '8px 18px', borderRadius: 8,
              background: 'transparent', border: 'none',
              fontSize: 14, fontWeight: 500, color: 'var(--text-primary)',
              cursor: 'pointer', fontFamily: 'var(--font)',
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => smoothClose(onConfirm)}
            style={{
              padding: '8px 20px', borderRadius: 8,
              background: danger ? 'rgba(239,68,68,0.1)' : 'rgba(0,106,255,0.1)',
              border: 'none',
              fontSize: 14, fontWeight: 500,
              color: danger ? '#ef4444' : 'var(--accent, #006AFF)',
              cursor: 'pointer', fontFamily: 'var(--font)',
              transition: 'background 0.12s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = danger ? 'rgba(239,68,68,0.18)' : 'rgba(0,106,255,0.18)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = danger ? 'rgba(239,68,68,0.1)' : 'rgba(0,106,255,0.1)'
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )

  if (!mounted) return null
  return createPortal(modal, document.body)
}
