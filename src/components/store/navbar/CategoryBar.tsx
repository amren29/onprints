'use client'

import Link from 'next/link'
import { CATEGORIES } from '@/config/store/products/catalog'
import CategoryIcon from '@/components/store/CategoryIcon'
import { useStore } from '@/providers/store-context'

export default function CategoryBar() {
  const { basePath } = useStore()
  return (
    <div className="border-t border-gray-100 bg-white">
      <div className="max-w-screen-2xl mx-auto px-4 md:px-8">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide h-12 md:justify-between">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              href={`${basePath}/products?cat=${cat.id}`}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap shrink-0 transition text-gray-500 hover:bg-accent/5 hover:text-accent"
            >
              <CategoryIcon category={cat.id} size={17} className="shrink-0" />
              {cat.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
