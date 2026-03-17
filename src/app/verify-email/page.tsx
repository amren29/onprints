'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const OTP_LENGTH = 8

/* ── Mail illustration ───────────────────────────────── */
function MailIllustration() {
  return (
    <div style={{ position: 'relative', zIndex: 1 }}>
      <div style={{
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 16,
        padding: 32,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
      }}>
        {/* Envelope SVG */}
        <div style={{
          width: 80, height: 80,
          background: 'rgba(255,255,255,0.12)',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
        </div>

        {/* OTP preview boxes */}
        <div style={{ display: 'flex', gap: 8 }}>
          {['2', '4', '•', '•', '•', '•', '•', '•'].map((d, i) => (
            <div key={i} style={{
              width: 36, height: 42,
              background: i < 2 ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
              border: `1.5px solid ${i < 2 ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)'}`,
              borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: i < 2 ? 16 : 20,
              fontWeight: 700,
              color: i < 2 ? '#fff' : 'rgba(255,255,255,0.3)',
              fontFamily: 'Inter, monospace',
            }}>
              {d}
            </div>
          ))}
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
          {[
            { n: '1', text: 'Check your inbox for the 6-digit code.' },
            { n: '2', text: 'Enter the code within 10 minutes.' },
            { n: '3', text: 'You\'ll be redirected to set up your workspace.' },
          ].map(s => (
            <div key={s.n} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                background: 'rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: '#fff',
              }}>
                {s.n}
              </div>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.72)', lineHeight: 1.5 }}>{s.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Page ────────────────────────────────────────────── */
export default function VerifyEmailPage() {
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resendCooldown, setResendCooldown] = useState(60)
  const [resending, setResending] = useState(false)
  const inputs = useRef<(HTMLInputElement | null)[]>([])
  const router = useRouter()

  /* Countdown timer */
  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  const focusAt = useCallback((i: number) => {
    inputs.current[i]?.focus()
  }, [])

  const handleChange = (i: number, val: string) => {
    const char = val.replace(/\D/g, '').slice(-1)
    const next = [...otp]
    next[i] = char
    setOtp(next)
    setError('')
    if (char && i < OTP_LENGTH - 1) focusAt(i + 1)
  }

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (otp[i]) {
        const next = [...otp]; next[i] = ''; setOtp(next)
      } else if (i > 0) {
        const next = [...otp]; next[i - 1] = ''; setOtp(next)
        focusAt(i - 1)
      }
    } else if (e.key === 'ArrowLeft' && i > 0) {
      focusAt(i - 1)
    } else if (e.key === 'ArrowRight' && i < OTP_LENGTH - 1) {
      focusAt(i + 1)
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (!pasted) return
    const next = [...otp]
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i]
    setOtp(next)
    focusAt(Math.min(pasted.length, OTP_LENGTH - 1))
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    const code = otp.join('')
    if (code.length < OTP_LENGTH) { setError('Please enter all 6 digits.'); return }
    setError('')
    setLoading(true)
    try {
      const { verifyOtp } = await import('@/lib/auth-actions')
      const storedEmail = typeof window !== 'undefined' ? localStorage.getItem('sp_verify_email') || '' : ''
      const result = await verifyOtp(storedEmail, code)
      if (result.error) {
        setError(result.error)
        setLoading(false)
        return
      }
      router.push('/onboarding')
    } catch {
      setError('Verification failed. Please try again.')
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendCooldown > 0) return
    setResending(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const storedEmail = typeof window !== 'undefined' ? localStorage.getItem('sp_verify_email') || '' : ''
      await supabase.auth.resend({ type: 'signup', email: storedEmail })
    } catch { /* ignore */ }
    setResending(false)
    setResendCooldown(60)
    setOtp(Array(OTP_LENGTH).fill(''))
    focusAt(0)
  }

  const filled = otp.filter(Boolean).length

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f0f0f3',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 960,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(15,23,42,0.12), 0 4px 16px rgba(15,23,42,0.06)',
        minHeight: 560,
      }}>

        {/* ── LEFT — OTP form ── */}
        <div style={{
          background: '#ffffff',
          padding: '48px 52px',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 52 }}>
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

          {/* Heading */}
          <div style={{ marginBottom: 36 }}>
            {/* Mail icon badge */}
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: '#eff6ff', border: '1px solid #dbeafe',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 20,
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#006AFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: '0 0 8px', letterSpacing: '-0.5px' }}>
              Check your email
            </h1>
            <p style={{ fontSize: 14, color: '#64748b', margin: 0, lineHeight: 1.6 }}>
              We sent a 6-digit verification code to your email. Enter it below to confirm your account.
            </p>
          </div>

          {/* OTP inputs */}
          <form onSubmit={handleVerify} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 8 }} onPaste={handlePaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={el => { inputs.current[i] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  onFocus={e => e.target.select()}
                  style={{
                    width: 52, height: 60,
                    textAlign: 'center',
                    fontSize: 22, fontWeight: 700, color: '#0f172a',
                    background: digit ? '#eff6ff' : '#f8fafc',
                    border: `2px solid ${error ? '#ef4444' : digit ? '#006AFF' : '#e2e8f0'}`,
                    borderRadius: 10, outline: 'none',
                    fontFamily: 'Inter, monospace',
                    caretColor: '#006AFF',
                    transition: 'border-color 0.15s, background 0.15s',
                    cursor: 'text',
                  }}
                  onFocusCapture={e => { e.target.style.borderColor = '#006AFF' }}
                  onBlur={e => { e.target.style.borderColor = digit ? '#006AFF' : error ? '#ef4444' : '#e2e8f0' }}
                  autoFocus={i === 0}
                />
              ))}
            </div>

            {/* Progress hint */}
            <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 4px' }}>
              {filled === 0 ? 'Enter the 6-digit code' : filled < OTP_LENGTH ? `${filled} of ${OTP_LENGTH} digits entered` : 'Code complete — ready to verify'}
            </p>

            {/* Error */}
            {error && (
              <div style={{
                fontSize: 13, color: '#ef4444',
                background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: 8, padding: '8px 12px', marginBottom: 4,
              }}>
                {error}
              </div>
            )}

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Verify button */}
            <button
              type="submit"
              disabled={loading || filled < OTP_LENGTH}
              style={{
                width: '100%', padding: '11px',
                background: filled < OTP_LENGTH ? '#e2e8f0' : loading ? '#338bff' : '#006AFF',
                color: filled < OTP_LENGTH ? '#94a3b8' : '#fff',
                border: 'none', borderRadius: 8,
                fontSize: 14, fontWeight: 600,
                cursor: filled < OTP_LENGTH || loading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                transition: 'background 0.15s, color 0.15s',
                letterSpacing: '0.1px',
                marginBottom: 14,
              }}
              onMouseEnter={e => { if (filled === OTP_LENGTH && !loading) e.currentTarget.style.background = '#005ce6' }}
              onMouseLeave={e => { if (filled === OTP_LENGTH && !loading) e.currentTarget.style.background = '#006AFF' }}
            >
              {loading ? 'Verifying…' : 'Verify Email'}
            </button>

            {/* Resend */}
            <div style={{ textAlign: 'center', fontSize: 13, color: '#64748b' }}>
              Didn&apos;t receive a code?{' '}
              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0 || resending}
                style={{
                  background: 'none', border: 'none', padding: 0,
                  fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                  color: resendCooldown > 0 ? '#94a3b8' : '#006AFF',
                  cursor: resendCooldown > 0 ? 'default' : 'pointer',
                }}
              >
                {resending ? 'Sending…' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
              </button>
            </div>
          </form>

          {/* Back to login */}
          <div style={{ marginTop: 28, textAlign: 'center', fontSize: 13, color: '#64748b' }}>
            <Link href="/login" style={{
              color: '#64748b', textDecoration: 'none', fontWeight: 500,
              display: 'inline-flex', alignItems: 'center', gap: 5,
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Back to login
            </Link>
          </div>
        </div>

        {/* ── RIGHT — Brand panel ── */}
        <div style={{
          background: 'linear-gradient(140deg, #0055d4 0%, #006AFF 45%, #338bff 100%)',
          padding: '52px 44px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 28,
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Decorative circles */}
          <div style={{
            position: 'absolute', top: -80, right: -80,
            width: 300, height: 300, borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)', pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', bottom: -60, left: -60,
            width: 220, height: 220, borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)', pointerEvents: 'none',
          }} />

          {/* Tagline */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 style={{
              fontSize: 28, fontWeight: 800, color: '#ffffff',
              margin: '0 0 14px', lineHeight: 1.25, letterSpacing: '-0.5px',
            }}>
              One step away from your dashboard.
            </h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.72)', margin: 0, lineHeight: 1.6 }}>
              Verify your email to unlock full access to your print shop workspace. The code expires in 10 minutes.
            </p>
          </div>

          {/* Illustration */}
          <MailIllustration />
        </div>
      </div>

      {/* Footer */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 32px',
        fontSize: 12, color: '#94a3b8',
        pointerEvents: 'none',
      }}>
        <span>Copyright © 2026 OnPrints</span>
        <span style={{ pointerEvents: 'all' }}>
          <Link href="/privacy" style={{ color: '#94a3b8', textDecoration: 'none' }}>Privacy Policy</Link>
        </span>
      </div>
    </div>
  )
}
