'use client'

import Link from 'next/link'
// TODO [Batch G]: Replace auth-store with Supabase store-users
import { useAuthStore } from '@/lib/store/auth-store'
import { useCanvaTokensFromCookie } from '@/lib/store/use-canva-tokens'
import { formatMYR } from '@/lib/store/pricing-engine'
import OrderStatusBadge from '@/components/store/account/OrderStatusBadge'

// ── Canva Section ────────────────────────────────────────────────────────────

function CanvaSection({ user }: { user: NonNullable<ReturnType<typeof useAuthStore.getState>['currentUser']> }) {
  const clearCanvaTokens = useAuthStore((s) => s.clearCanvaTokens)
  if (!process.env.NEXT_PUBLIC_CANVA_CLIENT_ID) return null

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            user.canvaTokens?.accessToken ? 'bg-green-100' : 'bg-gray-100'
          }`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={user.canvaTokens?.accessToken ? '#16a34a' : '#9ca3af'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Canva Integration</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {user.canvaTokens?.accessToken
                ? user.canvaTokens.expiresAt > Date.now()
                  ? 'Connected — design directly from product pages'
                  : 'Token expired — reconnect to continue'
                : 'Connect to design and import from Canva'}
            </p>
          </div>
        </div>
        {user.canvaTokens?.accessToken ? (
          <button
            onClick={() => clearCanvaTokens()}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-red-200 text-red-600 hover:bg-red-50 transition"
          >
            Disconnect
          </button>
        ) : (
          <a
            href="/api/store/canva/authorize?returnTo=/store/account"
            className="px-4 py-2 rounded-lg text-sm font-medium bg-[#7B2FBE] text-white hover:bg-[#6B21A8] transition"
          >
            Connect Canva
          </a>
        )}
      </div>
    </div>
  )
}

// ── Quick Actions ────────────────────────────────────────────────────────────

function QuickActions() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      <Link
        href="/store/products"
        className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3.5 text-sm font-medium text-gray-700 hover:border-accent/30 hover:text-accent transition"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        Browse Products
      </Link>
      <Link
        href="/store/account/profile"
        className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3.5 text-sm font-medium text-gray-700 hover:border-accent/30 hover:text-accent transition"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        Edit Profile
      </Link>
      <Link
        href="/store/account/addresses"
        className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3.5 text-sm font-medium text-gray-700 hover:border-accent/30 hover:text-accent transition col-span-2 md:col-span-1"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        Manage Addresses
      </Link>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function AccountDashboard() {
  const user = useAuthStore((s) => s.currentUser)
  useCanvaTokensFromCookie()
  if (!user) return null

  const totalSpent = user.orders.reduce((sum, o) => (o.payments ?? []).filter(p => p.status === 'Captured').reduce((s, p) => s + p.amount, 0) + sum, 0)
  const recentOrders = user.orders.slice(0, 3)
  const isAgent = user.role === 'agent'
  const isMember = user.membership && (user.membership.status ?? 'active') === 'active' && new Date(user.membership.expiryDate) > new Date()

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          Welcome back, {user.name.split(' ')[0]}
        </h1>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-sm text-gray-500">
            {isAgent ? 'Reseller Account' : 'Here\u2019s an overview of your account'}
          </p>
          {isAgent && user.discountRate && (
            <span className="inline-block text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
              {Math.round(user.discountRate * 100)}% Discount
            </span>
          )}
          {isMember && (
            <span className="inline-block text-[10px] font-bold bg-accent/10 text-accent px-2 py-0.5 rounded-full">
              {user.membership!.tierName} Member
            </span>
          )}
        </div>
      </div>

      {/* Membership card (customers only) */}
      {!isAgent && isMember ? (
        <div className="bg-gradient-to-r from-accent/5 to-blue-50 rounded-2xl border border-accent/20 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-accent uppercase tracking-wider">Membership</p>
              <p className="text-lg font-bold text-gray-900 mt-0.5">{user.membership!.tierName}</p>
              <p className="text-xs text-gray-500 mt-1">
                {Math.round(user.membership!.discountRate * 100)}% discount on all products
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Expires</p>
              <p className="text-sm font-semibold text-gray-900">
                {new Date(user.membership!.expiryDate).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
              <Link href="/store/account/membership" className="text-xs font-semibold text-accent hover:underline mt-1 inline-block">Manage</Link>
            </div>
          </div>
        </div>
      ) : !isAgent ? (
        <Link href="/store/account/membership" className="block bg-gradient-to-r from-accent/5 to-blue-50 rounded-2xl border border-accent/20 p-5 hover:border-accent/40 transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-accent uppercase tracking-wider">Membership</p>
              <p className="text-sm font-bold text-gray-900 mt-0.5">Get a membership to save on every order</p>
              <p className="text-xs text-gray-500 mt-1">Up to 15% discount — starting from RM 50/year</p>
            </div>
            <span className="shrink-0 px-4 py-2 rounded-xl text-sm font-semibold bg-accent text-white">Subscribe</span>
          </div>
        </Link>
      ) : null}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Total Orders</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{user.orders.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Total Spent</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatMYR(totalSpent)}</p>
        </div>
        <Link href="/store/account/wallet" className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-200 p-5 hover:border-green-300 transition">
          <p className="text-xs font-medium text-green-700 uppercase tracking-wider">Wallet Balance</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatMYR(user.walletBalance ?? 0)}</p>
          <p className="text-xs font-semibold text-green-600 mt-1">Top Up &rarr;</p>
        </Link>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Saved Addresses</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{user.addresses.length}</p>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-2xl border border-gray-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">Recent Orders</h2>
          {user.orders.length > 0 && (
            <Link href="/store/account/orders" className="text-xs font-semibold text-accent hover:underline">
              View all
            </Link>
          )}
        </div>

        {recentOrders.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-gray-400 mb-3">No orders yet</p>
            <Link
              href="/store/products"
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
          <div className="divide-y divide-gray-50">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/store/account/orders/${order.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{order.id}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(order.created).toLocaleDateString('en-MY', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                    {' · '}
                    {order.items.length} item{order.items.length > 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <OrderStatusBadge status={order.status} />
                  <span className="text-sm font-bold text-gray-900">{formatMYR(order.items.reduce((s, i) => s + i.total, 0))}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Canva + Quick Actions */}
      <CanvaSection user={user} />
      <QuickActions />
    </div>
  )
}
