'use client'

import { useState, useEffect } from 'react'
// TODO [Batch G]: Replace auth-store with Supabase store-users
import { useAuthStore } from '@/lib/store/auth-store'
import { getStoreProducts, getStoreCategories } from '@/lib/store/catalog-bridge'
// TODO [Batch H]: Replace finance-store with db/affiliates — customer-facing affiliate dashboard
import { getAffiliates, getAffiliateOrders, getAffiliatePayouts, getPaidAffiliateOrderIds, getUnpaidAffiliateOrders, createAffiliatePayout, initFinanceData } from '@/lib/finance-store'
import { creditStoreUserWallet } from '@/lib/store/auth-store'
import type { Product } from '@/types/store'

export default function AffiliatePage() {
  const user = useAuthStore((s) => s.currentUser)
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null)
  const [synced, setSynced] = useState(false)
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<{ id: string; label: string }[]>([])

  // Load products and categories from Supabase (async)
  useEffect(() => {
    let cancelled = false
    async function loadCatalog() {
      try {
        const [prods, cats] = await Promise.all([getStoreProducts(), getStoreCategories()])
        if (!cancelled) {
          setAllProducts(prods)
          setCategories(cats)
        }
      } catch {}
    }
    loadCatalog()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    initFinanceData()
    if (!user) return
    const code = user.affiliateCode || user.name.split(' ')[0].toUpperCase()
    const affiliate = getAffiliates().find(a => a.code === code)
    if (!affiliate) return

    // Auto-sync: any unpaid affiliate orders → create payout + credit wallet
    const unpaid = getUnpaidAffiliateOrders(code)
    if (unpaid.length > 0) {
      const orderTotal = Math.round(unpaid.reduce((s, o) => s + o.orderTotal, 0) * 100) / 100
      const commission = Math.round(orderTotal * (affiliate.commissionRate / 100) * 100) / 100
      const now = new Date().toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
      createAffiliatePayout({
        affiliateId: affiliate.id,
        affiliateName: affiliate.name,
        affiliateCode: affiliate.code,
        commissionRate: affiliate.commissionRate,
        orderIds: unpaid.map(o => o.id),
        orderTotal,
        commissionAmount: commission,
        paidAt: now,
      })
      creditStoreUserWallet(user.email, {
        id: `we_aff_sync_${Date.now()}`,
        date: new Date().toISOString(),
        type: 'credit',
        category: 'commission',
        description: `Affiliate commission — ${unpaid.length} order${unpaid.length !== 1 ? 's' : ''}`,
        amount: commission,
        status: 'completed',
      })
      // Rehydrate to pick up wallet changes
      useAuthStore.persist.rehydrate()
    }
    setSynced(true)
  }, [user])

  if (!user) return null

  const code = user.affiliateCode || user.name.split(' ')[0].toUpperCase()
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://onprints.my'

  function handleCopyProduct(slug: string) {
    const link = `${baseUrl}/store/products/${slug}?ref=${code}`
    navigator.clipboard.writeText(link)
    setCopiedSlug(slug)
    setTimeout(() => setCopiedSlug(null), 2000)
  }

  const affiliate = getAffiliates().find(a => a.code === code)
  const assignedIds = new Set(affiliate?.assignedProducts ?? [])
  const activeProducts = allProducts.filter((p) => p.isActive && assignedIds.has(p.id))
  const referredOrders = getAffiliateOrders().filter(o => o.affiliateCode === code)
  const paidIds = getPaidAffiliateOrderIds()
  const totalEarnings = referredOrders.reduce((s, o) => s + o.orderTotal, 0)
  const commissionRate = affiliate?.commissionRate ?? 0
  const estimatedCommission = Math.round(totalEarnings * (commissionRate / 100) * 100) / 100
  const myPayouts = getAffiliatePayouts().filter(p => p.affiliateCode === code)
  const totalPaidOut = myPayouts.reduce((s, p) => s + p.commissionAmount, 0)

  const fmt = (v: number) => `RM ${v.toFixed(2)}`

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Affiliate Programme</h1>
        <p className="text-sm text-gray-500 mt-1">
          Share your unique link and earn commission for referred orders.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Referred Orders</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{referredOrders.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Total Sales</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{fmt(totalEarnings)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Commission Earned</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{fmt(estimatedCommission)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{commissionRate}% rate</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Paid to Wallet</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{fmt(totalPaidOut)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{myPayouts.length} payout{myPayouts.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Referred orders */}
      {referredOrders.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-3">Referred Orders</h2>
          <div className="space-y-2">
            {referredOrders.map(o => {
              const isPaid = paidIds.has(o.id)
              return (
                <div key={o.id} className="flex items-center justify-between py-2 px-3 rounded-xl border border-gray-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">{o.orderId}</p>
                      {isPaid && <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase bg-green-100 text-green-700">Paid</span>}
                    </div>
                    <p className="text-xs text-gray-400">{o.orderDate} · {o.customerName}</p>
                  </div>
                  <p className="text-sm font-bold text-gray-900">{fmt(o.orderTotal)}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Per-product links */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="text-sm font-bold text-gray-900 mb-1">Product Links</h2>
        <p className="text-xs text-gray-500 mb-4">Share a direct link to any product with your affiliate code attached.</p>

        {activeProducts.length === 0 ? (
          <p className="text-sm text-gray-400">No products assigned yet. Contact admin for access.</p>
        ) : (
          <div className="space-y-2">
            {activeProducts.map((product) => {
              const catLabel = categories.find((c) => c.id === product.category)?.label ?? product.category
              const productLink = `${baseUrl}/store/products/${product.slug}?ref=${code}`
              const isCopied = copiedSlug === product.slug

              return (
                <div key={product.slug} className="flex items-center gap-3 py-2.5 px-3 rounded-xl border border-gray-100 hover:border-gray-200 transition">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{product.name}</p>
                    <p className="text-xs text-gray-400 truncate">{catLabel}</p>
                  </div>
                  <input
                    readOnly
                    value={productLink}
                    className="hidden sm:block flex-1 max-w-xs border border-gray-100 rounded-lg px-3 py-1.5 text-xs font-mono text-gray-500 bg-gray-50 truncate"
                  />
                  <button
                    onClick={() => handleCopyProduct(product.slug)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 ${
                      isCopied
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-accent/10 hover:text-accent'
                    }`}
                  >
                    {isCopied ? 'Copied!' : 'Copy Link'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="text-sm font-bold text-gray-900 mb-4">How It Works</h2>
        <div className="space-y-3">
          {[
            { step: '1', title: 'Share your link', desc: 'Send your unique affiliate link to friends, customers, or on social media.' },
            { step: '2', title: 'They place an order', desc: 'When someone visits through your link and places an order, it\'s attributed to you.' },
            { step: '3', title: 'Earn commission', desc: 'Commission from approved orders is automatically credited to your wallet. Use it to pay for future orders.' },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-accent text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {item.step}
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
