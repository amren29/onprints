export interface DeliveryZone {
  id:       string
  name:     string
  price:    number
  days:     string   // e.g. "2-3 business days"
  active:   boolean
}

export interface StoreSettings {
  // Store Info
  storeName:    string
  tagline:      string
  logoUrl:      string
  currency:     string
  // Contact
  email:        string
  phone:        string
  whatsapp:     string
  address:      string
  // Social
  facebook:     string
  instagram:    string
  tiktok:       string
  twitter:      string
  // Payment methods shown at checkout
  paymentFpx:      boolean
  paymentCard:     boolean
  paymentCash:     boolean
  paymentEwallet:  boolean
  // Bank transfer details (shown at checkout)
  bankName:        string
  bankAccountNo:   string
  bankAccountName: string
  // Delivery
  selfPickup:      boolean
  deliveryEnabled: boolean
  deliveryZones:   DeliveryZone[]
  // SEO
  seoTitle:        string
  seoDescription:  string
  ogImage:         string
  // SEO — Analytics & Verification
  googleVerification: string
  analyticsId:        string
  facebookPixelId:    string
  // SEO — Social Sharing
  defaultOgImage:     string
  twitterCardType:    'summary' | 'summary_large_image'
}

import { getStoreSettings as getDbStoreSettings } from '@/lib/db/storefront'

const SHOP_ID = process.env.NEXT_PUBLIC_SHOP_ID!

const KEY = 'sp_store_settings'

export const DEFAULTS: StoreSettings = {
  storeName:       'Kinabalu Print Shop',
  tagline:         'Quality Print, Fast Delivery',
  logoUrl:         '',
  currency:        'MYR',
  email:           'hello@kinabaluprint.my',
  phone:           '+60 11-1234 5678',
  whatsapp:        '601112345678',
  address:         'No. 12, Jalan Tuaran, Kota Kinabalu, Sabah 88000',
  facebook:        '',
  instagram:       '',
  tiktok:          '',
  twitter:         '',
  paymentFpx:      true,
  paymentCard:     true,
  paymentCash:     true,
  paymentEwallet:  true,
  bankName:        '',
  bankAccountNo:   '',
  bankAccountName: '',
  selfPickup:      true,
  deliveryEnabled: true,
  deliveryZones: [
    { id: 'dz1', name: 'Kota Kinabalu',  price: 8,  days: '1-2 days',         active: true },
    { id: 'dz2', name: 'Sabah (others)', price: 15, days: '2-4 days',         active: true },
    { id: 'dz3', name: 'West Malaysia',  price: 20, days: '3-5 days',         active: true },
    { id: 'dz4', name: 'Sarawak',        price: 18, days: '3-5 days',         active: true },
  ],
  seoTitle:        'Kinabalu Print Shop — Quality Print, Fast Delivery',
  seoDescription:  'Custom business cards, banners, flyers, t-shirts and more. Order online and get fast delivery across Malaysia.',
  ogImage:         '',
  googleVerification: '',
  analyticsId:        '',
  facebookPixelId:    '',
  defaultOgImage:     '',
  twitterCardType:    'summary_large_image',
}

export function getStoreSettings(): StoreSettings {
  if (typeof window === 'undefined') return DEFAULTS
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULTS }
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch { return { ...DEFAULTS } }
}

export function saveStoreSettings(s: StoreSettings): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(s))
}

/**
 * Fetch store settings from Supabase (async).
 * Returns StoreSettings shape by reading store_settings config from DB.
 */
export async function fetchStoreSettings(): Promise<StoreSettings> {
  try {
    const row = await getDbStoreSettings(SHOP_ID)
    if (row?.config) {
      return { ...DEFAULTS, ...(row.config as Partial<StoreSettings>) }
    }
  } catch { /* fall back to defaults */ }
  return { ...DEFAULTS }
}

export function addDeliveryZone(zone: Omit<DeliveryZone, 'id'>): void {
  const s = getStoreSettings()
  s.deliveryZones = [...s.deliveryZones, { ...zone, id: `dz${Date.now()}` }]
  saveStoreSettings(s)
}

export function removeDeliveryZone(id: string): void {
  const s = getStoreSettings()
  s.deliveryZones = s.deliveryZones.filter(z => z.id !== id)
  saveStoreSettings(s)
}

/**
 * Sync overlapping StoreSettings fields → GlobalSettings (sp_store_page).
 * Call this after saving StoreSettings so the editor/navbar/footer stay in sync.
 */
export function syncSettingsToGlobal(): void {
  if (typeof window === 'undefined') return
  const ss = getStoreSettings()
  try {
    const raw = localStorage.getItem('sp_store_page')
    if (!raw) return
    const store = JSON.parse(raw)
    const g = store.globalSettings
    if (!g) return
    g.shopName        = ss.storeName
    g.tagline         = ss.tagline
    g.contactEmail    = ss.email
    g.contactPhone    = ss.phone
    g.contactWhatsapp = ss.whatsapp
    g.contactAddress  = ss.address
    g.metaTitle       = ss.seoTitle
    g.metaDesc        = ss.seoDescription
    localStorage.setItem('sp_store_page', JSON.stringify(store))
  } catch { /* ignore parse errors */ }
}
