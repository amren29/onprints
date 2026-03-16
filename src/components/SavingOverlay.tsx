'use client'

const SpinnerIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
  </svg>
)

const OVERLAY_CSS = `
@keyframes soSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes soFadeIn { from { opacity: 0; } to { opacity: 1; } }
`

/**
 * Full-screen saving overlay with spinner. Usage: {saving && <SavingOverlay message="Creating order…" />}
 */
export default function SavingOverlay({ message = 'Saving…' }: { message?: string }) {
  return (
    <>
      <style suppressHydrationWarning>{OVERLAY_CSS}</style>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 998,
        background: 'rgba(0,0,0,0.08)', backdropFilter: 'blur(1px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'soFadeIn 0.2s ease',
      }}>
        <div style={{
          background: 'var(--bg-card)', borderRadius: 14, padding: '20px 28px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
          display: 'flex', alignItems: 'center', gap: 12,
          border: '1px solid var(--border)',
        }}>
          <div style={{ animation: 'soSpin 0.8s linear infinite', display: 'flex', color: 'var(--accent)' }}><SpinnerIcon /></div>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>{message}</span>
        </div>
      </div>
    </>
  )
}
