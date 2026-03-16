'use server'

import { createClient } from '@/lib/supabase/server'

// ── Types ───────────────────────────────────────────

export type DbMembership = {
  id: string
  shop_id: string
  name: string
  price: number
  discount_rate: number
  duration_months: number
  description: string
  status: string
  position: number
  created_at: string
}

export type DbMembershipRequest = {
  id: string
  shop_id: string
  store_user_id: string | null
  customer_name: string
  customer_email: string
  tier_id: string
  tier_name: string
  price: number
  payment_method: string
  status: string
  receipt_file: string
  notes: string
  created_at: string
  updated_at: string
}

// ── Membership Tier CRUD ────────────────────────────

export async function getMemberships(shopId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('memberships')
    .select('*')
    .eq('shop_id', shopId)
    .order('position', { ascending: true })

  if (error) throw new Error(error.message)
  return data as DbMembership[]
}

export async function getMembershipById(shopId: string, id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('memberships')
    .select('*')
    .eq('shop_id', shopId)
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as DbMembership | null
}

export async function createMembership(shopId: string, input: {
  name: string
  price?: number
  discount_rate?: number
  duration_months?: number
  description?: string
  status?: string
  position?: number
}) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('memberships')
    .insert({
      shop_id: shopId,
      name: input.name,
      price: input.price ?? 0,
      discount_rate: input.discount_rate ?? 0,
      duration_months: input.duration_months ?? 1,
      description: input.description ?? '',
      status: input.status ?? 'Active',
      position: input.position ?? 0,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as DbMembership
}

export async function updateMembership(shopId: string, id: string, updates: Partial<{
  name: string
  price: number
  discount_rate: number
  duration_months: number
  description: string
  status: string
  position: number
}>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('memberships')
    .update(updates)
    .eq('shop_id', shopId)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as DbMembership
}

export async function deleteMembership(shopId: string, id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('memberships')
    .delete()
    .eq('shop_id', shopId)
    .eq('id', id)

  if (error) throw new Error(error.message)
}

// ── Membership Request CRUD ─────────────────────────

export async function getMembershipRequests(shopId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('membership_requests')
    .select('*')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data as DbMembershipRequest[]
}

export async function getMembershipRequestById(shopId: string, id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('membership_requests')
    .select('*')
    .eq('shop_id', shopId)
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as DbMembershipRequest | null
}

export async function createMembershipRequest(shopId: string, input: {
  store_user_id?: string | null
  customer_name?: string
  customer_email?: string
  tier_id: string
  tier_name?: string
  price?: number
  payment_method?: string
  status?: string
  receipt_file?: string
  notes?: string
}) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('membership_requests')
    .insert({
      shop_id: shopId,
      store_user_id: input.store_user_id ?? null,
      customer_name: input.customer_name ?? '',
      customer_email: input.customer_email ?? '',
      tier_id: input.tier_id,
      tier_name: input.tier_name ?? '',
      price: input.price ?? 0,
      payment_method: input.payment_method ?? 'online',
      status: input.status ?? 'pending',
      receipt_file: input.receipt_file ?? '',
      notes: input.notes ?? '',
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as DbMembershipRequest
}

export async function updateMembershipRequest(shopId: string, id: string, updates: Partial<{
  status: string
  notes: string
  receipt_file: string
}>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('membership_requests')
    .update(updates)
    .eq('shop_id', shopId)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as DbMembershipRequest
}

export async function deleteMembershipRequest(shopId: string, id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('membership_requests')
    .delete()
    .eq('shop_id', shopId)
    .eq('id', id)

  if (error) throw new Error(error.message)
}
