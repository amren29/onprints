'use client'

import type { PageSection } from '@/lib/store-builder'
import AnimateIn from '@/components/store/AnimateIn'
import EditableText, { type SectionEditCtx } from './EditableText'

export default function TestimonialsSection({ section, editMode, sectionId, onEdit }: { section: PageSection } & SectionEditCtx) {
  const { title, items } = section.props
  const ep = { editMode, sectionId, onEdit }

  return (
    <section className="px-8 py-16">
      <div className="max-w-screen-xl mx-auto">
        <AnimateIn>
          <EditableText value={title} propPath="title" tag="h2" className="text-2xl font-bold text-gray-900 mb-8 text-center" {...ep} />
        </AnimateIn>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {(items || []).map((item: any, i: number) => (
            <AnimateIn key={item.name + i} delay={i * 80} animation="fade-up">
              <div className="bg-white rounded-2xl border border-gray-100 p-6 h-full">
                {editMode ? (
                  <EditableText value={item.text} propPath={`items.${i}.text`} tag="p" className="text-sm text-gray-600 leading-relaxed mb-4" {...ep} />
                ) : (
                  <p className="text-sm text-gray-600 leading-relaxed mb-4">&ldquo;{item.text}&rdquo;</p>
                )}
                <div className="border-t border-gray-100 pt-3">
                  <EditableText value={item.name} propPath={`items.${i}.name`} tag="div" className="font-semibold text-sm text-gray-900" {...ep} />
                  <EditableText value={item.company} propPath={`items.${i}.company`} tag="div" className="text-xs text-gray-400" {...ep} />
                </div>
              </div>
            </AnimateIn>
          ))}
        </div>
      </div>
    </section>
  )
}
