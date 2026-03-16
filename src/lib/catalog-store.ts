import type { PricingTier, VolumeTier, SqftPricing, OptionGroup } from './option-pricing'
import { SEED_CATEGORIES, SEED_CATALOG } from './catalog-seed-data'

const KEY      = 'sp_catalog'
const INIT_KEY = 'sp_catalog_init_v13'

const CAT_KEY      = 'sp_cat_groups'
const CAT_INIT_KEY = 'sp_cat_grp_init'

export type PricingType   = 'fixed' | 'volume' | 'tier' | 'sqft'
export type ItemStatus    = 'Active' | 'Paused'
export type Visibility    = 'published' | 'draft'
export type CategoryStatus = 'Active' | 'Paused'

export interface Category {
  id:         string
  name:       string
  status:     CategoryStatus
  visibility: Visibility
  notes:      string
}

export interface ProductImage {
  id:   string
  url:  string   // base64 data URL
  name: string   // label / alt text
}

export type SizeMode = 'fixed' | 'custom' | 'both'
export interface FixedSize {
  label: string; width: string; height: string; unit: string
  basePrice?:        string        // for 'fixed' pricing type
  tiers?:            PricingTier[] // for 'tier' pricing type
  volumeTiers?:      VolumeTier[]  // for 'volume' pricing type
  customQtyOptions?: number[]      // explicit qty choices shown in storefront dropdown
}
export interface SizesConfig { mode: SizeMode; fixed: FixedSize[]; sqft?: SqftPricing }

export interface CatalogItem {
  id:             string
  name:           string
  sku:            string
  category:       string
  price:          string
  pricingType:    PricingType
  status:         ItemStatus
  visibility:     Visibility
  description:    string
  notes:          string
  mainImage:      ProductImage | null
  variantImages:  ProductImage[]
  // Pricing engine
  basePrice?:     string
  tiers?:         PricingTier[]
  volumeTiers?:   VolumeTier[]
  sqft?:          SqftPricing
  optionGroups?:  OptionGroup[]
  // Sizes
  sizes?:         SizesConfig
  // Bulk variant flag (apparel products needing multi-row variant builder)
  bulkVariant?: boolean
  // Product info tabs (editable per product)
  productInfo?: {
    overview?:          string
    printSpec?:         string
    artworkGuidelines?: string
    processDuration?:   string
    howToOrder?:        string
    delivery?:          string
  }
}

function nextId(): string {
  const items: CatalogItem[] = JSON.parse(localStorage.getItem(KEY) || '[]')
  const nums = items.map(c => parseInt(c.id.replace('CAT-', '')) || 0)
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1
  return `CAT-${String(next).padStart(3, '0')}`
}

export function getCatalogItems(): CatalogItem[] {
  return JSON.parse(localStorage.getItem(KEY) || '[]')
}

export function getCatalogItemById(id: string): CatalogItem | null {
  return getCatalogItems().find(c => c.id === id) ?? null
}

export function createCatalogItem(data: Omit<CatalogItem, 'id'>): CatalogItem {
  const items = getCatalogItems()
  const item: CatalogItem = { id: nextId(), ...data }
  localStorage.setItem(KEY, JSON.stringify([...items, item]))
  return item
}

export function updateCatalogItem(id: string, updates: Partial<CatalogItem>): void {
  const updated = getCatalogItems().map(c => c.id === id ? { ...c, ...updates } : c)
  localStorage.setItem(KEY, JSON.stringify(updated))
}

export function deleteCatalogItem(id: string): void {
  localStorage.setItem(KEY, JSON.stringify(getCatalogItems().filter(c => c.id !== id)))
}

/* ── Category CRUD ─────────────────────────────────── */
function nextCatId(): string {
  const cats: Category[] = JSON.parse(localStorage.getItem(CAT_KEY) || '[]')
  const nums = cats.map(c => parseInt(c.id.replace('CGRP-', '')) || 0)
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1
  return `CGRP-${String(next).padStart(2, '0')}`
}

export function getCategories(): Category[] {
  return JSON.parse(localStorage.getItem(CAT_KEY) || '[]')
}

export function createCategory(data: Omit<Category, 'id'>): Category {
  const cats = getCategories()
  const cat: Category = { id: nextCatId(), ...data }
  localStorage.setItem(CAT_KEY, JSON.stringify([...cats, cat]))
  return cat
}

export function updateCategory(id: string, updates: Partial<Category>): void {
  const updated = getCategories().map(c => c.id === id ? { ...c, ...updates } : c)
  localStorage.setItem(CAT_KEY, JSON.stringify(updated))
}

export function deleteCategory(id: string): void {
  localStorage.setItem(CAT_KEY, JSON.stringify(getCategories().filter(c => c.id !== id)))
}

export function initCategoryData(): void {
  if (localStorage.getItem(CAT_INIT_KEY) === '8') return
  localStorage.setItem(CAT_KEY, JSON.stringify(SEED_CATEGORIES))
  localStorage.setItem(CAT_INIT_KEY, '8')
}

export function initCatalogData(): void {
  if (localStorage.getItem(INIT_KEY) === '13') return
  localStorage.setItem(KEY, JSON.stringify(SEED_CATALOG))
  localStorage.setItem(INIT_KEY, '13')
}

