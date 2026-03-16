'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/auth-store'
import { useStore } from '@/providers/store-context'

export function useRequireAuth() {
  const router = useRouter()
  const currentUser = useAuthStore((s) => s.currentUser)
  const isHydrated = useAuthStore((s) => s.isHydrated)
  const { basePath } = useStore()

  useEffect(() => {
    if (isHydrated && !currentUser) {
      router.replace(`${basePath}/auth/signin`)
    }
  }, [isHydrated, currentUser, router, basePath])

  return { user: currentUser, isLoading: !isHydrated }
}
