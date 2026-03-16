export type BundleStatus = 'Active' | 'Draft' | 'Paused'
export type BundleDiscountType = 'percentage' | 'fixed'

export interface BundleItem {
  catalogId: string
  name:      string
  qty:       number
}

export interface Bundle {
  id:           string
  name:         string
  description:  string
  items:        BundleItem[]
  discountType: BundleDiscountType
  discountValue: number
  originalPrice: number   // sum of item prices (for display)
  status:       BundleStatus
  featured:     boolean
  created:      string
}

const KEY      = 'sp_bundles'
const INIT_KEY = 'sp_bundles_init_v1'

function load(): Bundle[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}
function save(items: Bundle[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(items))
}
function nextId(): string { return `BDL-${String(load().length + 1).padStart(3, '0')}` }

export function getBundles(): Bundle[]                              { return load() }
export function getBundleById(id: string): Bundle | null            { return load().find(b => b.id === id) ?? null }
export function createBundle(data: Omit<Bundle, 'id'>): Bundle     { const all = load(); const b: Bundle = { id: nextId(), ...data }; save([...all, b]); return b }
export function updateBundle(id: string, updates: Partial<Bundle>): void { save(load().map(b => b.id === id ? { ...b, ...updates } : b)) }
export function deleteBundle(id: string): void                      { save(load().filter(b => b.id !== id)) }

export function initBundleData(): void {
  if (typeof window === 'undefined') return
  if (localStorage.getItem(INIT_KEY) === '2') return

  localStorage.setItem(KEY, JSON.stringify([]))
  localStorage.setItem(INIT_KEY, '2')
}
