'use client'

import type { CatalogItem } from '@/lib/catalog-store' // type-only import — keep until catalog-store is fully deleted

// ── Section Types ─────────────────────────────────────
export type SectionType =
  | 'hero' | 'products' | 'categories' | 'features' | 'testimonials'
  | 'cta' | 'stats' | 'faq' | 'gallery' | 'text-block' | 'trust-strip' | 'contact'
  | 'newsletter' | 'story-timeline' | 'location' | 'process-steps' | 'pricing-tiers'
  | 'banner'

export type StorePageId =
  | 'homepage' | 'about' | 'faq' | 'contact'
  | 'how-to-order' | 'membership' | 'bundles' | 'track'

export type PageSection = {
  id: string
  type: SectionType
  variant: string
  visible: boolean
  props: Record<string, any>
}

export type GlobalSettings = {
  shopName: string
  slug: string
  tagline: string
  accentColor: string
  showPrices: boolean
  contactEmail: string
  contactPhone: string
  contactWhatsapp: string
  contactAddress: string
  showWhatsapp: boolean
  metaTitle: string
  metaDesc: string
  keywords: string
  published: boolean
}

// Multi-page store shape
export type StorePages = Record<StorePageId, PageSection[]>

export type StorePage = {
  pages: StorePages
  globalSettings: GlobalSettings
  // Legacy compat — kept so old code that reads .sections still works during migration
  sections?: PageSection[]
}

// ── Section prop shapes ───────────────────────────────
export type HeroProps       = { badge: string; headline: string; subtitle: string; ctaPrimary: string; ctaSecondary: string; ctaPrimaryAction?: string; ctaSecondaryAction?: string }
export type ProductsProps   = { title: string; maxItems: number; categoryFilter: string }
export type CategoriesProps = { title: string }
export type FeaturesProps   = { title: string; subtitle: string; items: { icon: string; title: string; desc: string }[] }
export type TestimonialsProps = { title: string; items: { name: string; text: string; company: string }[] }
export type CtaProps         = { headline: string; subtitle: string; buttonText: string; bgStyle: 'accent' | 'dark' | 'light'; buttonAction?: string; ctaSecondary?: string; ctaSecondaryAction?: string }
export type StatsProps       = { items: { value: string; label: string }[] }
export type FaqProps         = { title: string; items: { question: string; answer: string; category?: string; icon?: string }[] }
export type GalleryProps     = { title: string; columns: number; images: { url: string; caption: string }[] }
export type TextBlockProps   = { heading: string; body: string; alignment: 'left' | 'center' }
export type TrustStripProps  = { items: { label: string; desc?: string; icon?: string }[] }
export type ContactProps     = { title: string; subtitle: string; showForm: boolean }
export type NewsletterProps  = { title: string; subtitle: string; buttonText: string; disclaimer: string }
export type StoryTimelineProps = { badge: string; title: string; paragraphs: string[]; timeline: { year: string; event: string }[] }
export type LocationProps    = { badge: string; title: string; description: string; hours: { label: string; time: string }[]; email: string; mapPlaceholder: string }
export type ProcessStepsProps = { badge: string; title: string; items: { number: string; icon: string; title: string; desc: string }[] }
export type PricingTiersProps = { title: string; subtitle: string }

// ── Renderer context (passed to every section) ────────
export type SectionCtx = {
  accentColor: string
  isMobile: boolean
  showPrices: boolean
  shopName: string
  tagline: string
  enabledItems: CatalogItem[]
  categories: string[]
  goProducts: (cat?: string) => void
  goDetail: (p: CatalogItem) => void
  nav: (view: string) => void
  contactEmail: string
  contactPhone: string
  contactWhatsapp: string
  contactAddress: string
  editingSectionId?: string | null
  onInlineEdit?: (sectionId: string, propPath: string, value: string) => void
}

// ── Section registry ──────────────────────────────────
export type VariantDef  = { key: string; label: string; desc: string }
export type SectionDef  = { label: string; icon: string; description: string; variants: VariantDef[]; defaultProps: Record<string, any> }

