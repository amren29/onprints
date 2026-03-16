'use client'

import { useAuthStore } from '@/lib/store/auth-store'
import { useStore } from '@/providers/store-context'

interface Props {
  returnTo?: string
  className?: string
  onConnected?: () => void
}

/**
 * Shows "Connect Canva" or "Canva Connected" based on auth state.
 * If not connected, redirects to the OAuth flow.
 * If connected, calls onConnected callback (e.g. open design picker).
 */
export default function CanvaConnectButton({ returnTo = '/', className = '', onConnected }: Props) {
  const currentUser = useAuthStore((s) => s.currentUser)
  const clearCanvaTokens = useAuthStore((s) => s.clearCanvaTokens)
  const { basePath } = useStore()

  const isConnected = !!currentUser?.canvaTokens?.accessToken
  const isExpired = currentUser?.canvaTokens?.expiresAt
    ? currentUser.canvaTokens.expiresAt < Date.now()
    : false

  function handleClick() {
    if (!currentUser) {
      // Not logged in — redirect to login
      window.location.href = `${basePath}/auth/signin?returnTo=` + encodeURIComponent(returnTo)
      return
    }

    if (isConnected && !isExpired) {
      onConnected?.()
      return
    }

    // Start OAuth flow
    window.location.href = `/api/store/canva/authorize?returnTo=${encodeURIComponent(returnTo)}`
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={handleClick}
        className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all w-full ${
          isConnected && !isExpired
            ? 'bg-accent text-white hover:opacity-90'
            : 'bg-[#7B2FBE] text-white hover:bg-[#6B21A8]'
        }`}
      >
        {/* Canva-style icon */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="16"/>
          <line x1="8" y1="12" x2="16" y2="12"/>
        </svg>
        {isConnected && !isExpired ? 'Design with Canva' : 'Connect Canva'}
      </button>
      {isConnected && (
        <button
          onClick={(e) => { e.stopPropagation(); clearCanvaTokens() }}
          title="Disconnect Canva"
          className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition shrink-0"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/>
          </svg>
        </button>
      )}
    </div>
  )
}
