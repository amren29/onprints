// ── Types ──────────────────────────────────────────────────────────────────

export type DiscountType   = 'percentage' | 'fixed'
export type DiscountStatus = 'Active' | 'Expired' | 'Draft'

export interface Discount {
  id:         string
  code:       string
  type:       DiscountType
  value:      number
  minOrder:   number
  usageLimit: number
  usageCount: number
  expiry:     string
  status:     DiscountStatus
  notes:      string
}

// ── localStorage helpers ───────────────────────────────────────────────────

const KEY      = 'sp_discounts'
const INIT_KEY = 'sp_discounts_init_v1'

function load(): Discount[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}
function save(items: Discount[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(items))
}

function nextId(): string {
  return `DSC-${Date.now()}`
}

// ── CRUD ───────────────────────────────────────────────────────────────────

export function getDiscounts(): Discount[]                               { return load() }
export function getDiscountById(id: string): Discount | null             { return load().find(d => d.id === id) ?? null }
export function createDiscount(data: Omit<Discount, 'id'>): Discount    { const all = load(); const d: Discount = { id: nextId(), ...data }; save([...all, d]); return d }
export function updateDiscount(id: string, updates: Partial<Discount>): void { save(load().map(d => d.id === id ? { ...d, ...updates } : d)) }
export function deleteDiscount(id: string): void                         { save(load().filter(d => d.id !== id)) }

// ── Seed data ──────────────────────────────────────────────────────────────

export function initDiscountData(): void {
  if (typeof window === 'undefined') return
  if (localStorage.getItem(INIT_KEY) === '2') return

  localStorage.setItem(KEY,      JSON.stringify([]))
  localStorage.setItem(INIT_KEY, '2')
}
