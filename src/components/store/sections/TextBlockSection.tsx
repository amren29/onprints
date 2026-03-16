'use client'

import type { PageSection } from '@/lib/store-builder'
import AnimateIn from '@/components/store/AnimateIn'
import EditableText, { type SectionEditCtx } from './EditableText'

export default function TextBlockSection({ section, editMode, sectionId, onEdit }: { section: PageSection } & SectionEditCtx) {
  const { heading, body, alignment } = section.props
  const align = alignment === 'center' ? 'text-center' : 'text-left'
  const maxW = section.variant === 'narrow' ? 'max-w-2xl mx-auto' : ''
  const ep = { editMode, sectionId, onEdit }

  return (
    <section className="bg-gray-50 border-y border-gray-100">
      <div className={`max-w-screen-xl mx-auto px-8 py-14 ${maxW}`}>
        {heading && (
          <AnimateIn>
            <EditableText value={heading} propPath="heading" tag="h2" className={`text-lg font-bold text-gray-900 mb-6 ${align}`} {...ep} />
          </AnimateIn>
        )}
        {body && (
          <AnimateIn animation="fade-up">
            <div className={`${align} ${maxW}`}>
              {editMode ? (
                <EditableText value={body} propPath="body" tag="div" className="text-sm text-gray-600 leading-relaxed whitespace-pre-line" multiline {...ep} />
              ) : (
                body.includes('\n') ? (
                  <ol className="space-y-3">
                    {body.split('\n').filter(Boolean).map((line: string, i: number) => {
                      const cleaned = line.replace(/^\d+\.\s*/, '')
                      return (
                        <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
                          <span className="text-xs font-bold text-gray-400 bg-gray-200 rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                          {cleaned}
                        </li>
                      )
                    })}
                  </ol>
                ) : (
                  <p className="text-sm text-gray-600 leading-relaxed">{body}</p>
                )
              )}
            </div>
          </AnimateIn>
        )}
      </div>
    </section>
  )
}
