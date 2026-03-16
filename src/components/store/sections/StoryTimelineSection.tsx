'use client'

import type { PageSection } from '@/lib/store-builder'
import AnimateIn from '@/components/store/AnimateIn'
import EditableText, { type SectionEditCtx } from './EditableText'

export default function StoryTimelineSection({ section, editMode, sectionId, onEdit }: { section: PageSection } & SectionEditCtx) {
  const { badge, title, paragraphs, timeline } = section.props
  const ep = { editMode, sectionId, onEdit }

  return (
    <section className="max-w-screen-xl mx-auto px-8 py-16 md:py-20">
      <div className="grid md:grid-cols-2 gap-16 items-center">
        <AnimateIn animation="slide-left">
          <div>
            {badge && <EditableText value={badge} propPath="badge" tag="div" className="text-xs font-semibold text-accent uppercase tracking-widest mb-3" {...ep} />}
            <EditableText value={title} propPath="title" tag="h2" className="text-2xl md:text-3xl font-bold text-gray-900 mb-4" {...ep} />
            {(paragraphs || []).map((p: string, i: number) => (
              <p key={i} className="text-sm text-gray-600 leading-relaxed mb-4">{p}</p>
            ))}
          </div>
        </AnimateIn>
        <AnimateIn animation="slide-right">
          <div className="space-y-4">
            {(timeline || []).map((item: { year: string; event: string }, i: number) => (
              <div key={item.year} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-xs shrink-0">{item.year}</div>
                  {i < (timeline || []).length - 1 && <div className="w-px flex-1 bg-gray-200 mt-2" />}
                </div>
                <p className="text-sm text-gray-600 pt-2.5 pb-4">{item.event}</p>
              </div>
            ))}
          </div>
        </AnimateIn>
      </div>
    </section>
  )
}
