// ── Types ──────────────────────────────────────────────────────────────────

export type CampaignType   = 'Email' | 'Push' | 'Social' | 'Referral' | 'SMS'
export type CampaignStatus = 'Active' | 'Draft' | 'Completed' | 'Paused'

export interface Campaign {
  id:         string
  name:       string
  type:       CampaignType
  status:     CampaignStatus
  date:       string   // scheduled/start date YYYY-MM-DD
  reach:      number   // number of recipients / impressions (0 = not sent)
  discount:   string   // linked discount code (empty if none)
  audience:   string   // e.g. "All Customers", "VIP", "Newsletter subscribers"
  subject:    string   // email subject line / push title
  body:       string   // campaign body / message
  notes:      string
}

// ── localStorage helpers ───────────────────────────────────────────────────

const KEY      = 'sp_campaigns'
const INIT_KEY = 'sp_campaigns_init_v1'

function load(): Campaign[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}
function save(items: Campaign[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(items))
}
function nextId(): string { return `CMP-${Date.now()}` }

// ── CRUD ───────────────────────────────────────────────────────────────────

export function getCampaigns(): Campaign[]                               { return load() }
export function getCampaignById(id: string): Campaign | null             { return load().find(c => c.id === id) ?? null }
export function createCampaign(data: Omit<Campaign, 'id'>): Campaign    { const all = load(); const c: Campaign = { id: nextId(), ...data }; save([...all, c]); return c }
export function updateCampaign(id: string, updates: Partial<Campaign>): void { save(load().map(c => c.id === id ? { ...c, ...updates } : c)) }
export function deleteCampaign(id: string): void                         { save(load().filter(c => c.id !== id)) }

// ── Seed data ──────────────────────────────────────────────────────────────

export function initCampaignData(): void {
  if (typeof window === 'undefined') return
  if (localStorage.getItem(INIT_KEY) === '2') return

  localStorage.setItem(KEY,      JSON.stringify([]))
  localStorage.setItem(INIT_KEY, '2')
}
