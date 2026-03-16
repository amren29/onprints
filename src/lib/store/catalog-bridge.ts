/**
 * Bridge between admin DbProduct (Supabase) and store Product type.
 * Converts DB products into the Product shape the online store expects.
 */
import { getProducts, getCategories, type DbProduct, type DbCategory } from '@/lib/db/catalog'
import { getStorePage } from '@/lib/db/storefront'
import type { Product, ProductCategory, SpecOption, PricingMatrix } from '@/types/store'

const SHOP_ID = process.env.NEXT_PUBLIC_SHOP_ID!

/* ── Category mapping ─────────────────────────────── */
const CATEGORY_MAP: Record<string, ProductCategory> = {
  // KinabaluPrintShop categories
  'Acrylic':           'signage',
  'Banner':            'large-format',
  'Bookmark':          'marketing',
  'Booklet':           'marketing',
  'Brochure':          'marketing',
  'Box Packaging':     'merchandise',
  'Bunting':           'large-format',
  'Business Cards':    'cards',
  'Button Badge':      'merchandise',
  'CD & DVD':          'marketing',
  'Calendar':          'stationery',
  'Canvas Print':      'large-format',
  'Document Printing': 'documents',
  'DTF':               'merchandise',
  'Drawings':          'documents',
  'Envelope':          'stationery',
  'Event Name Tag':    'events',
  'Flyers':            'marketing',
  'Hand fan':          'events',
  'Lanyard':           'events',
  'Letterhead':        'stationery',
  'Mug':               'merchandise',
  'Money Packet':      'marketing',
  'NCR Bill book':     'stationery',
  'Mock Up Cheque':    'events',
  'Name Tag':          'events',
  'Non Woven Bag':     'merchandise',
  'Notepad':           'stationery',
  'Pop-Up System':     'large-format',
  'Poster':            'marketing',
  'PVC ID Card':       'cards',
  'Stamp':             'stamps',
  'Sticker':           'stickers',
  'Sublimation':       'merchandise',
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[()]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/* ── Convert a single DbProduct → Product ──────── */
export function dbProductToProduct(item: DbProduct, categoryName: string): Product {
  const sizes = (item.sizes as any)?.fixed ?? []
  const firstSize = sizes[0]
  const pricing = item.pricing as any
  const productVTiers = pricing?.volumeTiers?.length ? pricing.volumeTiers : null
  const optionGroups = (item.option_groups ?? []) as any[]

  // Helper: resolve volume tiers for a given size
  function tiersForSize(s: typeof firstSize) {
    let vt = productVTiers
      ?? (s?.volumeTiers?.length ? s.volumeTiers : null)
    if (!vt) {
      const bp = parseFloat(s?.basePrice || String(item.base_price) || '0')
      vt = [{ minQty: 1, unitPrice: bp }]
    }
    return vt
  }

  // 1. Build per-size pricing matrix entries
  const pricingMatrix: PricingMatrix = {}
  if (sizes.length > 1) {
    sizes.forEach((s: any) => {
      pricingMatrix[s.label] = tiersForSize(s).map((t: any) => ({
        qty: t.minQty, unitPrice: t.unitPrice, productionDays: 5,
      }))
    })
  }
  // Always set 'default' from first size
  const defaultTiers = tiersForSize(firstSize)
  pricingMatrix.default = defaultTiers.map((t: any) => ({
    qty: t.minQty, unitPrice: t.unitPrice, productionDays: 5,
  }))

  // 2. Quantities: prefer customQtyOptions, then volume tier breakpoints
  const customQty = firstSize?.customQtyOptions
  const quantities = customQty?.length ? customQty : defaultTiers.map((t: any) => t.minQty)

  // Build specs from sizes + option groups
  const specs: SpecOption[] = []

  const sizeMode = (item.sizes as any)?.mode ?? 'fixed'
  if ((item.sizes as any)?.fixed && (item.sizes as any).fixed.length > 0 && sizeMode !== 'custom') {
    const sizeOptions = (item.sizes as any).fixed.map((s: any) => s.label)
    if (sizeMode === 'both') sizeOptions.push('Custom Size')
    specs.push({
      key: 'size',
      label: 'Size',
      displayType: 'dropdown',
      options: sizeOptions,
      default: (item.sizes as any).fixed[0].label,
    })
  }

  const optionModifiers: Record<string, { modifierType: 'add' | 'multiply'; modifierValue: number }> = {}
  optionGroups.forEach((g: any) => {
    const dt = g.displayType === 'dropdown' ? 'dropdown' as const
      : g.displayType === 'image' ? 'image' as const
      : 'buttons' as const
    const optionImages: Record<string, string> = {}
    g.options.forEach((o: any) => {
      if (o.imageUrl) optionImages[o.label] = o.imageUrl
      if (o.modifierValue) {
        optionModifiers[o.label] = { modifierType: o.modifierType, modifierValue: o.modifierValue }
      }
    })
    specs.push({
      key: g.groupName.toLowerCase().replace(/\s+/g, '-'),
      label: g.groupName,
      displayType: dt,
      options: g.options.map((o: any) => o.label),
      default: g.options[0]?.label || '',
      ...(dt === 'image' && Object.keys(optionImages).length > 0 ? { optionImages } : {}),
    })
  })

  const category = CATEGORY_MAP[categoryName] || 'marketing'
  const w = parseFloat(firstSize?.width || '0') || 90
  const h = parseFloat(firstSize?.height || '0') || 54

  return {
    id: item.id,
    slug: slugify(item.name),
    name: item.name,
    category,
    description: item.description,
    imageUrl: item.main_image || '',
    specs,
    quantities: quantities.length > 0 ? quantities : [1],
    pricingMatrix,
    optionModifiers: Object.keys(optionModifiers).length > 0 ? optionModifiers : undefined,
    printSpecs: {
      printMethod: category === 'large-format' ? 'large-format' : 'offset',
      bleedMm: 3,
      safeAreaMm: 5,
      minDpi: 300,
      trimWidthMm: w,
      trimHeightMm: h,
    },
    isActive: item.status === 'Active' && item.visibility === 'published',
    processDuration: (item.product_info as any)?.processDuration || undefined,
    sizeMode: sizeMode !== 'fixed' ? sizeMode : undefined,
    sqftPricing: (item.sizes as any)?.sqft ? { pricePerSqft: (item.sizes as any).sqft.pricePerSqft, minCharge: (item.sizes as any).sqft.minCharge } : undefined,
    ...(item.bulk_variant && optionGroups.length ? {
      bulkVariant: true,
      bulkVolumeTiers: (pricing?.volumeTiers || []).map((t: any) => ({
        qty: parseInt(t.minQty) || 0,
        unitPrice: parseFloat(t.unitPrice) || 0,
      })).filter((t: any) => t.unitPrice > 0),
      bulkOptionGroups: optionGroups.map((g: any) => ({
        groupName: g.groupName,
        selectionType: (g.selectionType || 'single') as 'single' | 'multi',
        displayType: (g.displayType || 'dropdown') as 'radio' | 'dropdown' | 'image',
        options: g.options.map((o: any) => ({
          label: o.label,
          modifierType: o.modifierType as 'add' | 'multiply',
          modifierValue: parseFloat(o.modifierValue) || 0,
        })),
      })),
    } : {}),
  }
}

/* ── Get all store products from Supabase ────── */
export async function getStoreProducts(): Promise<Product[]> {
  // Use API route instead of server actions (compatible with Cloudflare Workers)
  const baseUrl = typeof window !== 'undefined'
    ? ''
    : (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')

  const res = await fetch(`${baseUrl}/api/store/products`, { cache: 'no-store' })
  if (!res.ok) return []

  const { products, categories } = await res.json() as {
    products: DbProduct[]
    categories: DbCategory[]
  }

  const catMap = new Map((categories || []).map((c: DbCategory) => [c.id, c.name]))

  return (products || [])
    .filter(item => item.status === 'Active' && item.visibility === 'published')
    .map(item => dbProductToProduct(item, catMap.get(item.category_id ?? '') ?? ''))
}

/* ── Get a single product by slug ─────────────────── */
export async function getStoreProductBySlug(slug: string): Promise<Product | null> {
  const products = await getStoreProducts()
  return products.find(p => p.slug === slug) || null
}

/* ── Get unique categories from current catalog ───── */
export async function getStoreCategories(): Promise<{ id: ProductCategory; label: string; description: string }[]> {
  const products = await getStoreProducts()
  const seen = new Set<string>()
  const cats: { id: ProductCategory; label: string; description: string }[] = []

  const LABELS: Record<string, { label: string; description: string }> = {
    cards:          { label: 'Cards',             description: 'Business cards, PVC, membership' },
    marketing:      { label: 'Marketing',         description: 'Flyers, brochures, posters' },
    'large-format': { label: 'Large Format',      description: 'Banners, bunting, canvas' },
    stationery:     { label: 'Stationery',        description: 'Notebooks, pads, calendars' },
    stickers:       { label: 'Stickers & Labels', description: 'Custom stickers and labels' },
    signage:        { label: 'Signage',           description: 'Acrylic and display signage' },
    stamps:         { label: 'Stamps',            description: 'Self-inking rubber stamps' },
    events:         { label: 'Events & Promo',    description: 'Name tags, tickets, lanyards' },
    merchandise:    { label: 'Merchandise',       description: 'T-shirts, mugs, bags, and gifts' },
    documents:      { label: 'Documents',         description: 'Document and plan printing' },
  }

  products.forEach(p => {
    if (!seen.has(p.category)) {
      seen.add(p.category)
      const info = LABELS[p.category] || { label: p.category, description: '' }
      cats.push({ id: p.category, label: info.label, description: info.description })
    }
  })

  return cats
}
