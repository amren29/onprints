'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getStoreProducts } from '@/lib/store/catalog-bridge'
import CategoryIcon from '@/components/store/CategoryIcon'
import { useStore } from '@/providers/store-context'
import type { Product } from '@/types/store'

interface SearchBarProps {
  autoFocus?: boolean
  onNavigate?: () => void
}

export default function SearchBar({ autoFocus, onNavigate }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const router = useRouter()
  const { basePath } = useStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getStoreProducts().then(setAllProducts).catch(() => {})
  }, [])

  const suggestions =
    query.trim().length >= 2
      ? allProducts.filter(
          (p) =>
            p.isActive &&
            (p.name.toLowerCase().includes(query.toLowerCase()) ||
              p.description.toLowerCase().includes(query.toLowerCase()) ||
              p.category.replace('-', ' ').toLowerCase().includes(query.toLowerCase()))
        ).slice(0, 6)
      : []

  const showDropdown = focused && suggestions.length > 0

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim()) {
      router.push(`${basePath}/products?q=${encodeURIComponent(query.trim())}`)
      setFocused(false)
      inputRef.current?.blur()
      onNavigate?.()
    }
  }

  function handleSelect(slug: string) {
    router.push(`${basePath}/products/${slug}`)
    setQuery('')
    setFocused(false)
    onNavigate?.()
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            placeholder="Search products..."
            autoFocus={autoFocus}
            className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-accent focus:bg-white transition placeholder:text-gray-400"
          />
        </div>
      </form>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50">
          {suggestions.map((product) => (
            <button
              key={product.id}
              onClick={() => handleSelect(product.slug)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition text-left"
            >
              <CategoryIcon category={product.category} size={18} className="text-gray-400 shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate" title={product.name}>{product.name}</div>
                <div className="text-xs text-gray-400 capitalize">{product.category.replace('-', ' ')}</div>
              </div>
            </button>
          ))}
          <Link
            href={`${basePath}/products?q=${encodeURIComponent(query.trim())}`}
            onClick={() => {
              setFocused(false)
              onNavigate?.()
            }}
            className="block px-4 py-2.5 text-sm text-accent font-medium hover:bg-accent/5 border-t border-gray-100 transition"
          >
            View all results for &ldquo;{query.trim()}&rdquo;
          </Link>
        </div>
      )}
    </div>
  )
}
