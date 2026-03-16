// ── Types ──────────────────────────────────────────────────────────────────

export type OrderStatus     = 'Pending' | 'Confirmed' | 'Cancelled'
export type ProductionStatus = 'Queued' | 'In Progress' | 'Quality Check' | 'Completed' | 'Shipped' | 'Delivered' | '—'

export interface OrderItem {
  id:             string
  name:           string
  sku:            string
  qty:            number
  unitPrice:      number
  total:          number
  optionSummary?: string
  artworkFileName?: string
  artworkUrl?:     string
  selectedSpecs?:  Record<string, string>
  productSlug?:    string
  bulkVariant?:    boolean
  variantRows?:    { id: string; qty: number; selectedSpecs: Record<string, string>; optionSummary: string; unitPrice: number; rowTotal: number }[]
}

export interface OrderPayment {
  id:     string
  date:   string
  method: string
  ref:    string
  amount: number
  status: 'Captured' | 'Pending' | 'Failed'
  receiptData?: string
  receiptFileName?: string
}

export interface OrderTimeline {
  id:    string
  date:  string
  event: string
  by:    string
}

export type OrderSource = 'manual' | 'online-store'

export type CurrencyCode = 'MYR' | 'SGD' | 'USD'

export interface Order {
  id:              string
  customer:        string
  customerRef:     string
  agent:           string
  status:          OrderStatus
  production:      ProductionStatus
  created:         string
  dueDate:         string
  deliveryMethod:  'Delivery' | 'Self-Pickup'
  deliveryAddress: string
  notes:           string
  source:          OrderSource
  items:           OrderItem[]
  payments:        OrderPayment[]
  timeline:        OrderTimeline[]

  // ── Original files ──
  originalFiles?: { id: string; type: 'file' | 'link'; name: string; url?: string }[]

  // ── Financial fields ──
  discount:      number
  discountType:  'rm' | 'percent'
  sstEnabled:    boolean
  sstRate:       number
  sstAmount:     number
  rounding:      number
  shippingCost:  number
  subtotal:      number
  grandTotal:    number
  currency:      CurrencyCode
}

// ── localStorage helpers ───────────────────────────────────────────────────

const KEY      = 'sp_orders'
const INIT_KEY = 'sp_orders_init_v5'

function load(): Order[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}
function save(items: Order[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(KEY, JSON.stringify(items))
  } catch (e) {
    console.error('Failed to save orders to localStorage:', e)
    // Strip large data URLs and retry
    const stripped = items.map(o => ({
      ...o,
      originalFiles: o.originalFiles?.map(f => ({ ...f, url: f.url && f.url.length > 500 ? '' : f.url })),
      items: o.items.map(i => ({ ...i, artworkUrl: i.artworkUrl && i.artworkUrl.length > 500 ? '' : i.artworkUrl })),
    }))
    try { localStorage.setItem(KEY, JSON.stringify(stripped)) } catch {}
  }
}

const HWM_KEY = 'op.order-hwm'
function nextId(): string {
  const items = load()
  const nums  = items.map(o => parseInt(o.id.replace('ORD-', '')) || 0)
  const maxExisting = nums.length > 0 ? Math.max(...nums) : 2512
  const hwm = typeof window !== 'undefined' ? parseInt(localStorage.getItem(HWM_KEY) ?? '0') || 0 : 0
  const next = Math.max(maxExisting, hwm) + 1
  if (typeof window !== 'undefined') localStorage.setItem(HWM_KEY, String(next))
  return `ORD-${next}`
}

let _uid = 0
export function uid(): string { return `oi-${Date.now()}-${++_uid}` }

// ── Financial helpers ────────────────────────────────────────────────────────

export function calcOrderTotals(o: {
  items: OrderItem[]
  discount: number
  discountType: 'rm' | 'percent'
  sstEnabled: boolean
  sstRate: number
  rounding: number
  shippingCost: number
}) {
  const subtotal = o.items.reduce((s, i) => s + i.total, 0)
  const discountAmt = o.discountType === 'percent'
    ? subtotal * (o.discount / 100)
    : o.discount
  const afterDiscount = subtotal - discountAmt
  const sstAmt = o.sstEnabled
    ? parseFloat((afterDiscount * (o.sstRate / 100)).toFixed(2))
    : 0
  const beforeRounding = afterDiscount + sstAmt + o.shippingCost
  const grandTotal = parseFloat((beforeRounding + o.rounding).toFixed(2))

  return { subtotal, discountAmt, afterDiscount, sstAmt, grandTotal }
}

// ── CRUD ───────────────────────────────────────────────────────────────────

export function getOrders(): Order[]                          { return load() }
export function getOrderById(id: string): Order | null        { return load().find(o => o.id === id) ?? null }
export function createOrder(data: Omit<Order, 'id'>): Order   { const all = load(); const o: Order = { id: nextId(), ...data }; save([...all, o]); return o }
export function updateOrder(id: string, updates: Partial<Order>): void { save(load().map(o => o.id === id ? { ...o, ...updates } : o)) }
export function deleteOrder(id: string): void {
  save(load().filter(o => o.id !== id))
  // Clean up proof/card state for this order
  try {
    const proofLinks = JSON.parse(localStorage.getItem('sp.proof-links') ?? '[]')
    localStorage.setItem('sp.proof-links', JSON.stringify(proofLinks.filter((r: { cardId: string }) => r.cardId !== id)))
    const cardStates = JSON.parse(localStorage.getItem('sp.prod-card-state') ?? '{}')
    delete cardStates[id]
    localStorage.setItem('sp.prod-card-state', JSON.stringify(cardStates))
  } catch {}
}

export function duplicateOrder(sourceId: string): Order | null {
  const source = getOrderById(sourceId)
  if (!source) return null
  const newOrder: Order = {
    ...source,
    id: nextId(),
    status: 'Pending',
    production: '—',
    created: new Date().toISOString().slice(0, 16).replace('T', ' '),
    dueDate: '',
    payments: [],
    items: source.items.map(item => ({ ...item, id: `item_${uid()}` })),
    timeline: [{
      id: `tl_${uid()}`,
      date: new Date().toISOString().slice(0, 16).replace('T', ' '),
      event: `Duplicated from ${source.id}`,
      by: source.agent || 'Admin',
    }],
  }
  const all = load()
  save([...all, newOrder])
  return newOrder
}

// ── Seed data ──────────────────────────────────────────────────────────────

export function initOrderData(): void {
  if (typeof window === 'undefined') return
  if (localStorage.getItem(INIT_KEY)) return

  const seed: Order[] = []

  localStorage.setItem(KEY,      JSON.stringify(seed))
  localStorage.setItem(INIT_KEY, '1')
}
