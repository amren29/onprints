'use server'

import { createClient } from '@/lib/supabase/server'

// ── Types ───────────────────────────────────────────

export type DbAffiliate = {
  id: string
  shop_id: string
  store_user_id: string | null
  name: string
  email: string
  code: string
  commission_rate: number
  assigned_products: string[]
  total_earnings: number
  status: string
  created_at: string
}

export type DbAffiliateOrder = {
  id: string
  shop_id: string
  affiliate_id: string
  order_id: string
  customer_name: string
  affiliate_code: string
  affiliate_name: string
  order_total: number
  commission: number
  order_date: string
  status: string
  created_at: string
}

export type DbPayoutRequest = {
  id: string
  shop_id: string
  affiliate_id: string
  affiliate_name: string
  affiliate_code: string
  commission_rate: number
  order_ids: string[]
  order_total: number
  commission_amount: number
  status: string
  admin_notes: string
  created_at: string
  updated_at: string
}

// ── Affiliate CRUD ──────────────────────────────────

export async function getAffiliates(shopId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('affiliates')
    .select('*')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data as DbAffiliate[]
}

export async function getAffiliateById(shopId: string, id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('affiliates')
    .select('*')
    .eq('shop_id', shopId)
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as DbAffiliate | null
}

export async function getAffiliateByCode(shopId: string, code: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('affiliates')
    .select('*')
    .eq('shop_id', shopId)
    .eq('code', code)
    .eq('status', 'active')
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as DbAffiliate | null
}

export async function createAffiliate(shopId: string, input: {
  name: string
  email?: string
  code: string
  commission_rate?: number
  assigned_products?: string[]
  status?: string
  store_user_id?: string | null
}) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('affiliates')
    .insert({
      shop_id: shopId,
      name: input.name,
      email: input.email ?? '',
      code: input.code,
      commission_rate: input.commission_rate ?? 0,
      assigned_products: input.assigned_products ?? [],
      status: input.status ?? 'active',
      store_user_id: input.store_user_id ?? null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as DbAffiliate
}

export async function updateAffiliate(shopId: string, id: string, updates: Partial<{
  name: string
  email: string
  code: string
  commission_rate: number
  assigned_products: string[]
  total_earnings: number
  status: string
}>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('affiliates')
    .update(updates)
    .eq('shop_id', shopId)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as DbAffiliate
}

export async function deleteAffiliate(shopId: string, id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('affiliates')
    .delete()
    .eq('shop_id', shopId)
    .eq('id', id)

  if (error) throw new Error(error.message)
}

// ── Affiliate Order CRUD ────────────────────────────

export async function getAffiliateOrders(shopId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('affiliate_orders')
    .select('*')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data as DbAffiliateOrder[]
}

export async function getAffiliateOrdersByAffiliate(shopId: string, affiliateId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('affiliate_orders')
    .select('*')
    .eq('shop_id', shopId)
    .eq('affiliate_id', affiliateId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data as DbAffiliateOrder[]
}

export async function createAffiliateOrder(shopId: string, input: {
  affiliate_id: string
  order_id?: string
  customer_name?: string
  affiliate_code?: string
  affiliate_name?: string
  order_total?: number
  commission?: number
  order_date?: string
  status?: string
}) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('affiliate_orders')
    .insert({
      shop_id: shopId,
      affiliate_id: input.affiliate_id,
      order_id: input.order_id ?? '',
      customer_name: input.customer_name ?? '',
      affiliate_code: input.affiliate_code ?? '',
      affiliate_name: input.affiliate_name ?? '',
      order_total: input.order_total ?? 0,
      commission: input.commission ?? 0,
      order_date: input.order_date ?? '',
      status: input.status ?? 'Pending',
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as DbAffiliateOrder
}

// ── Payout Request CRUD ─────────────────────────────

export async function getPayoutRequests(shopId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('payout_requests')
    .select('*')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data as DbPayoutRequest[]
}

export async function createPayoutRequest(shopId: string, input: {
  affiliate_id: string
  affiliate_name?: string
  affiliate_code?: string
  commission_rate?: number
  order_ids?: string[]
  order_total?: number
  commission_amount?: number
  status?: string
}) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('payout_requests')
    .insert({
      shop_id: shopId,
      affiliate_id: input.affiliate_id,
      affiliate_name: input.affiliate_name ?? '',
      affiliate_code: input.affiliate_code ?? '',
      commission_rate: input.commission_rate ?? 0,
      order_ids: input.order_ids ?? [],
      order_total: input.order_total ?? 0,
      commission_amount: input.commission_amount ?? 0,
      status: input.status ?? 'pending',
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as DbPayoutRequest
}

export async function updatePayoutRequest(shopId: string, id: string, updates: Partial<{
  status: string
  admin_notes: string
}>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('payout_requests')
    .update(updates)
    .eq('shop_id', shopId)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as DbPayoutRequest
}

export async function deletePayoutRequest(shopId: string, id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('payout_requests')
    .delete()
    .eq('shop_id', shopId)
    .eq('id', id)

  if (error) throw new Error(error.message)
}
