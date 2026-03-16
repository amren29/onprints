'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/lib/store/auth-store'

/**
 * Hook that reads Canva tokens from the `canva_tokens` cookie
 * (set by /api/canva/callback) and stores them in the auth store.
 * Call this in any page where the user may return from Canva OAuth.
 */
export function useCanvaTokensFromCookie() {
  const setCanvaTokens = useAuthStore((s) => s.setCanvaTokens)
  const currentUser = useAuthStore((s) => s.currentUser)

  useEffect(() => {
    if (!currentUser) return

    const match = document.cookie.match(/(?:^|;\s*)canva_tokens=([^;]+)/)
    if (!match) return

    try {
      const tokens = JSON.parse(decodeURIComponent(match[1]))
      if (tokens.accessToken && tokens.refreshToken && tokens.expiresAt) {
        setCanvaTokens(tokens)
        // Clear the cookie
        document.cookie = 'canva_tokens=; path=/; max-age=0'
      }
    } catch {
      // Ignore parse errors
    }
  }, [currentUser, setCanvaTokens])
}
