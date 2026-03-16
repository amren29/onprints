'use client'

import Link from 'next/link'
import type { PageSection } from '@/lib/store-builder'
import AnimateIn from '@/components/store/AnimateIn'
import EditableText, { type SectionEditCtx } from './EditableText'
import { useStoreGlobal } from '@/hooks/useStoreGlobal'
import { useStore } from '@/providers/store-context'

export default function HeroSection({ section, editMode, sectionId, onEdit }: { section: PageSection } & SectionEditCtx) {
  const { badge, headline, subtitle, ctaPrimary, ctaSecondary, ctaPrimaryAction, ctaSecondaryAction } = section.props
  const isGradient = section.variant === 'gradient'
  const isCentered = section.variant === 'centered' || isGradient
  const ep = { editMode, sectionId, onEdit }
  const g = useStoreGlobal()
  const { basePath } = useStore()

  function resolveHref(action?: string) {
    if (!action) return `${basePath}/products`
    if (action === 'quote') return `${basePath}/contact`
    if (action === 'whatsapp') return `https://wa.me/${g.contactWhatsapp.replace(/[^0-9]/g, '')}`
    if (action.startsWith('/') || action.startsWith('http')) return action
    return `${basePath}/products`
  }

  return (
    <section className={`border-b border-gray-100 ${isGradient ? 'bg-gradient-to-br from-accent/5 via-white to-blue-50' : 'bg-white'}`}>
      <div className={`max-w-screen-xl mx-auto px-8 py-20 md:py-28 ${isCentered ? 'text-center' : ''}`}>
        <AnimateIn animation="fade-up">
          <div className={isCentered ? 'max-w-2xl mx-auto' : 'max-w-2xl'}>
            {badge && (
              <div className="inline-block bg-accent/10 text-accent text-xs font-semibold px-3 py-1 rounded-full mb-4 uppercase tracking-widest">
                <EditableText value={badge} propPath="badge" tag="span" {...ep} />
              </div>
            )}
            <EditableText value={headline} propPath="headline" tag="h1" className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-4 whitespace-pre-line" {...ep} />
            {subtitle && (
              <EditableText value={subtitle} propPath="subtitle" tag="p" className="text-lg text-gray-500 leading-relaxed max-w-xl mx-auto" {...ep} />
            )}
            {(ctaPrimary || ctaSecondary) && (
              <div className="flex flex-wrap gap-3 mt-8 justify-center">
                {ctaPrimary && (
                  <Link href={resolveHref(ctaPrimaryAction)} className="px-6 py-3 rounded-xl text-sm font-semibold bg-accent text-white hover:opacity-90 transition">
                    <EditableText value={ctaPrimary} propPath="ctaPrimary" tag="span" {...ep} />
                  </Link>
                )}
                {ctaSecondary && (
                  <Link href={resolveHref(ctaSecondaryAction)} className="px-6 py-3 rounded-xl text-sm font-semibold border-2 border-gray-200 text-gray-700 hover:border-gray-300 transition">
                    <EditableText value={ctaSecondary} propPath="ctaSecondary" tag="span" {...ep} />
                  </Link>
                )}
              </div>
            )}
          </div>
        </AnimateIn>
      </div>
    </section>
  )
}