export const SECTION_REGISTRY: Record<SectionType, SectionDef> = {
  hero: {
    label: 'Hero Banner', icon: '',
    description: 'Large banner with headline, subtitle, and CTA buttons',
    variants: [
      { key: 'split', label: 'Split', desc: 'Text left, image right' },
      { key: 'centered', label: 'Centered', desc: 'Center-aligned text' },
      { key: 'minimal', label: 'Minimal', desc: 'Simple text only' },
      { key: 'gradient', label: 'Gradient', desc: 'Light gradient background' },
    ],
    defaultProps: { badge: 'Professional Print Services', headline: 'Fast & Reliable Printing Solutions', subtitle: 'Banner \u2022 Sticker \u2022 Business Card \u2022 Signage \u2022 Custom Print', ctaPrimary: 'Get Quotation', ctaSecondary: 'WhatsApp Now', ctaPrimaryAction: 'quote', ctaSecondaryAction: 'whatsapp' },
  },
  products: {
    label: 'Product Grid', icon: '',
    description: 'Showcase featured products in a grid layout',
    variants: [
      { key: 'grid-3', label: '3 Columns', desc: 'Three products per row' },
      { key: 'grid-2', label: '2 Columns', desc: 'Two products per row' },
    ],
    defaultProps: { title: 'Best Products', maxItems: 20, categoryFilter: '' },
  },
  categories: {
    label: 'Category Chips', icon: '',
    description: 'Browse-by-category chip buttons',
    variants: [
      { key: 'chips', label: 'Chips', desc: 'Rounded pill buttons' },
      { key: 'cards', label: 'Cards', desc: 'Card-style with description' },
      { key: 'image-grid', label: 'Image Grid', desc: 'Image cards with labels' },
    ],
    defaultProps: { title: 'Browse by Category' },
  },
  features: {
    label: 'Features', icon: '',
    description: 'Highlight key features or value propositions',
    variants: [
      { key: '3-col', label: '3 Columns', desc: 'Three feature cards' },
      { key: '2-col', label: '2 Columns', desc: 'Two feature cards' },
      { key: '4-col', label: '4 Columns', desc: 'Four feature cards' },
    ],
    defaultProps: {
      title: 'Our Approach', subtitle: 'What makes us different',
      items: [
        { icon: '\uD83D\uDE9A', title: 'Doorstep Delivery', desc: 'We deliver your print orders right to your doorstep across Malaysia.' },
        { icon: '\uD83D\uDD12', title: 'Secure Payment', desc: 'Multiple secure payment options including online banking and e-wallets.' },
        { icon: '\uD83C\uDF89', title: 'Promotions', desc: 'Regular discounts and bundle deals for bulk and repeat customers.' },
        { icon: '\uD83D\uDE4B', title: 'Friendly Customer Service', desc: 'Our team is always ready to help via WhatsApp, phone, or email.' },
      ],
    },
  },
  testimonials: {
    label: 'Testimonials', icon: '',
    description: 'Customer reviews and testimonials',
    variants: [
      { key: 'cards', label: 'Cards', desc: 'Card-style testimonials' },
      { key: 'simple', label: 'Simple', desc: 'Minimal quote style' },
    ],
    defaultProps: {
      title: 'What Our Clients Say',
      items: [
        { name: 'Ahmad Razak', text: 'Excellent quality business cards. Fast delivery and great communication throughout. Highly recommended!', company: 'Razak Corp \u2605\u2605\u2605\u2605\u2605' },
        { name: 'Sarah Lim', text: "We've been using SaasPrint for all our marketing materials. Consistently impressive quality and on-time delivery.", company: 'Bright Studios \u2605\u2605\u2605\u2605\u2605' },
        { name: 'Priya Nair', text: 'The banner quality exceeded our expectations. Great value for money and super fast turnaround.', company: 'EventPro MY \u2605\u2605\u2605\u2605\u2605' },
        { name: 'Lee Wei Ming', text: 'Best sticker printing in KL! The die-cut quality is amazing. Already placing our next order.', company: 'FreshMart \u2605\u2605\u2605\u2605\u2605' },
      ],
    },
  },
  cta: {
    label: 'Call to Action', icon: '',
    description: 'Banner prompting visitors to take action',
    variants: [
      { key: 'banner', label: 'Full Banner', desc: 'Full-width colored banner' },
      { key: 'centered', label: 'Centered', desc: 'White background centered' },
      { key: 'promo-split', label: 'Promo Split', desc: 'Text + image side by side' },
    ],
    defaultProps: { headline: 'Need Printing Urgently?', subtitle: 'Get a free quote in minutes. No minimum order required.', buttonText: 'Get Instant Quote', bgStyle: 'accent', buttonAction: 'quote', ctaSecondary: 'WhatsApp Now', ctaSecondaryAction: 'whatsapp' },
  },
  stats: {
    label: 'Statistics', icon: '',
    description: 'Highlight key numbers and achievements',
    variants: [
      { key: 'inline', label: 'Inline', desc: 'Horizontal row' },
      { key: 'cards', label: 'Cards', desc: 'Individual stat cards' },
    ],
    defaultProps: { items: [{ value: '8+', label: 'Years' }, { value: '2,400+', label: 'Clients' }, { value: '18,000+', label: 'Orders' }, { value: '99%', label: 'Satisfaction' }] },
  },
  faq: {
    label: 'FAQ', icon: '',
    description: 'Frequently asked questions',
    variants: [
      { key: 'accordion', label: 'Accordion', desc: 'Expandable Q&A' },
      { key: 'simple', label: 'Simple', desc: 'All visible' },
      { key: 'grouped', label: 'Grouped', desc: 'Category tabs + grouped accordions' },
    ],
    defaultProps: {
      title: 'Frequently Asked Questions',
      items: [
        { question: 'What is the minimum order quantity?', answer: 'Most products have no minimum order. Some items like business cards start from 100 pieces.' },
        { question: 'How long does delivery take?', answer: 'Standard delivery is 5\u20137 working days. Express next-day options are available for most products.' },
        { question: 'Do you offer design services?', answer: 'Yes! Our in-house design team can help with artwork creation and adjustments at an additional fee.' },
      ],
    },
  },
  gallery: {
    label: 'Image Gallery', icon: '',
    description: 'Showcase work samples or portfolio',
    variants: [
      { key: 'grid', label: 'Grid', desc: 'Equal-size image grid' },
      { key: 'masonry', label: 'Masonry', desc: 'Pinterest-style layout' },
    ],
    defaultProps: { title: 'Our Work', columns: 3, images: [] },
  },
  'text-block': {
    label: 'Text Block', icon: '',
    description: 'Free-form text content section',
    variants: [
      { key: 'single', label: 'Full Width', desc: 'Full-width text' },
      { key: 'narrow', label: 'Narrow', desc: 'Centered narrow column' },
    ],
    defaultProps: { heading: '', body: '', alignment: 'left' },
  },
  'trust-strip': {
    label: 'Trust Strip', icon: '',
    description: 'Horizontal strip of trust badges',
    variants: [
      { key: 'badges', label: 'Badges', desc: 'Checkmark badges' },
      { key: 'simple', label: 'Simple', desc: 'Text only' },
      { key: 'icon-bar', label: 'Icon Bar', desc: 'Icon + label + description' },
    ],
    defaultProps: { items: [{ label: 'Fast Turnaround', desc: 'From 1 working day', icon: '\u26A1' }, { label: 'Nationwide Delivery', desc: 'Peninsular Malaysia', icon: '\uD83D\uDE9A' }, { label: 'Quality Guaranteed', desc: 'Or we reprint it', icon: '\uD83D\uDEE1\uFE0F' }, { label: 'Locally Produced', desc: 'Kuala Lumpur, Malaysia', icon: '\uD83D\uDCCD' }] },
  },
  contact: {
    label: 'Contact Section', icon: '',
    description: 'Contact info and optional form inline',
    variants: [
      { key: 'form-right', label: 'Form Right', desc: 'Info left, form right' },
      { key: 'centered', label: 'Centered', desc: 'Centered layout' },
      { key: 'cards', label: 'Cards', desc: 'Info cards grid' },
    ],
    defaultProps: { title: 'Get in Touch', subtitle: "We'd love to hear from you", showForm: true },
  },
  newsletter: {
    label: 'Newsletter CTA', icon: '',
    description: 'Email signup call-to-action',
    variants: [
      { key: 'default', label: 'Default', desc: 'Simple signup bar' },
    ],
    defaultProps: { title: 'Stay Updated', subtitle: 'Subscribe to get exclusive deals, new product launches, and printing tips delivered to your inbox.', buttonText: 'Subscribe', disclaimer: 'No spam, unsubscribe anytime.' },
  },
  'story-timeline': {
    label: 'Story + Timeline', icon: '',
    description: 'Two-column story text with vertical timeline',
    variants: [
      { key: 'default', label: 'Default', desc: 'Text left, timeline right' },
    ],
    defaultProps: {
      badge: 'Our Story',
      title: 'From a small shop to Malaysia\'s trusted print partner',
      paragraphs: [
        'SaasPrint started as a small print shop in the heart of Kuala Lumpur. We saw how painful the traditional printing process was \u2014 endless back-and-forth emails, unclear pricing, and artwork issues discovered only after printing.',
        'So we built something better: an online platform where you can configure your product, see instant pricing, proof your artwork in real-time, and track your order from start to finish. Today, we serve hundreds of businesses across Malaysia.',
      ],
      timeline: [
        { year: '2018', event: 'Founded in Kuala Lumpur as a small print shop serving local businesses.' },
        { year: '2020', event: 'Launched our online ordering platform with instant price calculator.' },
        { year: '2022', event: 'Introduced the online artwork proofing tool with bleed & DPI checks.' },
        { year: '2024', event: 'Expanded to serve 500+ business clients across Malaysia.' },
      ],
    },
  },
  location: {
    label: 'Location', icon: '',
    description: 'Contact info + hours + map placeholder',
    variants: [
      { key: 'default', label: 'Default', desc: 'Info left, map right' },
    ],
    defaultProps: {
      badge: 'Visit Us',
      title: 'Based in Kuala Lumpur',
      description: 'We serve customers nationwide with delivery across Peninsular and East Malaysia. Self-collection is available at our facility \u2014 we will notify you via SMS and email when your order is ready.',
      hours: [
        { label: 'Mon\u2013Fri', time: '9:00 AM \u2013 6:00 PM' },
        { label: 'Saturday', time: '9:00 AM \u2013 1:00 PM' },
      ],
      email: 'hello@saasprint.com',
      mapPlaceholder: 'Kuala Lumpur, Malaysia',
    },
  },
  'process-steps': {
    label: 'Process Steps', icon: '',
    description: 'Numbered step cards with icons',
    variants: [
      { key: 'horizontal', label: 'Horizontal', desc: 'Cards in a row' },
      { key: 'vertical', label: 'Vertical', desc: 'Stacked cards' },
    ],
    defaultProps: {
      badge: 'The Process',
      title: 'How it works',
      items: [
        { number: '01', icon: '\uD83D\uDED2', title: 'Choose Your Product', desc: 'Browse our catalog of 14+ print products. Select size, material, finishing, and quantity to see instant pricing.' },
        { number: '02', icon: '\uD83D\uDCE4', title: 'Upload Your Artwork', desc: 'Upload your print-ready file (PDF, PNG, JPG, AI, or PSD). Our proofing tool checks bleed, trim, and resolution.' },
        { number: '03', icon: '\uD83D\uDCB3', title: 'Checkout & Pay', desc: 'Review your order and pay securely via FPX, credit/debit card, or GrabPay.' },
        { number: '04', icon: '\uD83D\uDE9A', title: 'We Print & Deliver', desc: 'Production takes 3\u20135 working days. Track your order and receive it via courier or self-collect.' },
      ],
    },
  },
  'pricing-tiers': {
    label: 'Pricing Tiers', icon: '',
    description: 'Membership tier cards (reads from membership store)',
    variants: [
      { key: 'default', label: 'Default', desc: 'Tier cards grid' },
    ],
    defaultProps: { title: 'Membership Tiers', subtitle: 'Choose the plan that fits your business. All tiers include 12 months of savings.' },
  },
  banner: {
    label: 'Banner', icon: '🖼️',
    description: 'Full-width image banner — single or auto-sliding carousel',
    variants: [
      { key: 'single', label: 'Single Image', desc: 'One full-width image' },
      { key: 'slider', label: 'Slider', desc: 'Auto-rotating image carousel' },
    ],
    defaultProps: {
      images: [
        { url: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=1400&h=500&fit=crop&crop=center', alt: 'Banner 1' },
      ],
      height: 400,
      interval: 5,
      objectFit: 'cover',
    },
  },
}

// ── Ordered type list (for picker UI) ─────────────────
export const SECTION_TYPES: SectionType[] = [
  'hero', 'banner', 'products', 'categories', 'features', 'testimonials',
  'cta', 'stats', 'faq', 'gallery', 'text-block', 'trust-strip', 'contact',
  'newsletter', 'story-timeline', 'location', 'process-steps', 'pricing-tiers',
]

export const PAGE_IDS: StorePageId[] = [
  'homepage', 'about', 'faq', 'contact', 'how-to-order', 'membership', 'bundles', 'track',
]

export const PAGE_LABELS: Record<StorePageId, string> = {
  homepage: 'Homepage',
  about: 'About Us',
  faq: 'FAQ',
  contact: 'Contact Us',
  'how-to-order': 'How to Order',
  membership: 'Membership',
  bundles: 'Bundles',
  track: 'Track Order',
}

export const PAGE_ROUTES: Record<StorePageId, string> = {
  homepage: '/store',
  about: '/store/about',
  faq: '/store/faq',
  contact: '/store/contact',
  'how-to-order': '/store/how-to-order',
  membership: '/store/membership',
  bundles: '/store/bundles',
  track: '/store/track',
}

// ── Helpers ───────────────────────────────────────────
function uid() { return 'sec_' + Math.random().toString(36).slice(2, 10) }

// ── Default page sections ─────────────────────────────
function sec(type: SectionType, variant: string, propsOverride?: Record<string, any>): PageSection {
  const def = SECTION_REGISTRY[type]
  return { id: uid(), type, variant, visible: true, props: { ...JSON.parse(JSON.stringify(def.defaultProps)), ...propsOverride } }
}

export const DEFAULT_PAGE_SECTIONS: Record<StorePageId, () => PageSection[]> = {
  homepage: () => [
    sec('hero', 'split'),
    sec('trust-strip', 'icon-bar'),
    sec('categories', 'image-grid', { title: 'Explore all categories' }),
    sec('products', 'grid-3', { title: 'Popular Products' }),
    sec('cta', 'promo-split', { headline: 'First order? Get 10% off business cards', subtitle: 'All quantities, sizes, and paper stocks. Premium quality printing at unbeatable prices.', buttonText: 'Shop now', bgStyle: 'light' }),
    sec('newsletter', 'default'),
  ],
  about: () => [
    sec('hero', 'gradient', { badge: 'About SaasPrint', headline: 'Professional printing,\nmade simple.', subtitle: 'We are a Kuala Lumpur-based printing company on a mission to make high-quality print accessible, affordable, and hassle-free for everyone.', ctaPrimary: '', ctaSecondary: '' }),
    sec('stats', 'inline', { items: [{ value: '10K+', label: 'Orders Completed' }, { value: '500+', label: 'Business Clients' }, { value: '14', label: 'Product Categories' }, { value: '4.8', label: 'Customer Rating' }] }),
    sec('story-timeline', 'default'),
    sec('features', '4-col', {
      title: 'Why Choose Us', subtitle: 'Built for businesses that care about quality',
      items: [
        { icon: '\uD83D\uDEE1\uFE0F', title: 'Premium Quality', desc: 'We use top-grade materials and state-of-the-art printing equipment for every order, ensuring vivid colours and sharp details.' },
        { icon: '\u23F1\uFE0F', title: 'Fast Turnaround', desc: 'Most orders are completed within 3\u20135 working days. Need it sooner? Express options are available for urgent projects.' },
        { icon: '\uD83D\uDCD6', title: 'Online Artwork Proofing', desc: 'Our built-in proofing tool checks bleed, trim, and resolution before printing \u2014 so you know exactly what you will get.' },
        { icon: '\uD83D\uDCB0', title: 'Competitive Pricing', desc: 'Transparent bulk pricing tiers with no hidden fees. The more you order, the more you save \u2014 simple as that.' },
      ],
    }),
    sec('location', 'default'),
    sec('newsletter', 'default'),
  ],
  faq: () => [
    sec('hero', 'gradient', { badge: 'Help Centre', headline: 'Frequently Asked Questions', subtitle: 'Everything you need to know about ordering, artwork, production, and delivery.', ctaPrimary: '', ctaSecondary: '' }),
    sec('faq', 'grouped', {
      title: 'Frequently Asked Questions',
      items: [
        { question: 'How do I place an order?', answer: 'Select your product, configure the specs (size, material, finishing), upload your artwork, and add to cart. Then proceed to checkout to complete payment.', category: 'Ordering', icon: '\uD83D\uDED2' },
        { question: 'Can I order without uploading artwork?', answer: 'Yes! You can add items to cart and upload artwork later. We will hold production until artwork is received and approved.', category: 'Ordering', icon: '\uD83D\uDED2' },
        { question: 'What is the minimum order quantity?', answer: 'Minimum quantities vary by product. Most items start from 100 pieces, while some large-format products can be ordered as single units.', category: 'Ordering', icon: '\uD83D\uDED2' },
        { question: 'Can I modify my order after placing it?', answer: 'Changes can be made before production starts. Contact us as soon as possible and we will do our best to accommodate your request.', category: 'Ordering', icon: '\uD83D\uDED2' },
        { question: 'What file formats do you accept?', answer: 'We accept PDF, AI, PSD, PNG, and high-resolution JPG files. PDF is the preferred format for best results.', category: 'Artwork & Design', icon: '\uD83C\uDFA8' },
        { question: 'What resolution should my artwork be?', answer: 'Minimum 300 DPI for standard print products. Large-format items like banners can use 150 DPI. Our proofing tool will warn you if resolution is too low.', category: 'Artwork & Design', icon: '\uD83C\uDFA8' },
        { question: 'Do you offer design services?', answer: 'Currently we do not offer in-house design services, but you can use our Canva integration to create designs directly from the product page.', category: 'Artwork & Design', icon: '\uD83C\uDFA8' },
        { question: 'What is bleed and why is it important?', answer: 'Bleed is the area beyond the trim line that ensures no white edges appear after cutting. Each product specifies the required bleed in the Print Spec tab.', category: 'Artwork & Design', icon: '\uD83C\uDFA8' },
        { question: 'How long does production take?', answer: 'Standard production is 3\u20135 working days depending on the product and quantity. Timeline starts after artwork approval.', category: 'Production & Delivery', icon: '\uD83D\uDE9A' },
        { question: 'Do you offer rush orders?', answer: 'Yes, rush production is available for most products at an additional cost. Contact us for availability and pricing.', category: 'Production & Delivery', icon: '\uD83D\uDE9A' },
        { question: 'Where do you deliver?', answer: 'We deliver across Peninsular Malaysia (1\u20133 working days) and East Malaysia. International shipping is also available upon request.', category: 'Production & Delivery', icon: '\uD83D\uDE9A' },
        { question: 'Can I self-collect my order?', answer: 'Yes! Self-collection is available at our facility in Kuala Lumpur. You will be notified via SMS/email when your order is ready.', category: 'Production & Delivery', icon: '\uD83D\uDE9A' },
        { question: 'What payment methods do you accept?', answer: 'We accept online banking (FPX), credit/debit cards, and bank transfers. All prices are in Malaysian Ringgit (MYR).', category: 'Payment & Pricing', icon: '\uD83D\uDCB3' },
        { question: 'Are prices inclusive of SST?', answer: 'All prices displayed are before SST. Applicable taxes will be calculated at checkout.', category: 'Payment & Pricing', icon: '\uD83D\uDCB3' },
        { question: 'Do you offer bulk discounts?', answer: 'Yes! Pricing automatically adjusts based on quantity \u2014 the more you order, the lower the unit price. Business members get an additional 10% off.', category: 'Payment & Pricing', icon: '\uD83D\uDCB3' },
      ],
    }),
    sec('cta', 'centered', { headline: 'Still have questions?', subtitle: 'Our team is happy to help with anything not covered here.', buttonText: 'Contact Us', bgStyle: 'light', buttonAction: '/store/contact' }),
    sec('newsletter', 'default'),
  ],
  contact: () => [
    sec('hero', 'gradient', { badge: 'Get in Touch', headline: "We'd love to hear from you", subtitle: 'Have a question, need a custom quote, or want to discuss a project? Our team typically responds within 1 working day.', ctaPrimary: '', ctaSecondary: '' }),
    sec('contact', 'cards', { title: 'Contact Info', subtitle: '', showForm: false }),
    sec('contact', 'form-right', { title: 'Send us a message', subtitle: 'Fill out the form and we will get back to you shortly.', showForm: true }),
    sec('newsletter', 'default'),
  ],
  'how-to-order': () => [
    sec('hero', 'gradient', { badge: 'How to Order', headline: 'From screen to print\nin 4 simple steps', subtitle: 'Order professional prints online with instant pricing, real-time artwork proofing, and delivery across Malaysia.', ctaPrimary: '', ctaSecondary: '' }),
    sec('process-steps', 'horizontal'),
    sec('features', '4-col', {
      title: 'Artwork Tips', subtitle: 'Prepare your files for the best results',
      items: [
        { icon: '\uD83D\uDCC4', title: 'Accepted Formats', desc: 'PDF (preferred), AI, PSD, PNG, and high-resolution JPG. Vector files give the best print quality.' },
        { icon: '\uD83D\uDD32', title: 'Bleed Area', desc: 'Extend your background 1\u20133mm beyond the trim line to avoid white edges after cutting. Our proofing tool shows exact bleed boundaries.' },
        { icon: '\u2600\uFE0F', title: 'Resolution', desc: 'Use 300 DPI for standard products (cards, flyers, brochures). Large-format items like banners can use 150 DPI.' },
        { icon: '\uD83C\uDFA8', title: 'Canva Integration', desc: 'No design software? Use our Canva integration to create or edit designs directly from the product page with the correct dimensions.' },
      ],
    }),
    sec('cta', 'centered', { headline: 'Ready to get started?', subtitle: 'Browse our product catalog to find exactly what you need, or get in touch if you have questions.', buttonText: 'Browse Products', bgStyle: 'light', buttonAction: '/store/products', ctaSecondary: 'Contact Us', ctaSecondaryAction: '/store/contact' }),
    sec('newsletter', 'default'),
  ],
  membership: () => [
    sec('hero', 'gradient', { badge: 'Membership Programme', headline: 'Subscribe yearly, save on every order', subtitle: 'Join our membership programme and unlock exclusive discounts on all products. One yearly fee \u2014 unlimited savings.', ctaPrimary: '', ctaSecondary: '' }),
    sec('pricing-tiers', 'default'),
    sec('process-steps', 'horizontal', {
      badge: 'How It Works', title: 'How It Works',
      items: [
        { number: '01', icon: '\uD83C\uDFF7\uFE0F', title: 'Choose a Plan', desc: 'Pick the membership tier that suits your business needs and order volume.' },
        { number: '02', icon: '\uD83D\uDCB3', title: 'Subscribe Yearly', desc: 'Pay the annual membership fee and your discount is activated immediately.' },
        { number: '03', icon: '\uD83D\uDED2', title: 'Save on Every Order', desc: 'Enjoy your member discount on all products for the full year.' },
      ],
    }),
    sec('features', '4-col', {
      title: 'Member Benefits', subtitle: 'Enjoy exclusive perks and savings as a SaasPrint member.',
      items: [
        { icon: '\uD83D\uDCB0', title: 'Cheaper Rates', desc: 'Save up to 15% on every order with our tiered discount system.' },
        { icon: '\uD83D\uDCB3', title: 'Quick & Easy Payment', desc: 'Use your member credit balance for faster checkout on all orders.' },
        { icon: '\uD83C\uDFF7\uFE0F', title: 'Exclusive Deals', desc: 'Access member-only promotions, seasonal offers, and bonus coupons.' },
        { icon: '\uD83D\uDCDE', title: 'Priority Support', desc: 'Get dedicated assistance with faster response times via WhatsApp.' },
      ],
    }),
    sec('text-block', 'narrow', {
      heading: 'Terms & Conditions',
      body: '1. Open to Malaysian citizens (18+) with valid identification and foreign nationals with a valid Malaysian address.\n2. Membership is a yearly subscription. Your discount is activated immediately upon payment.\n3. All membership tiers are valid for 12 months from the date of subscription.\n4. Discounts are applied automatically to all orders during your active membership period.\n5. Membership fees are non-refundable once activated.\n6. You may upgrade to a higher tier at any time by paying the price difference.\n7. SaasPrint reserves the right to modify membership terms with 30 days prior notice.',
      alignment: 'center',
    }),
    sec('cta', 'centered', { headline: 'Ready to start saving?', subtitle: 'Choose a plan and subscribe to get started. Your discount activates immediately.', buttonText: 'Subscribe Now', bgStyle: 'light', buttonAction: '/store/account/membership', ctaSecondary: 'Contact Us', ctaSecondaryAction: '/store/contact' }),
    sec('newsletter', 'default'),
  ],
  bundles: () => [
    sec('hero', 'gradient', { badge: 'Save More', headline: 'Bundle Deals', subtitle: 'Save more with our curated bundles \u2014 everything you need for your business or event at a discounted price.', ctaPrimary: '', ctaSecondary: '' }),
  ],
  track: () => [
    sec('hero', 'gradient', { badge: 'Order Status', headline: 'Track Your Order', subtitle: 'Enter your order ID to check the status of your print job.', ctaPrimary: '', ctaSecondary: '' }),
  ],
}

// ── Default global settings ──────────────────────────
export const DEFAULT_GLOBAL: GlobalSettings = {
  shopName: 'SaasPrint',
  slug: 'saasprint',
  tagline: 'Your trusted print partner in Malaysia',
  accentColor: '#006AFF',
  showPrices: true,
  contactEmail: 'hello@saasprint.com',
  contactPhone: '+60 3-7865 4400',
  contactWhatsapp: '+60 12-388 4411',
  contactAddress: 'Kuala Lumpur, Malaysia',
  showWhatsapp: true,
  metaTitle: 'SaasPrint \u2014 Professional Print Services Malaysia',
  metaDesc: 'Fast, quality printing for business cards, flyers, banners, apparel and more. Get an instant quote today.',
  keywords: 'print shop malaysia, business cards, flyers, banners, t-shirt printing',
  published: true,
}

function buildDefaultPages(): StorePages {
  const pages = {} as StorePages
  for (const id of PAGE_IDS) {
    pages[id] = DEFAULT_PAGE_SECTIONS[id]()
  }
  return pages
}

// Legacy compat
export const DEFAULT_SECTIONS: PageSection[] = DEFAULT_PAGE_SECTIONS.homepage()

// ── localStorage keys ─────────────────────────────────
const PAGE_KEY     = 'sp_store_page'
const PRODUCTS_KEY = 'sp_storefront_products'
const PAGE_VERSION = 'sp_store_page_v'
const CURRENT_PAGE_VERSION = 3  // bump to 3 for multi-page migration

// ── Load / Save ───────────────────────────────────────
export function loadStorePage(): StorePage {
  if (typeof window === 'undefined') return { pages: buildDefaultPages(), globalSettings: DEFAULT_GLOBAL }

  const savedVer = localStorage.getItem(PAGE_VERSION)
  if (!savedVer || Number(savedVer) < CURRENT_PAGE_VERSION) {
    localStorage.removeItem(PAGE_KEY)
    localStorage.setItem(PAGE_VERSION, String(CURRENT_PAGE_VERSION))
    const defaults = { pages: buildDefaultPages(), globalSettings: DEFAULT_GLOBAL }
    saveStorePage(defaults)
    return defaults
  }

  try {
    const raw = localStorage.getItem(PAGE_KEY)
    if (raw) {
      const p = JSON.parse(raw)
      // Already multi-page format
      if (p.pages) {
        // Fill missing pages with defaults
        const pages = { ...buildDefaultPages() } as StorePages
        for (const id of PAGE_IDS) {
          if (p.pages[id]) pages[id] = p.pages[id]
        }
        return { pages, globalSettings: { ...DEFAULT_GLOBAL, ...(p.globalSettings || {}) } }
      }
      // Old single-page format: migrate
      if (p.sections) {
        const pages = buildDefaultPages()
        pages.homepage = p.sections
        return { pages, globalSettings: { ...DEFAULT_GLOBAL, ...(p.globalSettings || {}) } }
      }
    }
  } catch { /* ignore */ }

  const defaults = { pages: buildDefaultPages(), globalSettings: DEFAULT_GLOBAL }
  saveStorePage(defaults)
  return defaults
}

export function saveStorePage(page: StorePage) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(PAGE_KEY, JSON.stringify({ pages: page.pages, globalSettings: page.globalSettings }))
  }
}

