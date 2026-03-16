'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import AppShell from '@/components/AppShell'
import RowMenu from '@/components/RowMenu'
import CustomSelect from '@/components/CustomSelect'
import { initUserData, getTeamUsers, addTeamUser, updateTeamUser, deleteTeamUser, type TeamUser, type UserRole, type UserStatus } from '@/lib/user-store' // TODO: migrate to Supabase
import { getStoreSettings, saveStoreSettings } from '@/lib/db/storefront'
import { saveNotifPrefs } from '@/lib/db/notifications'
import { useShop } from '@/providers/shop-provider'
import { useQuery, useQueryClient } from '@tanstack/react-query'

/* ── ICONS ──────────────────────────────────────────── */
const UserIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
  </svg>
)
const OrgIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
)
const BellIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
  </svg>
)
const ShieldIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
)
const RoleIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
)
const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)
const CameraIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
)
const EyeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
)
const EyeOffIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
)

const SearchIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
)
const DotsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>
  </svg>
)
const MailIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
  </svg>
)
const ClockIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
)
const XIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)
const UsersIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
  </svg>
)
const WarningIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
)
const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)

/* ── SHARED STYLES ──────────────────────────────────── */
const sectionLabel: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14,
}
const cardStyle: React.CSSProperties = {
  padding: 24, borderRadius: 12,
  background: 'var(--bg-card)', border: '1px solid var(--border)',
}
const formLabel: React.CSSProperties = { fontWeight: 600 }
const sectionGap: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 24 }
const cardTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, marginBottom: 4 }
const cardDesc: React.CSSProperties = { fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 20 }
const footerBar: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
  gap: 10, marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)',
}

/* ── USERS DATA ─────────────────────────────────────── */
const ROLE_CFG: Record<UserRole, { label: string; color: string; bg: string; desc: string; perms: string[] }> = {
  admin: { label: 'Admin', color: 'var(--accent)', bg: 'var(--info-bg)', desc: 'Full access to everything',         perms: ['All orders','All finance','All CRM','Inventory','Users','Settings','Reports'] },
  staff: { label: 'Staff', color: 'var(--accent, #006AFF)', bg: 'var(--info-bg)', desc: 'Operational access, no settings',   perms: ['All orders','Finance view','All CRM','Inventory','Production'] },
  agent: { label: 'Agent', color: 'var(--purple-text)', bg: 'rgba(124,58,237,0.1)', desc: 'Own orders & customers only',   perms: ['Own orders','Own customers','Discount pricing'] },
}

const USER_STATUS_BADGE: Record<UserStatus, string> = {
  Active: 'badge badge-success', Suspended: 'badge badge-pending', Invited: 'badge badge-warning',
}

function InviteModal({ onClose, onInvite }: { onClose: () => void; onInvite: (name: string, email: string, role: UserRole) => void }) {
  const [name, setName]   = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole]   = useState<UserRole>('staff')
  const [err, setErr]     = useState('')

  const handleSend = () => {
    if (!name.trim()) { setErr('Name is required.'); return }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) { setErr('Valid email required.'); return }
    onInvite(name.trim(), email.trim(), role)
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: 28, width: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Invite User</div>
          <button className="btn-ghost" style={{ padding: 6, borderRadius: 8 }} onClick={onClose}><XIcon /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label className="form-group"><span className="form-label" style={formLabel}>Full Name *</span><input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Ahmad Zawawi" style={{ padding: '10px 12px' }} /></label>
          <label className="form-group"><span className="form-label" style={formLabel}>Email Address *</span><input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="user@saasprint.my" style={{ padding: '10px 12px' }} /></label>
          {err && <div style={{ fontSize: 12, color: 'var(--negative)' }}>{err}</div>}
          <label className="form-group">
            <span className="form-label" style={formLabel}>Role</span>
            <CustomSelect
              value={role}
              onChange={v => setRole(v as UserRole)}
              options={(Object.keys(ROLE_CFG) as UserRole[]).map(r => ({ value: r, label: `${ROLE_CFG[r].label} — ${ROLE_CFG[r].desc}` }))}
            />
          </label>
          <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={sectionLabel}>Permissions granted</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {ROLE_CFG[role].perms.map(p => <span key={p} style={{ fontSize: 11.5, background: ROLE_CFG[role].bg, color: ROLE_CFG[role].color, borderRadius: 5, padding: '3px 9px', fontWeight: 500 }}>{p}</span>)}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
          <button className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>Cancel</button>
          <button className="btn-primary" style={{ flex: 2, justifyContent: 'center' }} onClick={handleSend}>Send Invite</button>
        </div>
      </div>
    </div>
  )
}

