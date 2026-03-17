'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

/* ── Icons ───────────────────────────────────────────── */
const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
)
const EyeOffIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
)
const CheckIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
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
    { label: 'Weak', color: '#ef4444' },
    { label: 'Fair', color: '#f59e0b' },
    { label: 'Good', color: '#3b82f6' },
    { label: 'Strong', color: '#22c55e' },
  ]
  return { score, ...map[score] }
}

/* ── Feature list on the right ───────────────────────── */
const FEATURES = [
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
      </svg>
    ),
    title: 'Order management',
    desc: 'Track every job from quote to delivery.',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
      </svg>
    ),
    title: 'Finance suite',
    desc: 'Payments, wallet, and financial tracking in one view.',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="5" height="11" rx="1"/><rect x="10" y="7" width="5" height="7" rx="1"/><rect x="17" y="5" width="4" height="9" rx="1"/>
        <line x1="3" y1="21" x2="21" y2="21"/>
      </svg>
    ),
    title: 'Production board',
    desc: 'Kanban-style workflow for your press floor.',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
    title: 'Live analytics',
    desc: 'Revenue trends and top-customer insights.',
  },
]

/* ── Animated bubble CSS ─────────────────────────────── */
const BUBBLE_CSS = `
  @keyframes bubbleFloat1 {
    0%, 100% { transform: translate(0, 0) scale(1); }
    33%  { transform: translate(25px, -30px) scale(1.05); }
    66%  { transform: translate(-15px, -15px) scale(0.97); }
  }
  @keyframes bubbleFloat2 {
    0%, 100% { transform: translate(0, 0) scale(1); }
    33%  { transform: translate(-20px, 25px) scale(0.95); }
    66%  { transform: translate(18px, 10px) scale(1.03); }
  }
  @keyframes bubbleFloat3 {
    0%, 100% { transform: translate(0, 0) scale(1); }
    50%  { transform: translate(15px, 20px) scale(1.06); }
  }
`

