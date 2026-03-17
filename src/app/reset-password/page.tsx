'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

/* ── View states ─────────────────────────────────────── */
type View = 'request' | 'sent' | 'reset' | 'success'

/* ── Icons ───────────────────────────────────────────── */
const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
)
const EyeOffIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
)

/* ── Password strength ───────────────────────────────── */
function passwordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: '#e2e8f0' }
  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  const map = [
    { label: 'Too short', color: '#ef4444' },
    { label: 'Weak',      color: '#ef4444' },
    { label: 'Fair',      color: '#f59e0b' },
    { label: 'Good',      color: '#3b82f6' },
    { label: 'Strong',    color: '#22c55e' },
  ]
  return { score, ...map[score] }
}

/* ── Right panel — request / sent ────────────────────── */
function SecurityIllustration({ sent }: { sent: boolean }) {
  const steps = [
    'Enter your registered email address.',
    'Click the reset link in your inbox.',
    'Set a new, strong password and sign in.',
  ]
  return (
    <div style={{
      background: 'rgba(255,255,255,0.08)',
      border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: 16, padding: 28,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24,
    }}>
      {/* Icon circle */}
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        background: sent ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.12)',
        border: '2px solid rgba(255,255,255,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.3s',
      }}>
        {sent ? (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
        ) : (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0110 0v4"/>
          </svg>
        )}
      </div>

      {/* Steps */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {steps.map((text, i) => {
          const done = sent && i === 0
          const active = (!sent && i === 0) || (sent && i === 1)
          const dim = (!sent && i > 0) || (sent && i > 1)
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, opacity: dim ? 0.4 : 1, transition: 'opacity 0.3s' }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                background: done || active ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700,
                color: done || active ? '#006AFF' : 'rgba(255,255,255,0.7)',
              }}>
                {done ? (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#006AFF" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : i + 1}
              </div>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.82)', lineHeight: 1.5, paddingTop: 3 }}>
                {text}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Right panel — reset / success ───────────────────── */
function PasswordTipsCard({ success }: { success: boolean }) {
  const tips = [
    {
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>
        </svg>
      ),
      text: 'At least 8 characters long',
    },
    {
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
          <line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
        </svg>
      ),
      text: 'Mix of upper and lowercase letters',
    },
    {
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2"/>
          <path d="M7 11V7a5 5 0 0110 0v4"/>
        </svg>
      ),
      text: 'At least one number or symbol',
    },
  ]
  return (
    <div style={{
      background: 'rgba(255,255,255,0.08)',
      border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: 16, padding: 24,
    }}>
      {success ? (
        /* Success state */
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '12px 0' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'rgba(34,197,94,0.2)',
            border: '2px solid rgba(34,197,94,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 6 }}>All done!</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>
              Your account is secured with your new password. Redirecting to login…
            </div>
          </div>
        </div>
      ) : (
        /* Tips state */
        <>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 14 }}>
            Password tips
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {tips.map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: 'rgba(255,255,255,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {t.icon}
                </div>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.78)', lineHeight: 1.4 }}>{t.text}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/* ── inputStyle factory ──────────────────────────────── */
const inputStyle = (hasError: boolean): React.CSSProperties => ({
  width: '100%', boxSizing: 'border-box',
  padding: '10px 14px',
  fontSize: 14, color: '#0f172a',
  background: '#f8fafc',
  border: `1.5px solid ${hasError ? '#ef4444' : '#e2e8f0'}`,
  borderRadius: 8, outline: 'none',
  fontFamily: 'inherit',
  transition: 'border-color 0.15s, background 0.15s',
})

/* ── Page ────────────────────────────────────────────── */
export default function ResetPasswordPage() {
  const router = useRouter()

  const [view, setView] = useState<View>('request')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showCf, setShowCf] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [resendCooldown, setResendCooldown] = useState(0)

  /* Detect Supabase recovery token in URL (avoids useSearchParams + Suspense) */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const hash = window.location.hash
    if (params.get('code') || hash.includes('type=recovery')) {
      setView('reset')
    }
  }, [])

  /* Resend cooldown ticker */
  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  /* Auto-redirect after success */
  useEffect(() => {
    if (view !== 'success') return
    const t = setTimeout(() => router.push('/login'), 2500)
    return () => clearTimeout(t)
  }, [view, router])

  /* ── Handlers ── */
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!email.trim()) errs.email = 'Email is required.'
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Enter a valid email address.'
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setLoading(true)
    try {
      const { resetPassword } = await import('@/lib/auth-actions')
      const result = await resetPassword(email)
      if (result.error) {
        setErrors({ email: result.error })
        setLoading(false)
        return
      }
      setResendCooldown(60)
      setView('sent')
    } catch {
      setErrors({ email: 'Something went wrong. Please try again.' })
    }
    setLoading(false)
  }

  const handleResend = async () => {
    if (resendCooldown > 0) return
    setLoading(true)
    try {
      const { resetPassword } = await import('@/lib/auth-actions')
      await resetPassword(email)
    } catch { /* ignore */ }
    setLoading(false)
    setResendCooldown(60)
  }

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!password) errs.password = 'Password is required.'
    else if (password.length < 8) errs.password = 'Password must be at least 8 characters.'
    if (!confirm) errs.confirm = 'Please confirm your new password.'
    else if (confirm !== password) errs.confirm = 'Passwords do not match.'
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setLoading(true)
    try {
      const { updatePassword } = await import('@/lib/auth-actions')
      const result = await updatePassword(password)
      if (result.error) {
        setErrors({ password: result.error })
        setLoading(false)
        return
      }
      setView('success')
    } catch {
      setErrors({ password: 'Something went wrong. Please try again.' })
    }
    setLoading(false)
  }

  const strength = passwordStrength(password)

  const ctaBtn = (label: string, disabled = false): React.CSSProperties => ({
    width: '100%', padding: '11px',
    background: disabled ? '#338bff' : '#006AFF',
    color: '#fff', border: 'none',
    borderRadius: 8, fontSize: 14, fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit',
    transition: 'background 0.15s', letterSpacing: '0.1px',
  })

  /* ── Right panel copy ── */
  const RIGHT: Record<View, { title: string; sub: string }> = {
    request: { title: 'Forgot your password?',    sub: 'No worries — it happens. We\'ll send you a secure link to reset it.' },
    sent:    { title: 'Check your inbox.',         sub: 'A reset link has been sent. It expires in 60 minutes.' },
    reset:   { title: 'Almost there.',             sub: 'Choose a strong password you haven\'t used before.' },
    success: { title: 'You\'re all set.',           sub: 'Your password has been updated. Taking you back to login now.' },
  }

  /* ── Badge icon per view ── */
  const BadgeIcon = () => {
    if (view === 'sent') return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
        <polyline points="22,6 12,13 2,6"/>
      </svg>
    )
    if (view === 'success') return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    )
    if (view === 'reset') return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#006AFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    )
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#006AFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0110 0v4"/>
      </svg>
    )
  }

  const isGreen = view === 'sent' || view === 'success'
  const badgeBg = isGreen ? '#f0fdf4' : '#eff6ff'
  const badgeBorder = isGreen ? '#bbf7d0' : '#dbeafe'

  /* ── Render ── */
  return (
    <div style={{
      minHeight: '100vh', background: '#f0f0f3',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    }}>
      <div style={{
        width: '100%', maxWidth: 960,
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        borderRadius: 20, overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(15,23,42,0.12), 0 4px 16px rgba(15,23,42,0.06)',
        minHeight: 560,
      }}>

        {/* ── LEFT panel ── */}
        <div style={{ background: '#fff', padding: '48px 52px', display: 'flex', flexDirection: 'column' }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 48 }}>
            <div style={{
              width: 34, height: 34, background: '#006AFF', borderRadius: 9,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="7" height="7" rx="1.5" fill="white"/>
                <rect x="14" y="3" width="7" height="7" rx="1.5" fill="white" opacity="0.7"/>
                <rect x="3" y="14" width="7" height="7" rx="1.5" fill="white" opacity="0.7"/>
                <rect x="14" y="14" width="7" height="7" rx="1.5" fill="white" opacity="0.4"/>
              </svg>
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.3px' }}>OnPrints</span>
          </div>

          {/* Badge icon */}
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: badgeBg, border: `1px solid ${badgeBorder}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 20, transition: 'background 0.3s, border-color 0.3s',
          }}>
            <BadgeIcon />
          </div>

          {/* ─────── VIEW: request ─────── */}
          {view === 'request' && (
            <>
              <div style={{ marginBottom: 32 }}>
                <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: '0 0 8px', letterSpacing: '-0.5px' }}>
                  Reset your password
                </h1>
                <p style={{ fontSize: 14, color: '#64748b', margin: 0, lineHeight: 1.6 }}>
                  Enter your email and we&apos;ll send you a link to reset your password.
                </p>
              </div>

              <form onSubmit={handleRequestReset} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setErrors({}) }}
                    placeholder="you@company.com"
                    autoFocus
                    style={inputStyle(!!errors.email)}
                    onFocus={e => { e.target.style.borderColor = '#006AFF'; e.target.style.background = '#fff' }}
                    onBlur={e => { e.target.style.borderColor = errors.email ? '#ef4444' : '#e2e8f0'; e.target.style.background = '#f8fafc' }}
                  />
                  {errors.email && <p style={{ fontSize: 12, color: '#ef4444', margin: '4px 0 0' }}>{errors.email}</p>}
                </div>

                <div style={{ flex: 1 }} />

                <button
                  type="submit"
                  disabled={loading}
                  style={ctaBtn('Send Reset Link', loading)}
                  onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#005ce6' }}
                  onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#006AFF' }}
                >
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>
            </>
          )}

          {/* ─────── VIEW: sent ─────── */}
          {view === 'sent' && (
            <>
              <div style={{ marginBottom: 32 }}>
                <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: '0 0 8px', letterSpacing: '-0.5px' }}>
                  Check your email
                </h1>
                <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 16px', lineHeight: 1.6 }}>
                  We sent a reset link to{' '}
                  <strong style={{ color: '#0f172a', fontWeight: 600 }}>{email}</strong>.
                  {' '}It expires in 60 minutes.
                </p>

                {/* Email preview pill */}
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: '#f8fafc', border: '1px solid #e2e8f0',
                  borderRadius: 8, padding: '8px 14px',
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  <span style={{ fontSize: 13, color: '#374151' }}>{email}</span>
                  <button
                    type="button"
                    onClick={() => { setView('request'); setErrors({}) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#006AFF', fontFamily: 'inherit', padding: 0, fontWeight: 500 }}
                  >
                    Change
                  </button>
                </div>
              </div>

              <div style={{ flex: 1 }} />

              <div style={{ textAlign: 'center', fontSize: 13, color: '#64748b' }}>
                Didn&apos;t receive it?{' '}
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0}
                  style={{
                    background: 'none', border: 'none', padding: 0,
                    fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                    color: resendCooldown > 0 ? '#94a3b8' : '#006AFF',
                    cursor: resendCooldown > 0 ? 'default' : 'pointer',
                  }}
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend email'}
                </button>
              </div>
            </>
          )}

          {/* ─────── VIEW: reset ─────── */}
          {view === 'reset' && (
            <>
              <div style={{ marginBottom: 28 }}>
                <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: '0 0 8px', letterSpacing: '-0.5px' }}>
                  Create new password
                </h1>
                <p style={{ fontSize: 14, color: '#64748b', margin: 0, lineHeight: 1.6 }}>
                  Must be different from your previously used passwords.
                </p>
              </div>

              <form onSubmit={handleSetPassword} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* New password */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }}>
                    New Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => { setPassword(e.target.value); setErrors(err => ({ ...err, password: '' })) }}
                      placeholder="Min. 8 characters"
                      style={{ ...inputStyle(!!errors.password), paddingRight: 40 }}
                      onFocus={e => { e.target.style.borderColor = '#006AFF'; e.target.style.background = '#fff' }}
                      onBlur={e => { e.target.style.borderColor = errors.password ? '#ef4444' : '#e2e8f0'; e.target.style.background = '#f8fafc' }}
                    />
                    <button type="button" onClick={() => setShowPw(v => !v)} style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#94a3b8', padding: 2, display: 'flex', alignItems: 'center',
                    }}>
                      {showPw ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                  {/* Strength bar */}
                  {password && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                        {[1, 2, 3, 4].map(i => (
                          <div key={i} style={{
                            flex: 1, height: 3, borderRadius: 2,
                            background: i <= strength.score ? strength.color : '#e2e8f0',
                            transition: 'background 0.2s',
                          }} />
                        ))}
                      </div>
                      <span style={{ fontSize: 11, color: strength.color, fontWeight: 500 }}>{strength.label}</span>
                    </div>
                  )}
                  {errors.password && <p style={{ fontSize: 12, color: '#ef4444', margin: '4px 0 0' }}>{errors.password}</p>}
                </div>

                {/* Confirm password */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }}>
                    Confirm Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showCf ? 'text' : 'password'}
                      value={confirm}
                      onChange={e => { setConfirm(e.target.value); setErrors(err => ({ ...err, confirm: '' })) }}
                      placeholder="Re-enter new password"
                      style={{ ...inputStyle(!!errors.confirm), paddingRight: 40 }}
                      onFocus={e => { e.target.style.borderColor = '#006AFF'; e.target.style.background = '#fff' }}
                      onBlur={e => { e.target.style.borderColor = errors.confirm ? '#ef4444' : '#e2e8f0'; e.target.style.background = '#f8fafc' }}
                    />
                    <button type="button" onClick={() => setShowCf(v => !v)} style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#94a3b8', padding: 2, display: 'flex', alignItems: 'center',
                    }}>
                      {showCf ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                  {errors.confirm && <p style={{ fontSize: 12, color: '#ef4444', margin: '4px 0 0' }}>{errors.confirm}</p>}
                </div>

                <div style={{ flex: 1 }} />

                <button
                  type="submit"
                  disabled={loading}
                  style={ctaBtn('Update Password', loading)}
                  onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#005ce6' }}
                  onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#006AFF' }}
                >
                  {loading ? 'Updating…' : 'Update Password'}
                </button>
              </form>
            </>
          )}

          {/* ─────── VIEW: success ─────── */}
          {view === 'success' && (
            <>
              <div style={{ marginBottom: 32 }}>
                <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: '0 0 8px', letterSpacing: '-0.5px' }}>
                  Password updated!
                </h1>
                <p style={{ fontSize: 14, color: '#64748b', margin: 0, lineHeight: 1.6 }}>
                  Your password has been changed successfully. You&apos;re being redirected to login.
                </p>
              </div>

              {/* Progress bar */}
              <div style={{ marginBottom: 32 }}>
                <div style={{ height: 4, borderRadius: 2, background: '#e2e8f0', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', background: '#22c55e', borderRadius: 2,
                    animation: 'progressBar 2.5s linear forwards',
                  }} />
                </div>
                <style>{`@keyframes progressBar { from { width: 0% } to { width: 100% } }`}</style>
              </div>

              <div style={{ flex: 1 }} />

              <button
                onClick={() => router.push('/login')}
                style={ctaBtn('Go to Login')}
                onMouseEnter={e => e.currentTarget.style.background = '#005ce6'}
                onMouseLeave={e => e.currentTarget.style.background = '#006AFF'}
              >
                Go to Login
              </button>
            </>
          )}

          {/* Back to login — all views except success */}
          {view !== 'success' && (
            <div style={{ marginTop: 28, textAlign: 'center' }}>
              <Link href="/login" style={{
                color: '#64748b', textDecoration: 'none', fontWeight: 500,
                fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 5,
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
                Back to login
              </Link>
            </div>
          )}
        </div>

        {/* ── RIGHT panel ── */}
        <div style={{
          background: 'linear-gradient(140deg, #0055d4 0%, #006AFF 45%, #338bff 100%)',
          padding: '52px 44px',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 28,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -80, right: -80, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -60, left: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: '#fff', margin: '0 0 14px', lineHeight: 1.25, letterSpacing: '-0.5px' }}>
              {RIGHT[view].title}
            </h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.72)', margin: 0, lineHeight: 1.6 }}>
              {RIGHT[view].sub}
            </p>
          </div>

          <div style={{ position: 'relative', zIndex: 1 }}>
            {(view === 'request' || view === 'sent') && (
              <SecurityIllustration sent={view === 'sent'} />
            )}
            {(view === 'reset' || view === 'success') && (
              <PasswordTipsCard success={view === 'success'} />
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 32px', fontSize: 12, color: '#94a3b8', pointerEvents: 'none',
      }}>
        <span>Copyright © 2026 OnPrints</span>
        <span style={{ pointerEvents: 'all' }}>
          <Link href="/privacy" style={{ color: '#94a3b8', textDecoration: 'none' }}>Privacy Policy</Link>
        </span>
      </div>
    </div>
  )
}
