'use server'

import { createClient } from '@/lib/supabase/server'

// ── Types ───────────────────────────────────────────

export type DbNotification = {
  id: string
  shop_id: string
  user_id: string | null
  type: string
  title: string
  message: string
  time: string
  read: boolean
  starred: boolean
  link: string
  source: string
  created_at: string
}

export type DbNotifPrefs = {
  id: string
  shop_id: string
  user_id: string
  channels: Record<string, { email: boolean; inApp: boolean; sms: boolean }>
}

// ── Notification CRUD ───────────────────────────────

export async function getNotifications(shopId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw new Error(error.message)
  return data as DbNotification[]
}

export async function addNotification(shopId: string, input: {
  user_id?: string | null
  type: 'info' | 'success' | 'warning' | 'danger'
  title: string
  message?: string
  link?: string
  source?: string
}) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      shop_id: shopId,
      user_id: input.user_id ?? null,
      type: input.type,
      title: input.title,
      message: input.message ?? '',
      link: input.link ?? '',
      source: input.source ?? '',
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as DbNotification
}

export async function markRead(shopId: string, id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('shop_id', shopId)
    .eq('id', id)

  if (error) throw new Error(error.message)
}

export async function markAllRead(shopId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('shop_id', shopId)
    .eq('read', false)

  if (error) throw new Error(error.message)
}

export async function toggleStar(shopId: string, id: string) {
  const supabase = await createClient()
  // Need to read current value first
  const { data: current } = await supabase
    .from('notifications')
    .select('starred')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('notifications')
    .update({ starred: !current?.starred })
    .eq('shop_id', shopId)
    .eq('id', id)

  if (error) throw new Error(error.message)
}

export async function deleteNotification(shopId: string, id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('shop_id', shopId)
    .eq('id', id)

  if (error) throw new Error(error.message)
}

export async function bulkMarkRead(shopId: string, ids: string[]) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('shop_id', shopId)
    .in('id', ids)

  if (error) throw new Error(error.message)
}

export async function markUnread(shopId: string, id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('notifications')
    .update({ read: false })
    .eq('shop_id', shopId)
    .eq('id', id)

  if (error) throw new Error(error.message)
}

export async function bulkMarkUnread(shopId: string, ids: string[]) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('notifications')
    .update({ read: false })
    .eq('shop_id', shopId)
    .in('id', ids)

  if (error) throw new Error(error.message)
}

export async function bulkStar(shopId: string, ids: string[]) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('notifications')
    .update({ starred: true })
    .eq('shop_id', shopId)
    .in('id', ids)

  if (error) throw new Error(error.message)
}

export async function bulkDelete(shopId: string, ids: string[]) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('shop_id', shopId)
    .in('id', ids)

  if (error) throw new Error(error.message)
}

export async function getUnreadCount(shopId: string) {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('shop_id', shopId)
    .eq('read', false)

  if (error) throw new Error(error.message)
  return count ?? 0
}

// ── Notification Prefs ──────────────────────────────

export async function getNotifPrefs(shopId: string, userId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('notification_prefs')
    .select('*')
    .eq('shop_id', shopId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as DbNotifPrefs | null
}

export async function saveNotifPrefs(shopId: string, userId: string, channels: Record<string, { email: boolean; inApp: boolean; sms: boolean }>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('notification_prefs')
    .upsert({
      shop_id: shopId,
      user_id: userId,
      channels,
    }, { onConflict: 'shop_id,user_id' })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as DbNotifPrefs
}
