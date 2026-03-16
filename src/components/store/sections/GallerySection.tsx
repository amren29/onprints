'use client'

import type { PageSection } from '@/lib/store-builder'
import AnimateIn from '@/components/store/AnimateIn'
import EditableText, { type SectionEditCtx } from './EditableText'

export default function GallerySection({ section, editMode, sectionId, onEdit }: { section: PageSection } & SectionEditCtx) {
  const { title, columns, images } = section.props
  const ep = { editMode, sectionId, onEdit }

  if (!images || images.length === 0) return null

  const cols = columns === 2 ? 'grid-cols-2' : columns === 4 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-3'

  return (
    <section className="px-8 py-16">
      <div className="max-w-screen-xl mx-auto">
        {title && (
          <AnimateIn>
            <EditableText value={title} propPath="title" tag="h2" className="text-2xl font-bold text-gray-900 mb-8 text-center" {...ep} />
          </AnimateIn>
        )}
        <div className={`grid ${cols} gap-4`}>
          {images.map((img: { url: string; caption: string }, i: number) => (
            <AnimateIn key={i} delay={i * 80} animation="scale-in">
              <div className="rounded-xl overflow-hidden bg-gray-100 aspect-square">
                <img src={img.url} alt={img.caption || ''} className="w-full h-full object-cover" />
              </div>
              {img.caption && <p className="text-xs text-gray-500 mt-1 text-center">{img.caption}</p>}
            </AnimateIn>
          ))}
        </div>
      </div>
    </section>
  )
}
