'use client'

import { useState } from 'react'
import type { PageSection } from '@/lib/store-builder'
import AnimateIn from '@/components/store/AnimateIn'
import EditableText, { type SectionEditCtx } from './EditableText'
import SectionIcon from './SectionIcon'

type FaqItem = { question: string; answer: string; category?: string; icon?: string }

export default function FaqSection({ section, editMode, sectionId, onEdit }: { section: PageSection } & SectionEditCtx) {
  const { title, items = [] } = section.props as { title: string; items: FaqItem[] }
  const isGrouped = section.variant === 'grouped'
  const [openIdx, setOpenIdx] = useState<string | null>(null)
  const ep = { editMode, sectionId, onEdit }

  if (isGrouped) {
    // Group items by category
    const categories: { name: string; icon: string; items: FaqItem[]; startIdx: number }[] = []
    const catMap = new Map<string, { items: FaqItem[]; startIdx: number }>()
    let idx = 0
    for (const item of items) {
      const cat = item.category || 'General'
      if (!catMap.has(cat)) catMap.set(cat, { items: [], startIdx: idx })
      catMap.get(cat)!.items.push(item)
      idx++
    }
    catMap.forEach((data, catName) => {
      categories.push({ name: catName, icon: data.items[0]?.icon || '', items: data.items, startIdx: data.startIdx })
    })

    return (
      <>
        {/* Category quick links */}
        <section className="border-b border-gray-100 bg-white sticky top-0 z-30">
          <div className="max-w-3xl mx-auto px-8 flex gap-2 overflow-x-auto scrollbar-hide py-3">
            {categories.map((cat) => (
              <a
                key={cat.name}
                href={`#${cat.name.toLowerCase().replace(/\s+/g, '-')}`}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-accent hover:bg-accent/5 transition whitespace-nowrap shrink-0"
              >
                {cat.icon && <SectionIcon icon={cat.icon} size={16} className="text-gray-400" />}
                {cat.name}
              </a>
            ))}
          </div>
        </section>

        {/* FAQ sections */}
        <main className="max-w-3xl mx-auto px-8 py-12">
          <div className="space-y-10">
            {categories.map((cat) => (
              <AnimateIn key={cat.name} animation="fade-up">
                <div id={cat.name.toLowerCase().replace(/\s+/g, '-')}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
                      <SectionIcon icon={cat.icon} size={18} />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">{cat.name}</h2>
                  </div>
                  <div className="rounded-2xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
                    {cat.items.map((item, i) => {
                      const globalIdx = cat.startIdx + i
                      const key = `${cat.name}-${i}`
                      const isOpen = openIdx === key
                      return (
                        <div
                          key={key}
                          className="w-full text-left px-5 py-4 hover:bg-gray-50/50 transition"
                        >
                          <div
                            className="flex items-start justify-between gap-4 cursor-pointer"
                            onClick={() => !editMode && setOpenIdx(isOpen ? null : key)}
                          >
                            <div className="flex-1">
                              <EditableText value={item.question} propPath={`items.${globalIdx}.question`} tag="div" className="text-sm font-medium text-gray-800" {...ep} />
                            </div>
                            <svg className={`w-4 h-4 text-gray-400 shrink-0 mt-1 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="m6 9 6 6 6-6" />
                            </svg>
                          </div>
                          {(isOpen || editMode) && (
                            <EditableText value={item.answer} propPath={`items.${globalIdx}.answer`} tag="p" className="text-sm text-gray-500 mt-2 leading-relaxed" multiline {...ep} />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </AnimateIn>
            ))}
          </div>
        </main>
      </>
    )
  }

  // Simple / accordion variant
  return (
    <section className="max-w-3xl mx-auto px-8 py-16">
      <AnimateIn>
        <EditableText value={title} propPath="title" tag="h2" className="text-2xl font-bold text-gray-900 mb-8 text-center" {...ep} />
      </AnimateIn>
      <div className="rounded-2xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
        {items.map((item: FaqItem, i: number) => {
          const key = `faq-${i}`
          const isOpen = openIdx === key
          return (
            <div
              key={key}
              className="w-full text-left px-5 py-4 hover:bg-gray-50/50 transition"
            >
              <div
                className="flex items-start justify-between gap-4 cursor-pointer"
                onClick={() => !editMode && setOpenIdx(isOpen ? null : key)}
              >
                <div className="flex-1">
                  <EditableText value={item.question} propPath={`items.${i}.question`} tag="div" className="text-sm font-medium text-gray-800" {...ep} />
                </div>
                {section.variant !== 'simple' && (
                  <svg className={`w-4 h-4 text-gray-400 shrink-0 mt-1 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                )}
              </div>
              {(section.variant === 'simple' || isOpen || editMode) && (
                <EditableText value={item.answer} propPath={`items.${i}.answer`} tag="p" className="text-sm text-gray-500 mt-2 leading-relaxed" multiline {...ep} />
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
