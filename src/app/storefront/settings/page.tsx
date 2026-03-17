'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import MyStoreShell from '@/components/MyStoreShell'
import CustomSelect from '@/components/CustomSelect'
import { getStoreSettings, saveStoreSettings } from '@/lib/db/storefront'
import { useShop } from '@/providers/shop-provider'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const MALAYSIAN_BANKS = [
  'Maybank', 'CIMB Bank', 'Public Bank', 'RHB Bank', 'Hong Leong Bank',
  'AmBank', 'Bank Islam', 'Bank Rakyat', 'Alliance Bank', 'Affin Bank',
  'OCBC Bank', 'HSBC Bank', 'Standard Chartered', 'UOB Bank', 'Bank Muamalat',
  'Agrobank', 'BSN', 'MBSB Bank',
]

const PLAN_FEE_LABELS: Record<string, { fee: string; label: string }> = {
  starter: { fee: 'RM 1.00', label: 'Starter' },
  growth: { fee: 'RM 0.60', label: 'Growth' },
  pro: { fee: 'RM 0.20', label: 'Pro' },
}

/* ── Icons ─────────────────────────────────────────── */

const StoreIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
)
const PhoneIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
  </svg>
)
const GlobeIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
  </svg>
)
const CardIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
  </svg>
)

type Tab = 'info' | 'contact' | 'social' | 'payment'

const NAV: { key: Tab; label: string; icon: () => React.ReactNode; desc: string }[] = [
  { key: 'info',     label: 'Store Info', icon: StoreIcon,     desc: 'Name, tagline & branding' },
  { key: 'contact',  label: 'Contact',    icon: PhoneIcon,     desc: 'Email, phone & address' },
  { key: 'social',   label: 'Social',     icon: GlobeIcon,     desc: 'Social media links' },
  { key: 'payment',  label: 'Payment',    icon: CardIcon,      desc: 'Bank & payment methods' },
]

const CheckIcon = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>)

const STORE_SETTINGS_CSS = `
@keyframes ssFadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes ssToastIn {
  from { opacity: 0; transform: translateX(-50%) translateY(-12px) scale(0.95); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
}
@keyframes ssToastOut {
  from { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
  to   { opacity: 0; transform: translateX(-50%) translateY(-8px) scale(0.95); }
}
@media (max-width: 768px) {
  .ss-grid {
    grid-template-columns: 1fr !important;
    gap: 16px !important;
  }
  .ss-nav {
    position: static !important;
    display: flex !important;
    flex-direction: row !important;
    overflow-x: auto !important;
    gap: 2px !important;
    padding: 6px !important;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .ss-nav::-webkit-scrollbar { display: none; }
  .ss-nav-btn {
    flex-shrink: 0 !important;
    padding: 8px 14px !important;
    border-bottom: 3px solid transparent !important;
  }
  .ss-nav-btn[data-active="true"] {
    border-bottom-color: var(--accent) !important;
  }
  .ss-nav-desc { display: none !important; }
}
`

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</div>
      {sub && <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
      <div onClick={() => onChange(!checked)} style={{ width: 40, height: 22, borderRadius: 11, background: checked ? 'var(--accent)' : 'var(--border)', position: 'relative', transition: 'background 0.2s', cursor: 'pointer', flexShrink: 0 }}>
        <div style={{ position: 'absolute', top: 3, left: checked ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: 'var(--bg-card)', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
      </div>
      <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{label}</span>
    </label>
  )
}

const footerBar: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
  gap: 10, marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)',
}

