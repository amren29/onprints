'use client'

import type { PageSection } from '@/lib/store-builder'
import AnimateIn from '@/components/store/AnimateIn'
import EditableText, { type SectionEditCtx } from './EditableText'
import SectionIcon from './SectionIcon'

export default function ProcessStepsSection({ section, editMode, sectionId, onEdit }: { section: PageSection } & SectionEditCtx) {
  const { badge, title, items } = section.props
  const ep = { editMode, sectionId, onEdit }

  return (
    <section className="max-w-screen-xl mx-auto px-8 py-16 md:py-20">
      <AnimateIn>
        <div className="text-center mb-12">
          {badge && <EditableText value={badge} propPath="badge" tag="div" className="text-xs font-semibold text-accent uppercase tracking-widest mb-3" {...ep} />}
          <EditableText value={title} propPath="title" tag="h2" className="text-2xl md:text-3xl font-bold text-gray-900" {...ep} />
        </div>
      </AnimateIn>
      <div className={`grid sm:grid-cols-2 ${(items || []).length <= 3 ? 'md:grid-cols-3 max-w-3xl mx-auto' : 'lg:grid-cols-4'} gap-6`}>
        {(items || []).map((step: any, i: number) => (
          <AnimateIn key={step.number + i} delay={i * 100} animation="fade-up">
            <div className="relative bg-white rounded-2xl p-6 border border-gray-100 h-full">
              <div className="text-5xl font-black text-gray-100 absolute top-4 right-5 select-none">{step.number}</div>
              <div className="w-12 h-12 rounded-xl bg-accent/10 text-accent flex items-center justify-center mb-4">
                <SectionIcon icon={step.icon} size={22} />
              </div>
              <EditableText value={step.title} propPath={`items.${i}.title`} tag="h3" className="font-semibold text-gray-900 mb-2" {...ep} />
              <EditableText value={step.desc} propPath={`items.${i}.desc`} tag="p" className="text-sm text-gray-500 leading-relaxed" {...ep} />
            </div>
          </AnimateIn>
        ))}
      </div>
    </section>
  )
}
