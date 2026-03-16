// ── Types ──────────────────────────────────────────────────────────────────

export type DeliveryStatus = 'Pending' | 'Dispatched' | 'In Transit' | 'Delivered' | 'Failed'

export interface Delivery {
  id:            string
  orderId:       string
  customer:      string
  courier:       string        // e.g. "J&T Express", "Pos Laju", "DHL"
  trackingNo:    string
  status:        DeliveryStatus
  dispatchDate:  string        // YYYY-MM-DD
  eta:           string        // YYYY-MM-DD
  deliveredDate: string        // YYYY-MM-DD (filled when Delivered)
  address:       string
  notes:         string
  confirmed:     boolean       // recipient confirmed delivery
}

// ── localStorage helpers ───────────────────────────────────────────────────

const KEY      = 'sp_deliveries'
const INIT_KEY = 'sp_deliveries_init_v1'

function load(): Delivery[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}
function save(items: Delivery[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(items))
}
function nextId(): string { return `DEL-${Date.now()}` }

// ── CRUD ───────────────────────────────────────────────────────────────────

export function getDeliveries(): Delivery[]                              { return load() }
export function getDeliveryById(id: string): Delivery | null             { return load().find(d => d.id === id) ?? null }
export function createDelivery(data: Omit<Delivery, 'id'>): Delivery    { const all = load(); const d: Delivery = { id: nextId(), ...data }; save([...all, d]); return d }
export function updateDelivery(id: string, updates: Partial<Delivery>): void { save(load().map(d => d.id === id ? { ...d, ...updates } : d)) }
export function deleteDelivery(id: string): void                         { save(load().filter(d => d.id !== id)) }

export function bulkUpdateDeliveries(ids: string[], updates: Partial<Delivery>): void {
  const set = new Set(ids)
  save(load().map(d => set.has(d.id) ? { ...d, ...updates } : d))
}
export function bulkDeleteDeliveries(ids: string[]): void {
  const set = new Set(ids)
  save(load().filter(d => !set.has(d.id)))
}

// ── Seed data ──────────────────────────────────────────────────────────────

export function initDeliveryData(): void {
  if (typeof window === 'undefined') return
  if (localStorage.getItem(INIT_KEY) === '2') return

  localStorage.setItem(KEY,      JSON.stringify([]))
  localStorage.setItem(INIT_KEY, '2')
}
