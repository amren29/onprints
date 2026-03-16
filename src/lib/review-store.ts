export type ReviewStatus = 'Pending' | 'Approved' | 'Rejected'

export interface Review {
  id:      string
  name:    string
  company: string
  product: string
  rating:  number     // 1-5
  text:    string
  status:  ReviewStatus
  pinned:  boolean
  date:    string     // YYYY-MM-DD
}

const KEY      = 'sp_reviews'
const INIT_KEY = 'sp_reviews_init_v1'

function load(): Review[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}
function save(items: Review[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(items))
}
function nextId(): string { return `REV-${Date.now()}` }

export function getReviews(): Review[]                            { return load() }
export function getReviewById(id: string): Review | null          { return load().find(r => r.id === id) ?? null }
export function createReview(data: Omit<Review, 'id'>): Review   { const all = load(); const r: Review = { id: nextId(), ...data }; save([...all, r]); return r }
export function updateReview(id: string, updates: Partial<Review>): void { save(load().map(r => r.id === id ? { ...r, ...updates } : r)) }
export function deleteReview(id: string): void                    { save(load().filter(r => r.id !== id)) }

export function initReviewData(): void {
  if (typeof window === 'undefined') return
  if (localStorage.getItem(INIT_KEY) === '2') return

  localStorage.setItem(KEY, JSON.stringify([]))
  localStorage.setItem(INIT_KEY, '2')
}
