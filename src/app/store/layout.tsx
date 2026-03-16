'use client'

import { Suspense } from 'react'
import AffiliateCapture from '@/components/store/AffiliateCapture'
import CartTracker from '@/components/store/CartTracker'

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
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
  )
}
