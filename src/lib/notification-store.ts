'use client'

// ── Types ─────────────────────────────────────────────
export type Notification = {
  id: string
  type: 'info' | 'success' | 'warning' | 'danger'
  title: string
  message: string
  time: string   // ISO string
  read: boolean
  starred?: boolean
  link?: string
  source?: string  // e.g. 'prod_move', 'payment', etc.
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
function uid() { return Math.random().toString(36).slice(2, 10) }

// ── Keys & Events ────────────────────────────────────
const K = {
  init: 'notif.init',
  notifications: 'notif.items',
}
export const NOTIF_CHANGE_EVENT = 'notif:change'
/** Fired with the new Notification as CustomEvent detail whenever addNotification() is called */
export const NOTIF_NEW_EVENT = 'notif:new'

function dispatchChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(NOTIF_CHANGE_EVENT))
  }
}

// ── Seed data ─────────────────────────────────────────
export function initNotifications() {
  if (read<string>(K.init, '') === 'v2') return

  write(K.notifications, [])
  write(K.init, 'v2')
}

// ── CRUD ──────────────────────────────────────────────
export function getNotifications(): Notification[] {
  return read<Notification[]>(K.notifications, [])
}

export function markRead(id: string) {
  write(K.notifications, getNotifications().map(n => n.id === id ? { ...n, read: true } : n))
  dispatchChange()
}

export function markAllRead() {
  write(K.notifications, getNotifications().map(n => ({ ...n, read: true })))
  dispatchChange()
}

export function markUnread(id: string) {
  write(K.notifications, getNotifications().map(n => n.id === id ? { ...n, read: false } : n))
  dispatchChange()
}

export function toggleStar(id: string) {
  write(K.notifications, getNotifications().map(n => n.id === id ? { ...n, starred: !n.starred } : n))
  dispatchChange()
}

export function deleteNotification(id: string) {
  write(K.notifications, getNotifications().filter(n => n.id !== id))
  dispatchChange()
}

export function bulkMarkRead(ids: string[]) {
  const set = new Set(ids)
  write(K.notifications, getNotifications().map(n => set.has(n.id) ? { ...n, read: true } : n))
  dispatchChange()
}

export function bulkMarkUnread(ids: string[]) {
  const set = new Set(ids)
  write(K.notifications, getNotifications().map(n => set.has(n.id) ? { ...n, read: false } : n))
  dispatchChange()
}

export function bulkStar(ids: string[]) {
  const set = new Set(ids)
  write(K.notifications, getNotifications().map(n => set.has(n.id) ? { ...n, starred: true } : n))
  dispatchChange()
}

export function bulkDelete(ids: string[]) {
  const set = new Set(ids)
  write(K.notifications, getNotifications().filter(n => !set.has(n.id)))
  dispatchChange()
}

export function getUnreadCount(): number {
  return getNotifications().filter(n => !n.read).length
}

/** Add a new notification and dispatch change + new events */
export function addNotification(params: {
  type: Notification['type']
  title: string
  message: string
  link?: string
  source?: string
}) {
  const notif: Notification = {
    id: uid(),
    type: params.type,
    title: params.title,
    message: params.message,
    time: new Date().toISOString(),
    read: false,
    link: params.link,
    source: params.source,
  }
  const updated = [notif, ...getNotifications()].slice(0, 50)
  write(K.notifications, updated)
  dispatchChange()
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(NOTIF_NEW_EVENT, { detail: notif }))
  }
  return notif
}
