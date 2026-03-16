'use client'
import { useEffect, useState, useContext, createContext, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/* ── Modal context — provides smoothThen for child buttons ── */
const ModalCtx = createContext<{ smoothThen: (cb: () => void) => void }>({ smoothThen: cb => cb() })

/* ── Shared backdrop + shell ─────────────────────────── */
function ModalShell({ onClose, width, children }: { onClose: () => void; width: number; children: ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  const smoothThen = (cb: () => void) => { setVisible(false); setTimeout(cb, 200) }

  useEffect(() => { setMounted(true); requestAnimationFrame(() => setVisible(true)) }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') smoothThen(onClose) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const modal = (
    <ModalCtx.Provider value={{ smoothThen }}>
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
        onClick={() => smoothThen(onClose)}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: 'var(--bg-card, white)',
            borderRadius: 14,
            width: '100%',
            maxWidth: width,
            maxHeight: '88vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 'var(--shadow-modal)',
            margin: '0 20px',
            transform: visible ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.98)',
            transition: 'transform 0.2s ease, opacity 0.2s ease',
            opacity: visible ? 1 : 0,
          }}
        >
          {children}
        </div>
      </div>
    </ModalCtx.Provider>
  )

  if (!mounted) return null
  return createPortal(modal, document.body)
}

/* ── Icons ───────────────────────────────────────────── */
const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)
const ExpandIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
  </svg>
)
const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)
const PrintIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 6 2 18 2 18 9"/>
    <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
    <rect x="6" y="14" width="12" height="8"/>
  </svg>
)
const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
  </svg>
)
const SaveIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
  </svg>
)
const CheckIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

/* ── Status badge colors ─────────────────────────────── */
const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  Draft:            { bg: 'var(--bg, #f1f5f9)', color: 'var(--text-secondary)' },
  Sent:             { bg: 'color-mix(in srgb, var(--accent) 10%, transparent)', color: 'var(--accent, #006AFF)' },
  Paid:             { bg: 'color-mix(in srgb, var(--accent) 10%, transparent)', color: 'var(--accent, #006AFF)' },
  Captured:         { bg: 'color-mix(in srgb, var(--accent) 10%, transparent)', color: 'var(--accent, #006AFF)' },
  Approved:         { bg: 'color-mix(in srgb, var(--accent) 10%, transparent)', color: 'var(--accent, #006AFF)' },
  Overdue:          { bg: 'color-mix(in srgb, var(--negative) 10%, transparent)', color: 'var(--negative, #ef4444)' },
  Failed:           { bg: 'color-mix(in srgb, var(--negative) 10%, transparent)', color: 'var(--negative, #ef4444)' },
  Expired:          { bg: 'color-mix(in srgb, var(--negative) 10%, transparent)', color: 'var(--negative, #ef4444)' },
  Pending:          { bg: 'color-mix(in srgb, var(--warning) 12%, transparent)', color: 'var(--warning, #f59e0b)' },
  'Partially Paid': { bg: 'color-mix(in srgb, var(--warning) 12%, transparent)', color: 'var(--warning, #f59e0b)' },
}

/* ═══ VIEW MODAL ═════════════════════════════════════ */
interface ViewProps {
  title: string
  subtitle?: string
  status?: string
  onClose: () => void
  onEdit?: () => void
  onPrint?: () => void
  children: ReactNode
}

