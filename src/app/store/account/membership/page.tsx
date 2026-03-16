'use client'

import { useState, useEffect } from 'react'
// TODO [Batch G]: Replace auth-store with Supabase store-users
import { useAuthStore } from '@/lib/store/auth-store'
// TODO [Batch G]: Replace membership-store with Supabase
import { useMembershipStore } from '@/lib/store/membership-store'
import { formatMYR } from '@/lib/store/pricing-engine'
import { MembershipPurchase } from '@/types/store'
// TODO [Batch H]: Replace finance-store with db/memberships — customer-facing membership page
import { initFinanceData, createMembershipRequest } from '@/lib/finance-store'
import { fetchStoreSettings, type StoreSettings, DEFAULTS as SETTINGS_DEFAULTS } from '@/lib/store-settings-store'

const TIER_COLORS: Record<string, string> = {
  Essential: 'border-gray-200 bg-gray-50',
  Bronze: 'border-amber-200 bg-amber-50',
  Silver: 'border-slate-200 bg-slate-50',
  Gold: 'border-yellow-200 bg-yellow-50',
  Platinum: 'border-accent/30 bg-accent/5',
}

type PaymentFlow = null | { tierId: string; tierName: string; price: number; discountRate: number; method: 'online' | 'bank-transfer' }

