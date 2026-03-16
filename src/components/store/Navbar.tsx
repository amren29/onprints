'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCartStore } from '@/lib/store/cart-store'
import { useAuthStore } from '@/lib/store/auth-store'
import { useStoreGlobal } from '@/hooks/useStoreGlobal'
import SearchBar from '@/components/store/navbar/SearchBar'
import MobileMenu from '@/components/store/navbar/MobileMenu'

export default function Navbar() {
  const pathname = usePathname()
  const itemCount = useCartStore((s) => s.items.length)
  const currentUser = useAuthStore((s) => s.currentUser)
  const signOut = useAuthStore((s) => s.signOut)
  const globalSettings = useStoreGlobal()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [hidden, setHidden] = useState(false)
  const lastScrollY = useRef(0)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Close user menu on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Close user menu on route change
  useEffect(() => {
    setUserMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    const threshold = 10
    const scrollRoot = document.getElementById('store-scroll-root') || window
    const onScroll = () => {
      const y = scrollRoot instanceof HTMLElement ? scrollRoot.scrollTop : window.scrollY
      if (y > lastScrollY.current + threshold && y > 80) {
        setHidden(true)
      } else if (y < lastScrollY.current - threshold) {
        setHidden(false)
      }
      lastScrollY.current = y
    }
    scrollRoot.addEventListener('scroll', onScroll, { passive: true })
    return () => scrollRoot.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <nav className={`sticky top-0 z-40 bg-white border-b border-gray-100 transition-transform duration-300 ${hidden ? '-translate-y-full' : 'translate-y-0'}`}>
        {/* ── Row 1: Main Bar ────────────────────────── */}
        <div className="max-w-screen-2xl mx-auto px-4 md:px-8 h-16 flex items-center gap-6">
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden p-2 -ml-2 text-gray-600 hover:text-gray-900 transition"
            aria-label="Open menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </svg>
          </button>

          {/* Logo */}
          <Link href="/store" className="font-extrabold text-2xl text-accent tracking-tight shrink-0">
            {globalSettings.shopName}
          </Link>

          {/* Nav menu — desktop (centered) */}
          <div className="hidden md:flex flex-1 items-center justify-center gap-1">
            {[
              { href: '/store', label: 'Home' },
              { href: '/store/about', label: 'About' },
              { href: '/store/products', label: 'Products' },
              { href: '/store/bundles', label: 'Bundles' },
              { href: '/store/how-to-order', label: 'How to Order' },
              { href: '/store/membership', label: 'Membership' },
              { href: '/store/faq', label: 'FAQ' },
              { href: '/store/track', label: 'Track Order' },
              { href: '/store/contact', label: 'Contact Us' },
            ].map((link) => {
              const isActive = pathname === link.href || (link.href !== '/store' && pathname.startsWith(link.href))
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative px-3 py-1.5 text-sm font-medium whitespace-nowrap transition ${
                    isActive
                      ? 'text-accent'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-accent rounded-full" />
                  )}
                </Link>
              )
            })}
          </div>

          {/* Right-side icons */}
          <div className="flex items-center gap-2 ml-auto md:ml-0">
            {/* Auth — lg+ */}
            {currentUser ? (
              <div className="hidden lg:block relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 transition"
                >
                  <div className="w-7 h-7 rounded-full bg-accent text-white text-xs font-bold flex items-center justify-center">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-gray-700 max-w-[100px] truncate">
                    {currentUser.name.split(' ')[0]}
                  </span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-gray-100 shadow-lg py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900 truncate">{currentUser.name}</p>
                      <p className="text-xs text-gray-400 truncate">{currentUser.email}</p>
                      {currentUser.role === 'agent' && (
                        <span className="inline-block mt-1 text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          Agent
                        </span>
                      )}
                    </div>
                    <div className="py-1">
                      {[
                        { href: '/store/account', label: 'Dashboard' },
                        { href: '/store/account/orders', label: 'My Orders' },
                        { href: '/store/account/profile', label: 'Profile' },
                      ].map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-accent transition"
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>
                    <div className="border-t border-gray-100 pt-1">
                      <button
                        onClick={() => {
                          signOut()
                          setUserMenuOpen(false)
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/store/auth/signin"
                className="hidden lg:flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span className="text-[10px] font-medium leading-none">Sign In</span>
              </Link>
            )}

            {/* Mobile search toggle */}
            <button
              onClick={() => setMobileSearchOpen((v) => !v)}
              className="md:hidden p-2 text-gray-600 hover:text-gray-900 transition"
              aria-label="Search"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </button>

            {/* Cart — always visible */}
            <Link
              href="/store/cart"
              className={`relative flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg transition ${
                pathname === '/store/cart' ? 'text-accent bg-accent/5' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
              aria-label={itemCount > 0 ? `Cart with ${itemCount} item${itemCount > 1 ? 's' : ''}` : 'Cart'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 1.98 1.61h9.72a2 2 0 0 0 1.98-1.61L23 6H6" />
              </svg>
              <span className="hidden lg:block text-[10px] font-medium leading-none">Cart</span>
              {itemCount > 0 && (
                <span className="absolute -top-0.5 right-0.5 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Mobile search — expands below Row 1 */}
        {mobileSearchOpen && (
          <div className="md:hidden px-4 pb-3">
            <SearchBar autoFocus onNavigate={() => setMobileSearchOpen(false)} />
          </div>
        )}

        {/* Category Bar removed */}
      </nav>

      {/* Mobile slide-out menu */}
      <MobileMenu open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
    </>
  )
}
