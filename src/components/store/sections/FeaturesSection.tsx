'use client'

import type { PageSection } from '@/lib/store-builder'
import AnimateIn from '@/components/store/AnimateIn'
import EditableText, { type SectionEditCtx } from './EditableText'
import SectionIcon from './SectionIcon'

export default function FeaturesSection({ section, editMode, sectionId, onEdit }: { section: PageSection } & SectionEditCtx) {
  const { title, subtitle, items } = section.props
  const cols = section.variant === '2-col' ? 'sm:grid-cols-2' : section.variant === '4-col' ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-3'
  const ep = { editMode, sectionId, onEdit }

  return (
    <section className="bg-gray-50 border-y border-gray-100">
      <div className="max-w-screen-xl mx-auto px-8 py-16 md:py-20">
        <AnimateIn>
          <div className="text-center mb-12">
            {subtitle && <EditableText value={subtitle} propPath="subtitle" tag="div" className="text-xs font-semibold text-accent uppercase tracking-widest mb-3" {...ep} />}
            <EditableText value={title} propPath="title" tag="h2" className="text-2xl md:text-3xl font-bold text-gray-900" {...ep} />
          </div>
        </AnimateIn>
        <div className={`grid ${cols} gap-6`}>
          {(items || []).map((item: any, i: number) => (
            <AnimateIn key={item.title + i} delay={i * 100} animation="scale-in">
              <div className="bg-white rounded-2xl p-6 border border-gray-100">
                <div className="w-12 h-12 rounded-xl bg-accent/10 text-accent flex items-center justify-center mb-4">
                  <SectionIcon icon={item.icon} size={22} />
                </div>
                <EditableText value={item.title} propPath={`items.${i}.title`} tag="h3" className="font-semibold text-gray-900 mb-2" {...ep} />
                <EditableText value={item.desc} propPath={`items.${i}.desc`} tag="p" className="text-sm text-gray-500 leading-relaxed" {...ep} />
              </div>
            </AnimateIn>
          ))}
        </div>
      </div>
    </section>
  )
}
