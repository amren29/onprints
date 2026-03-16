'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/store/Navbar'
import Footer from '@/components/store/Footer'
import { useAuthStore } from '@/lib/store/auth-store'
import { useRequireAuth } from '@/lib/store/useRequireAuth'
import { useStore } from '@/providers/store-context'

type NavItem = {
  href: string
  label: string
  icon: React.ReactNode
  exact?: boolean
  agentOnly?: boolean
  customerOnly?: boolean
  affiliateOnly?: boolean
}

// href stores relative path segments (appended to basePath + /account)
const ACCOUNT_NAV_ITEMS: NavItem[] = [
  {
    href: '',
    label: 'Dashboard',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
    exact: true,
  },
  {
    href: '/orders',
    label: 'Orders',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
  },
  {
    href: '/affiliate',
    label: 'Affiliate',
    affiliateOnly: true,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    href: '/membership',
    label: 'Membership',
    customerOnly: true,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
      </svg>
    ),
  },
  {
    href: '/wallet',
    label: 'Wallet',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 10h20"/><circle cx="17" cy="14" r="1.5"/>
      </svg>
    ),
  },
  {
    href: '/profile',
    label: 'Profile',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    href: '/artwork',
    label: 'Artwork',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    ),
  },
  {
    href: '/addresses',
    label: 'Addresses',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
]

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, isLoading } = useRequireAuth()
  const signOut = useAuthStore((s) => s.signOut)
  const clearMembership = useAuthStore((s) => s.clearMembership)
  const { basePath } = useStore()

  // Build nav items with full hrefs based on basePath
  const ACCOUNT_NAV = ACCOUNT_NAV_ITEMS.map((item) => ({
    ...item,
    href: `${basePath}/account${item.href}`,
  }))

  // Re-sync from localStorage on each navigation
  // (picks up admin-side role changes like demote/promote)
  useEffect(() => {
    useAuthStore.persist.rehydrate()
  }, [pathname])

  // Auto-clear expired memberships
  useEffect(() => {
    if (!user?.membership) return
    if ((user.membership.status ?? 'active') === 'active' && new Date(user.membership.expiryDate) < new Date()) {
      clearMembership()
    }
  }, [user?.membership, clearMembership])

  if (isLoading) {
    return (
      <>
        <Navbar />
        <main className="min-h-[80vh] flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </main>
        <Footer />
      </>
    )
  }

  if (!user) return null

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href)

  const navItems = ACCOUNT_NAV.filter((link) => {
    if (link.agentOnly && user.role !== 'agent') return false
    if (link.customerOnly && user.role === 'agent') return false
    if (link.affiliateOnly && !user.affiliateCode) return false
    return true
  })

  return (
    <>
      <Navbar />
      <main className="max-w-screen-xl mx-auto px-4 md:px-8 py-8 md:py-10 min-h-[80vh]">
        <div className="grid md:grid-cols-[240px_1fr] gap-8">
          {/* ── Desktop sidebar ── */}
          <aside className="hidden md:block">
            {/* User info */}
            <div className="flex items-center gap-3 px-3 py-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-accent text-white text-sm font-bold flex items-center justify-center shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
                </div>
                {user.role === 'agent' && (
                  <span className="inline-block mt-1 text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    Agent
                  </span>
                )}
              </div>
            </div>

            <div className="border-t border-gray-100 mb-2" />

            {/* Nav links */}
            <nav className="space-y-0.5">
              {navItems.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition ${
                    isActive(link.href, link.exact)
                      ? 'text-accent bg-accent/5'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {link.icon}
                  {link.label}
                </Link>
              ))}

              <div className="border-t border-gray-100 my-2" />

              <button
                onClick={signOut}
                className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-500 rounded-lg hover:bg-red-50 transition w-full"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Sign Out
              </button>
            </nav>
          </aside>

          {/* ── Mobile tabs ── */}
          <div className="md:hidden overflow-x-auto scrollbar-hide -mx-4 px-4">
            <div className="flex gap-1 min-w-max pb-2">
              {navItems.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-full whitespace-nowrap transition ${
                    isActive(link.href, link.exact)
                      ? 'bg-accent text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {link.icon}
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* ── Page content ── */}
          <div className="min-w-0">{children}</div>
        </div>
      </main>
      <Footer />
    </>
  )
}
