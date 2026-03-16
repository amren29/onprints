'use client'

import MyStoreShell from '@/components/MyStoreShell'
import Link from 'next/link'

const ExternalLinkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
)

export default function StorePreviewPage() {
  return (
    <MyStoreShell>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Header bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 20px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-card)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#22c55e',
              }}
            />
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
              Live Store Preview
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link
              href="/storefront/editor"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                fontWeight: 500,
                color: '#fff',
                padding: '5px 14px',
                borderRadius: 'var(--r-md)',
                border: 'none',
                background: 'var(--accent, #006AFF)',
                textDecoration: 'none',
                cursor: 'pointer',
              }}
            >
              Edit Store
            </Link>
            <Link
              href="/store"
              target="_blank"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                fontWeight: 450,
                color: 'var(--text-secondary)',
                padding: '5px 12px',
                borderRadius: 'var(--r-md)',
                border: '1px solid var(--border)',
                background: 'var(--bg-card)',
                textDecoration: 'none',
                cursor: 'pointer',
              }}
            >
              Open in new tab <ExternalLinkIcon />
            </Link>
          </div>
        </div>

        {/* Iframe */}
        <div style={{ flex: 1, minHeight: 0 }}>
          <iframe
            src="/store"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
            }}
            title="SaasPrint Store"
          />
        </div>
      </div>
    </MyStoreShell>
  )
}