// ── Page-specific loaders ────────────────────────────
export function loadPageSections(pageId: StorePageId): PageSection[] {
  const store = loadStorePage()
  return store.pages[pageId] || DEFAULT_PAGE_SECTIONS[pageId]()
}

export function savePageSections(pageId: StorePageId, sections: PageSection[]) {
  const store = loadStorePage()
  store.pages[pageId] = sections
  saveStorePage(store)
}

export function loadGlobalSettings(): GlobalSettings {
  const store = loadStorePage()
  return store.globalSettings
}

export function saveGlobalSettings(settings: GlobalSettings) {
  const store = loadStorePage()
  store.globalSettings = settings
  saveStorePage(store)
}

export function loadProductMap(): Record<string, boolean> {
  if (typeof window === 'undefined') return {}
  try { const r = localStorage.getItem(PRODUCTS_KEY); return r ? JSON.parse(r) : {} } catch { return {} }
}

export function saveProductMap(map: Record<string, boolean>) {
  if (typeof window !== 'undefined') localStorage.setItem(PRODUCTS_KEY, JSON.stringify(map))
}

/**
 * Sync overlapping GlobalSettings fields → StoreSettings (sp_store_settings).
 * Call this after saving GlobalSettings so the storefront admin settings stay in sync.
 */
