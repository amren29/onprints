/**
 * Abandoned Cart Tracker
 *
 * Saves cart snapshots to localStorage so the admin storefront
 * can see carts that were filled but never checked out.
 *
 * Each browser session gets a unique ID. When items are added/removed
 * the snapshot updates. When checkout completes (clearCart), the
 * session is removed from the abandoned list.
 */

const STORAGE_KEY = 'sp_abandoned_carts'
const SESSION_KEY = 'sp_cart_session_id'

export type AbandonedCart = {
  sessionId: string
  customerName: string
  customerEmail: string
  isGuest: boolean
  items: { name: string; qty: number; unitPrice: number; total: number; optionSummary: string }[]
  totalValue: number
  itemCount: number
  createdAt: string
  updatedAt: string
}

/* ── Session ID ───────────────────────────────────── */
function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  let id = sessionStorage.getItem(SESSION_KEY)
  if (!id) {
    id = `cart_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    sessionStorage.setItem(SESSION_KEY, id)
  }
  return id
}

/* ── Load / Save ──────────────────────────────────── */
function loadAll(): AbandonedCart[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch { return [] }
}

function saveAll(carts: AbandonedCart[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(carts))
}

/* ── Public API ───────────────────────────────────── */

/** Save or update the current cart session snapshot */
export function snapshotCart(
  cartItems: { name: string; qty: number; unitPrice: number; total: number; optionSummary: string }[],
  user?: { name: string; email: string } | null,
) {
  if (typeof window === 'undefined') return
  if (cartItems.length === 0) {
    // Cart is empty — remove this session from abandoned list
    removeCurrentSession()
    return
  }

  const sessionId = getSessionId()
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const all = loadAll()
  const idx = all.findIndex(c => c.sessionId === sessionId)

  const entry: AbandonedCart = {
    sessionId,
    customerName: user?.name || 'Guest',
    customerEmail: user?.email || '',
    isGuest: !user,
    items: cartItems.map(i => ({ name: i.name, qty: i.qty, unitPrice: i.unitPrice, total: i.total, optionSummary: i.optionSummary })),
    totalValue: cartItems.reduce((s, i) => s + i.total, 0),
    itemCount: cartItems.reduce((s, i) => s + i.qty, 0),
    createdAt: idx >= 0 ? all[idx].createdAt : now,
    updatedAt: now,
  }

  if (idx >= 0) {
    all[idx] = entry
  } else {
    all.push(entry)
  }

  saveAll(all)
}

/** Remove the current session (called on successful checkout) */
export function removeCurrentSession() {
  if (typeof window === 'undefined') return
  const sessionId = sessionStorage.getItem(SESSION_KEY)
  if (!sessionId) return
  const all = loadAll().filter(c => c.sessionId !== sessionId)
  saveAll(all)
  sessionStorage.removeItem(SESSION_KEY)
}

/* ── Admin API ────────────────────────────────────── */

/** Get all abandoned cart sessions (for admin page) */
export function getAbandonedCarts(): AbandonedCart[] {
  return loadAll()
}

/** Remove a specific abandoned cart by session ID (admin action) */
export function removeAbandonedCart(sessionId: string) {
  saveAll(loadAll().filter(c => c.sessionId !== sessionId))
}

/** Clear all abandoned carts (admin action) */
export function clearAllAbandonedCarts() {
  saveAll([])
}
