'use client'

import { Suspense } from 'react'
import { useParams } from 'next/navigation'
import { StoreProvider } from '@/providers/store-context'
import AffiliateCapture from '@/components/store/AffiliateCapture'
import CartTracker from '@/components/store/CartTracker'

export default function SlugStoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const params = useParams()
  const slug = params.slug as string

  return (
    <StoreProvider slug={slug}>
      <div
        id="store-scroll-root"
        className="store-root antialiased"
        style={{
          position: 'fixed',
          inset: 0,
          overflow: 'auto',
          background: '#ffffff',
          color: '#111827',
          zIndex: 0,
        }}
      >
        <Suspense>
          <AffiliateCapture />
          <CartTracker />
        </Suspense>
        {children}
      </div>
    </StoreProvider>
  )
}
