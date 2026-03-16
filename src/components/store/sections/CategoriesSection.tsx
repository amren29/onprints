'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { PageSection } from '@/lib/store-builder'
import AnimateIn from '@/components/store/AnimateIn'
import CategoryIcon from '@/components/store/CategoryIcon'
import { getStoreCategories } from '@/lib/store/catalog-bridge'
import { useStore } from '@/providers/store-context'
import type { ProductCategory } from '@/types/store'
import EditableText, { type SectionEditCtx } from './EditableText'

const CATEGORY_IMAGES: Record<string, string> = {
  cards: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=256&h=256&fit=crop&crop=center',
  marketing: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=256&h=256&fit=crop&crop=center',
  'large-format': 'https://images.unsplash.com/photo-1588412079929-790b9f593d8e?w=256&h=256&fit=crop&crop=center',
  stationery: 'https://images.unsplash.com/photo-1568205612837-017257d2310a?w=256&h=256&fit=crop&crop=center',
  stickers: 'https://images.unsplash.com/photo-1635405074683-96d6921a2a68?w=256&h=256&fit=crop&crop=center',
  signage: 'https://images.unsplash.com/photo-1563906267088-b029e7101114?w=256&h=256&fit=crop&crop=center',
  stamps: 'https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?w=256&h=256&fit=crop&crop=center',
  events: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=256&h=256&fit=crop&crop=center',
  merchandise: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=256&h=256&fit=crop&crop=center',
  documents: 'https://images.unsplash.com/photo-1568219656418-15c329312bf1?w=256&h=256&fit=crop&crop=center',
}

export default function CategoriesSection({ section, editMode, sectionId, onEdit }: { section: PageSection } & SectionEditCtx) {
  const title = section.props.title || 'Browse by Category'
  const { basePath } = useStore()
  const ep = { editMode, sectionId, onEdit }
  const [categories, setCategories] = useState<{ id: ProductCategory; label: string; description: string }[]>([])

  useEffect(() => {
    getStoreCategories().then(setCategories).catch(() => {})
  }, [])

  return (
    <section className="px-8 py-16">
      <AnimateIn>
        <EditableText value={title} propPath="title" tag="h2" className="text-2xl font-bold text-gray-900 mb-8 max-w-screen-xl mx-auto" {...ep} />
      </AnimateIn>
      <div className="flex justify-between max-w-screen-xl mx-auto">
        {categories.map((cat, i) => {
          const img = CATEGORY_IMAGES[cat.id]
          return (
            <AnimateIn key={cat.id} delay={i * 60} animation="scale-in">
              <Link href={`${basePath}/products?cat=${cat.id}`} className="group flex flex-col items-center gap-3">
                <div className="w-20 h-20 md:w-24 md:h-24 xl:w-28 xl:h-28 rounded-xl bg-gray-100 overflow-hidden">
                  {img ? (
                    <img src={img} alt={cat.label} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center group-hover:bg-accent/10 transition-colors duration-200">
                      <CategoryIcon category={cat.id} size={40} className="text-gray-400 group-hover:text-accent transition" />
                    </div>
                  )}
                </div>
                <span className="text-sm font-medium text-gray-700 group-hover:text-accent transition text-center max-w-[120px] leading-tight">{cat.label}</span>
              </Link>
            </AnimateIn>
          )
        })}
      </div>
    </section>
  )
}
