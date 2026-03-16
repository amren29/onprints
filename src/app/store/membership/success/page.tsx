'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/store/Navbar'
import Footer from '@/components/store/Footer'
// TODO [Batch G]: Replace auth-store with Supabase store-users
import { useAuthStore } from '@/lib/store/auth-store'
// TODO [Batch G]: Replace membership-store with Supabase
import { useMembershipStore } from '@/lib/store/membership-store'

export default function MembershipSuccessPage() {
  return (
    <Suspense>
      <MembershipSuccessContent />
    </Suspense>
  )
}

function MembershipSuccessContent() {
  const params = useSearchParams()
  const billplzId = params.get('billplz_id')
  const isBankTransfer = params.get('method') === 'bank-transfer'

  const setMembership = useAuthStore((s) => s.setMembership)
  const addMembershipPurchase = useAuthStore((s) => s.addMembershipPurchase)
  const currentUser = useAuthStore((s) => s.currentUser)
  const tiers = useMembershipStore((s) => s.tiers)

  const [verifying, setVerifying] = useState(!!billplzId)
  const [, setVerified] = useState(false)
  const [error, setError] = useState('')
  const [tierName, setTierName] = useState('')

  // Billplz verification flow
  useEffect(() => {
    if (!billplzId) return

    let handled = false

    async function verify() {
      try {
        const res = await fetch(`/api/store/membership/verify?billplz_id=${billplzId}`)
        const data = await res.json()

        if (!res.ok || !data.verified) {
          setError(data.error || 'Payment could not be verified')
          setVerifying(false)
          return
        }

        if (handled) return
        handled = true

        // Recover pending membership info
        const pendingRaw = sessionStorage.getItem('saasprint-pending-membership')
        let tierId = data.tierId
        let tName = data.tierName
        let discountRate = 0
        let price = data.amountTotal

        if (pendingRaw) {
          try {
            const pending = JSON.parse(pendingRaw)
            tierId = pending.tierId || tierId
            tName = pending.tierName || tName
            discountRate = pending.discountRate || 0
            price = pending.price || price
          } catch { /* ignore */ }
        }

        // Look up discountRate from tiers if not in pending
        if (!discountRate) {
          const tier = tiers.find((t) => t.id === tierId)
          discountRate = tier?.discountRate ?? 0
        }

        const now = new Date()
        const expiry = new Date(now)
        expiry.setFullYear(expiry.getFullYear() + 1)

        // Agents cannot have membership — skip activation
        if (currentUser?.role === 'agent') {
          setError('Agent accounts cannot subscribe to membership. You already have agent pricing.')
          setVerifying(false)
          return
        }

        // Activate membership
        setMembership({
          tierId,
          tierName: tName,
          discountRate,
          startDate: now.toISOString(),
          expiryDate: expiry.toISOString(),
          status: 'active',
        })

        // Record purchase
        if (currentUser) {
          addMembershipPurchase({
            id: `mp_${Date.now()}`,
            userId: currentUser.id,
            tierId,
            tierName: tName,
            price,
            paymentMethod: 'online',
            paymentStatus: 'completed',
            paymentRef: billplzId || undefined,
            purchasedAt: now.toISOString(),
            activatedAt: now.toISOString(),
          })
        }

        sessionStorage.removeItem('saasprint-pending-membership')
        setTierName(tName)
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
      <>
        <Navbar />
        <main className="max-w-lg mx-auto px-4 py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-5">
            <svg className="animate-spin text-accent" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" strokeOpacity=".3"/>
              <path d="M12 2a10 10 0 0110 10" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Verifying Payment…</h1>
          <p className="text-sm text-gray-500">Please wait while we confirm your membership payment.</p>
        </main>
        <Footer />
      </>
    )
  }

  // Error
  if (error) {
    return (
      <>
        <Navbar />
        <main className="max-w-lg mx-auto px-4 py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center mx-auto mb-5">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Issue</h1>
          <p className="text-gray-500 mb-6">{error}</p>
          <Link href="/store/account/membership" className="border-2 border-accent text-accent font-bold px-6 py-3 rounded-xl hover:bg-accent/5 transition">
            Try Again
          </Link>
        </main>
        <Footer />
      </>
    )
  }

  // Bank transfer submitted
  if (isBankTransfer) {
    return (
      <>
        <Navbar />
        <main className="max-w-lg mx-auto px-4 py-16 text-center">
          <div className="w-20 h-20 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center mx-auto mb-5">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Receipt Submitted</h1>
          <p className="text-gray-500 mb-6">
            Your bank transfer receipt has been submitted. Your membership will be activated once our admin team verifies payment.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/store/account/membership" className="border-2 border-accent text-accent font-bold px-6 py-3 rounded-xl hover:bg-accent/5 transition">
              Back to Membership
            </Link>
            <Link href="/store/products" className="bg-accent text-white font-bold px-6 py-3 rounded-xl hover:opacity-90 transition">
              Browse Products
            </Link>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  // Payment success
  return (
    <>
      <Navbar />
      <main className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center mx-auto mb-5">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Membership Activated!</h1>
        <p className="text-gray-500 mb-8">
          You&apos;re now a <span className="font-semibold text-gray-700">{tierName}</span> member. Your discount is active on all products.
        </p>

        <div className="rounded-2xl bg-green-50 border border-green-200 p-5 mb-8">
          <p className="font-semibold text-green-800 text-sm">Payment verified</p>
          <p className="text-xs text-green-600 mt-0.5">Your membership is valid for 12 months.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/store/account" className="border-2 border-accent text-accent font-bold px-6 py-3 rounded-xl hover:bg-accent/5 transition">
            Go to Dashboard
          </Link>
          <Link href="/store/products" className="bg-accent text-white font-bold px-6 py-3 rounded-xl hover:opacity-90 transition">
            Start Shopping
          </Link>
        </div>
      </main>
      <Footer />
    </>
  )
}