export default function StoreSettingsPage() {
  const searchParams = useSearchParams()
  const { shopId } = useShop()
  const qc = useQueryClient()

  const [tab, setTab] = useState<Tab>(() => {
    const t = searchParams.get('tab')
    if (t && NAV.some(n => n.key === t)) return t as Tab
    return 'info'
  })
  const [hovered, setHovered] = useState<Tab | null>(null)
  const [s, setS] = useState<Record<string, unknown> | null>(null)
  const [toastMsg, setToastMsg] = useState('')
  const [toastExiting, setToastExiting] = useState(false)
  const [toastVisible, setToastVisible] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  const { data: settingsRow, isFetched } = useQuery({
    queryKey: ['store-settings', shopId],
    queryFn: () => getStoreSettings(shopId),
    enabled: !!shopId,
  })

  // Hydrate from DB (or init empty for new shops with no settings row)
  if (!hydrated && isFetched) {
    setS(settingsRow?.config as Record<string, unknown> ?? {})
    setHydrated(true)
  }

  const saveMut = useMutation({
    mutationFn: (config: Record<string, unknown>) => saveStoreSettings(shopId, config),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['store-settings', shopId] }),
    onError: (err: any) => {
      console.error('[saveStoreSettings]', err)
      alert('Failed to save: ' + (err?.message || 'Unknown error'))
    },
  })

  useEffect(() => {
    if (!toastMsg) return
    setToastExiting(false)
    setToastVisible(true)
    const exitTimer = setTimeout(() => setToastExiting(true), 1700)
    const hideTimer = setTimeout(() => setToastVisible(false), 2200)
    return () => { clearTimeout(exitTimer); clearTimeout(hideTimer) }
  }, [toastMsg])

  if (!s) return <MyStoreShell><div style={{ padding: 40 }}>Loading...</div></MyStoreShell>

  const f = (k: string, v: unknown) => setS(p => p ? { ...p, [k]: v } : p)

  const showToast = (msg: string) => {
    if (!s) return
    saveMut.mutate(s)
    setToastMsg(msg)
  }

  return (
    <MyStoreShell>
      <style suppressHydrationWarning>{STORE_SETTINGS_CSS}</style>
      {toastVisible && toastMsg && (
        <div style={{
          position: 'fixed', top: 28, left: '50%', transform: 'translateX(-50%)', zIndex: 300,
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '11px 20px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          animation: toastExiting ? 'ssToastOut 0.35s ease forwards' : 'ssToastIn 0.35s ease',
        }}>
          <span style={{ color: 'var(--positive)', display: 'flex' }}><CheckIcon /></span>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{toastMsg}</span>
        </div>
      )}

      <div className="page-header">
        <div>
          <div className="page-title">Store Settings</div>
          <div className="page-subtitle">Manage your online store configuration</div>
        </div>
      </div>

      <div className="page-scroll">
        <div className="ss-grid" style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 24, alignItems: 'start' }}>
          <div className="card ss-nav" style={{ padding: 8, position: 'sticky', top: 20 }}>
            {NAV.map(n => {
              const active = n.key === tab
              const hover  = n.key === hovered
              return (
                <button
                  key={n.key}
                  className="ss-nav-btn"
                  data-active={active}
                  onClick={() => setTab(n.key)}
                  onMouseEnter={() => setHovered(n.key)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', textAlign: 'left', padding: '10px 12px 10px 14px',
                    borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: active ? 'var(--bg)' : hover ? 'var(--bg)' : 'transparent',
                    color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontFamily: 'var(--font)', marginBottom: 2, position: 'relative',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span style={{ opacity: active ? 1 : 0.65, flexShrink: 0, transition: 'all 0.15s ease' }}><n.icon /></span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: active ? 600 : 500 }}>{n.label}</div>
                    <div className="ss-nav-desc" style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.desc}</div>
                  </div>
                </button>
              )
            })}
          </div>

          <div key={tab} style={{ animation: 'ssFadeIn 0.25s ease' }}>

            {tab === 'info' && (
              <div className="card" style={{ padding: 24, maxWidth: 640 }}>
                <SectionHeader title="Store Information" sub="Displayed in the storefront header and footer" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label className="form-label">Store Name</label>
                    <input className="form-input" value={(s.storeName as string) || ''} onChange={e => f('storeName', e.target.value)} placeholder="e.g. Kinabalu Print Shop" />
                  </div>
                  <div>
                    <label className="form-label">Tagline</label>
                    <input className="form-input" value={(s.tagline as string) || ''} onChange={e => f('tagline', e.target.value)} placeholder="Short tagline shown under the store name" />
                  </div>
                  <div>
                    <label className="form-label">Logo URL</label>
                    <input className="form-input" value={(s.logoUrl as string) || ''} onChange={e => f('logoUrl', e.target.value)} placeholder="https://... (leave blank to use store name text)" />
                  </div>
                  <div>
                    <label className="form-label">Currency</label>
                    <input className="form-input" value={(s.currency as string) || ''} onChange={e => f('currency', e.target.value)} placeholder="MYR" style={{ maxWidth: 120 }} />
                  </div>
                </div>
                <div style={footerBar}>
                  <button className="btn-primary" onClick={() => showToast('Store info saved')}>Save Changes</button>
                </div>
              </div>
            )}

            {tab === 'contact' && (
              <div className="card" style={{ padding: 24, maxWidth: 640 }}>
                <SectionHeader title="Contact Details" sub="Shown in the storefront footer and contact page" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label className="form-label">Email</label>
                    <input className="form-input" type="email" value={(s.email as string) || ''} onChange={e => f('email', e.target.value)} placeholder="hello@yourstore.com" />
                  </div>
                  <div>
                    <label className="form-label">Phone</label>
                    <input className="form-input" value={(s.phone as string) || ''} onChange={e => f('phone', e.target.value)} placeholder="+60 11-1234 5678" />
                  </div>
                  <div>
                    <label className="form-label">WhatsApp Number</label>
                    <input className="form-input" value={(s.whatsapp as string) || ''} onChange={e => f('whatsapp', e.target.value)} placeholder="601112345678 (no + or spaces)" style={{ fontFamily: 'monospace' }} />
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>Used for WhatsApp chat button. Format: 60xxxxxxxxxx</div>
                  </div>
                  <div>
                    <label className="form-label">Store Address</label>
                    <textarea className="form-input" rows={2} value={(s.address as string) || ''} onChange={e => f('address', e.target.value)} placeholder="Full store address" style={{ resize: 'vertical' }} />
                  </div>
                </div>
                <div style={footerBar}>
                  <button className="btn-primary" onClick={() => showToast('Contact details saved')}>Save Changes</button>
                </div>
              </div>
            )}

            {tab === 'social' && (
              <div className="card" style={{ padding: 24, maxWidth: 640 }}>
                <SectionHeader title="Social Media Links" sub="Links displayed in the storefront footer" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {([
                    { key: 'facebook',  label: 'Facebook Page URL',  placeholder: 'https://facebook.com/yourpage' },
                    { key: 'instagram', label: 'Instagram Profile URL', placeholder: 'https://instagram.com/yourhandle' },
                    { key: 'tiktok',   label: 'TikTok Profile URL',  placeholder: 'https://tiktok.com/@yourhandle' },
                    { key: 'twitter',  label: 'X / Twitter URL',     placeholder: 'https://twitter.com/yourhandle' },
                  ] as { key: string; label: string; placeholder: string }[]).map(({ key, label, placeholder }) => (
                    <div key={key}>
                      <label className="form-label">{label}</label>
                      <input className="form-input" value={(s[key] as string) || ''} onChange={e => f(key, e.target.value)} placeholder={placeholder} />
                    </div>
                  ))}
                </div>
                <div style={footerBar}>
                  <button className="btn-primary" onClick={() => showToast('Social links saved')}>Save Changes</button>
                </div>
              </div>
            )}

            {tab === 'payment' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
                <BankConnectionCard shopId={shopId} />
                <div className="card" style={{ padding: 24 }}>
                  <SectionHeader title="Payment Methods" sub="Select which methods customers can choose at checkout" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <Toggle checked={!!s.paymentFpx}     onChange={v => f('paymentFpx',     v)} label="Online Banking (FPX)" />
                    <Toggle checked={!!s.paymentCard}    onChange={v => f('paymentCard',    v)} label="Credit / Debit Card" />
                    <Toggle checked={!!s.paymentEwallet} onChange={v => f('paymentEwallet', v)} label="E-Wallet (Touch 'n Go, GrabPay, Boost)" />
                    <Toggle checked={!!s.paymentCash}    onChange={v => f('paymentCash',    v)} label="Cash on Pickup" />
                  </div>
                  <div style={footerBar}>
                    <button className="btn-primary" onClick={() => showToast('Payment methods saved')}>Save Changes</button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </MyStoreShell>
  )
}

