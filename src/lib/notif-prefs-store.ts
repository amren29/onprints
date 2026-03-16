/**
 * Notification preference store — shared between Settings and any feature
 * that needs to check whether a channel is enabled before firing.
 */

const KEY = 'sp_notif_prefs'

export type ChannelPrefs = { email: boolean; inApp: boolean; sms: boolean }
export type NotifPrefs = Record<string, ChannelPrefs>

export const NOTIF_PREFS_DEFAULTS: NotifPrefs = {
  newOrder:       { email: true,  inApp: true,  sms: false },
  paymentRecv:    { email: true,  inApp: true,  sms: true  },
  invoiceOverdue: { email: true,  inApp: true,  sms: false },
  stockLow:       { email: false, inApp: true,  sms: false },
  prodComplete:   { email: false, inApp: true,  sms: false },
  prodMove:       { email: false, inApp: true,  sms: false },
  quotExpiring:   { email: true,  inApp: true,  sms: false },
  newAgent:       { email: true,  inApp: false, sms: false },
  digest:         { email: true,  inApp: false, sms: false },
}

export function getNotifPrefs(): NotifPrefs {
  if (typeof window === 'undefined') return NOTIF_PREFS_DEFAULTS
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    return stored ? { ...NOTIF_PREFS_DEFAULTS, ...stored } : NOTIF_PREFS_DEFAULTS
  } catch {
    return NOTIF_PREFS_DEFAULTS
  }
}

export function saveNotifPrefs(prefs: NotifPrefs): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(prefs))
}

/** Returns true if the in-app channel is enabled for the given pref key */
export function isInAppEnabled(key: string): boolean {
  return getNotifPrefs()[key]?.inApp ?? true
}
