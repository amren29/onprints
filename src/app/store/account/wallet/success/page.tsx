'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
// TODO [Batch G]: Replace auth-store with Supabase store-users
import { useAuthStore } from '@/lib/store/auth-store'
import { formatMYR } from '@/lib/store/pricing-engine'
import { useStore } from '@/providers/store-context'

export default function WalletSuccessPage() {
  return (
    <Suspense>
      <WalletSuccessContent />
    </Suspense>
  )
}

function WalletSuccessContent() {
  const { basePath } = useStore()
  const params = useSearchParams()
  const billplzId = params.get('billplz_id')

  const creditWallet = useAuthStore((s) => s.creditWallet)
  const currentUser = useAuthStore((s) => s.currentUser)

  const [verifying, setVerifying] = useState(!!billplzId)
  const [, setVerified] = useState(false)
  const [error, setError] = useState('')
  const [creditedAmount, setCreditedAmount] = useState(0)

  useEffect(() => {
    if (!billplzId) return

    let handled = false

    async function verify() {
      try {
        const res = await fetch(`/api/store/topup/verify?billplz_id=${billplzId}`)
        const data = await res.json()

        if (!res.ok || !data.verified) {
          setError(data.error || 'Payment could not be verified')
          setVerifying(false)
          return
        }

        if (handled) return
        handled = true

        const amt = data.amount || data.amountTotal

        // Credit wallet
        creditWallet({
          id: `we_${Date.now()}`,
          date: new Date().toISOString(),
          type: 'credit',
          category: 'topup-stripe',
          description: `Wallet top-up via Online Payment — ${formatMYR(amt)}`,
          amount: amt,
          balance: 0, // Will be calculated by store
          reference: billplzId || undefined,
          status: 'completed',
        })

        sessionStorage.removeItem('saasprint-pending-topup')
        setCreditedAmount(amt)
        setVerified(true)
        setVerifying(false)
      } catch {
        setError('Failed to verify payment. Please contact support.')
        setVerifying(false)
      }
    }

    verify()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billplzId])

  // Loading
  if (verifying) {
    return (
      <div className="space-y-6">
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-5">
            <svg className="animate-spin text-accent" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" strokeOpacity=".3"/>
              <path d="M12 2a10 10 0 0110 10" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Verifying Payment…</h1>
          <p className="text-sm text-gray-500">Please wait while we confirm your top-up.</p>
        </div>
      </div>
    )
  }

  // Error
  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-16">
          <div className="w-20 h-20 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center mx-auto mb-5">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Top-Up Issue</h1>
          <p className="text-gray-500 mb-6">{error}</p>
          <Link href={`${basePath}/account/wallet`} className="border-2 border-accent text-accent font-bold px-6 py-3 rounded-xl hover:bg-accent/5 transition">
            Back to Wallet
          </Link>
        </div>
      </div>
    )
  }

  // Success
  return (
    <div className="space-y-6">
      <div className="text-center py-12">
        <div className="w-20 h-20 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center mx-auto mb-5">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{formatMYR(creditedAmount)} Added!</h1>
        <p className="text-gray-500 mb-2">Your wallet has been topped up successfully.</p>
        <p className="text-sm font-semibold text-gray-700">
          New balance: {formatMYR(currentUser?.walletBalance ?? 0)}
        </p>
      </div>

      <div className="rounded-2xl bg-green-50 border border-green-200 p-5 text-center">
        <p className="font-semibold text-green-800 text-sm">Payment verified</p>
        <p className="text-xs text-green-600 mt-0.5">Your credit is available immediately for orders.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link href={`${basePath}/account/wallet`} className="flex-1 text-center border-2 border-accent text-accent font-bold px-6 py-3 rounded-xl hover:bg-accent/5 transition">
          Back to Wallet
        </Link>
        <Link href={`${basePath}/products`} className="flex-1 text-center bg-accent text-white font-bold px-6 py-3 rounded-xl hover:opacity-90 transition">
          Start Shopping
        </Link>
      </div>
    </div>
  )
}
