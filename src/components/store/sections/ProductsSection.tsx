'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { PageSection } from '@/lib/store-builder'
import AnimateIn from '@/components/store/AnimateIn'
import CategoryIcon from '@/components/store/CategoryIcon'
import { getStoreProducts } from '@/lib/store/catalog-bridge'
import type { Product } from '@/types/store'
import EditableText, { type SectionEditCtx } from './EditableText'

const CATEGORY_IMAGES: Record<string, string> = {
  cards: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=256&h=256&fit=crop&crop=center',
  marketing: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=256&h=256&fit=crop&crop=center',
  'large-format': 'https://images.unsplash.com/photo-1588412079929-790b9f593d8e?w=256&h=256&fit=crop&crop=center',
  stationery: 'https://images.unsplash.com/photo-1568205612837-017257d2310a?w=256&h=256&fit=crop&crop=center',
  stickers: 'https://images.unsplash.com/photo-1635405074683-96d6921a2a68?w=256&h=256&fit=crop&crop=center',
  signage: 'https://images.unsplash.com/photo-1563906267088-b029e7101114?w=256&h=256&fit=crop&crop=center',
}

export default function ProductsSection({ section, editMode, sectionId, onEdit }: { section: PageSection } & SectionEditCtx) {
  const { title, maxItems } = section.props
  const [products, setProducts] = useState<Product[]>([])
  useEffect(() => { getStoreProducts().then(prods => setProducts(prods.slice(0, maxItems || 20))).catch(() => {}) }, [maxItems])
  const ep = { editMode, sectionId, onEdit }

  return (
    <section className="px-8 py-16">
      <div className="max-w-screen-xl mx-auto">
        <AnimateIn>
          <div className="flex items-center gap-4 mb-8">
            <EditableText value={title || 'Popular Products'} propPath="title" tag="h2" className="text-2xl font-bold text-gray-900" {...ep} />
            <Link href="/store/products" className="text-sm text-gray-500 hover:text-accent font-medium flex items-center gap-1 transition">
              See all products
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
            </Link>
          </div>
        </AnimateIn>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {products.map((product, i) => {
            const img = product.imageUrl || CATEGORY_IMAGES[product.category]
            return (
              <AnimateIn key={product.id} delay={i * 80} animation="fade-up">
                <Link href={`/store/products/${product.slug}`} className="group">
                  <div className="aspect-square rounded-xl overflow-hidden bg-gray-100 mb-3">
                    {img ? (
                      <img src={img} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <CategoryIcon category={product.category} size={64} className="text-gray-300 group-hover:text-accent/40 transition" />
                      </div>
                    )}
                  </div>
                  <h3 className="font-medium text-gray-900 text-base group-hover:text-accent transition leading-tight">{product.name}</h3>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">{product.description}</p>
                  <span className="text-xs font-semibold text-accent mt-1 inline-block">
                    {product.pricingMatrix.default[0]?.unitPrice > 0
                      ? `From RM ${product.pricingMatrix.default[0].unitPrice.toFixed(2)}/pc`
                      : product.quantities.length > 0 ? 'Get a quote' : ''}
                  </span>
                </Link>
              </AnimateIn>
            )
          })}
        </div>
        {products.length > 0 && (
          <div className="flex justify-center mt-10">
            <Link href="/store/products" className="inline-flex items-center gap-2 border-2 border-gray-900 text-gray-900 font-bold px-8 py-3 rounded-lg hover:bg-gray-900 hover:text-white transition text-sm">
              See more
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
