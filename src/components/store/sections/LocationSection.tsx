'use client'

import type { PageSection } from '@/lib/store-builder'
import AnimateIn from '@/components/store/AnimateIn'
import EditableText, { type SectionEditCtx } from './EditableText'

export default function LocationSection({ section, editMode, sectionId, onEdit }: { section: PageSection } & SectionEditCtx) {
  const { badge, title, description, hours, email, mapPlaceholder } = section.props
  const ep = { editMode, sectionId, onEdit }

  return (
    <section className="max-w-screen-xl mx-auto px-8 py-16 md:py-20">
      <div className="grid md:grid-cols-2 gap-12 items-center">
        <AnimateIn animation="slide-left">
          <div>
            {badge && <EditableText value={badge} propPath="badge" tag="div" className="text-xs font-semibold text-accent uppercase tracking-widest mb-3" {...ep} />}
            <EditableText value={title} propPath="title" tag="h2" className="text-2xl md:text-3xl font-bold text-gray-900 mb-4" {...ep} />
            {description && <EditableText value={description} propPath="description" tag="p" className="text-sm text-gray-600 leading-relaxed mb-6" {...ep} />}
            <div className="space-y-3">
              {(hours || []).map((h: { label: string; time: string }) => (
                <div key={h.label} className="flex items-center gap-3 text-sm text-gray-600">
                  <svg className="w-4 h-4 text-accent shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  {h.label}: {h.time}
                </div>
              ))}
              {email && (
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <svg className="w-4 h-4 text-accent shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                  {email}
                </div>
              )}
            </div>
          </div>
        </AnimateIn>
        <AnimateIn animation="slide-right">
          <div className="rounded-2xl bg-gray-100 border border-gray-200 aspect-[4/3] flex items-center justify-center">
            <div className="text-center text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              <p className="text-sm">{mapPlaceholder || 'Map placeholder'}</p>
            </div>
          </div>
        </AnimateIn>
      </div>
    </section>
  )
}
