'use client'

import Link from 'next/link'
import type { PageSection } from '@/lib/store-builder'
import AnimateIn from '@/components/store/AnimateIn'
import EditableText, { type SectionEditCtx } from './EditableText'
import { useStoreGlobal } from '@/hooks/useStoreGlobal'
import { useStore } from '@/providers/store-context'

export default function CtaSection({ section, editMode, sectionId, onEdit }: { section: PageSection } & SectionEditCtx) {
  const { headline, subtitle, buttonText, bgStyle, buttonAction, ctaSecondary, ctaSecondaryAction } = section.props
  const variant = section.variant
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

  // Promo split variant — text + image side by side
  if (variant === 'promo-split') {
    return (
      <section className="px-8 pb-16">
        <div className="max-w-screen-xl mx-auto bg-gray-100 rounded-3xl overflow-hidden">
          <AnimateIn animation="fade-in">
            <div className="flex flex-col md:flex-row items-center">
              <div className="flex-1 px-8 py-10 md:px-12 md:py-14">
                <EditableText value={headline} propPath="headline" tag="h2" className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight mb-3" {...ep} />
                <EditableText value={subtitle} propPath="subtitle" tag="p" className="text-gray-600 text-sm md:text-base mb-2" {...ep} />
                <p className="text-gray-500 text-sm mb-6">Ends while stocks last</p>
                <Link href={resolveHref(buttonAction)} className="inline-flex items-center gap-2 bg-gray-900 text-white font-bold px-6 py-3 rounded-xl hover:bg-gray-800 transition text-sm">
                  <EditableText value={buttonText || 'Shop Now'} propPath="buttonText" tag="span" {...ep} />
                </Link>
                <p className="text-xs text-gray-400 mt-4">Discount will automatically be applied to your cart.</p>
              </div>
              <div className="w-full md:w-1/2 h-64 md:h-auto md:min-h-[320px]">
                <img src="https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800&h=600&fit=crop&crop=center" alt="Promotion" className="w-full h-full object-cover" />
              </div>
            </div>
          </AnimateIn>
        </div>
      </section>
    )
  }

  // Centered / light background variant
  if (variant === 'centered' || bgStyle === 'light') {
    return (
      <section className="max-w-screen-xl mx-auto px-8 py-16 md:py-20">
        <AnimateIn animation="scale-in">
          <div className="rounded-2xl bg-accent/5 border border-accent/10 p-10 text-center">
            <EditableText value={headline} propPath="headline" tag="h3" className="font-bold text-gray-900 text-xl mb-2" {...ep} />
            <EditableText value={subtitle} propPath="subtitle" tag="p" className="text-sm text-gray-500 mb-6 max-w-md mx-auto" {...ep} />
            <div className="flex flex-wrap justify-center gap-3">
              {buttonText && (
                <Link href={resolveHref(buttonAction)} className="inline-block px-6 py-2.5 rounded-xl text-sm font-semibold bg-accent text-white hover:opacity-90 transition">
                  <EditableText value={buttonText} propPath="buttonText" tag="span" {...ep} />
                </Link>
              )}
              {ctaSecondary && (
                <Link href={resolveHref(ctaSecondaryAction)} className="inline-block px-6 py-2.5 rounded-xl text-sm font-semibold bg-white text-gray-700 border border-gray-200 hover:border-gray-300 transition">
                  <EditableText value={ctaSecondary} propPath="ctaSecondary" tag="span" {...ep} />
                </Link>
              )}
            </div>
          </div>
        </AnimateIn>
      </section>
    )
  }

  // Full-width banner (accent/dark)
  const bgClass = bgStyle === 'dark' ? 'bg-gray-900 text-white' : 'bg-accent text-white'
  return (
    <section className={`${bgClass} px-8 py-16`}>
      <div className="max-w-screen-xl mx-auto text-center">
        <AnimateIn animation="fade-up">
          <EditableText value={headline} propPath="headline" tag="h2" className="text-2xl md:text-3xl font-bold mb-3" {...ep} />
          <EditableText value={subtitle} propPath="subtitle" tag="p" className="text-sm opacity-80 mb-6 max-w-md mx-auto" {...ep} />
          <div className="flex flex-wrap justify-center gap-3">
            {buttonText && (
              <Link href={resolveHref(buttonAction)} className="inline-block px-6 py-3 rounded-xl text-sm font-semibold bg-white text-gray-900 hover:bg-gray-100 transition">
                <EditableText value={buttonText} propPath="buttonText" tag="span" {...ep} />
              </Link>
            )}
            {ctaSecondary && (
              <Link href={resolveHref(ctaSecondaryAction)} className="inline-block px-6 py-3 rounded-xl text-sm font-semibold border-2 border-white/30 hover:border-white/60 transition">
                <EditableText value={ctaSecondary} propPath="ctaSecondary" tag="span" {...ep} />
              </Link>
            )}
          </div>
        </AnimateIn>
      </div>
    </section>
  )
}
