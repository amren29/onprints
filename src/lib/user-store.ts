const KEY      = 'sp_team_users'
const INIT_KEY = 'sp_team_users_init_v2'

export type UserRole   = 'admin' | 'staff' | 'agent'
export type UserStatus = 'Active' | 'Suspended' | 'Invited'

export interface TeamUser {
  id:       string
  name:     string
  email:    string
  role:     UserRole
  status:   UserStatus
  lastSeen: string
  joined:   string
  initials: string
  color:    string
  phone?:   string
}

function uid(): string { return 'USR-' + Math.random().toString(36).slice(2, 8).toUpperCase() }
function load(): TeamUser[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}
function save(users: TeamUser[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(users))
}
function initials(name: string): string {
  return name.trim().split(/\s+/).map(w => w[0]?.toUpperCase() ?? '').slice(0, 2).join('')
}

const COLORS = ['#006AFF', '#7c3aed', '#db2777', '#d97706', '#0891b2', '#059669', '#6366f1', '#ef4444']

export function initUserData(): void {
  if (typeof window === 'undefined') return
  if (localStorage.getItem(INIT_KEY) === 'v2') return
  save([])
  localStorage.setItem(INIT_KEY, 'v2')
}

export function getTeamUsers(): TeamUser[]       { return load() }
export function getTeamUserById(id: string)      { return load().find(u => u.id === id) }

export function addTeamUser(data: { name: string; email: string; role: UserRole }): TeamUser {
  const users = load()
  const colorIdx = users.length % COLORS.length
  const user: TeamUser = {
    id:       uid(),
    name:     data.name,
    email:    data.email,
    role:     data.role,
    status:   'Invited',
    lastSeen: 'Never',
    joined:   new Date().toISOString().slice(0, 10),
    initials: initials(data.name),
    color:    COLORS[colorIdx],
  }
  save([...users, user])
  return user
}

export function updateTeamUser(id: string, patch: Partial<TeamUser>): void {
  save(load().map(u => u.id === id ? { ...u, ...patch } : u))
}

export function deleteTeamUser(id: string): void {
  save(load().filter(u => u.id !== id))
}
