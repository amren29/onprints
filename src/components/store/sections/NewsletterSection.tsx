'use client'

import type { PageSection } from '@/lib/store-builder'
import EditableText, { type SectionEditCtx } from './EditableText'

export default function NewsletterSection({ section, editMode, sectionId, onEdit }: { section: PageSection } & SectionEditCtx) {
  const { title, subtitle, buttonText, disclaimer } = section.props
  const ep = { editMode, sectionId, onEdit }

  return (
    <section className="mt-16 bg-gray-50 border-t border-gray-100 py-12 px-8 text-center">
      <EditableText value={title || 'Stay Updated'} propPath="title" tag="h2" className="text-lg font-bold text-gray-900 mb-2" {...ep} />
      <EditableText value={subtitle || 'Subscribe to get exclusive deals, new product launches, and printing tips delivered to your inbox.'} propPath="subtitle" tag="p" className="text-sm text-gray-500 mb-6 max-w-md mx-auto" {...ep} />
      <form onSubmit={(e) => e.preventDefault()} className="flex gap-3 max-w-md mx-auto">
        <input
          type="email"
          placeholder="Enter your email address"
          className="flex-1 px-4 py-2.5 rounded-lg text-sm border border-gray-200 bg-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition"
        />
        <button type="submit" className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-accent text-white hover:opacity-90 transition whitespace-nowrap">
          <EditableText value={buttonText || 'Subscribe'} propPath="buttonText" tag="span" {...ep} />
        </button>
      </form>
      {disclaimer && <EditableText value={disclaimer} propPath="disclaimer" tag="p" className="text-xs text-gray-400 mt-3" {...ep} />}
    </section>
  )
}