export function syncGlobalToSettings(): void {
  if (typeof window === 'undefined') return
  const g = loadGlobalSettings()
  try {
    const raw = localStorage.getItem('sp_store_settings')
    const ss = raw ? JSON.parse(raw) : {}
    ss.storeName      = g.shopName
    ss.tagline        = g.tagline
    ss.email          = g.contactEmail
    ss.phone          = g.contactPhone
    ss.whatsapp       = g.contactWhatsapp
    ss.address        = g.contactAddress
    ss.seoTitle       = g.metaTitle
    ss.seoDescription = g.metaDesc
    localStorage.setItem('sp_store_settings', JSON.stringify(ss))
  } catch { /* ignore parse errors */ }
}

// ── Section CRUD ──────────────────────────────────────
export function addSection(sections: PageSection[], type: SectionType, afterId?: string): PageSection[] {
  const def = SECTION_REGISTRY[type]
  const s: PageSection = { id: uid(), type, variant: def.variants[0].key, visible: true, props: JSON.parse(JSON.stringify(def.defaultProps)) }
  if (!afterId) return [...sections, s]
  const idx = sections.findIndex(x => x.id === afterId)
  if (idx === -1) return [...sections, s]
  const next = [...sections]; next.splice(idx + 1, 0, s); return next
}