/* ── Bank Connection Card ─────────────────────────── */
function BankConnectionCard({ shopId }: { shopId: string }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [status, setStatus] = useState<{
    bankConnected: boolean; bankName: string | null; bankAccountName: string | null
    bankAccountNo: string | null; billplzEmail: string | null; paymentEnabled: boolean
    plan: string; platformFeeSen: number
  } | null>(null)
  const [bankName, setBankName] = useState('')
  const [bankAccountNo, setBankAccountNo] = useState('')
  const [bankAccountName, setBankAccountName] = useState('')
  const [bankAccountNoConfirm, setBankAccountNoConfirm] = useState('')
  const [mismatchError, setMismatchError] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/payment/status?shopId=${shopId}`)
        if (res.ok) {
          const data = await res.json()
          setStatus(data)
          if (data.bankName) setBankName(data.bankName)
          if (data.bankAccountNo) setBankAccountNo(data.bankAccountNo)
          if (data.bankAccountName) setBankAccountName(data.bankAccountName)
        }
      } catch { /* ignore */ }
      setLoading(false)
    })()
  }, [shopId])

  async function handleConnect() {
    if (!bankName || !bankAccountNo || !bankAccountName) return
    if (bankAccountNo !== bankAccountNoConfirm) { setMismatchError(true); return }
    setSaving(true)
    try {
      const res = await fetch('/api/payment/connect', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopId, bankName, bankAccountNo, bankAccountName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setStatus({ bankConnected: true, bankName, bankAccountName, bankAccountNo, billplzEmail: null, paymentEnabled: true, plan: data.plan || 'starter', platformFeeSen: data.platformFeeSen || 100 })
      setToast('Bank account connected successfully')
      setTimeout(() => setToast(''), 3000)
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Failed to connect')
      setTimeout(() => setToast(''), 3000)
    }
    setSaving(false)
  }

  const planInfo = PLAN_FEE_LABELS[status?.plan || 'starter'] || PLAN_FEE_LABELS.starter
  const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }

  return (
    <div className="card" style={{ padding: 24, position: 'relative' }}>
      {toast && (
        <div style={{ position: 'absolute', top: 12, right: 12, fontSize: 12, fontWeight: 600, color: 'var(--positive)', background: 'var(--info-bg)', padding: '4px 12px', borderRadius: 6 }}>
          {toast}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Bank Account</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Connect your bank to receive payments via Billplz</div>
        </div>
        {status?.bankConnected && (
          <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 20, background: 'var(--info-bg)', color: 'var(--positive)' }}>Connected</span>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)', fontSize: 13 }}>Loading...</div>
      ) : status?.bankConnected ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginBottom: 3 }}>Bank</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{status.bankName}</div>
            </div>
            <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginBottom: 3 }}>Account Holder</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{status.bankAccountName}</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginBottom: 3 }}>Account Number</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{status.bankAccountNo}</div>
            </div>
            <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginBottom: 3 }}>Platform Fee</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{planInfo.label} &mdash; {planInfo.fee}/txn</div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>Bank Name *</label>
              <CustomSelect value={bankName} onChange={setBankName} options={MALAYSIAN_BANKS} placeholder="Select bank..." />
            </div>
            <div>
              <label style={lbl}>Account Holder *</label>
              <input className="form-input" value={bankAccountName} onChange={e => setBankAccountName(e.target.value)} placeholder="As per bank statement" />
            </div>
            <div>
              <label style={lbl}>Account Number *</label>
              <input className="form-input" value={bankAccountNo} onChange={e => { setBankAccountNo(e.target.value); setMismatchError(false) }} placeholder="e.g. 1234567890" />
            </div>
            <div>
              <label style={lbl}>Confirm Account No. *</label>
              <input className="form-input" value={bankAccountNoConfirm} onChange={e => { setBankAccountNoConfirm(e.target.value); setMismatchError(false) }} placeholder="Re-enter account number" style={mismatchError ? { borderColor: '#ef4444' } : {}} />
              {mismatchError && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>Account numbers do not match</div>}
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <button className="btn-primary" onClick={handleConnect} disabled={saving || !bankName || !bankAccountNo || !bankAccountNoConfirm || !bankAccountName} style={{ opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Connecting...' : 'Connect Bank Account'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
