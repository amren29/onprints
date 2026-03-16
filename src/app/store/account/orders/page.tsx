'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
// TODO [Batch G]: Replace auth-store with Supabase store-users
import { useAuthStore } from '@/lib/store/auth-store'
import { useCartStore } from '@/lib/store/cart-store'
import { formatMYR } from '@/lib/store/pricing-engine'
import OrderStatusBadge from '@/components/store/account/OrderStatusBadge'
import { Order } from '@/types/store'
import { useStore } from '@/providers/store-context'

export default function OrdersPage() {
  const user = useAuthStore((s) => s.currentUser)
  const router = useRouter()
  const { basePath } = useStore()
  const [notice, setNotice] = useState<string | null>(null)

  if (!user) return null

  const orders = user.orders

  function canReorder(order: Order) {
    return order.status !== 'Cancelled' && (order.production === 'Completed' || order.production === 'Delivered')
  }

  async function handleQuickReorder(e: React.MouseEvent, order: Order) {
    e.preventDefault()
    e.stopPropagation()
    const result = await useCartStore.getState().reorderItems(order.items)
    const messages: string[] = []
    if (result.added > 0) messages.push(`${result.added} item${result.added > 1 ? 's' : ''} added to cart`)
    if (result.skipped.length > 0) messages.push(`${result.skipped.join(', ')} skipped`)
    if (result.priceChanged) messages.push('Prices updated')
    setNotice(messages.join(' · '))
    if (result.added > 0) setTimeout(() => router.push(`${basePath}/cart`), 1500)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">My Orders</h1>

      {notice && (
        <div className="rounded-xl bg-green-50 border border-green-200 p-3 text-sm text-green-700 flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {notice}
        </div>
      )}

      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 px-6 py-16 text-center">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-gray-200 mb-4">
            <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          </svg>
          <p className="text-sm text-gray-500 mb-4">You don&apos;t have any orders yet</p>
          <Link
            href={`${basePath}/products`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-accent hover:underline"
          >
            Browse Products
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`${basePath}/account/orders/${order.id}`}
              className="block bg-white rounded-2xl border border-gray-100 hover:border-gray-200 transition p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-sm font-bold text-gray-900">{order.id}</span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <p className="text-xs text-gray-400">
                    {new Date(order.created).toLocaleDateString('en-MY', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    {order.items.map((item) => `${item.name} x${item.qty}`).join(', ')}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {canReorder(order) && (
                    <button
                      onClick={(e) => handleQuickReorder(e, order)}
                      className="p-2 rounded-lg text-gray-400 hover:text-accent hover:bg-accent/5 transition"
                      title="Reorder"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="1 4 1 10 7 10" />
                        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                      </svg>
                    </button>
                  )}
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{formatMYR(order.items.reduce((s, i) => s + i.total, 0))}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{order.deliveryMethod}</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