export function removeSection(sections: PageSection[], id: string): PageSection[] {
  return sections.filter(s => s.id !== id)
}

export function moveSection(sections: PageSection[], id: string, dir: 'up' | 'down'): PageSection[] {
  const idx = sections.findIndex(s => s.id === id)
  if (idx === -1) return sections
  const t = dir === 'up' ? idx - 1 : idx + 1
  if (t < 0 || t >= sections.length) return sections
  const next = [...sections]; [next[idx], next[t]] = [next[t], next[idx]]; return next
}

export function updateSectionProps(sections: PageSection[], id: string, props: Record<string, any>): PageSection[] {
  return sections.map(s => s.id === id ? { ...s, props: { ...s.props, ...props } } : s)
}

export function updateSectionPropByPath(sections: PageSection[], id: string, path: string, value: string): PageSection[] {
  return sections.map(s => {
    if (s.id !== id) return s
    const clone = JSON.parse(JSON.stringify(s.props))
    const keys = path.split('.')
    let cur: any = clone
    for (let i = 0; i < keys.length - 1; i++) {
      const k = /^\d+$/.test(keys[i]) ? Number(keys[i]) : keys[i]
      cur = cur[k]
    }
    const last = /^\d+$/.test(keys[keys.length - 1]) ? Number(keys[keys.length - 1]) : keys[keys.length - 1]
    cur[last] = value
    return { ...s, props: clone }
  })
}

export function updateSectionVariant(sections: PageSection[], id: string, variant: string): PageSection[] {
  return sections.map(s => s.id === id ? { ...s, variant } : s)
}

export function toggleSectionVisibility(sections: PageSection[], id: string): PageSection[] {
  return sections.map(s => s.id === id ? { ...s, visible: !s.visible } : s)
}