export default function AccountMembershipPage() {
  const user = useAuthStore((s) => s.currentUser)
  const addMembershipPurchase = useAuthStore((s) => s.addMembershipPurchase)
  const tiers = useMembershipStore((s) => s.tiers)

  const [storeSettings, setStoreSettings] = useState<StoreSettings>(SETTINGS_DEFAULTS)

  // Load store settings from Supabase
  useEffect(() => {
    fetchStoreSettings().then(setStoreSettings).catch(() => {})
  }, [])

  // Rehydrate to pick up admin-side changes (approve/suspend/etc.)
  useEffect(() => { useAuthStore.persist.rehydrate() }, [])

  const [flow, setFlow] = useState<PaymentFlow>(null)
  const [loading, setLoading] = useState(false)
  const [receiptFile, setReceiptFile] = useState<{ data: string; name: string } | null>(null)
  const [error, setError] = useState('')

  if (!user) return null

  // Agents get their own discount — membership is not available
  if (user.role === 'agent') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Membership</h1>
          <p className="text-sm text-gray-500 mt-1">Subscribe to a membership tier and enjoy discounts on all products.</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
          <p className="text-sm font-semibold text-blue-800">Agent Account</p>
          <p className="text-xs text-blue-600 mt-1">
            You have an agent account with {Math.round((user.discountRate ?? 0) * 100)}% discount on all products. Membership subscriptions are not available for agent accounts.
          </p>
        </div>
      </div>
    )
  }

  const activeMembership = user.membership && (user.membership.status ?? 'active') === 'active' && new Date(user.membership.expiryDate) > new Date() ? user.membership : null
  const suspendedMembership = user.membership && (user.membership.status === 'suspended' || user.membership.status === 'inactive') ? user.membership : null
  const pendingPurchases = (user.membershipPurchases ?? []).filter((p) => p.paymentStatus === 'pending')

  async function handleOnlinePayment() {
    if (!flow) return
    setLoading(true)
    setError('')

    try {
      // Save pending info to sessionStorage
      sessionStorage.setItem('saasprint-pending-membership', JSON.stringify({
        tierId: flow.tierId,
        tierName: flow.tierName,
        price: flow.price,
        discountRate: flow.discountRate,
      }))

      const res = await fetch('/api/store/membership/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tierId: flow.tierId,
          tierName: flow.tierName,
          price: flow.price,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed')
      setLoading(false)
    }
  }

  function handleReceiptUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setReceiptFile({ data: reader.result as string, name: file.name })
    }
    reader.readAsDataURL(file)
  }

  function handleBankTransferSubmit() {
    if (!flow || !receiptFile) return
    setLoading(true)

    const purchase: MembershipPurchase = {
      id: `mp_${Date.now()}`,
      userId: user!.id,
      tierId: flow.tierId,
      tierName: flow.tierName,
      price: flow.price,
      paymentMethod: 'bank-transfer',
      paymentStatus: 'pending',
      receiptData: receiptFile.data,
      receiptFileName: receiptFile.name,
      purchasedAt: new Date().toISOString(),
    }

    addMembershipPurchase(purchase)

    // Also create a MembershipRequest in finance-store so admin can see & approve it
    initFinanceData()
    createMembershipRequest({
      customerName: user!.name,
      customerEmail: user!.email,
      tierId: flow.tierId,
      tierName: flow.tierName,
      price: flow.price,
      paymentMethod: 'bank-transfer',
      status: 'pending',
      receiptFileName: receiptFile.name,
      receiptData: receiptFile.data,
      submittedAt: new Date().toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }),
    })

    setLoading(false)
    setFlow(null)
    setReceiptFile(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Membership</h1>
        <p className="text-sm text-gray-500 mt-1">Subscribe to a membership tier and enjoy discounts on all products.</p>
      </div>

      {/* Active membership */}
      {activeMembership && (
        <div className="bg-gradient-to-r from-accent/5 to-blue-50 rounded-2xl border border-accent/20 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-accent uppercase tracking-wider">Active Membership</p>
              <p className="text-lg font-bold text-gray-900 mt-0.5">{activeMembership.tierName}</p>
              <p className="text-xs text-gray-500 mt-1">
                {Math.round(activeMembership.discountRate * 100)}% discount on all products
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Expires</p>
              <p className="text-sm font-semibold text-gray-900">
                {new Date(activeMembership.expiryDate).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Suspended / Inactive membership */}
      {suspendedMembership && (
        <div className={`rounded-2xl border p-5 ${suspendedMembership.status === 'suspended' ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs font-medium uppercase tracking-wider ${suspendedMembership.status === 'suspended' ? 'text-amber-600' : 'text-red-600'}`}>
                {suspendedMembership.status === 'suspended' ? 'Membership Suspended' : 'Membership Inactive'}
              </p>
              <p className="text-lg font-bold text-gray-900 mt-0.5">{suspendedMembership.tierName}</p>
              <p className="text-xs text-gray-500 mt-1">
                {suspendedMembership.status === 'suspended'
                  ? 'Your membership has been temporarily suspended. Please contact support for more information.'
                  : 'Your membership has been deactivated. Please contact support or subscribe to a new plan.'}
              </p>
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${suspendedMembership.status === 'suspended' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
              {suspendedMembership.status === 'suspended' ? 'Suspended' : 'Inactive'}
            </span>
          </div>
        </div>
      )}

      {/* Pending purchases (hide if already active) */}
      {!activeMembership && pendingPurchases.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <h2 className="text-sm font-bold text-amber-800 mb-2">Pending Approval</h2>
          {pendingPurchases.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-sm">
              <div>
                <p className="font-semibold text-amber-900">{p.tierName} Membership</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Submitted on {new Date(p.purchasedAt).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {p.receiptFileName && ` — Receipt: ${p.receiptFileName}`}
                </p>
              </div>
              <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">Pending</span>
            </div>
          ))}
        </div>
      )}

      {/* Tier selection (if no active flow) */}
      {!flow && (
        <div>
          <h2 className="text-sm font-bold text-gray-900 mb-4">Choose a Tier</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {tiers.map((tier) => {
              const isActive = activeMembership?.tierId === tier.id
              const colors = TIER_COLORS[tier.name] || 'border-gray-200 bg-gray-50'
              return (
                <div key={tier.id} className={`rounded-2xl border p-5 ${colors} relative`}>
                  {isActive && (
                    <span className="absolute top-3 right-3 text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Current</span>
                  )}
                  <p className="font-bold text-gray-900">{tier.name}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{Math.round(tier.discountRate * 100)}%<span className="text-sm font-normal text-gray-500 ml-1">off</span></p>
                  <p className="text-sm font-semibold text-gray-700 mt-2">{formatMYR(tier.price)}<span className="text-xs font-normal text-gray-500">/year</span></p>
                  {tier.description && <p className="text-xs text-gray-500 mt-1">{tier.description}</p>}
                  {!isActive && (
                    <button
                      onClick={() => setFlow({ tierId: tier.id, tierName: tier.name, price: tier.price, discountRate: tier.discountRate, method: 'online' })}
                      className="mt-3 w-full py-2 rounded-xl text-sm font-semibold bg-accent text-white hover:opacity-90 transition"
                    >
                      Subscribe
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Payment method selection */}
      {flow && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-bold text-gray-900">Subscribe to {flow.tierName}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{formatMYR(flow.price)} / year — {Math.round(flow.discountRate * 100)}% discount</p>
            </div>
            <button onClick={() => { setFlow(null); setError(''); setReceiptFile(null) }} className="text-sm text-gray-400 hover:text-gray-600">Cancel</button>
          </div>

          {/* Method toggle */}
          <div className="flex gap-2 mb-5">
            <button
              onClick={() => setFlow({ ...flow, method: 'online' })}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition ${
                flow.method === 'online' ? 'border-accent bg-accent/5 text-accent' : 'border-gray-100 text-gray-600'
              }`}
            >
              Pay Online
            </button>
            <button
              onClick={() => setFlow({ ...flow, method: 'bank-transfer' })}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition ${
                flow.method === 'bank-transfer' ? 'border-accent bg-accent/5 text-accent' : 'border-gray-100 text-gray-600'
              }`}
            >
              Bank Transfer
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
          )}

          {flow.method === 'online' && (
            <div>
              <p className="text-sm text-gray-500 mb-4">You&apos;ll be redirected to Billplz to complete payment via FPX, Card, or e-Wallet.</p>
              <button
                onClick={handleOnlinePayment}
                disabled={loading}
                className="w-full py-3 rounded-xl font-bold text-sm bg-accent text-white hover:opacity-90 transition disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity=".3"/><path d="M12 2a10 10 0 0110 10" strokeLinecap="round"/></svg>
                    Redirecting…
                  </>
                ) : (
                  `Pay ${formatMYR(flow.price)}`
                )}
              </button>
            </div>
          )}

          {flow.method === 'bank-transfer' && (
            <div className="space-y-4">
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm">
                <p className="font-semibold text-amber-800 mb-1">Bank Transfer Details</p>
                <div className="space-y-1 text-amber-700 text-xs">
                  <div className="flex gap-3"><span className="font-medium w-20">Bank</span><span>{storeSettings.bankName || '—'}</span></div>
                  <div className="flex gap-3"><span className="font-medium w-20">Account</span><span>{storeSettings.bankAccountNo || '—'}</span></div>
                  <div className="flex gap-3"><span className="font-medium w-20">Name</span><span>{storeSettings.bankAccountName || '—'}</span></div>
                  <div className="flex gap-3"><span className="font-medium w-20">Amount</span><span className="font-bold">{formatMYR(flow.price)}</span></div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Upload Transfer Receipt <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleReceiptUpload}
                  className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-accent/10 file:text-accent hover:file:bg-accent/20 transition"
                />
                {receiptFile && (
                  <p className="text-xs text-green-600 mt-1">Uploaded: {receiptFile.name}</p>
                )}
              </div>

              <button
                onClick={handleBankTransferSubmit}
                disabled={loading || !receiptFile}
                className="w-full py-3 rounded-xl font-bold text-sm bg-accent text-white hover:opacity-90 transition disabled:opacity-60"
              >
                {loading ? 'Submitting…' : 'Submit for Approval'}
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