/* ── Page ────────────────────────────────────────────── */
export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [showPw, setShowPw] = useState(false)
  const [showCf, setShowCf] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const router = useRouter()

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }))

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Full name is required.'
    if (!form.email.trim()) e.email = 'Email is required.'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email.'
    if (!form.password) e.password = 'Password is required.'
    else if (form.password.length < 8) e.password = 'Password must be at least 8 characters.'
    if (!form.confirm) e.confirm = 'Please confirm your password.'
    else if (form.confirm !== form.password) e.confirm = 'Passwords do not match.'
    if (!agreed) e.agreed = 'You must accept the terms to continue.'
    return e
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setLoading(true)
    try {
      const { signUp } = await import('@/lib/auth-actions')
      const result = await signUp({
        name: form.name,
        email: form.email,
        password: form.password,
      })
      if (result.error) {
        setErrors({ form: result.error })
        setLoading(false)
        return
      }
      // Store email for OTP verification page
      localStorage.setItem('sp_verify_email', form.email)
      router.push('/verify-email')
    } catch {
      setErrors({ form: 'Something went wrong. Please try again.' })
      setLoading(false)
    }
  }

  const strength = passwordStrength(form.password)

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
      <style>{BUBBLE_CSS}</style>
      <div style={{
        width: '100%',
        maxWidth: 960,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(15,23,42,0.12), 0 4px 16px rgba(15,23,42,0.06)',
        minHeight: 620,
      }}>

        {/* ── LEFT — Form ── */}
        <div style={{
          background: '#ffffff',
          padding: '44px 52px',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 }}>
            <div style={{
              width: 34, height: 34,
              background: '#006AFF',
              borderRadius: 9,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
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
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: '0 0 8px', letterSpacing: '-0.5px' }}>
              Create your account
            </h1>
            <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
              Get started — it only takes a minute.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Full name */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }}>
                Full Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={set('name')}
                placeholder="Ahmad Razali"
                style={inputStyle(!!errors.name)}
                onFocus={e => { e.target.style.borderColor = '#006AFF'; e.target.style.background = '#fff' }}
                onBlur={e => { e.target.style.borderColor = errors.name ? '#ef4444' : '#e2e8f0'; e.target.style.background = '#f8fafc' }}
              />
              {errors.name && <p style={{ fontSize: 12, color: '#ef4444', margin: '4px 0 0' }}>{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }}>
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={set('email')}
                placeholder="you@company.com"
                style={inputStyle(!!errors.email)}
                onFocus={e => { e.target.style.borderColor = '#006AFF'; e.target.style.background = '#fff' }}
                onBlur={e => { e.target.style.borderColor = errors.email ? '#ef4444' : '#e2e8f0'; e.target.style.background = '#f8fafc' }}
              />
              {errors.email && <p style={{ fontSize: 12, color: '#ef4444', margin: '4px 0 0' }}>{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
                  placeholder="Min. 8 characters"
                  style={{ ...inputStyle(!!errors.password), paddingRight: 40 }}
                  onFocus={e => { e.target.style.borderColor = '#006AFF'; e.target.style.background = '#fff' }}
                  onBlur={e => { e.target.style.borderColor = errors.password ? '#ef4444' : '#e2e8f0'; e.target.style.background = '#f8fafc' }}
                />
                <button type="button" onClick={() => setShowPw(v => !v)} style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8',
                  padding: 2, display: 'flex', alignItems: 'center',
                }}>
                  {showPw ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {/* Strength bar */}
              {form.password && (
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
                  value={form.confirm}
                  onChange={set('confirm')}
                  placeholder="Re-enter password"
                  style={{ ...inputStyle(!!errors.confirm), paddingRight: 40 }}
                  onFocus={e => { e.target.style.borderColor = '#006AFF'; e.target.style.background = '#fff' }}
                  onBlur={e => { e.target.style.borderColor = errors.confirm ? '#ef4444' : '#e2e8f0'; e.target.style.background = '#f8fafc' }}
                />
                <button type="button" onClick={() => setShowCf(v => !v)} style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8',
                  padding: 2, display: 'flex', alignItems: 'center',
                }}>
                  {showCf ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {errors.confirm && <p style={{ fontSize: 12, color: '#ef4444', margin: '4px 0 0' }}>{errors.confirm}</p>}
            </div>

            {/* Terms */}
            <div>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                <div
                  onClick={() => setAgreed(v => !v)}
                  style={{
                    width: 16, height: 16, borderRadius: 4, flexShrink: 0, marginTop: 1,
                    border: `1.5px solid ${errors.agreed ? '#ef4444' : agreed ? '#006AFF' : '#cbd5e1'}`,
                    background: agreed ? '#006AFF' : '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s', cursor: 'pointer',
                  }}
                >
                  {agreed && <CheckIcon />}
                </div>
                <span style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
                  I agree to the{' '}
                  <Link href="/terms" style={{ color: '#006AFF', fontWeight: 500, textDecoration: 'none' }}>Terms of Service</Link>
                  {' '}and{' '}
                  <Link href="/privacy" style={{ color: '#006AFF', fontWeight: 500, textDecoration: 'none' }}>Privacy Policy</Link>.
                </span>
              </label>
              {errors.agreed && <p style={{ fontSize: 12, color: '#ef4444', margin: '4px 0 0 26px' }}>{errors.agreed}</p>}
            </div>

            {/* Form-level error */}
            {errors.form && (
              <div style={{ fontSize: 13, color: '#ef4444', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px' }}>
                {errors.form}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '11px',
                background: loading ? '#338bff' : '#006AFF',
                color: '#fff', border: 'none',
                borderRadius: 8, fontSize: 14, fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                transition: 'background 0.15s',
                letterSpacing: '0.1px',
                marginTop: 2,
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#005ce6' }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#006AFF' }}
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          {/* Login link */}
          <div style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: '#64748b' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: '#006AFF', fontWeight: 600, textDecoration: 'none' }}>
              Log In
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
          gap: 36,
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Animated bubbles */}
          <div style={{ position: 'absolute', top: -80, right: -80, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none', animation: 'bubbleFloat1 8s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', bottom: -60, left: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none', animation: 'bubbleFloat2 10s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', top: '40%', left: '50%', width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none', animation: 'bubbleFloat3 12s ease-in-out infinite' }} />

          {/* Tagline */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 style={{
              fontSize: 30, fontWeight: 800, color: '#ffffff',
              margin: '0 0 14px', lineHeight: 1.25, letterSpacing: '-0.5px',
            }}>
              Everything your print shop needs.
            </h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.72)', margin: 0, lineHeight: 1.6 }}>
              Join hundreds of print shops managing orders, finances, and production — all from one dashboard.
            </p>
          </div>

          {/* Feature cards */}
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {FEATURES.map(f => (
              <div key={f.title} style={{
                display: 'flex', alignItems: 'flex-start', gap: 14,
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 12, padding: '14px 16px',
                backdropFilter: 'blur(4px)',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                  background: 'rgba(255,255,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {f.icon}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 3 }}>{f.title}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
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
