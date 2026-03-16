'use client'

import { useState, useEffect } from 'react'
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
const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
)
const AppleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
  </svg>
)

/* ── Animated CSS for slider + bubbles ──────────────── */
const SLIDER_CSS = `
  @keyframes slideFadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
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

/* ── Feature slide data ─────────────────────────────── */
const SLIDES = [
  {
    title: 'Effortlessly manage your print shop.',
    desc: 'Access your dashboard, manage orders, track payments, and stay on top of every job — all in one place.',
    mockup: 'dashboard',
  },
  {
    title: 'Smart production board.',
    desc: 'Track every job through your production pipeline with a Kanban-style board your team will love.',
    mockup: 'kanban',
  },
  {
    title: 'Your own online store.',
    desc: 'Let customers browse products, upload artwork, and place orders 24/7 with your branded storefront.',
    mockup: 'store',
  },
  {
    title: 'Complete finance suite.',
    desc: 'Invoices, payments, wallet top-ups, and financial reports — all connected to your orders.',
    mockup: 'finance',
  },
]

/* ── Slide mockups ──────────────────────────────────── */
function DashboardMockup() {
  return (
    <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 16, border: '1px solid rgba(255,255,255,0.15)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
        {[
          { label: 'Total Revenue', value: 'RM 48,250', tag: '+12%', color: '#4ade80' },
          { label: 'Active Orders', value: '34', tag: '6 urgent', color: '#fbbf24' },
          { label: 'Total Profit', value: 'RM 12,890', tag: '+8%', color: '#4ade80' },
        ].map(c => (
          <div key={c.label} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 10px' }}>
            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.6)', marginBottom: 3 }}>{c.label}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 3 }}>{c.value}</div>
            <span style={{ fontSize: 7, fontWeight: 600, color: c.color, background: c.color + '22', borderRadius: 4, padding: '1px 4px' }}>{c.tag}</span>
          </div>
        ))}
      </div>
      <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: 10, marginBottom: 8 }}>
        <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>Revenue Trend</div>
        <svg viewBox="0 0 300 50" width="100%" height="45">
          <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgba(255,255,255,0.3)"/><stop offset="100%" stopColor="rgba(255,255,255,0)"/></linearGradient></defs>
          <path d="M0,42 C30,40 50,36 80,30 C110,24 130,20 160,16 C190,12 210,15 240,8 C270,3 290,5 300,4" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5"/>
          <path d="M0,42 C30,40 50,36 80,30 C110,24 130,20 160,16 C190,12 210,15 240,8 C270,3 290,5 300,4 L300,50 L0,50Z" fill="url(#cg)"/>
        </svg>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '6px 10px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'grid', gridTemplateColumns: '1.5fr 1fr 0.8fr 0.7fr', gap: 6 }}>
          {['Order', 'Customer', 'Amount', 'Status'].map(h => (
            <div key={h} style={{ fontSize: 7, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</div>
          ))}
        </div>
        {[
          { id: 'ORD-001', name: 'Ahmad Razali', amount: 'RM 1,200', status: 'Active', color: '#4ade80' },
          { id: 'ORD-002', name: 'Siti Noor', amount: 'RM 850', status: 'Pending', color: '#fbbf24' },
        ].map((r, i) => (
          <div key={r.id} style={{ padding: '5px 10px', display: 'grid', gridTemplateColumns: '1.5fr 1fr 0.8fr 0.7fr', gap: 6, borderBottom: i === 0 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>{r.id}</div>
            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.7)' }}>{r.name}</div>
            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.7)' }}>{r.amount}</div>
            <span style={{ fontSize: 7, fontWeight: 600, color: r.color, background: r.color + '22', borderRadius: 4, padding: '1px 4px', display: 'inline-block' }}>{r.status}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function KanbanMockup() {
  const cols = [
    { title: 'Design', color: '#818cf8', cards: ['Business Cards – Ahmad', 'Flyer A3 – Siti'] },
    { title: 'Printing', color: '#fbbf24', cards: ['Banner 6ft – Lee'] },
    { title: 'Done', color: '#4ade80', cards: ['Stickers x500 – Farah', 'Poster A2 – Rizal'] },
  ]
  return (
    <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 14, border: '1px solid rgba(255,255,255,0.15)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {cols.map(col => (
          <div key={col.title} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: col.color }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: '#fff' }}>{col.title}</span>
              <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', marginLeft: 'auto' }}>{col.cards.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {col.cards.map(c => (
                <div key={c} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 7, padding: '7px 8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontSize: 8, fontWeight: 600, color: '#fff', lineHeight: 1.3 }}>{c}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function StoreMockup() {
  const products = [
    { name: 'Business Cards', price: 'RM 45', img: '#3b82f6' },
    { name: 'Flyers A5', price: 'RM 120', img: '#8b5cf6' },
    { name: 'Banners', price: 'RM 85', img: '#f59e0b' },
    { name: 'Stickers', price: 'RM 35', img: '#10b981' },
  ]
  return (
    <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 14, border: '1px solid rgba(255,255,255,0.15)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ width: 20, height: 20, borderRadius: 5, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/></svg>
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>yourshop.saasprint.com</span>
        <div style={{ marginLeft: 'auto', width: 40, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.15)' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {products.map(p => (
          <div key={p.name} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 9, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ height: 40, background: p.img, opacity: 0.3 }} />
            <div style={{ padding: '6px 8px' }}>
              <div style={{ fontSize: 8, fontWeight: 600, color: '#fff' }}>{p.name}</div>
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.6)', marginTop: 1 }}>from {p.price}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function FinanceMockup() {
  return (
    <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 14, border: '1px solid rgba(255,255,255,0.15)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        {[
          { label: 'Receivable', value: 'RM 18,400', color: '#4ade80' },
          { label: 'Collected', value: 'RM 32,100', color: '#60a5fa' },
        ].map(s => (
          <div key={s.label} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 10px' }}>
            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.6)', marginBottom: 3 }}>{s.label}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{s.value}</div>
          </div>
        ))}
      </div>
      <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '6px 10px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr 0.7fr', gap: 6 }}>
          {['Invoice', 'Customer', 'Amount', 'Status'].map(h => (
            <div key={h} style={{ fontSize: 7, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</div>
          ))}
        </div>
        {[
          { id: 'INV-041', name: 'Ahmad R.', amount: 'RM 2,400', status: 'Paid', color: '#4ade80' },
          { id: 'INV-042', name: 'Siti N.', amount: 'RM 850', status: 'Sent', color: '#60a5fa' },
          { id: 'INV-043', name: 'Lee M.', amount: 'RM 1,200', status: 'Overdue', color: '#f87171' },
        ].map((r, i) => (
          <div key={r.id} style={{ padding: '5px 10px', display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr 0.7fr', gap: 6, borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>{r.id}</div>
            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.7)' }}>{r.name}</div>
            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.7)' }}>{r.amount}</div>
            <span style={{ fontSize: 7, fontWeight: 600, color: r.color, background: r.color + '22', borderRadius: 4, padding: '1px 4px', display: 'inline-block' }}>{r.status}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const MOCKUPS: Record<string, React.ReactNode> = {
  dashboard: <DashboardMockup />,
  kanban: <KanbanMockup />,
  store: <StoreMockup />,
  finance: <FinanceMockup />,
}

/* ── Page ────────────────────────────────────────────── */
export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeSlide, setActiveSlide] = useState(0)
  const router = useRouter()

  /* Auto-advance slider */
  useEffect(() => {
    const timer = setInterval(() => setActiveSlide(a => (a + 1) % SLIDES.length), 5000)
    return () => clearInterval(timer)
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) { setError('Please fill in all fields.'); return }
    setError('')
    setLoading(true)
    try {
      const { signIn } = await import('@/lib/auth-actions')
      const result = await signIn({ email, password })
      if (result.error) {
        setError(result.error)
        setLoading(false)
        return
      }
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

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
      <style>{SLIDER_CSS}</style>

      <div style={{
        width: '100%',
        maxWidth: 960,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(15,23,42,0.12), 0 4px 16px rgba(15,23,42,0.06)',
        minHeight: 580,
      }}>

        {/* ── LEFT — Form ── */}
        <div style={{
          background: '#ffffff',
          padding: '48px 52px',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 52 }}>
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
            <span style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.3px' }}>SaasPrint</span>
          </div>

          {/* Heading */}
          <div style={{ marginBottom: 36 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', margin: '0 0 8px', letterSpacing: '-0.5px' }}>
              Welcome Back
            </h1>
            <p style={{ fontSize: 14, color: '#64748b', margin: 0, lineHeight: 1.5 }}>
              Enter your email and password to access your account.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '10px 14px',
                  fontSize: 14, color: '#0f172a',
                  background: '#f8fafc',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: 8, outline: 'none',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => { e.target.style.borderColor = '#006AFF'; e.target.style.background = '#fff' }}
                onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc' }}
              />
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '10px 40px 10px 14px',
                    fontSize: 14, color: '#0f172a',
                    background: '#f8fafc',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: 8, outline: 'none',
                    fontFamily: 'inherit',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#006AFF'; e.target.style.background = '#fff' }}
                  onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#94a3b8', padding: 2, display: 'flex', alignItems: 'center',
                  }}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {/* Remember me + Forgot */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  style={{ width: 14, height: 14, accentColor: '#006AFF', cursor: 'pointer' }}
                />
                <span style={{ fontSize: 13, color: '#64748b' }}>Remember Me</span>
              </label>
              <Link href="/reset-password" style={{ fontSize: 13, color: '#006AFF', textDecoration: 'none', fontWeight: 500 }}>
                Forgot Your Password?
              </Link>
            </div>

            {/* Error */}
            {error && (
              <div style={{ fontSize: 13, color: '#ef4444', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px' }}>
                {error}
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
                transition: 'background 0.15s, transform 0.1s',
                letterSpacing: '0.1px',
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#005ce6' }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#006AFF' }}
            >
              {loading ? 'Signing in…' : 'Log In'}
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
              <span style={{ fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>Or Login With</span>
              <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
            </div>

            {/* Social buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'Google', icon: <GoogleIcon /> },
                { label: 'Apple', icon: <AppleIcon /> },
              ].map(btn => (
                <button
                  key={btn.label}
                  type="button"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '9px 16px',
                    background: '#fff',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: 8, fontSize: 13, fontWeight: 500,
                    color: '#374151', cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fff' }}
                >
                  {btn.icon}
                  {btn.label}
                </button>
              ))}
            </div>
          </form>

          {/* Register link */}
          <div style={{ marginTop: 28, textAlign: 'center', fontSize: 13, color: '#64748b' }}>
            Don&apos;t Have An Account?{' '}
            <Link href="/register" style={{ color: '#006AFF', fontWeight: 600, textDecoration: 'none' }}>
              Register Now.
            </Link>
          </div>
        </div>

        {/* ── RIGHT — Feature slider ── */}
        <div style={{
          background: 'linear-gradient(140deg, #0055d4 0%, #006AFF 45%, #338bff 100%)',
          padding: '48px 40px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 24,
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Animated bubbles */}
          <div style={{ position: 'absolute', top: -80, right: -80, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none', animation: 'bubbleFloat1 8s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', bottom: -60, left: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none', animation: 'bubbleFloat2 10s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', top: '40%', left: '50%', width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none', animation: 'bubbleFloat3 12s ease-in-out infinite' }} />

          {/* Slide text */}
          <div key={`text-${activeSlide}`} style={{ position: 'relative', zIndex: 1, animation: 'slideFadeIn 0.4s ease both' }}>
            <h2 style={{
              fontSize: 28, fontWeight: 800, color: '#ffffff',
              margin: '0 0 12px', lineHeight: 1.25, letterSpacing: '-0.5px',
            }}>
              {SLIDES[activeSlide].title}
            </h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.72)', margin: 0, lineHeight: 1.6 }}>
              {SLIDES[activeSlide].desc}
            </p>
          </div>

          {/* Slide mockup */}
          <div key={`mock-${activeSlide}`} style={{ position: 'relative', zIndex: 1, animation: 'slideFadeIn 0.4s ease 0.08s both' }}>
            {MOCKUPS[SLIDES[activeSlide].mockup]}
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
        <span>Copyright © 2026 SaasPrint Inc.</span>
        <span style={{ pointerEvents: 'all' }}>
          <Link href="/privacy" style={{ color: '#94a3b8', textDecoration: 'none' }}>Privacy Policy</Link>
        </span>
      </div>
    </div>
  )
}
