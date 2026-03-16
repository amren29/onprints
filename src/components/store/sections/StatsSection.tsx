'use client'

import type { PageSection } from '@/lib/store-builder'
import AnimateIn from '@/components/store/AnimateIn'
import EditableText, { type SectionEditCtx } from './EditableText'

export default function StatsSection({ section, editMode, sectionId, onEdit }: { section: PageSection } & SectionEditCtx) {
  const items: { value: string; label: string }[] = section.props.items || []
  const ep = { editMode, sectionId, onEdit }

  return (
    <section className="border-b border-gray-100">
      <div className="max-w-screen-xl mx-auto px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {items.map((stat, i) => (
            <AnimateIn key={stat.label} delay={i * 100} animation="fade-up">
              <div className="text-center">
                <EditableText value={stat.value} propPath={`items.${i}.value`} tag="div" className="text-3xl md:text-4xl font-bold text-accent mb-1" {...ep} />
                <EditableText value={stat.label} propPath={`items.${i}.label`} tag="div" className="text-sm text-gray-500" {...ep} />
              </div>
            </AnimateIn>
          ))}
        </div>
      </div>
    </section>
  )
}
