'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getStoreCategories } from '@/lib/store/catalog-bridge'
import CategoryIcon from '@/components/store/CategoryIcon'
import { useAuthStore } from '@/lib/store/auth-store'
import { useStoreGlobal } from '@/hooks/useStoreGlobal'
import { useStore } from '@/providers/store-context'
import type { ProductCategory } from '@/types/store'

interface MobileMenuProps {
  open: boolean
  onClose: () => void
}

function getNavLinks(basePath: string) {
  return [
    { href: basePath, label: 'Home' },
    { href: `${basePath}/about`, label: 'About' },
    { href: `${basePath}/products`, label: 'Products' },
    { href: `${basePath}/bundles`, label: 'Bundles' },
    { href: `${basePath}/how-to-order`, label: 'How to Order' },
    { href: `${basePath}/membership`, label: 'Membership' },
    { href: `${basePath}/faq`, label: 'FAQ' },
    { href: `${basePath}/track`, label: 'Track Order' },
    { href: `${basePath}/contact`, label: 'Contact Us' },
  ]
}

const PLACEHOLDER_LINKS = [
  { label: 'Help' },
  { label: 'Wishlist' },
]

export default function MobileMenu({ open, onClose }: MobileMenuProps) {
  const pathname = usePathname()
  const currentUser = useAuthStore((s) => s.currentUser)
  const signOut = useAuthStore((s) => s.signOut)
  const globalSettings = useStoreGlobal()
  const { basePath } = useStore()
  const [categories, setCategories] = useState<{ id: ProductCategory; label: string; description: string }[]>([])

  useEffect(() => {
    getStoreCategories().then(setCategories).catch(() => {})
  }, [])

  // Close on route change
  useEffect(() => {
    onClose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // Lock scroll when open (target the store scroll container)
  useEffect(() => {
    const scrollRoot = document.getElementById('store-scroll-root')
    if (scrollRoot) {
      scrollRoot.style.overflow = open ? 'hidden' : 'auto'
    } else {
      document.body.style.overflow = open ? 'hidden' : ''
    }
    return () => {
      if (scrollRoot) {
        scrollRoot.style.overflow = 'auto'
      } else {
        document.body.style.overflow = ''
      }
    }
  }, [open])

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 bg-black/30 z-50 md:hidden" onClick={onClose} aria-hidden="true" />
      )}

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={`fixed top-0 left-0 bottom-0 w-72 bg-white z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-gray-100">
          <span className="font-extrabold text-lg text-accent tracking-tight">{globalSettings.shopName}</span>
          <button onClick={onClose} aria-label="Close menu" className="p-2 text-gray-400 hover:text-gray-600 transition">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto h-[calc(100%-56px)] py-4">
          {/* Navigation links */}
          <div className="px-4 mb-4">
            {getNavLinks(basePath).map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`block py-2.5 text-sm font-medium rounded-lg px-3 transition ${
                  (href === basePath ? pathname === basePath : pathname.startsWith(href))
                    ? 'text-accent bg-accent/5'
                    : 'text-gray-700 hover:text-accent hover:bg-gray-50'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>

          <div className="border-t border-gray-100 mx-4 mb-4" />

          {/* Categories */}
          <div className="px-4 mb-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3 px-3">
              Categories
            </div>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`${basePath}/products?cat=${cat.id}`}
                className="flex items-center gap-3 py-2.5 text-sm text-gray-600 hover:text-accent transition rounded-lg px-3 hover:bg-gray-50"
              >
                <CategoryIcon category={cat.id} size={18} className="text-gray-400 shrink-0" />
                {cat.label}
              </Link>
            ))}
          </div>

          <div className="border-t border-gray-100 mx-4 mb-4" />

          {/* Auth & placeholder links */}
          <div className="px-4">
            {currentUser ? (
              <>
                <div className="flex items-center gap-3 px-3 py-3 mb-1">
                  <div className="w-8 h-8 rounded-full bg-accent text-white text-sm font-bold flex items-center justify-center shrink-0">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{currentUser.name}</p>
                    <p className="text-xs text-gray-400 truncate">{currentUser.email}</p>
                  </div>
                  {currentUser.role === 'agent' && (
                    <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full shrink-0">
                      Agent
                    </span>
                  )}
                </div>
                {[
                  { href: `${basePath}/account`, label: 'Dashboard' },
                  { href: `${basePath}/account/orders`, label: 'My Orders' },
                  { href: `${basePath}/account/profile`, label: 'Profile' },
                  { href: `${basePath}/account/artwork`, label: 'Artwork Library' },
                  { href: `${basePath}/account/addresses`, label: 'Addresses' },
                ].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`block py-2.5 text-sm font-medium rounded-lg px-3 transition ${
                      pathname.startsWith(link.href) && (link.href !== `${basePath}/account` || pathname === `${basePath}/account`)
                        ? 'text-accent bg-accent/5'
                        : 'text-gray-700 hover:text-accent hover:bg-gray-50'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
                <button
                  onClick={() => {
                    signOut()
                    onClose()
                  }}
                  className="w-full text-left py-2.5 text-sm font-medium text-red-500 rounded-lg px-3 hover:bg-red-50 transition mt-1"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                href={`${basePath}/auth/signin`}
                className="flex items-center gap-3 py-2.5 text-sm font-medium text-accent rounded-lg px-3 hover:bg-accent/5 transition"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Sign In
              </Link>
            )}

            <div className="border-t border-gray-100 my-2" />

            {PLACEHOLDER_LINKS.map(({ label }) => (
              <div
                key={label}
                className="flex items-center justify-between py-2.5 text-sm text-gray-400 px-3"
              >
                {label}
                <span className="text-[10px] bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">
                  Soon
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
