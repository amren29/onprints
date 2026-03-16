// ── Types ──────────────────────────────────────────────────────────────────

export type ContentType   = 'Page' | 'Blog' | 'Banner'
export type ContentStatus = 'Published' | 'Draft'

export interface ContentItem {
  id:      string
  title:   string
  type:    ContentType
  status:  ContentStatus
  slug:    string
  body:    string
  updated: string  // ISO date string (YYYY-MM-DD)
}

// ── localStorage helpers ───────────────────────────────────────────────────

const KEY      = 'sp_content'
const INIT_KEY = 'sp_content_init_v1'

function load(): ContentItem[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}
function save(items: ContentItem[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(items))
}
function nextId(): string { return `CNT-${Date.now()}` }

// ── CRUD ───────────────────────────────────────────────────────────────────

export function getContent(): ContentItem[]                               { return load() }
export function getContentById(id: string): ContentItem | null            { return load().find(c => c.id === id) ?? null }
export function createContent(data: Omit<ContentItem, 'id'>): ContentItem { const all = load(); const c: ContentItem = { id: nextId(), ...data }; save([...all, c]); return c }
export function updateContent(id: string, updates: Partial<ContentItem>): void { save(load().map(c => c.id === id ? { ...c, ...updates, updated: new Date().toISOString().slice(0, 10) } : c)) }
export function deleteContent(id: string): void                           { save(load().filter(c => c.id !== id)) }

// ── Seed data ──────────────────────────────────────────────────────────────

export function initContentData(): void {
  if (typeof window === 'undefined') return
  if (localStorage.getItem(INIT_KEY) === '2') return

  localStorage.setItem(KEY,      JSON.stringify([]))
  localStorage.setItem(INIT_KEY, '2')
}
