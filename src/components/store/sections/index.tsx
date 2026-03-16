'use client'

import type { PageSection } from '@/lib/store-builder'
import type { SectionEditCtx } from './EditableText'
import HeroSection from './HeroSection'
import TrustBarSection from './TrustBarSection'
import CategoriesSection from './CategoriesSection'
import ProductsSection from './ProductsSection'
import FeaturesSection from './FeaturesSection'
import TestimonialsSection from './TestimonialsSection'
import CtaSection from './CtaSection'
import StatsSection from './StatsSection'
import FaqSection from './FaqSection'
import GallerySection from './GallerySection'
import TextBlockSection from './TextBlockSection'
import ContactSection from './ContactSection'
import NewsletterSection from './NewsletterSection'
import StoryTimelineSection from './StoryTimelineSection'
import LocationSection from './LocationSection'
import ProcessStepsSection from './ProcessStepsSection'
import PricingTiersSection from './PricingTiersSection'
import BannerSection from './BannerSection'

type SectionCompProps = { section: PageSection } & SectionEditCtx

const RENDERERS: Record<string, React.ComponentType<SectionCompProps>> = {
  hero: HeroSection,
  'trust-strip': TrustBarSection,
  categories: CategoriesSection,
  products: ProductsSection,
  features: FeaturesSection,
  testimonials: TestimonialsSection,
  cta: CtaSection,
  stats: StatsSection,
  faq: FaqSection,
  gallery: GallerySection,
  'text-block': TextBlockSection,
  contact: ContactSection,
  newsletter: NewsletterSection,
  'story-timeline': StoryTimelineSection,
  location: LocationSection,
  'process-steps': ProcessStepsSection,
  'pricing-tiers': PricingTiersSection,
  banner: BannerSection,
}

type RendererProps = {
  section: PageSection
  editMode?: boolean
  selectedId?: string | null
  onSelect?: (id: string) => void
  onInlineEdit?: (sectionId: string, propPath: string, value: string) => void
}

export function SectionRenderer({ section, editMode, selectedId, onSelect, onInlineEdit }: RendererProps) {
  if (!section.visible) return null
  const Comp = RENDERERS[section.type]
  if (!Comp) return null

  if (!editMode) return <Comp section={section} />

  const isSelected = selectedId === section.id

  return (
    <div
      data-section-id={section.id}
      className={`builder-section-wrapper${isSelected ? ' builder-section-selected' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelect?.(section.id) }}
    >
      {isSelected && (
        <div className="builder-section-label">{section.type.replace(/-/g, ' ')}</div>
      )}
      <Comp
        section={section}
        editMode={isSelected}
        sectionId={section.id}
        onEdit={onInlineEdit}
      />
    </div>
  )
}

export function PageRenderer({ sections, editMode, selectedId, onSelect, onInlineEdit }: {
  sections: PageSection[]
  editMode?: boolean
  selectedId?: string | null
  onSelect?: (id: string) => void
  onInlineEdit?: (sectionId: string, propPath: string, value: string) => void
}) {
  return (
    <>
      {sections.map((section) => (
        <SectionRenderer
          key={section.id}
          section={section}
          editMode={editMode}
          selectedId={selectedId}
          onSelect={onSelect}
          onInlineEdit={onInlineEdit}
        />
      ))}
    </>
  )
}
