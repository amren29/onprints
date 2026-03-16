'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/auth-store'

export function useRequireAuth() {
  const router = useRouter()
  const currentUser = useAuthStore((s) => s.currentUser)
  const isHydrated = useAuthStore((s) => s.isHydrated)

  useEffect(() => {
    if (isHydrated && !currentUser) {
      router.replace('/store/auth/signin')
    }
  }, [isHydrated, currentUser, router])

  return { user: currentUser, isLoading: !isHydrated }
}
