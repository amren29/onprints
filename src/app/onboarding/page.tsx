'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getStoreSettings, saveStoreSettings } from '@/lib/store-settings-store'

/* ── Keyframe CSS ────────────────────────────────────── */
const ANIM_CSS = `
@keyframes sbFadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes logoPlaceholderPulse {
  0%, 100% { opacity: 0.4; }
  50%       { opacity: 1; }
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
@keyframes overlayFadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
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

/* ── Loading overlay — step-by-step checklist ───────── */
function LoadingOverlay({ onDone, hasInvites }: { onDone: () => void; hasInvites: boolean }) {
  const setupSteps = [
    { title: 'Workspace created', subtitle: 'Your workspace is ready to go' },
    { title: 'Store configured', subtitle: 'Products and catalog set up' },
    { title: 'Preferences saved', subtitle: 'Personalized to your workflow' },
    { title: 'Production board ready', subtitle: 'Order tracking pipeline is live' },
    ...(hasInvites ? [{ title: 'Invites sent!', subtitle: 'Build something great together' }] : []),
  ]
  const [completed, setCompleted] = useState(0)
  const [allDone, setAllDone] = useState(false)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    let step = 0
    const interval = setInterval(() => {
      step++
      if (step <= setupSteps.length) setCompleted(step)
      if (step === setupSteps.length) {
        clearInterval(interval)
        setTimeout(() => setAllDone(true), 800)
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#f0f0f3',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      animation: 'overlayFadeIn 0.3s ease both',
    }}>
      <div style={{
        width: '100%', maxWidth: 960,
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        borderRadius: 20, overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(15,23,42,0.12), 0 4px 16px rgba(15,23,42,0.06)',
        minHeight: 640,
        transform: exiting ? 'scale(0.97)' : 'scale(1)',
        opacity: exiting ? 0 : 1,
        transition: 'transform 0.6s ease, opacity 0.6s ease',
      }}>
        {/* ── Left panel ── */}
        <div style={{
          background: '#fff', padding: '48px 52px',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
        }}>
          {!allDone ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              {setupSteps.map((s, i) => {
                const done = i < completed
                const active = i === completed
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 16,
                    opacity: done || active ? 1 : 0.35,
                    transition: 'opacity 0.4s ease',
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: done ? '#22c55e' : 'transparent',
                      border: done ? 'none' : '2.5px solid #d1d5db',
                      transition: 'background 0.3s, border 0.3s',
                      position: 'relative',
                    }}>
                      {done && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'sbFadeIn 0.25s ease both' }}>
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                      {active && (
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%',
                          border: '2.5px solid #d1d5db', borderTopColor: '#22c55e',
                          animation: 'spin 0.7s linear infinite',
                          position: 'absolute', inset: -2.5,
                        }} />
                      )}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: done ? '#374151' : '#9ca3af', transition: 'color 0.3s' }}>
                        {s.title}
                      </p>
                      <p style={{ margin: '3px 0 0', fontSize: 13, color: '#9ca3af' }}>
                        {s.subtitle}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', animation: 'sbFadeIn 0.4s ease both' }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%', background: '#22c55e',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 20,
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 800, color: '#0f172a', textAlign: 'center' }}>
                All set &amp; ready to go!
              </h2>
              <p style={{ margin: '0 0 28px', fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 1.6 }}>
                It&apos;s time to explore and take the first<br />step towards enhanced productivity
              </p>
              <button onClick={() => { setExiting(true); setTimeout(onDone, 600) }} style={{
                padding: '13px 40px', background: '#0f172a', color: '#fff',
                border: 'none', borderRadius: 50, fontSize: 15, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = '#1e293b'}
                onMouseLeave={e => e.currentTarget.style.background = '#0f172a'}
              >
                Get Started
              </button>
            </div>
          )}
        </div>

        {/* ── Right panel ── */}
        <div style={{
          background: 'linear-gradient(140deg, #0055d4 0%, #006AFF 45%, #338bff 100%)',
          padding: '52px 44px',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -80, right: -80, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none', animation: 'bubbleFloat1 8s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', bottom: -60, left: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none', animation: 'bubbleFloat2 10s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', top: '40%', left: '50%', width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none', animation: 'bubbleFloat3 12s ease-in-out infinite' }} />
          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: '#fff', margin: '0 0 12px', lineHeight: 1.25, letterSpacing: '-0.5px' }}>
              {allDone ? 'Welcome aboard!' : 'Setting things up...'}
            </h2>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: 1.6 }}>
              {allDone ? 'Your workspace is ready. Let\'s build something great.' : 'We\'re preparing your workspace. This will only take a moment.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Logo mark ───────────────────────────────────────── */

/* ── Step indicator (6 steps) ────────────────────────── */
type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10

function StepIndicator({ current }: { current: Step }) {
  const steps = [
    { n: 1, label: 'Shop' },
    { n: 2, label: 'Website' },
    { n: 3, label: 'Team' },
    { n: 4, label: 'Services' },
    { n: 5, label: 'Volume' },
    { n: 6, label: 'Source' },
    { n: 7, label: 'Tools' },
    { n: 8, label: 'Scale' },
    { n: 9, label: 'Logo' },
    { n: 10, label: 'Invite' },
  ]
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 24 }}>
      {steps.map((s, i) => (
        <React.Fragment key={s.n}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              background: s.n <= current ? '#006AFF' : '#e2e8f0',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              {s.n < current ? (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ) : (
                <span style={{ fontSize: 10, fontWeight: 700, color: s.n === current ? '#fff' : '#94a3b8' }}>
                  {s.n}
                </span>
              )}
            </div>
            <span style={{
              fontSize: 9, fontWeight: 500,
              color: s.n === current ? '#006AFF' : '#94a3b8',
              whiteSpace: 'nowrap',
            }}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div style={{
              flex: 1, height: 2, marginTop: 11, marginLeft: 3, marginRight: 3,
              background: s.n < current ? '#006AFF' : '#e2e8f0',
              borderRadius: 1,
            }} />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}




/* ── Right panel — Step 1: Shop card ─────────────────── */
function ShopCard({ shopForm }: { shopForm: { shopName: string; businessType: string; phone: string } }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.08)',
      border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: 14, padding: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: 'rgba(255,255,255,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 700, color: '#fff',
        }}>
          {shopForm.shopName ? shopForm.shopName[0].toUpperCase() : 'S'}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
            {shopForm.shopName || 'Your Shop Name'}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
            {shopForm.businessType || 'Business Type'}
          </div>
        </div>
      </div>
      {shopForm.phone && (
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginBottom: 14 }}>
          {shopForm.phone}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {[{ label: 'Orders', value: '0' }, { label: 'Revenue', value: 'RM 0' }, { label: 'Staff', value: '1' }].map(s => (
          <div key={s.label} style={{
            background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 8px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{s.value}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Right panel — About steps: highlights active row ── */
function InsightsCard({ highlight }: { highlight: 0 | 1 | 2 }) {
  const rows = [
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      ),
      label: 'How you found us',
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1"/>
          <rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/>
          <rect x="14" y="14" width="7" height="7" rx="1"/>
        </svg>
      ),
      label: 'Your current workflow',
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10"/>
          <line x1="12" y1="20" x2="12" y2="4"/>
          <line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
      ),
      label: 'Your business scale',
    },
  ]
  return (
    <div>
      <div style={{
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 14, padding: 16,
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        {rows.map((r, i) => (
          <div key={r.label} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            background: i === highlight ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)',
            border: i === highlight ? '1px solid rgba(255,255,255,0.35)' : '1px solid transparent',
            borderRadius: 10, padding: '12px 14px',
            transition: 'background 0.2s',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 9, flexShrink: 0,
              background: i === highlight ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white',
            }}>
              {r.icon}
            </div>
            <span style={{
              fontSize: 13, fontWeight: i === highlight ? 600 : 400,
              color: i === highlight ? '#fff' : 'rgba(255,255,255,0.7)',
            }}>
              {r.label}
            </span>
            {i === highlight && (
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: '#fff', marginLeft: 'auto', flexShrink: 0,
              }} />
            )}
          </div>
        ))}
      </div>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', margin: '12px 0 0', lineHeight: 1.5 }}>
        Your answers are never shared with third parties.
      </p>
    </div>
  )
}

/* ── Right panel — Steps 2-5: Setup progress card ────── */
function SetupCard({ highlight }: { highlight: 0 | 1 | 2 | 3 }) {
  const rows = [
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
        </svg>
      ),
      label: 'Online presence',
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
        </svg>
      ),
      label: 'Your team',
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 6 2 18 2 18 9"/>
          <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
          <rect x="6" y="14" width="12" height="8"/>
        </svg>
      ),
      label: 'Print services',
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
        </svg>
      ),
      label: 'Order volume',
    },
  ]
  return (
    <div>
      <div style={{
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 14, padding: 16,
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        {rows.map((r, i) => (
          <div key={r.label} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            background: i === highlight ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)',
            border: i === highlight ? '1px solid rgba(255,255,255,0.35)' : '1px solid transparent',
            borderRadius: 10, padding: '12px 14px',
            transition: 'background 0.2s',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 9, flexShrink: 0,
              background: i === highlight ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white',
            }}>
              {r.icon}
            </div>
            <span style={{
              fontSize: 13, fontWeight: i === highlight ? 600 : 400,
              color: i === highlight ? '#fff' : 'rgba(255,255,255,0.7)',
            }}>
              {r.label}
            </span>
            {i === highlight && (
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: '#fff', marginLeft: 'auto', flexShrink: 0,
              }} />
            )}
          </div>
        ))}
      </div>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', margin: '12px 0 0', lineHeight: 1.5 }}>
        This helps us personalise your workspace.
      </p>
    </div>
  )
}

/* ── Right panel — Step 9: Logo preview ──────────────── */
function LogoPreviewCard({ logoPreview }: { logoPreview: string }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.08)',
      border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: 14, padding: 24,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
    }}>
      <div style={{
        width: 120, height: 120,
        background: 'rgba(255,255,255,0.12)',
        borderRadius: 16,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {logoPreview ? (
          <img src={logoPreview} alt="Logo preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        ) : (
          <div style={{ animation: 'logoPlaceholderPulse 2s ease-in-out infinite', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {['Orders', 'Receipts', 'Storefront'].map(label => (
          <span key={label} style={{
            fontSize: 11, fontWeight: 500,
            background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 20, padding: '4px 10px',
            color: 'rgba(255,255,255,0.8)',
          }}>
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ── Right panel — Step 6: Team card ─────────────────── */
function TeamCard() {
  const members = [
    { initials: 'AR', color: '#6366f1', name: 'Ahmad Razali', role: 'Agent', opacity: 1 },
    { initials: 'SN', color: '#0891b2', name: 'Siti Noor', role: 'Staff', opacity: 1 },
    { initials: 'LM', color: '#059669', name: 'Lee Ming', role: 'Staff', opacity: 0.5 },
  ]
  return (
    <div style={{
      background: 'rgba(255,255,255,0.08)',
      border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: 14, padding: 20,
    }}>
      <div style={{ display: 'flex', marginBottom: 20 }}>
        {members.map((m, i) => (
          <div key={m.initials} style={{
            width: 36, height: 36, borderRadius: '50%', background: m.color,
            border: '2.5px solid rgba(0,55,212,0.7)',
            marginLeft: i > 0 ? -10 : 0, zIndex: members.length - i, position: 'relative',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: '#fff',
          }}>
            {m.initials}
          </div>
        ))}
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'rgba(255,255,255,0.15)',
          border: '2.5px solid rgba(255,255,255,0.2)',
          marginLeft: -10, position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.7)',
        }}>
          +5
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {members.map(m => (
          <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: m.opacity }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%', background: m.color, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: '#fff',
            }}>
              {m.initials}
            </div>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', flex: 1 }}>{m.name}</span>
            <span style={{
              fontSize: 10, fontWeight: 600,
              background: m.opacity < 1 ? 'rgba(148,163,184,0.25)' : m.role === 'Agent' ? 'rgba(99,102,241,0.3)' : 'rgba(8,145,178,0.3)',
              color: m.opacity < 1 ? 'rgba(255,255,255,0.45)' : m.role === 'Agent' ? '#a5b4fc' : '#67e8f9',
              borderRadius: 20, padding: '3px 8px',
            }}>
              {m.opacity < 1 ? 'pending' : m.role}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Page ────────────────────────────────────────────── */
export default function OnboardingPage() {
  const router = useRouter()

  const [step, setStep] = useState<Step>(1)

  // Step 1 — Shop Details
  const [shopForm, setShopForm] = useState({ shopName: '', businessType: '', phone: '' })
  const [shopErrors, setShopErrors] = useState<Record<string, string>>({})

  // Step 2 — Website
  const [hasWebsite, setHasWebsite] = useState<'yes' | 'no' | ''>('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [websiteStatus, setWebsiteStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle')
  const websiteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Step 3 — Team size
  const [teamSize, setTeamSize] = useState('')

  // Step 3 — Primary services
  const [primaryServices, setPrimaryServices] = useState<string[]>([])

  // Step 4 — Order volume
  const [orderVolume, setOrderVolume] = useState('')

  // Step 5 — How did you hear
  const [heardFrom, setHeardFrom] = useState('')

  // Step 6 — Current software
  const [currentSoftware, setCurrentSoftware] = useState('')

  // Step 7 — Revenue range
  const [revenueRange, setRevenueRange] = useState('')

  // Step 8 — Logo
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [logoError, setLogoError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  // Step 9 — Invite Team
  const [invites, setInvites] = useState([{ email: '', role: 'Staff' }])
  const [inviteErrors, setInviteErrors] = useState<Record<number, string>>({})

  const [loading, setLoading] = useState(false)

  /* ── Validation ── */
  const validateStep1 = () => {
    const e: Record<string, string> = {}
    if (!shopForm.shopName.trim()) e.shopName = 'Shop name is required.'
    if (!shopForm.businessType) e.businessType = 'Business type is required.'
    setShopErrors(e)
    return Object.keys(e).length === 0
  }

  const validateStep6 = () => {
    const e: Record<number, string> = {}
    const hasAnyEmail = invites.some(inv => inv.email.trim())
    invites.forEach((inv, i) => {
      if (!inv.email.trim()) e[i] = 'Email is required.'
      else if (!/\S+@\S+\.\S+/.test(inv.email)) e[i] = 'Enter a valid email address.'
    })
    if (!hasAnyEmail) e[0] = 'Enter at least one email to send invites.'
    setInviteErrors(e)
    return Object.keys(e).length === 0
  }

  /* ── Logo ── */
  const processFile = (file: File) => {
    setLogoError('')
    if (!file.type.startsWith('image/')) { setLogoError('Please upload an image file (PNG, JPG, SVG).'); return }
    if (file.size > 2 * 1024 * 1024) { setLogoError('File is too large. Maximum size is 2 MB.'); return }
    setLogoFile(file)
    const reader = new FileReader()
    reader.onload = ev => setLogoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
    // TODO: upload to Cloudflare R2
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  /* ── Final submit ── */
  const handleFinalSubmit = async () => {
    if (!validateStep6()) return
    setLoading(true)

    // Create shop in Supabase
    try {
      const { createShop } = await import('@/lib/db/shops')
      const result = await createShop({
        name: shopForm.shopName.trim() || 'My Print Shop',
        phone: shopForm.phone.trim() || undefined,
        logoUrl: logoPreview || undefined,
        onboardingData: {
          businessType: shopForm.businessType,
          hasWebsite,
          websiteUrl,
          teamSize,
          services: primaryServices,
          orderVolume,
          source: heardFrom,
          workflow: currentSoftware,
          revenue: revenueRange,
        },
      })
      if (result.error) {
        console.error('Shop creation failed:', result.error)
      }
    } catch (err) {
      console.error('Shop creation error:', err)
    }

    // Also persist to localStorage (fallback during migration)
    if (shopForm.shopName.trim()) {
      const current = getStoreSettings()
      saveStoreSettings({
        ...current,
        storeName: shopForm.shopName.trim(),
        phone:     shopForm.phone.trim() || current.phone,
        ...(logoPreview ? { logoUrl: logoPreview } : {}),
      })
    }
    localStorage.setItem('sp_onboarding_done', '1')
    localStorage.setItem('sp_show_welcome', '1')
  }

  /* ── Shared button styles ── */
  const ctaStyle: React.CSSProperties = {
    padding: '11px',
    background: '#006AFF', color: '#fff', border: 'none',
    borderRadius: 8, fontSize: 14, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
    transition: 'background 0.15s', letterSpacing: '0.1px',
  }

  const ghostStyle: React.CSSProperties = {
    flex: 1, padding: '10px',
    background: 'none', color: '#64748b',
    border: '1.5px solid #e2e8f0',
    borderRadius: 8, fontSize: 14, fontWeight: 500,
    cursor: 'pointer', fontFamily: 'inherit',
    transition: 'border-color 0.15s',
  }

  /* ── Right panel content ── */
  const taglines: Record<number, string> = {
    1: 'Set up your workspace.',
    2: 'Your online presence.',
    3: 'How big is your team?',
    4: 'What do you print?',
    5: 'Your order volume.',
    6: 'How did you find us?',
    7: 'What tools do you use?',
    8: 'How big is your business?',
    9: 'Your brand, front and center.',
    10: 'Build your team.',
  }

  const subtitles: Record<number, string> = {
    1: 'Your workspace is just a few details away.',
    2: 'We\'ll check your online presence.',
    3: 'We recommend the right plan for your team.',
    4: 'We\'ll pre-populate your catalog categories.',
    5: 'We\'ll help set up your workflow.',
    6: 'Knowing your source helps us improve.',
    7: 'We\'ll help you migrate or integrate seamlessly.',
    8: 'We tailor your experience to your business size.',
    9: 'Upload your logo once — it appears everywhere.',
    10: 'Collaborate with your team from day one.',
  }

  const selectOptions = {
    teamSize:   ['Solo (just me)', '2–5 people', '6–15 people', '16–50 people', '50+ people'],
    services:   ['Business Cards', 'Flyers & Brochures', 'Banners & Signage', 'Stickers & Labels', 'Packaging', 'Apparel & Merch', 'Corporate Gifts'],
    orderVolume:['Under 50', '50–200', '200–500', '500–1,000', '1,000+'],
    heardFrom:  ['Google Search', 'Social Media', 'Word of Mouth', 'Referral', 'Trade Event', 'Other'],
    software:   ['Excel / Spreadsheets', 'Another print management system', 'Custom in-house software', 'Nothing yet', 'Other'],
    revenue:    ['Under RM 100K', 'RM 100K – 500K', 'RM 500K – 1M', 'Over RM 1M', 'Prefer not to say'],
  }

  /* ── MiniSelect (compact inline dropdown) ── */
  function MiniSelect({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
    const [open, setOpen] = React.useState(false)
    const ref = useRef<HTMLDivElement>(null)
    React.useEffect(() => {
      const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
      document.addEventListener('mousedown', handler)
      return () => document.removeEventListener('mousedown', handler)
    }, [])
    return (
      <div ref={ref} style={{ position: 'relative', width: 110, flexShrink: 0 }}>
        <button type="button" onClick={() => setOpen(o => !o)}
          style={{
            width: '100%', boxSizing: 'border-box', padding: '10px 28px 10px 10px', textAlign: 'left',
            fontSize: 13, color: '#0f172a', background: open ? '#fff' : '#f8fafc',
            border: `1.5px solid ${open ? '#006AFF' : '#e2e8f0'}`, borderRadius: 8, outline: 'none',
            fontFamily: 'inherit', cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s',
          }}
        >{value}</button>
        <svg style={{ position: 'absolute', right: 8, top: '50%', transform: `translateY(-50%) rotate(${open ? 180 : 0}deg)`, pointerEvents: 'none', color: '#94a3b8', transition: 'transform 0.15s' }}
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
        {open && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50,
            background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)', overflow: 'hidden',
          }}>
            {options.map(o => (
              <button key={o} type="button" onClick={() => { onChange(o); setOpen(false) }}
                style={{
                  display: 'block', width: '100%', padding: '8px 10px', fontSize: 13, fontFamily: 'inherit',
                  color: o === value ? '#006AFF' : '#0f172a', fontWeight: o === value ? 600 : 400,
                  background: o === value ? '#f0f6ff' : 'transparent',
                  border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (o !== value) (e.target as HTMLElement).style.background = '#f8fafc' }}
                onMouseLeave={e => { if (o !== value) (e.target as HTMLElement).style.background = 'transparent' }}
              >{o}</button>
            ))}
          </div>
        )}
      </div>
    )
  }

  /* ── SelectField (custom dropdown) ── */
  function SelectField({ label, value, onChange, options, placeholder, error }: {
    label: string; value: string; onChange: (v: string) => void
    options: string[]; placeholder: string; error?: string
  }) {
    const [open, setOpen] = React.useState(false)
    const ref = useRef<HTMLDivElement>(null)
    React.useEffect(() => {
      const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
      document.addEventListener('mousedown', handler)
      return () => document.removeEventListener('mousedown', handler)
    }, [])
    return (
      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }}>{label}</label>
        <div ref={ref} style={{ position: 'relative' }}>
          <button type="button" onClick={() => setOpen(o => !o)}
            style={{
              width: '100%', boxSizing: 'border-box', textAlign: 'left',
              padding: '10px 36px 10px 14px', fontSize: 14,
              color: value ? '#0f172a' : '#94a3b8', background: open ? '#fff' : '#f8fafc',
              border: `1.5px solid ${error ? '#ef4444' : open ? '#006AFF' : '#e2e8f0'}`,
              borderRadius: 8, outline: 'none', fontFamily: 'inherit',
              cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s',
            }}
          >
            {value || placeholder}
          </button>
          <svg style={{ position: 'absolute', right: 12, top: '50%', transform: `translateY(-50%) rotate(${open ? 180 : 0}deg)`, pointerEvents: 'none', color: '#94a3b8', transition: 'transform 0.15s' }}
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
          {open && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50,
              background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 8,
              boxShadow: '0 8px 24px rgba(0,0,0,0.08)', overflow: 'hidden',
            }}>
              {options.map(o => (
                <button key={o} type="button"
                  onClick={() => { onChange(o); setOpen(false) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', padding: '9px 14px', fontSize: 14, fontFamily: 'inherit',
                    color: o === value ? '#006AFF' : '#0f172a', fontWeight: o === value ? 600 : 400,
                    background: o === value ? '#f0f6ff' : 'transparent',
                    border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (o !== value) (e.target as HTMLElement).style.background = '#f8fafc' }}
                  onMouseLeave={e => { if (o !== value) (e.target as HTMLElement).style.background = 'transparent' }}
                >
                  {o === value && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#006AFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  )}
                  {o}
                </button>
              ))}
            </div>
          )}
        </div>
        {error && <p style={{ fontSize: 12, color: '#ef4444', margin: '4px 0 0' }}>{error}</p>}
      </div>
    )
  }

  /* ── Render ── */
  return (
    <div style={{
      minHeight: '100vh', background: '#f0f0f3',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    }}>
      <style>{ANIM_CSS}</style>
      {loading && <LoadingOverlay onDone={() => router.push('/dashboard')} hasInvites={invites.some(inv => inv.email.trim() !== '')} />}

      <div style={{
        width: '100%', maxWidth: 960,
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        borderRadius: 20, overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(15,23,42,0.12), 0 4px 16px rgba(15,23,42,0.06)',
        minHeight: 640,
      }}>

        {/* ── LEFT panel ── */}
        <div style={{ background: '#fff', padding: '48px 52px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
            {step > 1 && (
              <button type="button" onClick={() => setStep((step - 1) as Step)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 34, height: 34, borderRadius: 8, border: 'none',
                  background: 'transparent', cursor: 'pointer', color: '#64748b', transition: 'color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#0f172a' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#64748b' }}
                aria-label="Go back"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/>
                </svg>
              </button>
            )}
          </div>

          <div
            key={`step-${step}`}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', animation: 'sbFadeIn 0.25s ease both' }}
          >

            {/* ─────────── STEP 1 — Shop Details ─────────── */}
            {step === 1 && (
              <>
                <div style={{ marginBottom: 24 }}>
                  <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '0 0 8px', letterSpacing: '-0.5px' }}>
                    Set up your workspace
                  </h1>
                  <p style={{ fontSize: 14, color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                    Tell us about your shop so we can personalise your dashboard.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }}>
                      Shop Name
                    </label>
                    <input
                      type="text"
                      value={shopForm.shopName}
                      onChange={e => setShopForm(f => ({ ...f, shopName: e.target.value }))}
                      placeholder="e.g. PrintMaster KL"
                      style={inputStyle(!!shopErrors.shopName)}
                      onFocus={e => { e.target.style.borderColor = '#006AFF'; e.target.style.background = '#fff' }}
                      onBlur={e => { e.target.style.borderColor = shopErrors.shopName ? '#ef4444' : '#e2e8f0'; e.target.style.background = '#f8fafc' }}
                    />
                    {shopErrors.shopName && <p style={{ fontSize: 12, color: '#ef4444', margin: '4px 0 0' }}>{shopErrors.shopName}</p>}
                  </div>

                  <SelectField
                    label="Business Type"
                    value={shopForm.businessType}
                    onChange={v => setShopForm(f => ({ ...f, businessType: v }))}
                    options={['Print Shop', 'Design Studio', 'Print & Design', 'Other']}
                    placeholder="Select business type"
                    error={shopErrors.businessType}
                  />

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }}>
                      Phone Number <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span>
                    </label>
                    <input
                      type="tel"
                      value={shopForm.phone}
                      onChange={e => setShopForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="+60 12-345 6789"
                      style={inputStyle(false)}
                      onFocus={e => { e.target.style.borderColor = '#006AFF'; e.target.style.background = '#fff' }}
                      onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc' }}
                    />
                  </div>
                </div>

                <div style={{ flex: 1, minHeight: 20 }} />
                <button
                  onClick={() => { if (validateStep1()) setStep(2) }}

                  style={{ ...ctaStyle, width: '100%' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#005ce6'}
                  onMouseLeave={e => e.currentTarget.style.background = '#006AFF'}
                >
                  Continue
                </button>
              </>
            )}

            {/* ─────────── STEP 2 — Website ─────────── */}
            {step === 2 && (
              <>
                <div style={{ marginBottom: 24 }}>
                  <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '0 0 8px', letterSpacing: '-0.5px' }}>
                    Do you have a website or online store?
                  </h1>
                  <p style={{ fontSize: 14, color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                    If you have an existing website, we can link it to your account.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(['yes', 'no'] as const).map(opt => {
                    const sel = hasWebsite === opt
                    return (
                      <button key={opt} type="button" onClick={() => { setHasWebsite(opt); if (opt === 'no') { setWebsiteUrl(''); setWebsiteStatus('idle') } }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '11px 14px', borderRadius: 10,
                          border: `1.5px solid ${sel ? '#006AFF' : '#e2e8f0'}`,
                          background: sel ? '#eff6ff' : '#fff',
                          cursor: 'pointer', fontFamily: 'inherit',
                          transition: 'border-color 0.12s, background 0.12s',
                        }}
                        onMouseEnter={e => { if (!sel) { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc' } }}
                        onMouseLeave={e => { if (!sel) { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fff' } }}
                      >
                        <div style={{
                          width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                          border: sel ? 'none' : '2px solid #cbd5e1',
                          background: sel ? '#006AFF' : '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'background 0.12s, border 0.12s',
                        }}>
                          {sel && (
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          )}
                        </div>
                        <span style={{ fontSize: 14, fontWeight: sel ? 600 : 400, color: sel ? '#006AFF' : '#374151' }}>
                          {opt === 'yes' ? 'Yes, I have a website' : 'No, not yet'}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {hasWebsite === 'yes' && (
                  <div style={{ marginTop: 16 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }}>Website URL *</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="url"
                        value={websiteUrl}
                        onChange={e => {
                          const val = e.target.value
                          setWebsiteUrl(val)
                          setWebsiteStatus('idle')
                          if (websiteTimerRef.current) clearTimeout(websiteTimerRef.current)
                          if (!val.trim()) return
                          websiteTimerRef.current = setTimeout(() => {
                            // Validate: must look like a real domain (not social media)
                            const cleaned = val.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
                            const socialDomains = ['facebook.com', 'fb.com', 'instagram.com', 'twitter.com', 'x.com', 'tiktok.com', 'youtube.com', 'linkedin.com', 'wa.me', 'whatsapp.com', 't.me']
                            const isSocial = socialDomains.some(d => cleaned === d || cleaned.startsWith(d + '/') || cleaned.endsWith('.' + d))
                            const domainPattern = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z]{2,})+$/
                            const isValidDomain = domainPattern.test(cleaned)
                            if (isSocial) {
                              setWebsiteStatus('invalid')
                            } else if (isValidDomain) {
                              setWebsiteStatus('checking')
                              // Simulate verification delay
                              setTimeout(() => setWebsiteStatus('valid'), 800)
                            } else {
                              setWebsiteStatus('invalid')
                            }
                          }, 600)
                        }}
                        placeholder="https://www.yourshop.com"
                        style={{
                          ...inputStyle(websiteStatus === 'invalid'),
                          paddingRight: 40,
                          borderColor: websiteStatus === 'valid' ? '#22c55e' : websiteStatus === 'invalid' ? '#ef4444' : undefined,
                        }}
                        onFocus={e => { if (websiteStatus !== 'valid' && websiteStatus !== 'invalid') { e.target.style.borderColor = '#006AFF'; e.target.style.background = '#fff' } }}
                        onBlur={e => { if (websiteStatus !== 'valid' && websiteStatus !== 'invalid') { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc' } }}
                      />
                      <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
                        {websiteStatus === 'checking' && (
                          <div style={{ width: 18, height: 18, border: '2px solid #e2e8f0', borderTopColor: '#006AFF', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                        )}
                        {websiteStatus === 'valid' && (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        )}
                        {websiteStatus === 'invalid' && (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        )}
                      </div>
                    </div>
                    {websiteStatus === 'invalid' && (
                      <p style={{ fontSize: 12, color: '#ef4444', margin: '4px 0 0' }}>
                        Please enter a valid website URL (not a social media link).
                      </p>
                    )}
                    {websiteStatus === 'valid' && (
                      <p style={{ fontSize: 12, color: '#22c55e', margin: '4px 0 0' }}>
                        Website verified!
                      </p>
                    )}
                  </div>
                )}

                <div style={{ flex: 1, minHeight: 20 }} />
                {(() => {
                  const canContinue = hasWebsite === 'no' || (hasWebsite === 'yes' && websiteStatus === 'valid')
                  return (
                    <button onClick={() => { if (canContinue) setStep(3) }}
                        style={{ ...ctaStyle, opacity: canContinue ? 1 : 0.5, cursor: canContinue ? 'pointer' : 'not-allowed' }}
                        onMouseEnter={e => { if (canContinue) e.currentTarget.style.background = '#005ce6' }}
                        onMouseLeave={e => { if (canContinue) e.currentTarget.style.background = '#006AFF' }}>
                        Continue
                    </button>
                  )
                })()}
              </>
            )}

            {/* ─────────── STEP 3 — Team size ─────────── */}
            {step === 3 && (
              <>
                <div style={{ marginBottom: 24 }}>
                  <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '0 0 8px', letterSpacing: '-0.5px' }}>
                    How many people are in your team?
                  </h1>
                  <p style={{ fontSize: 14, color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                    This helps us recommend the right plan and features for you.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {selectOptions.teamSize.map(opt => {
                    const sel = teamSize === opt
                    return (
                      <button key={opt} type="button" onClick={() => setTeamSize(opt)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '11px 14px', borderRadius: 10,
                          border: `1.5px solid ${sel ? '#006AFF' : '#e2e8f0'}`,
                          background: sel ? '#eff6ff' : '#fff',
                          cursor: 'pointer', fontFamily: 'inherit',
                          transition: 'border-color 0.12s, background 0.12s',
                        }}
                        onMouseEnter={e => { if (!sel) { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc' } }}
                        onMouseLeave={e => { if (!sel) { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fff' } }}
                      >
                        <div style={{
                          width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                          border: sel ? 'none' : '2px solid #cbd5e1',
                          background: sel ? '#006AFF' : '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'background 0.12s, border 0.12s',
                        }}>
                          {sel && (
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          )}
                        </div>
                        <span style={{ fontSize: 14, fontWeight: sel ? 600 : 400, color: sel ? '#006AFF' : '#374151' }}>
                          {opt}
                        </span>
                      </button>
                    )
                  })}
                </div>

                <div style={{ flex: 1, minHeight: 20 }} />
                <button onClick={() => { if (teamSize) setStep(4) }}
                    style={{ ...ctaStyle, opacity: teamSize ? 1 : 0.5, cursor: teamSize ? 'pointer' : 'not-allowed' }}
                    onMouseEnter={e => { if (teamSize) e.currentTarget.style.background = '#005ce6' }}
                    onMouseLeave={e => { if (teamSize) e.currentTarget.style.background = '#006AFF' }}>
                    Continue
                </button>
              </>
            )}

            {/* ─────────── STEP 4 — Primary services ─────────── */}
            {step === 4 && (
              <>
                <div style={{ marginBottom: 24 }}>
                  <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '0 0 8px', letterSpacing: '-0.5px' }}>
                    What do you mainly print?
                  </h1>
                  <p style={{ fontSize: 14, color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                    Select all that apply — helps us pre-populate your catalog.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {selectOptions.services.map(opt => {
                    const sel = primaryServices.includes(opt)
                    return (
                      <button key={opt} type="button" onClick={() => setPrimaryServices(prev => sel ? prev.filter(s => s !== opt) : [...prev, opt])}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '11px 14px', borderRadius: 10,
                          border: `1.5px solid ${sel ? '#006AFF' : '#e2e8f0'}`,
                          background: sel ? '#eff6ff' : '#fff',
                          cursor: 'pointer', fontFamily: 'inherit',
                          transition: 'border-color 0.12s, background 0.12s',
                        }}
                        onMouseEnter={e => { if (!sel) { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc' } }}
                        onMouseLeave={e => { if (!sel) { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fff' } }}
                      >
                        <div style={{
                          width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                          border: sel ? 'none' : '2px solid #cbd5e1',
                          background: sel ? '#006AFF' : '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'background 0.12s, border 0.12s',
                        }}>
                          {sel && (
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          )}
                        </div>
                        <span style={{ fontSize: 14, fontWeight: sel ? 600 : 400, color: sel ? '#006AFF' : '#374151' }}>
                          {opt}
                        </span>
                      </button>
                    )
                  })}
                </div>

                <div style={{ flex: 1, minHeight: 20 }} />
                <button onClick={() => { if (primaryServices.length) setStep(5) }}
                    style={{ ...ctaStyle, opacity: primaryServices.length ? 1 : 0.5, cursor: primaryServices.length ? 'pointer' : 'not-allowed' }}
                    onMouseEnter={e => { if (primaryServices.length) e.currentTarget.style.background = '#005ce6' }}
                    onMouseLeave={e => { if (primaryServices.length) e.currentTarget.style.background = '#006AFF' }}>
                    Continue
                </button>
              </>
            )}

            {/* ─────────── STEP 5 — Order volume ─────────── */}
            {step === 5 && (
              <>
                <div style={{ marginBottom: 24 }}>
                  <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '0 0 8px', letterSpacing: '-0.5px' }}>
                    How many orders per month?
                  </h1>
                  <p style={{ fontSize: 14, color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                    This helps us set up the right workflow for you.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {selectOptions.orderVolume.map(opt => {
                    const sel = orderVolume === opt
                    return (
                      <button key={opt} type="button" onClick={() => setOrderVolume(opt)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '11px 14px', borderRadius: 10,
                          border: `1.5px solid ${sel ? '#006AFF' : '#e2e8f0'}`,
                          background: sel ? '#eff6ff' : '#fff',
                          cursor: 'pointer', fontFamily: 'inherit',
                          transition: 'border-color 0.12s, background 0.12s',
                        }}
                        onMouseEnter={e => { if (!sel) { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc' } }}
                        onMouseLeave={e => { if (!sel) { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fff' } }}
                      >
                        <div style={{
                          width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                          border: sel ? 'none' : '2px solid #cbd5e1',
                          background: sel ? '#006AFF' : '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'background 0.12s, border 0.12s',
                        }}>
                          {sel && (
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          )}
                        </div>
                        <span style={{ fontSize: 14, fontWeight: sel ? 600 : 400, color: sel ? '#006AFF' : '#374151' }}>
                          {opt}
                        </span>
                      </button>
                    )
                  })}
                </div>

                <div style={{ flex: 1, minHeight: 20 }} />
                <button onClick={() => { if (orderVolume) setStep(6) }}
                    style={{ ...ctaStyle, opacity: orderVolume ? 1 : 0.5, cursor: orderVolume ? 'pointer' : 'not-allowed' }}
                    onMouseEnter={e => { if (orderVolume) e.currentTarget.style.background = '#005ce6' }}
                    onMouseLeave={e => { if (orderVolume) e.currentTarget.style.background = '#006AFF' }}>
                    Continue
                </button>
              </>
            )}

            {/* ─────────── STEP 6 — How did you hear ─────────── */}
            {step === 6 && (
              <>
                <div style={{ marginBottom: 24 }}>
                  <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '0 0 8px', letterSpacing: '-0.5px' }}>
                    How did you hear about us?
                  </h1>
                  <p style={{ fontSize: 14, color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                    Pick the option that best describes how you found OnPrints.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {selectOptions.heardFrom.map(opt => {
                    const sel = heardFrom === opt
                    return (
                      <button key={opt} type="button" onClick={() => setHeardFrom(opt)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '11px 14px', borderRadius: 10,
                          border: `1.5px solid ${sel ? '#006AFF' : '#e2e8f0'}`,
                          background: sel ? '#eff6ff' : '#fff',
                          cursor: 'pointer', fontFamily: 'inherit',
                          transition: 'border-color 0.12s, background 0.12s',
                        }}
                        onMouseEnter={e => { if (!sel) { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc' } }}
                        onMouseLeave={e => { if (!sel) { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fff' } }}
                      >
                        <div style={{
                          width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                          border: sel ? 'none' : '2px solid #cbd5e1',
                          background: sel ? '#006AFF' : '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'background 0.12s, border 0.12s',
                        }}>
                          {sel && (
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          )}
                        </div>
                        <span style={{ fontSize: 14, fontWeight: sel ? 600 : 400, color: sel ? '#006AFF' : '#374151' }}>
                          {opt}
                        </span>
                      </button>
                    )
                  })}
                </div>

                <div style={{ flex: 1, minHeight: 20 }} />
                <button onClick={() => { if (heardFrom) setStep(7) }}
                    style={{ ...ctaStyle, opacity: heardFrom ? 1 : 0.5, cursor: heardFrom ? 'pointer' : 'not-allowed' }}
                    onMouseEnter={e => { if (heardFrom) e.currentTarget.style.background = '#005ce6' }}
                    onMouseLeave={e => { if (heardFrom) e.currentTarget.style.background = '#006AFF' }}>
                    Continue
                </button>
              </>
            )}

            {/* ─────────── STEP 7 — Current software ─────────── */}
            {step === 7 && (
              <>
                <div style={{ marginBottom: 24 }}>
                  <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '0 0 8px', letterSpacing: '-0.5px' }}>
                    What software do you currently use?
                  </h1>
                  <p style={{ fontSize: 14, color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                    This helps us tailor your migration or integration experience.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {selectOptions.software.map(opt => {
                    const sel = currentSoftware === opt
                    return (
                      <button key={opt} type="button" onClick={() => setCurrentSoftware(opt)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '11px 14px', borderRadius: 10,
                          border: `1.5px solid ${sel ? '#006AFF' : '#e2e8f0'}`,
                          background: sel ? '#eff6ff' : '#fff',
                          cursor: 'pointer', fontFamily: 'inherit',
                          transition: 'border-color 0.12s, background 0.12s',
                        }}
                        onMouseEnter={e => { if (!sel) { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc' } }}
                        onMouseLeave={e => { if (!sel) { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fff' } }}
                      >
                        <div style={{
                          width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                          border: sel ? 'none' : '2px solid #cbd5e1',
                          background: sel ? '#006AFF' : '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'background 0.12s, border 0.12s',
                        }}>
                          {sel && (
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          )}
                        </div>
                        <span style={{ fontSize: 14, fontWeight: sel ? 600 : 400, color: sel ? '#006AFF' : '#374151' }}>
                          {opt}
                        </span>
                      </button>
                    )
                  })}
                </div>

                <div style={{ flex: 1, minHeight: 20 }} />
                <button onClick={() => { if (currentSoftware) setStep(8) }}
                    style={{ ...ctaStyle, opacity: currentSoftware ? 1 : 0.5, cursor: currentSoftware ? 'pointer' : 'not-allowed' }}
                    onMouseEnter={e => { if (currentSoftware) e.currentTarget.style.background = '#005ce6' }}
                    onMouseLeave={e => { if (currentSoftware) e.currentTarget.style.background = '#006AFF' }}>
                    Continue
                </button>
              </>
            )}

            {/* ─────────── STEP 8 — Annual revenue ─────────── */}
            {step === 8 && (
              <>
                <div style={{ marginBottom: 24 }}>
                  <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '0 0 8px', letterSpacing: '-0.5px' }}>
                    Annual revenue range
                  </h1>
                  <p style={{ fontSize: 14, color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                    We use this to recommend the right plan and features for you.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {selectOptions.revenue.map(opt => {
                    const sel = revenueRange === opt
                    return (
                      <button key={opt} type="button" onClick={() => setRevenueRange(opt)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '11px 14px', borderRadius: 10,
                          border: `1.5px solid ${sel ? '#006AFF' : '#e2e8f0'}`,
                          background: sel ? '#eff6ff' : '#fff',
                          cursor: 'pointer', fontFamily: 'inherit',
                          transition: 'border-color 0.12s, background 0.12s',
                        }}
                        onMouseEnter={e => { if (!sel) { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc' } }}
                        onMouseLeave={e => { if (!sel) { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fff' } }}
                      >
                        <div style={{
                          width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                          border: sel ? 'none' : '2px solid #cbd5e1',
                          background: sel ? '#006AFF' : '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'background 0.12s, border 0.12s',
                        }}>
                          {sel && (
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          )}
                        </div>
                        <span style={{ fontSize: 14, fontWeight: sel ? 600 : 400, color: sel ? '#006AFF' : '#374151' }}>
                          {opt}
                        </span>
                      </button>
                    )
                  })}
                </div>

                <div style={{ flex: 1, minHeight: 20 }} />
                <button onClick={() => { if (revenueRange) setStep(9) }}
                    style={{ ...ctaStyle, opacity: revenueRange ? 1 : 0.5, cursor: revenueRange ? 'pointer' : 'not-allowed' }}
                    onMouseEnter={e => { if (revenueRange) e.currentTarget.style.background = '#005ce6' }}
                    onMouseLeave={e => { if (revenueRange) e.currentTarget.style.background = '#006AFF' }}>
                    Continue
                </button>
              </>
            )}

            {/* ─────────── STEP 9 — Upload Logo ─────────── */}
            {step === 9 && (
              <>
                <div style={{ marginBottom: 20 }}>
                  <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '0 0 8px', letterSpacing: '-0.5px' }}>
                    Upload your logo
                  </h1>
                  <p style={{ fontSize: 14, color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                    Your logo will appear on quotations, receipts, and your storefront.
                  </p>
                </div>

                <div
                  ref={dropZoneRef}
                  onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => !logoPreview && fileInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${isDragging ? '#006AFF' : '#e2e8f0'}`,
                    borderRadius: 12,
                    background: isDragging ? '#eff6ff' : '#f8fafc',
                    padding: '32px 20px', textAlign: 'center',
                    cursor: logoPreview ? 'default' : 'pointer',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                >
                  {logoPreview ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                      <img src={logoPreview} alt="Logo preview" style={{ maxHeight: 80, maxWidth: '100%', borderRadius: 8, objectFit: 'contain' }} />
                      <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{logoFile?.name}</span>
                      <button type="button"
                        onClick={e => { e.stopPropagation(); setLogoFile(null); setLogoPreview(''); setLogoError(''); if (fileInputRef.current) fileInputRef.current.value = '' }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#ef4444', fontFamily: 'inherit', padding: 0, fontWeight: 500 }}>
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
                        <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/>
                      </svg>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 500, color: '#374151', margin: '0 0 4px' }}>Drag &amp; drop your logo here</p>
                        <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>PNG, JPG, SVG — max 2 MB</p>
                      </div>
                      <button type="button"
                        onClick={e => { e.stopPropagation(); fileInputRef.current?.click() }}
                        style={{
                          background: 'none', border: '1.5px solid #e2e8f0', borderRadius: 8,
                          padding: '7px 16px', fontSize: 13, fontWeight: 500, color: '#374151',
                          cursor: 'pointer', fontFamily: 'inherit', transition: 'border-color 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = '#94a3b8'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}>
                        Browse files
                      </button>
                    </div>
                  )}
                </div>

                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f) }} />
                {logoError && <p style={{ fontSize: 12, color: '#ef4444', margin: '6px 0 0' }}>{logoError}</p>}

                <div style={{ flex: 1, minHeight: 20 }} />

                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setStep(10)} style={ghostStyle}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#cbd5e1'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}>
                    Skip
                  </button>
                  <button onClick={() => setStep(10)} style={{ ...ctaStyle, flex: 2 }}
                    onMouseEnter={e => e.currentTarget.style.background = '#005ce6'}
                    onMouseLeave={e => e.currentTarget.style.background = '#006AFF'}>
                    Continue
                  </button>
                </div>
              </>
            )}

            {/* ─────────── STEP 10 — Invite Team ─────────── */}
            {step === 10 && (
              <>
                <div style={{ marginBottom: 20 }}>
                  <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '0 0 8px', letterSpacing: '-0.5px' }}>
                    Invite your team
                  </h1>
                  <p style={{ fontSize: 14, color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                    You can also do this later from Settings.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {invites.map((inv, i) => (
                    <div key={i}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                          type="email"
                          value={inv.email}
                          onChange={e => {
                            const next = [...invites]; next[i] = { ...next[i], email: e.target.value }; setInvites(next)
                            if (inviteErrors[i]) setInviteErrors(errs => { const n = { ...errs }; delete n[i]; return n })
                          }}
                          placeholder="colleague@company.com"
                          style={{ ...inputStyle(!!inviteErrors[i]), flex: 1 }}
                          onFocus={e => { e.target.style.borderColor = '#006AFF'; e.target.style.background = '#fff' }}
                          onBlur={e => { e.target.style.borderColor = inviteErrors[i] ? '#ef4444' : '#e2e8f0'; e.target.style.background = '#f8fafc' }}
                        />
                        <MiniSelect value={inv.role} options={['Staff', 'Agent', 'Manager', 'Admin']}
                          onChange={v => { const next = [...invites]; next[i] = { ...next[i], role: v }; setInvites(next) }} />
                        {invites.length > 1 && (
                          <button type="button"
                            onClick={() => { setInvites(invites.filter((_, idx) => idx !== i)); setInviteErrors(errs => { const n = { ...errs }; delete n[i]; return n }) }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                          </button>
                        )}
                      </div>
                      {inviteErrors[i] && <p style={{ fontSize: 12, color: '#ef4444', margin: '4px 0 0' }}>{inviteErrors[i]}</p>}
                    </div>
                  ))}
                  {invites.length < 3 && (
                    <button type="button"
                      onClick={() => setInvites([...invites, { email: '', role: 'Staff' }])}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#006AFF', fontFamily: 'inherit', padding: '4px 0', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 500 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                      Add another
                    </button>
                  )}
                </div>

                <div style={{ flex: 1, minHeight: 20 }} />

                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => { localStorage.setItem('sp_onboarding_done', '1'); localStorage.setItem('sp_show_welcome', '1'); setLoading(true) }} style={ghostStyle}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#cbd5e1'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}>
                    Skip
                  </button>
                  <button onClick={handleFinalSubmit} disabled={loading}
                    style={{ ...ctaStyle, flex: 2, background: loading ? '#338bff' : '#006AFF', cursor: loading ? 'not-allowed' : 'pointer' }}
                    onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#005ce6' }}
                    onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#006AFF' }}>
                    {loading ? 'Setting up…' : 'Send Invites'}
                  </button>
                </div>
              </>
            )}

          </div>
        </div>

        {/* ── RIGHT panel ── */}
        <div style={{
          background: 'linear-gradient(140deg, #0055d4 0%, #006AFF 45%, #338bff 100%)',
          padding: '52px 44px',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 28,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -80, right: -80, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none', animation: 'bubbleFloat1 8s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', bottom: -60, left: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none', animation: 'bubbleFloat2 10s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', top: '40%', left: '50%', width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none', animation: 'bubbleFloat3 12s ease-in-out infinite' }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: '#fff', margin: '0 0 12px', lineHeight: 1.25, letterSpacing: '-0.5px' }}>
              {taglines[step]}
            </h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.72)', margin: 0, lineHeight: 1.6 }}>
              {subtitles[step]}
            </p>
          </div>

          <div style={{ position: 'relative', zIndex: 1 }}>
            {step === 1 && <ShopCard shopForm={shopForm} />}
            {step === 2 && <SetupCard highlight={0} />}
            {step === 3 && <SetupCard highlight={1} />}
            {step === 4 && <SetupCard highlight={2} />}
            {step === 5 && <SetupCard highlight={3} />}
            {step === 6 && <InsightsCard highlight={0} />}
            {step === 7 && <InsightsCard highlight={1} />}
            {step === 8 && <InsightsCard highlight={2} />}
            {step === 9 && <LogoPreviewCard logoPreview={logoPreview} />}
            {step === 10 && <TeamCard />}
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