export default function ViewModal({ title, subtitle, status, onClose, onEdit, onPrint, children }: ViewProps) {
  const sc = status ? STATUS_COLORS[status] || { bg: 'var(--bg, #f1f5f9)', color: 'var(--text-secondary)' } : null
  const { smoothThen } = useContext(ModalCtx)

  return (
    <ModalShell onClose={onClose} width={640}>
      {/* Header */}
      <div style={{
        padding: '22px 28px 18px',
        borderBottom: '1px solid var(--border, #e5e7eb)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font)', letterSpacing: -0.3 }}>{title}</span>
              {sc && (
                <span style={{
                  padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                  background: sc.bg, color: sc.color, letterSpacing: 0.2,
                }}>{status}</span>
              )}
            </div>
            {subtitle && (
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 3, fontFamily: 'var(--font)' }}>{subtitle}</div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
          {onPrint && (
            <button
              onClick={onPrint}
              title="Print / Save as PDF"
              style={{
                padding: 6, borderRadius: 8, background: 'transparent', border: 'none',
                cursor: 'pointer', color: 'var(--text-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'color 0.12s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              <PrintIcon />
            </button>
          )}
          {onEdit && (
            <button
              onClick={onEdit}
              title="Edit"
              style={{
                padding: 6, borderRadius: 8, background: 'transparent', border: 'none',
                cursor: 'pointer', color: 'var(--text-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'color 0.12s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              <EditIcon />
            </button>
          )}
          <button
            onClick={() => smoothThen(onClose)}
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
      </div>

      {/* Body */}
      <div style={{ padding: '22px 28px 28px', overflow: 'auto', flex: 1 }}>
        {children}
      </div>
    </ModalShell>
  )
}

/* ═══ EDIT MODAL ═════════════════════════════════════ */
interface EditProps {
  title: string
  onClose: () => void
  onSave: () => void
  onFullPage?: () => void
  onPrint?: () => void
  saving?: boolean
  width?: number
  children: ReactNode
}

export function EditModal({ title, onClose, onSave, onFullPage, onPrint, saving, width, children }: EditProps) {
  const { smoothThen } = useContext(ModalCtx)

  return (
    <ModalShell onClose={onClose} width={width ?? 740}>
      {/* Header */}
      <div style={{
        padding: '20px 28px 16px',
        borderBottom: '1px solid var(--border, #e5e7eb)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font)', letterSpacing: -0.3 }}>
          {title}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {onPrint && (
            <button
              onClick={onPrint}
              title="Print / Save as PDF"
              style={{
                padding: 6, borderRadius: 8, background: 'transparent', border: 'none',
                cursor: 'pointer', color: 'var(--text-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'color 0.12s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              <PrintIcon />
            </button>
          )}
          {onFullPage && (
            <button
              onClick={() => smoothThen(onFullPage)}
              title="Open full page"
              style={{
                padding: 6, borderRadius: 8, background: 'transparent', border: 'none',
                cursor: 'pointer', color: 'var(--text-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'color 0.12s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              <ExpandIcon />
            </button>
          )}
          <button
            onClick={() => smoothThen(onClose)}
            title="Close"
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
      </div>

      {/* Body */}
      <div style={{ padding: '22px 28px', overflow: 'auto', flex: 1 }}>
        {children}
      </div>

      {/* Footer */}
      <div style={{
        padding: '16px 28px',
        borderTop: '1px solid var(--border, #e5e7eb)',
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
      }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => smoothThen(onClose)}
            title="Cancel"
            style={{
              width: 34, height: 34, borderRadius: 8,
              background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border, #e5e7eb)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'color 0.12s, border-color 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--text-primary)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border, #e5e7eb)' }}
          >
            <CloseIcon />
          </button>
          <button
            onClick={onSave}
            disabled={!!saving}
            title={saving ? 'Saved!' : 'Save Changes'}
            style={{
              width: 34, height: 34, borderRadius: 8,
              background: saving ? 'rgba(0,106,255,0.12)' : 'var(--accent, #006AFF)',
              color: saving ? 'var(--accent, #006AFF)' : '#fff',
              border: 'none', cursor: saving ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { if (!saving) e.currentTarget.style.background = '#006AFF' }}
            onMouseLeave={e => { if (!saving) e.currentTarget.style.background = '#006AFF' }}
          >
            {saving ? <CheckIcon /> : <SaveIcon />}
          </button>
        </div>
      </div>
    </ModalShell>
  )
}

/* ── Section header ──────────────────────────────────── */
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8,
      color: 'var(--text-muted)', marginBottom: 12, paddingBottom: 8,
      borderBottom: '2px solid var(--border, #e5e7eb)',
    }}>
      {children}
    </div>
  )
}

/* ── View row ────────────────────────────────────────── */
export function ViewRow({ label, value, accent, badge }: { label: string; value: React.ReactNode; accent?: boolean; badge?: string }) {
  const sc = badge ? STATUS_COLORS[badge] || null : null
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '9px 0',
      borderBottom: '1px solid color-mix(in srgb, var(--border, #e5e7eb) 50%, transparent)',
    }}>
      <span style={{ fontSize: 12.5, color: 'var(--text-muted)', fontFamily: 'var(--font)' }}>{label}</span>
      {sc ? (
        <span style={{
          padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600,
          background: sc.bg, color: sc.color,
        }}>{badge}</span>
      ) : (
        <span style={{
          fontSize: 13, fontWeight: accent ? 600 : 500,
          color: accent ? 'var(--accent)' : 'var(--text-primary)',
          fontFamily: 'var(--font)',
        }}>{value}</span>
      )}
    </div>
  )
}