function UsersSection() {
  const [tab, setTab]           = useState('All')
  const [search, setSearch]     = useState('')
  const [showInvite, setShowInvite] = useState(false)
  const [users, setUsers]       = useState<TeamUser[]>([])

  useEffect(() => { initUserData(); setUsers(getTeamUsers()) }, [])
  const reload = () => setUsers(getTeamUsers())

  const filtered = users.filter(u => {
    if (tab === 'Admin'     && u.role !== 'admin')       return false
    if (tab === 'Staff'     && u.role !== 'staff')       return false
    if (tab === 'Agent'     && u.role !== 'agent')       return false
    if (tab === 'Suspended' && u.status !== 'Suspended') return false
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const active    = users.filter(u => u.status === 'Active').length
  const admins    = users.filter(u => u.role === 'admin').length
  const staff     = users.filter(u => u.role === 'staff').length
  const agents    = users.filter(u => u.role === 'agent').length
  const suspended = users.filter(u => u.status === 'Suspended').length
  const invited   = users.filter(u => u.status === 'Invited').length

  const handleInvite = (name: string, email: string, role: UserRole) => {
    addTeamUser({ name, email, role })
    reload()
  }
  const handleToggleSuspend = (u: TeamUser) => {
    updateTeamUser(u.id, { status: u.status === 'Suspended' ? 'Active' : 'Suspended' })
    reload()
  }
  const handleRemove = (id: string) => {
    deleteTeamUser(id)
    reload()
  }

  return (
    <div>
      <SectionHeader title="Users" subtitle="Team members, role assignments and pending invitations" />
      <div style={sectionGap}>
      {showInvite && <InviteModal onClose={() => setShowInvite(false)} onInvite={handleInvite} />}

      {/* Stat chips */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
        {[
          { label: 'Total',     value: users.length, color: 'var(--text-primary)' },
          { label: 'Active',    value: active,        color: 'var(--positive)'    },
          { label: 'Admins',    value: admins,        color: 'var(--accent)'            },
          { label: 'Staff',     value: staff,         color: 'var(--accent, #006AFF)' },
          { label: 'Agents',    value: agents,        color: 'var(--purple-text)'            },
          { label: 'Suspended', value: suspended,     color: suspended > 0 ? 'var(--negative)' : 'var(--text-muted)' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ padding: '14px 16px' }}>
            <div className="stat-card-label" style={{ marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Invite button — more prominent */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn-primary" onClick={() => setShowInvite(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', fontSize: 13, fontWeight: 600 }}>
          <PlusIcon /> Invite User
        </button>
      </div>

      {/* Filter + search */}
      <div className="filter-row" style={{ position: 'static' }}>
        <div className="filter-bar">
          {['All','Admin','Staff','Agent','Suspended'].map(t => (
            <button key={t} className={`filter-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '6px 12px' }}>
          <SearchIcon />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users…"
            style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12.5, color: 'var(--text-primary)', width: 160 }} />
        </div>
      </div>

      {/* Users table */}
      <div className="card">
        <table className="data-table">
          <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Email</th><th>Phone</th><th>Joined</th><th>Last Seen</th><th></th></tr></thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={8}><div className="empty-state">No users found</div></td></tr>}
            {filtered.map(u => {
              const cfg = ROLE_CFG[u.role]
              return (
                <tr key={u.id} style={{ transition: 'background 0.15s ease' }}>
                  <td>
                    <div className="td-with-icon">
                      <div style={{
                        width: 34, height: 34, borderRadius: '50%', background: `${u.color}22`, color: u.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700,
                        flexShrink: 0, border: `1.5px solid ${u.color}44`, transition: 'box-shadow 0.2s ease',
                      }}>{u.initials}</div>
                      <div><div className="cell-name">{u.name}</div><div className="cell-sub">{u.id}</div></div>
                    </div>
                  </td>
                  <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: cfg.color, background: cfg.bg, borderRadius: 6, padding: '3px 9px' }}><ShieldIcon /> {cfg.label}</span></td>
                  <td><span className={USER_STATUS_BADGE[u.status]}>{u.status}</span></td>
                  <td><div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'var(--text-secondary)' }}><MailIcon /> {u.email}</div></td>
                  <td style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{u.phone ?? '—'}</td>
                  <td style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{u.joined}</td>
                  <td><div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: u.lastSeen === 'Never' ? 'var(--text-muted)' : 'var(--text-secondary)' }}>{u.lastSeen !== 'Never' && <ClockIcon />}{u.lastSeen}</div></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        className="btn-ghost"
                        style={{ padding: '4px 8px', fontSize: 11.5, borderRadius: 6, color: u.status === 'Suspended' ? 'var(--positive)' : 'var(--text-muted)' }}
                        title={u.status === 'Suspended' ? 'Activate' : 'Suspend'}
                        onClick={() => handleToggleSuspend(u)}
                      >
                        {u.status === 'Suspended' ? 'Activate' : 'Suspend'}
                      </button>
                      <button
                        className="btn-ghost"
                        style={{ padding: '4px 8px', fontSize: 11.5, borderRadius: 6, color: 'var(--negative)' }}
                        title="Remove user"
                        onClick={() => handleRemove(u.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pending invites banner */}
      {invited > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', borderRadius: 10, padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <MailIcon />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--warning-subtle)' }}>{invited} pending invite{invited !== 1 ? 's' : ''}</div>
              <div style={{ fontSize: 12, color: 'var(--warning)' }}>Invite link expires in 7 days</div>
            </div>
          </div>
          <button className="btn-secondary" style={{ fontSize: 12 }}>Resend All</button>
        </div>
      )}
    </div>
    </div>
  )
}

/* ── NAV SECTIONS ───────────────────────────────────── */
type Section = 'account' | 'organization' | 'notifications' | 'security' | 'billing' | 'payment' | 'roles' | 'users'

const BankIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/>
  </svg>
)

const NAV: { key: Section; label: string; icon: () => React.ReactNode; desc: string }[] = [
  { key: 'account',       label: 'My Account',      icon: UserIcon,    desc: 'Profile & preferences'    },
  { key: 'organization',  label: 'Organization',    icon: OrgIcon,     desc: 'Shop info & branding'     },
  { key: 'notifications', label: 'Notifications',   icon: BellIcon,    desc: 'Alerts & digests'         },
  { key: 'security',      label: 'Security',        icon: ShieldIcon,  desc: 'Password & 2FA'           },
  { key: 'billing',       label: 'Billing & Plan',  icon: BankIcon,    desc: 'Subscription & invoices'   },
  { key: 'roles',         label: 'Roles & Access',  icon: RoleIcon,    desc: 'Permission configuration' },
  { key: 'users',         label: 'Users',           icon: UsersIcon,   desc: 'Team members & invites'   },
]

/* ── TOGGLE SWITCH ──────────────────────────────────── */
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      style={{
        width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
        background: on ? 'var(--accent)' : 'var(--border)',
        position: 'relative', flexShrink: 0, transition: 'background 0.25s ease',
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: on ? 22 : 3,
        width: 18, height: 18, borderRadius: '50%', background: 'var(--bg-card)',
        transition: 'left 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
      }} />
    </button>
  )
}

/* ── TOAST ─────────────────────────────────────────── */
function useToast() {
  const [toast, setToast] = useState<{ message: string; id: number } | null>(null)
  const show = useCallback((message: string) => {
    setToast({ message, id: Date.now() })
  }, [])
  return { toast, show }
}

function Toast({ toast }: { toast: { message: string; id: number } | null }) {
  const [visible, setVisible] = useState(false)
  const [exiting, setExiting] = useState(false)
  const prevId = useRef<number | null>(null)

  useEffect(() => {
    if (!toast || toast.id === prevId.current) return
    prevId.current = toast.id
    setExiting(false)
    setVisible(true)
    const exitTimer = setTimeout(() => setExiting(true), 1700)
    const hideTimer = setTimeout(() => setVisible(false), 2200)
    return () => { clearTimeout(exitTimer); clearTimeout(hideTimer) }
  }, [toast])

  if (!visible || !toast) return null

  return (
    <div style={{
      position: 'fixed', top: 28, left: '50%', transform: 'translateX(-50%)', zIndex: 300,
      display: 'flex', alignItems: 'center', gap: 8,
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '11px 20px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      animation: exiting ? 'settingsToastOut 0.35s ease forwards' : 'settingsToastIn 0.35s ease',
    }}>
      <span style={{ color: 'var(--positive)', display: 'flex' }}><CheckIcon /></span>
      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{toast.message}</span>
    </div>
  )
}

/* ── SECTION HEADER ─────────────────────────────────── */
function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{subtitle}</div>
    </div>
  )
}

/* ── SECTION COMPONENTS ──────────────────────────────── */

function AccountSection({ onSave }: { onSave: (msg: string) => void }) {
  const [name, setName]   = useState('Ahmad Zawawi')
  const [email, setEmail] = useState('ahmad@saasprint.my')
  const [phone, setPhone] = useState('+60 12-388 4411')

  return (
    <div>
      <SectionHeader title="My Account" subtitle="Manage your personal profile, contact details and preferences" />
      <div style={sectionGap}>
        {/* Avatar */}
        <div style={cardStyle}>
          <div style={sectionLabel}>Profile Photo</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{ position: 'relative' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--info-bg)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, border: '2px solid var(--accent)' }}>
                AZ
              </div>
              <button style={{ position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: '50%', background: 'var(--accent)', border: '2px solid var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', transition: 'transform 0.15s ease' }}>
                <CameraIcon />
              </button>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Ahmad Zawawi</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>JPG, PNG or GIF · Max 2MB</div>
              <button className="btn-secondary" style={{ fontSize: 12, padding: '6px 14px' }}>Upload Photo</button>
            </div>
          </div>
        </div>

        {/* Profile info */}
        <div style={cardStyle}>
          <div style={sectionLabel}>Personal Information</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <label className="form-group">
              <span className="form-label" style={formLabel}>Full Name</span>
              <input className="form-input" value={name} onChange={e => setName(e.target.value)} style={{ padding: '10px 12px' }} />
            </label>
            <label className="form-group">
              <span className="form-label" style={formLabel}>Phone</span>
              <input className="form-input" value={phone} onChange={e => setPhone(e.target.value)} style={{ padding: '10px 12px' }} />
            </label>
            <label className="form-group" style={{ gridColumn: '1 / -1' }}>
              <span className="form-label" style={formLabel}>Email Address</span>
              <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} style={{ padding: '10px 12px' }} />
            </label>
          </div>
          <div style={footerBar}>
            <button className="btn-primary" onClick={() => onSave('Account saved')}>Save Changes</button>
          </div>
        </div>

        {/* Preferences */}
        <div style={cardStyle}>
          <div style={sectionLabel}>Preferences</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              { label: 'Language', value: 'English (EN)',             options: ['English (EN)', 'Bahasa Melayu (BM)'] },
              { label: 'Timezone', value: 'Asia/Kuala_Lumpur (GMT+8)', options: ['Asia/Kuala_Lumpur (GMT+8)', 'Asia/Singapore (GMT+8)', 'UTC (GMT+0)'] },
              { label: 'Currency', value: 'Malaysian Ringgit (MYR)',   options: ['Malaysian Ringgit (MYR)', 'US Dollar (USD)', 'Singapore Dollar (SGD)'] },
            ].map(p => (
              <div key={p.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>{p.label}</span>
                <div style={{ width: 260 }}>
                  <CustomSelect value={p.value} onChange={() => {}} options={p.options} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Danger zone */}
        <div style={{ ...cardStyle, background: 'rgba(239,68,68,0.06)', border: '1px solid #fecaca' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ color: 'var(--negative)' }}><WarningIcon /></span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--negative)' }}>Danger Zone</span>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--negative)', marginBottom: 16, opacity: 0.7 }}>These actions are irreversible. Please be careful.</div>
          <button style={{
            fontSize: 12.5, fontWeight: 600, color: '#fff', border: 'none',
            background: 'var(--negative)', padding: '8px 16px', borderRadius: 8,
            cursor: 'pointer', fontFamily: 'var(--font)', transition: 'opacity 0.15s ease',
          }}>
            Delete My Account
          </button>
        </div>
      </div>
    </div>
  )
}

function OrganizationSection({ onSave, shopId }: { onSave: (msg: string) => void; shopId: string }) {
  const qc = useQueryClient()
  const [loaded,   setLoaded]   = useState(false)
  const [shopName, setShopName] = useState('')
  const [tagline,  setTagline]  = useState('')
  const [email,    setEmail]    = useState('')
  const [phone,    setPhone]    = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [address,  setAddress]  = useState('')
  const [facebook, setFacebook] = useState('')
  const [instagram,setInstagram]= useState('')
  const [logoUrl,  setLogoUrl]  = useState('')
  const logoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!shopId) return
    getStoreSettings(shopId).then(data => {
      const s = (data?.config ?? {}) as Record<string, string>
      setShopName(s.storeName ?? '')
      setTagline(s.tagline ?? '')
      setEmail(s.email ?? '')
      setPhone(s.phone ?? '')
      setWhatsapp(s.whatsapp ?? '')
      setAddress(s.address ?? '')
      setFacebook(s.facebook ?? '')
      setInstagram(s.instagram ?? '')
      setLogoUrl(s.logoUrl ?? '')
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [shopId])

  const handleLogoFile = (file: File) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = ev => setLogoUrl(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    const current = await getStoreSettings(shopId)
    const prevConfig = (current?.config ?? {}) as Record<string, unknown>
    await saveStoreSettings(shopId, {
      ...prevConfig,
      storeName:  shopName.trim() || (prevConfig.storeName as string) || '',
      tagline,
      email,
      phone,
      whatsapp,
      address,
      facebook,
      instagram,
      logoUrl,
    })
    qc.invalidateQueries({ queryKey: ['storeSettings', shopId] })
    onSave('Organization settings saved')
  }

  if (!loaded) return null

  return (
    <div>
      <SectionHeader title="Organization" subtitle="Shop identity, contact details and social links" />
      <div style={sectionGap}>

        {/* Logo */}
        <div style={cardStyle}>
          <div style={sectionLabel}>Shop Logo</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{ width: 72, height: 72, borderRadius: 14, background: logoUrl ? 'transparent' : 'var(--bg-hero)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: 'var(--accent)', flexShrink: 0 }}>
              {logoUrl
                ? <img src={logoUrl} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                : shopName.slice(0, 2).toUpperCase() || 'SP'}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{shopName || 'Your Shop'}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>PNG or SVG · Recommended 200×200px</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoFile(f) }} />
                <button className="btn-secondary" style={{ fontSize: 12, padding: '6px 14px' }}
                  onClick={() => logoInputRef.current?.click()}>Upload Logo</button>
                {logoUrl && (
                  <button className="btn-ghost" style={{ fontSize: 12, padding: '6px 12px', color: 'var(--negative)' }}
                    onClick={() => setLogoUrl('')}>Remove</button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Business info */}
        <div style={cardStyle}>
          <div style={sectionLabel}>Business Information</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <label className="form-group">
              <span className="form-label" style={formLabel}>Shop Name *</span>
              <input className="form-input" value={shopName} onChange={e => setShopName(e.target.value)} style={{ padding: '10px 12px' }} />
            </label>
            <label className="form-group">
              <span className="form-label" style={formLabel}>Tagline</span>
              <input className="form-input" value={tagline} onChange={e => setTagline(e.target.value)} style={{ padding: '10px 12px' }} />
            </label>
            <label className="form-group">
              <span className="form-label" style={formLabel}>Business Email</span>
              <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} style={{ padding: '10px 12px' }} />
            </label>
            <label className="form-group">
              <span className="form-label" style={formLabel}>Phone</span>
              <input className="form-input" value={phone} onChange={e => setPhone(e.target.value)} style={{ padding: '10px 12px' }} />
            </label>
            <label className="form-group">
              <span className="form-label" style={formLabel}>WhatsApp Number <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(digits only, e.g. 601112345678)</span></span>
              <input className="form-input" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} style={{ padding: '10px 12px' }} placeholder="601112345678" />
            </label>
            <label className="form-group">
              <span className="form-label" style={formLabel}>Facebook URL</span>
              <input className="form-input" value={facebook} onChange={e => setFacebook(e.target.value)} style={{ padding: '10px 12px' }} placeholder="https://facebook.com/yourpage" />
            </label>
            <label className="form-group" style={{ gridColumn: '1 / -1' }}>
              <span className="form-label" style={formLabel}>Business Address</span>
              <textarea className="form-input" rows={2} value={address} onChange={e => setAddress(e.target.value)} style={{ resize: 'vertical', padding: '10px 12px' }} />
            </label>
            <label className="form-group">
              <span className="form-label" style={formLabel}>Instagram URL</span>
              <input className="form-input" value={instagram} onChange={e => setInstagram(e.target.value)} style={{ padding: '10px 12px' }} placeholder="https://instagram.com/yourhandle" />
            </label>
          </div>
          <div style={footerBar}>
            <button className="btn-primary" onClick={handleSave}>Save Changes</button>
          </div>
        </div>


      </div>
    </div>
  )
}

function NotificationsSection({ onSave, shopId }: { onSave: (msg: string) => void; shopId: string }) {
  const [prefs, setPrefs] = useState({
    newOrder:      { email: true,  inApp: true,  sms: false },
    paymentRecv:   { email: true,  inApp: true,  sms: true  },
    orderOverdue:  { email: true,  inApp: true,  sms: false },
    stockLow:      { email: false, inApp: true,  sms: false },
    prodComplete:  { email: false, inApp: true,  sms: false },
    prodMove:      { email: false, inApp: true,  sms: false },
    newAgent:      { email: true,  inApp: false, sms: false },
    digest:        { email: true,  inApp: false, sms: false },
  })

  type PrefKey = keyof typeof prefs
  type Channel = 'email' | 'inApp' | 'sms'

  const toggle = (key: PrefKey, ch: Channel) =>
    setPrefs(p => ({ ...p, [key]: { ...p[key], [ch]: !p[key][ch] } }))

  const rows: { key: PrefKey; label: string; desc: string }[] = [
    { key: 'newOrder',       label: 'New Order',                desc: 'When a new order is placed'                           },
    { key: 'paymentRecv',    label: 'Payment Received',         desc: 'When a payment is captured'                           },
    { key: 'orderOverdue',   label: 'Order Overdue',             desc: 'When an order passes its due date'                    },
    { key: 'stockLow',       label: 'Low Stock Alert',          desc: 'When stock falls below reorder level'                 },
    { key: 'prodComplete',   label: 'Production Completed',     desc: 'When a production job is finished'                    },
    { key: 'prodMove',       label: 'Production Card Moved',    desc: 'When a card is moved between production stages'       },
    { key: 'newAgent',       label: 'New Agent Registered',     desc: 'When a new agent joins'                               },
    { key: 'digest',         label: 'Daily Digest',             desc: 'Daily summary email at 8 AM'                          },
  ]

  return (
    <div>
      <SectionHeader title="Notifications" subtitle="Choose how and when you want to be notified" />
      <div style={cardStyle}>
        <div style={sectionLabel}>Notification Preferences</div>

        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px', gap: 8, paddingBottom: 10, borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Event</div>
          {['Email', 'In-App', 'SMS'].map(ch => (
            <div key={ch} style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' }}>{ch}</div>
          ))}
        </div>

        {rows.map((row, i) => (
          <div key={row.key} style={{
            display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px', gap: 8, alignItems: 'center',
            padding: '14px 4px', borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none',
            background: i % 2 === 0 ? 'transparent' : 'var(--bg)',
            borderRadius: 6, margin: '0 -4px',
          }}>
            <div style={{ paddingLeft: 4 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{row.label}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{row.desc}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}><Toggle on={prefs[row.key].email}  onChange={() => toggle(row.key, 'email')}  /></div>
            <div style={{ display: 'flex', justifyContent: 'center' }}><Toggle on={prefs[row.key].inApp}  onChange={() => toggle(row.key, 'inApp')}  /></div>
            <div style={{ display: 'flex', justifyContent: 'center' }}><Toggle on={prefs[row.key].sms}    onChange={() => toggle(row.key, 'sms')}    /></div>
          </div>
        ))}

        <div style={footerBar}>
          <button className="btn-primary" onClick={async () => { await saveNotifPrefs(shopId, 'default', prefs); onSave('Preferences saved') }}>Save Preferences</button>
        </div>
      </div>
    </div>
  )
}

function SecuritySection({ onSave }: { onSave: (msg: string) => void }) {
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [twoFA,   setTwoFA]   = useState(false)

  const SESSIONS = [
    { device: 'MacBook Pro (Chrome)',   location: 'Kuala Lumpur, MY', time: 'Active now',    current: true  },
    { device: 'iPhone 15 (Safari)',     location: 'Kuala Lumpur, MY', time: '2 hours ago',   current: false },
    { device: 'Windows PC (Edge)',      location: 'Shah Alam, MY',    time: '3 days ago',    current: false },
  ]

  return (
    <div>
      <SectionHeader title="Security" subtitle="Password management, two-factor auth and session control" />
      <div style={sectionGap}>
        {/* Password */}
        <div style={cardStyle}>
          <div style={sectionLabel}>Change Password</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 400 }}>
            {[
              { label: 'Current Password', show: showOld, toggle: () => setShowOld(v => !v) },
              { label: 'New Password',     show: showNew, toggle: () => setShowNew(v => !v) },
              { label: 'Confirm New Password', show: showNew, toggle: () => setShowNew(v => !v) },
            ].map(f => (
              <label key={f.label} className="form-group">
                <span className="form-label" style={formLabel}>{f.label}</span>
                <div style={{ position: 'relative' }}>
                  <input className="form-input" type={f.show ? 'text' : 'password'} placeholder="••••••••" style={{ padding: '10px 12px', paddingRight: 38 }} />
                  <button onClick={f.toggle} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'color 0.15s ease' }}>
                    {f.show ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </label>
            ))}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>Min. 8 characters · include uppercase, number & symbol</div>
          <div style={footerBar}>
            <button className="btn-primary" onClick={() => onSave('Password updated')}>Update Password</button>
          </div>
        </div>

        {/* 2FA */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={cardTitle}>Two-Factor Authentication</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', maxWidth: 380 }}>
                Add an extra layer of security. You'll need your authenticator app each time you sign in.
              </div>
            </div>
            <Toggle on={twoFA} onChange={setTwoFA} />
          </div>
          {twoFA && (
            <div style={{ marginTop: 16, padding: '16px 18px', background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 8 }}>Scan with your authenticator app</div>
              <div style={{ width: 100, height: 100, background: 'var(--border)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--text-muted)' }}>QR Code</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}>Or enter code manually: <code style={{ fontFamily: 'monospace', background: 'var(--border)', padding: '2px 8px', borderRadius: 5, fontSize: 12 }}>SAAS-PRNT-2026</code></div>
            </div>
          )}
        </div>

        {/* Active sessions */}
        <div style={cardStyle}>
          <div style={sectionLabel}>Active Sessions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {SESSIONS.map((s, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 8px', borderBottom: i < SESSIONS.length - 1 ? '1px solid var(--border)' : 'none',
                borderRadius: 8, margin: '0 -8px', transition: 'background 0.15s ease',
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{s.device}</span>
                    {s.current && <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--positive)', background: 'var(--info-bg)', borderRadius: 4, padding: '2px 8px' }}>Current</span>}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 3 }}>{s.location} · {s.time}</div>
                </div>
                {!s.current && (
                  <button style={{
                    fontSize: 12, fontWeight: 500, color: 'var(--negative)', border: '1px solid #fca5a5',
                    background: 'var(--danger-bg)', padding: '6px 14px', borderRadius: 7,
                    cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.15s ease',
                  }}>
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <button style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--negative)', border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font)', transition: 'opacity 0.15s ease' }}>
              Revoke all other sessions
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── BILLING SECTION ──────────────────────────────────── */

function BillingSection({ onSave, shopId }: { onSave: (msg: string) => void; shopId: string }) {
  const [currentPlan, setCurrentPlan] = useState<{
    plan: string | null
    billing: string | null
    planStartedAt: string | null
    planExpiresAt: string | null
    platformFeeSen: number | null
    stripeSubscriptionId: string | null
    stripeCustomerId: string | null
    subscriptionStatus: string | null
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [managingSubscription, setManagingSubscription] = useState(false)
  const [invoices, setInvoices] = useState<{ id: string; amount_paid: number; status: string; created: number; hosted_invoice_url: string | null; invoice_pdf: string | null; lines?: { data?: { description?: string }[] } }[]>([])

  useEffect(() => {
    fetchCurrentPlan()
    fetchInvoices()
    checkStripeReturn()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    function handleFocus() { fetchCurrentPlan(); fetchInvoices() }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchCurrentPlan() {
    try {
      const res = await fetch(`/api/plan/current?shopId=${shopId}`)
      if (res.ok) setCurrentPlan(await res.json())
    } catch (err) { console.error('Failed to fetch plan:', err) }
    finally { setLoading(false) }
  }

  async function fetchInvoices() {
    try {
      const res = await fetch(`/api/plan/invoices?shopId=${shopId}`)
      if (res.ok) { const data = await res.json(); setInvoices(data.invoices || []) }
    } catch { /* not critical */ }
  }

  async function checkStripeReturn() {
    const stripeSessionId = new URLSearchParams(window.location.search).get('stripe_session_id')
    if (!stripeSessionId) return
    try {
      const res = await fetch(`/api/plan/verify?stripe_session_id=${stripeSessionId}`)
      const data = await res.json()
      if (data.verified) {
        setCurrentPlan({ plan: data.plan, billing: data.billing, planStartedAt: data.planStartedAt, planExpiresAt: data.planExpiresAt, platformFeeSen: ({ starter: 100, growth: 60, pro: 20 } as Record<string, number>)[data.plan] ?? null, stripeSubscriptionId: null, stripeCustomerId: null, subscriptionStatus: 'active' })
        onSave(`Successfully subscribed to ${data.plan.charAt(0).toUpperCase() + data.plan.slice(1)} plan!`)
        fetchInvoices()
      }
    } catch (err) { console.error('Failed to verify:', err) }
    window.history.replaceState({}, '', '/settings?section=billing')
  }

  async function handleManageSubscription() {
    setManagingSubscription(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shopId }) })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch (err) { console.error('Failed to open portal:', err) }
    finally { setManagingSubscription(false) }
  }

  const feeLabel = ({ starter: 'RM 1.00', growth: 'RM 0.60', pro: 'RM 0.20' } as Record<string, string>)[currentPlan?.plan || ''] || '—'

  return (
    <div>
      <SectionHeader title="Billing & Plan" subtitle="Manage your subscription and view billing history" />

      {/* Current plan info bar */}
      {!loading && currentPlan?.plan ? (
        <div style={{
          padding: '16px 20px', borderRadius: 12, marginBottom: 24,
          background: 'linear-gradient(135deg, #0a1a3a 0%, #122a1c 50%, #0f1f18 100%)',
          color: '#fff', position: 'relative', overflow: 'hidden',
          boxShadow: '0 0 40px rgba(0,106,255,0.15), 0 4px 24px rgba(0,0,0,0.2)',
        }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,192,112,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Active Plan</div>
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.3px' }}>
                {currentPlan.plan.charAt(0).toUpperCase() + currentPlan.plan.slice(1)}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
                Platform fee: {feeLabel} per transaction
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
                  Billed {currentPlan.billing === 'annually' ? 'annually' : 'monthly'}
                </div>
                {currentPlan.planExpiresAt && (
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                    Expires {new Date(currentPlan.planExpiresAt).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                )}
              </div>
              <button onClick={handleManageSubscription} disabled={managingSubscription}
                style={{ fontSize: 12, fontWeight: 600, padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.15s ease', whiteSpace: 'nowrap' }}>
                {managingSubscription ? 'Opening...' : 'Manage Subscription'}
              </button>
            </div>
          </div>
        </div>
      ) : !loading ? (
        <div style={{ padding: '20px', borderRadius: 12, marginBottom: 24, background: 'var(--bg)', border: '1px solid var(--border)', textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No active plan. Contact support to get started.</div>
        </div>
      ) : null}

      {/* Billing History */}
      <div style={sectionGap}>
        <div style={{ ...sectionLabel, marginBottom: 16 }}>Billing History</div>
        <div className="card" style={{ padding: 0 }}>
          <table className="data-table">
            <thead>
              <tr><th>Invoice</th><th>Description</th><th>Date</th><th>Amount</th><th>Status</th><th style={{ width: 40 }}></th></tr>
            </thead>
            <tbody>
              {invoices.length === 0 && (
                <tr><td colSpan={6}><div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 13 }}>No invoices yet.</div></td></tr>
              )}
              {invoices.map(inv => {
                const description = inv.lines?.data?.[0]?.description || 'SaasPrint Subscription'
                const isPaid = inv.status === 'paid'
                const date = inv.created ? new Date(inv.created * 1000).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
                const handleDownload = () => {
                  if (inv.hosted_invoice_url && inv.hosted_invoice_url !== '#') window.open(inv.hosted_invoice_url, '_blank')
                  else if (inv.invoice_pdf && inv.invoice_pdf !== '#') window.open(inv.invoice_pdf, '_blank')
                }
                return (
                  <tr key={inv.id}>
                    <td><div className="cell-name">{inv.id}</div></td>
                    <td>{description}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{date}</td>
                    <td style={{ fontWeight: 600, fontSize: 13 }}>RM {(inv.amount_paid / 100).toFixed(2)}</td>
                    <td><span className={`badge ${isPaid ? 'badge-success' : 'badge-pending'}`}>{isPaid ? 'Paid' : 'Pending'}</span></td>
                    <td><RowMenu items={[{ label: 'View Invoice', action: handleDownload }]} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function RolesSection() {
  const [permSearch, setPermSearch] = useState('')
  type Role = 'admin' | 'staff' | 'agent'
  const ROLES: { key: Role; label: string; color: string; bg: string; desc: string }[] = [
    { key: 'admin', label: 'Admin',  color: 'var(--accent)', bg: 'var(--info-bg)', desc: 'Full system access' },
    { key: 'staff', label: 'Staff',  color: 'var(--accent, #006AFF)', bg: 'var(--info-bg)', desc: 'Operational access' },
    { key: 'agent', label: 'Agent',  color: 'var(--purple-text)', bg: 'rgba(124,58,237,0.1)', desc: 'Limited self-service' },
  ]

  const PERM_GROUPS: { group: string; perms: { label: string; admin: boolean; staff: boolean; agent: boolean }[] }[] = [
    {
      group: 'Orders',
      perms: [
        { label: 'View all orders',      admin: true,  staff: true,  agent: false },
        { label: 'Create orders',         admin: true,  staff: true,  agent: false },
        { label: 'Edit / cancel orders',  admin: true,  staff: true,  agent: false },
        { label: 'View own orders only',  admin: true,  staff: true,  agent: true  },
      ],
    },
    {
      group: 'Finance',
      perms: [
        { label: 'View payments',          admin: true,  staff: true,  agent: false },
        { label: 'Record payments',       admin: true,  staff: true,  agent: false },
        { label: 'View wallet',           admin: true,  staff: false, agent: false },
        { label: 'View own discount',     admin: true,  staff: false, agent: true  },
      ],
    },
    {
      group: 'CRM',
      perms: [
        { label: 'View all customers',    admin: true,  staff: true,  agent: false },
        { label: 'Manage own customers',  admin: true,  staff: true,  agent: true  },
        { label: 'View all agents',       admin: true,  staff: true,  agent: false },
      ],
    },
    {
      group: 'System',
      perms: [
        { label: 'Manage users',          admin: true,  staff: false, agent: false },
        { label: 'Edit settings',         admin: true,  staff: false, agent: false },
        { label: 'View reports',          admin: true,  staff: true,  agent: false },
        { label: 'Manage inventory',      admin: true,  staff: true,  agent: false },
      ],
    },
  ]

  return (
    <div>
      <SectionHeader title="Roles & Access" subtitle="Define what each role can see and do in the system" />
      <div style={sectionGap}>
        {/* Role cards with gradient header strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {ROLES.map(r => (
            <div key={r.key} style={{
              borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border)',
              overflow: 'hidden', transition: 'box-shadow 0.2s ease',
            }}>
              {/* Top accent line removed */}
              <div style={{ padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: r.bg, color: r.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShieldIcon />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: r.color }}>{r.label}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{r.desc}</div>
                  </div>
                </div>
                <button className="btn-ghost" style={{
                  width: '100%', justifyContent: 'center', fontSize: 12, fontWeight: 500,
                  border: `1px solid ${r.color}33`, color: r.color, borderRadius: 8,
                  padding: '8px 0', transition: 'all 0.15s ease',
                }}>
                  Customize
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Permission matrix */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={cardTitle}>Permission Matrix</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 10px' }}>
              <SearchIcon />
              <input
                value={permSearch} onChange={e => setPermSearch(e.target.value)}
                placeholder="Filter permissions…"
                style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12, color: 'var(--text-primary)', width: 150 }}
              />
              {permSearch && (
                <button onClick={() => setPermSearch('')} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 0 }}>
                  <XIcon />
                </button>
              )}
            </div>
          </div>
          <div style={cardDesc}>Overview of what each role can do. Contact support to create custom roles.</div>

          {PERM_GROUPS.map((group, gi) => {
            const q = permSearch.toLowerCase()
            const filteredPerms = q ? group.perms.filter(p => p.label.toLowerCase().includes(q)) : group.perms
            if (q && filteredPerms.length === 0) return null
            return (
            <div key={group.group} style={{ marginBottom: gi < PERM_GROUPS.length - 1 ? 28 : 0 }}>
              {/* Group header with accent line */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
                paddingBottom: 8, borderBottom: '2px solid var(--border)',
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{group.group}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr repeat(3, 80px)', gap: 0 }}>
                {/* Header */}
                <div />
                {ROLES.map(r => (
                  <div key={r.key} style={{ fontSize: 11.5, fontWeight: 600, color: r.color, textAlign: 'center', paddingBottom: 8 }}>
                    {r.label}
                  </div>
                ))}
                {/* Rows with alternating backgrounds */}
                {filteredPerms.map((p, i) => (
                  <div key={p.label} style={{ display: 'contents' }}>
                    <div style={{
                      fontSize: 12.5, color: 'var(--text-secondary)', padding: '10px 6px',
                      borderBottom: i < filteredPerms.length - 1 ? '1px solid var(--border)' : 'none',
                      background: i % 2 === 0 ? 'transparent' : 'var(--bg)',
                      borderRadius: i % 2 !== 0 ? '6px 0 0 6px' : 0,
                    }}>
                      {p.label}
                    </div>
                    {(['admin', 'staff', 'agent'] as Role[]).map((role, ri) => (
                      <div key={role} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderBottom: i < filteredPerms.length - 1 ? '1px solid var(--border)' : 'none',
                        background: i % 2 === 0 ? 'transparent' : 'var(--bg)',
                        borderRadius: i % 2 !== 0 && ri === 2 ? '0 6px 6px 0' : 0,
                      }}>
                        {p[role]
                          ? <span style={{ color: 'var(--positive)' }}><CheckIcon /></span>
                          : <span style={{ color: 'var(--border)', fontSize: 14, lineHeight: 1 }}>—</span>
                        }
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ── SETTINGS PAGE CSS ───────────────────────────────── */
const SETTINGS_CSS = `
@keyframes settingsFadeSlideIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes settingsToastIn {
  from { opacity: 0; transform: translateX(-50%) translateY(-12px) scale(0.95); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
}
@keyframes settingsToastOut {
  from { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
  to   { opacity: 0; transform: translateX(-50%) translateY(-8px) scale(0.95); }
}
@media (max-width: 768px) {
  .settings-grid {
    grid-template-columns: 1fr !important;
    gap: 16px !important;
  }
  .settings-nav {
    position: static !important;
    display: flex !important;
    flex-direction: row !important;
    overflow-x: auto !important;
    gap: 2px !important;
    padding: 6px !important;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .settings-nav::-webkit-scrollbar { display: none; }
  .settings-nav-btn {
    flex-shrink: 0 !important;
    padding: 8px 14px !important;
    border-bottom: 3px solid transparent !important;
  }
  .settings-nav-btn[data-active="true"] {
    border-bottom-color: var(--accent) !important;
  }
  .settings-nav-desc { display: none !important; }
}
`

/* ── PAGE ────────────────────────────────────────────── */
export default function SettingsPage() {
  const { shopId } = useShop()
  const [section, setSection] = useState<Section>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('billplz[id]') || params.get('section') === 'billing') return 'billing'
    }
    return 'account'
  })
  const [hovered, setHovered] = useState<Section | null>(null)
  const { toast, show: showToast } = useToast()

  return (
    <AppShell>
      <style suppressHydrationWarning>{SETTINGS_CSS}</style>
      <Toast toast={toast} />

      <div className="page-header">
        <div>
          <div className="page-title">Settings</div>
          <div className="page-subtitle">Manage your account, organisation and preferences</div>
        </div>
      </div>

      <div className="page-scroll">
      <div className="settings-grid" style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 24, alignItems: 'start' }}>
        {/* Left nav */}
        <div className="card settings-nav" style={{ padding: 8, position: 'sticky', top: 20 }}>
          {NAV.map(n => {
            const active = n.key === section
            const hover  = n.key === hovered
            return (
              <button
                key={n.key}
                className="settings-nav-btn"
                data-active={active}
                onClick={() => setSection(n.key)}
                onMouseEnter={() => setHovered(n.key)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', textAlign: 'left', padding: '10px 12px 10px 14px',
                  borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: active ? 'var(--bg)' : hover ? 'var(--bg)' : 'transparent',
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontFamily: 'var(--font)', marginBottom: 2, position: 'relative',
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ opacity: active ? 1 : 0.65, flexShrink: 0, transition: 'all 0.15s ease' }}><n.icon /></span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: active ? 600 : 500 }}>{n.label}</div>
                  <div className="settings-nav-desc" style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.desc}</div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Right content — animated transitions */}
        <div key={section} style={{ animation: 'settingsFadeSlideIn 0.25s ease' }}>
          {section === 'account'       && <AccountSection onSave={showToast} />}
          {section === 'organization'  && <OrganizationSection onSave={showToast} shopId={shopId} />}
          {section === 'notifications' && <NotificationsSection onSave={showToast} shopId={shopId} />}
          {section === 'security'      && <SecuritySection onSave={showToast} />}
          {section === 'billing'       && <BillingSection onSave={showToast} shopId={shopId} />}
          {section === 'roles'         && <RolesSection />}
          {section === 'users'         && <UsersSection />}
        </div>
      </div>
      </div>
    </AppShell>
  )
}
