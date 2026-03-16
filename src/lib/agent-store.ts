// ── Types ─────────────────────────────────────────────
/** @deprecated kept for backward compat with old data */
export type Commission = {
  id: string
  orderId: string
  orderTotal: number
  commissionAmount: number
  status: 'pending' | 'approved' | 'paid'
  date: string
}

export type Agent = {
  id: string
  fullName: string
  email: string
  phone: string
  region: string
  status: 'Active' | 'Suspended' | 'Inactive'
  discountRate: number          // e.g. 20 for 20%
  paymentMethod: string
  bankName: string
  bankAccountName: string
  bankAccountNumber: string
  startDate: string
  notes: string
  // Legacy fields (may exist in old data)
  commissionType?: 'percentage' | 'flat'
  commissionValue?: number
  orders?: number
  earned?: number
  commissions?: Commission[]
  commissionTierId?: string
  tierOverride?: boolean
}

// ── localStorage helpers ───────────────────────────────
function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback } catch { return fallback }
}
function write(key: string, value: unknown) {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, JSON.stringify(value))
}

function nextId(): string {
  const items = read<{ id: string }[]>(Ka.agents, [])
  const maxNum = items.reduce((max, item) => {
    const m = item.id.match(/^AG-(\d+)$/)
    return m ? Math.max(max, parseInt(m[1])) : max
  }, 41)
  return `AG-${String(maxNum + 1).padStart(2, '0')}`
}

const Ka = {
  init: 'agent.init',
  agents: 'agent.agents',
}

// ── Seed data ─────────────────────────────────────────
export function initAgentData() {
  if (read<string>(Ka.init, '') === 'v3') return

  write(Ka.agents, [])
  write(Ka.init, 'v3')
}

// ── CRUD ──────────────────────────────────────────────
export function getAgents(): Agent[] { return read(Ka.agents, []) }
export function getAgentById(id: string): Agent | null { return getAgents().find(a => a.id === id) ?? null }

export function createAgent(data: Omit<Agent, 'id'>): Agent {
  const agent = { ...data, id: nextId() }
  write(Ka.agents, [...getAgents(), agent])
  return agent
}

export function updateAgent(id: string, updates: Partial<Agent>) {
  write(Ka.agents, getAgents().map(a => a.id === id ? { ...a, ...updates } : a))
}

export function deleteAgent(id: string) {
  write(Ka.agents, getAgents().filter(a => a.id !== id))
}
