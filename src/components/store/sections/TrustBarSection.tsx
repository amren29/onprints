'use client'

import type { PageSection } from '@/lib/store-builder'
import AnimateIn from '@/components/store/AnimateIn'
import EditableText, { type SectionEditCtx } from './EditableText'
import SectionIcon from './SectionIcon'

export default function TrustBarSection({ section, editMode, sectionId, onEdit }: { section: PageSection } & SectionEditCtx) {
  const items: { label: string; desc?: string; icon?: string }[] = section.props.items || []
  const ep = { editMode, sectionId, onEdit }

  return (
    <section className="border-b border-gray-100 bg-white">
      <div className="max-w-7xl mx-auto px-6 py-6 overflow-x-auto scrollbar-hide">
        <div className="flex gap-8 min-w-max lg:min-w-0 lg:justify-between">
          {items.map((t, i) => (
            <AnimateIn key={t.label} delay={i * 80}>
              <div className="flex items-center gap-3.5 shrink-0">
                {t.icon && <SectionIcon icon={t.icon} size={20} className="text-gray-400" />}
                <div>
                  <EditableText value={t.label} propPath={`items.${i}.label`} tag="div" className="text-base font-semibold text-gray-900" {...ep} />
                  {t.desc && <EditableText value={t.desc} propPath={`items.${i}.desc`} tag="div" className="text-sm text-gray-400" {...ep} />}
                </div>
              </div>
            </AnimateIn>
          ))}
        </div>
      </div>
    </section>
  )
}
