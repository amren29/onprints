'use client'

import { useState } from 'react'
import MyStoreShell from '@/components/MyStoreShell'
import { getStoreSettings, saveStoreSettings } from '@/lib/db/storefront'
import { useShop } from '@/providers/shop-provider'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

/* -- Icons ------------------------------------------------ */
const SaveIcon  = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>)
const CheckIcon = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>)

/* -- Helpers ---------------------------------------------- */
function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</div>
      {sub && <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

/* ========================================================= */
export default function SeoPage() {
  const { shopId } = useShop()
  const qc = useQueryClient()

  const { data: settingsRow } = useQuery({
    queryKey: ['store-settings', shopId],
    queryFn: () => getStoreSettings(shopId),
    enabled: !!shopId,
  })

  const [hydrated, setHydrated] = useState(false)
  const [saved, setSaved] = useState(false)

  // Form state
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDescription, setSeoDescription] = useState('')
  const [ogImage, setOgImage] = useState('')
  const [googleVerification, setGoogleVerification] = useState('')
  const [analyticsId, setAnalyticsId] = useState('')
  const [facebookPixelId, setFacebookPixelId] = useState('')
  const [defaultOgImage, setDefaultOgImage] = useState('')
  const [twitterCardType, setTwitterCardType] = useState<'summary' | 'summary_large_image'>('summary')

  // Hydrate from DB
  if (settingsRow && !hydrated) {
    const s = settingsRow.config
    setSeoTitle((s.seoTitle as string) || '')
    setSeoDescription((s.seoDescription as string) || '')
    setOgImage((s.ogImage as string) || '')
    setGoogleVerification((s.googleVerification as string) || '')
    setAnalyticsId((s.analyticsId as string) || '')
    setFacebookPixelId((s.facebookPixelId as string) || '')
    setDefaultOgImage((s.defaultOgImage as string) || '')
    setTwitterCardType((s.twitterCardType as 'summary' | 'summary_large_image') || 'summary')
    setHydrated(true)
  }

  const saveMut = useMutation({
    mutationFn: () => {
      const config = {
        ...(settingsRow?.config || {}),
        seoTitle,
        seoDescription,
        ogImage,
        googleVerification,
        analyticsId,
        facebookPixelId,
        defaultOgImage,
        twitterCardType,
      }
      return saveStoreSettings(shopId, config)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['store-settings', shopId] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    },
    onError: (err: any) => {
      console.error('[saveStoreSettings]', err)
      alert('Failed to save: ' + (err?.message || 'Unknown error'))
    },
  })

  if (!settingsRow && !hydrated) return <MyStoreShell><div style={{ padding: 40 }}>Loading...</div></MyStoreShell>

  const handleSave = () => {
    if (saveMut.isPending) return
    saveMut.mutate()
  }

  return (
    <MyStoreShell>
      <div className="page-header">
        <div>
          <div className="page-title">SEO</div>
          <div className="page-subtitle">Optimize your store for search engines</div>
        </div>
        <div className="page-actions">
          <button className="btn-primary" onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {saved ? <><CheckIcon /> Saved</> : <><SaveIcon /> Save Changes</>}
          </button>
        </div>
      </div>

      <div className="page-scroll">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
          {/* -- Left Column -- */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Homepage Meta */}
            <div className="card" style={{ padding: 24 }}>
              <SectionHeader title="Homepage Meta" sub="Controls how your store appears in search engine results" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span>SEO Title</span>
                    <span style={{ fontSize: 11.5, color: seoTitle.length > 60 ? 'var(--negative)' : 'var(--text-muted)', fontWeight: 400 }}>{seoTitle.length}/60</span>
                  </label>
                  <input className="form-input" value={seoTitle} onChange={e => setSeoTitle(e.target.value)} maxLength={60} placeholder="Page title shown in search results" />
                </div>
                <div>
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span>Meta Description</span>
                    <span style={{ fontSize: 11.5, color: seoDescription.length > 160 ? 'var(--negative)' : 'var(--text-muted)', fontWeight: 400 }}>{seoDescription.length}/160</span>
                  </label>
                  <textarea className="form-input" rows={3} value={seoDescription} onChange={e => setSeoDescription(e.target.value)} maxLength={160} placeholder="Brief description shown below the title in search results" style={{ resize: 'vertical' }} />
                </div>
                <div>
                  <label className="form-label">Open Graph Image URL</label>
                  <input className="form-input" value={ogImage} onChange={e => setOgImage(e.target.value)} placeholder="https://... (image shown when shared on social media)" />
                </div>
                {/* Google Preview */}
                <div style={{ marginTop: 6 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Google Preview</div>
                  <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
                    <div style={{ fontSize: 18, fontWeight: 400, color: '#1a0dab', lineHeight: 1.3, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {seoTitle || 'Your Store Title'}
                    </div>
                    <div style={{ fontSize: 13, color: '#006621', marginBottom: 4 }}>https://yourstore.my</div>
                    <div style={{ fontSize: 13, color: '#545454', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {seoDescription || 'Your store description will appear here...'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* -- Right Column -- */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Google & Analytics */}
            <div className="card" style={{ padding: 24 }}>
              <SectionHeader title="Google & Analytics" sub="Connect tracking and verification services" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label className="form-label">Google Site Verification</label>
                  <input className="form-input" value={googleVerification} onChange={e => setGoogleVerification(e.target.value)} placeholder="Google Search Console verification code" />
                </div>
                <div>
                  <label className="form-label">Google Analytics ID</label>
                  <input className="form-input" value={analyticsId} onChange={e => setAnalyticsId(e.target.value)} placeholder="G-XXXXXXXXXX" style={{ fontFamily: 'monospace' }} />
                </div>
                <div>
                  <label className="form-label">Facebook Pixel ID</label>
                  <input className="form-input" value={facebookPixelId} onChange={e => setFacebookPixelId(e.target.value)} placeholder="Enter Facebook Pixel ID" style={{ fontFamily: 'monospace' }} />
                </div>
              </div>
            </div>

            {/* Sitemap */}
            <div className="card" style={{ padding: 24 }}>
              <SectionHeader title="Sitemap" sub="Help search engines discover your store pages" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Status:</span>
                  <span className="badge badge-success">Auto-generated</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>URL:</span>
                  <span style={{ fontSize: 13, fontFamily: 'monospace', color: 'var(--accent)' }}>yourstore.my/sitemap.xml</span>
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                  Your sitemap is automatically updated when you add or modify products
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* -- Social Sharing (full width) -- */}
        <div className="card" style={{ padding: 24, marginTop: 16 }}>
          <SectionHeader title="Social Sharing" sub="Default settings when your store pages are shared on social media" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label className="form-label">Default OG Image URL</label>
              <input className="form-input" value={defaultOgImage} onChange={e => setDefaultOgImage(e.target.value)} placeholder="https://... (fallback image for social sharing)" />
            </div>
            <div>
              <label className="form-label">Twitter Card Type</label>
              <div style={{ display: 'flex', gap: 0, marginTop: 4 }}>
                {(['summary', 'summary_large_image'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setTwitterCardType(type)}
                    style={{
                      padding: '7px 16px', fontSize: 12.5, fontWeight: 500, fontFamily: 'var(--font)',
                      border: '1px solid var(--border)',
                      borderRight: type === 'summary' ? 'none' : '1px solid var(--border)',
                      borderRadius: type === 'summary' ? '6px 0 0 6px' : '0 6px 6px 0',
                      cursor: 'pointer',
                      background: twitterCardType === type ? 'var(--accent)' : 'var(--bg-card)',
                      color: twitterCardType === type ? '#fff' : 'var(--text-primary)',
                      transition: 'all 0.15s',
                    }}
                  >
                    {type === 'summary' ? 'Summary' : 'Summary Large Image'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MyStoreShell>
  )
}
