'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAffiliateStore } from '@/lib/store/affiliate-store'

export default function AffiliateCapture() {
  const searchParams = useSearchParams()
  const captureRef = useAffiliateStore((s) => s.captureRef)

  useEffect(() => {
    const ref = searchParams.get('ref')
    if (ref) captureRef(ref)
  }, [searchParams, captureRef])

  return null
}
