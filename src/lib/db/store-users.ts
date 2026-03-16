'use server'

import { createClient } from '@/lib/supabase/server'

// ── Types ───────────────────────────────────────────

export type DbStoreUser = {
  id: string
  shop_id: string
  auth_user_id: string | null
  name: string
  email: string
  role: string
  phone: string
  company: string
  addresses: unknown[]
  saved_artwork: unknown[]
  canva_tokens: Record<string, unknown>
  affiliate_code: string
  discount_rate: number
  wallet_balance: number
  membership: Record<string, unknown> | null
  membership_purchases: unknown[]
  created_at: string
  updated_at: string
}

export type DbStoreWalletEntry = {
  id: string
  shop_id: string
  store_user_id: string
  date: string
  type: string
  category: string
  description: string
  amount: number
  balance: number
  reference: string
  receipt_file: string
  status: string
  created_at: string
}

export type DbStoreCart = {
  id: string
  shop_id: string
  store_user_id: string | null
  session_id: string | null
  items: unknown[]
  updated_at: string
}

// ── Store User CRUD ─────────────────────────────────

export async function getStoreUsers(shopId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('store_users')
    .select('*')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data as DbStoreUser[]
}

export async function getStoreUserById(shopId: string, id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('store_users')
    .select('*')
    .eq('shop_id', shopId)
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as DbStoreUser | null
}

export async function getStoreUserByEmail(shopId: string, email: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('store_users')
    .select('*')
    .eq('shop_id', shopId)
    .ilike('email', email.trim())
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as DbStoreUser | null
}

export async function getStoreUserByAuthId(authUserId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('store_users')
    .select('*')
    .eq('auth_user_id', authUserId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as DbStoreUser | null
}

export async function getStoreUserByAffiliateCode(shopId: string, code: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('store_users')
    .select('*')
    .eq('shop_id', shopId)
    .eq('affiliate_code', code)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as DbStoreUser | null
}

export async function createStoreUser(shopId: string, input: {
  auth_user_id?: string | null
  name: string
  email: string
  role?: string
  phone?: string
  company?: string
}) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('store_users')
    .insert({
      shop_id: shopId,
      auth_user_id: input.auth_user_id ?? null,
      name: input.name,
      email: input.email,
      role: input.role ?? 'customer',
      phone: input.phone ?? '',
      company: input.company ?? '',
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as DbStoreUser
}

export async function updateStoreUser(shopId: string, id: string, updates: Partial<{
  name: string
  email: string
  role: string
  phone: string
  company: string
  addresses: unknown[]
  saved_artwork: unknown[]
  canva_tokens: Record<string, unknown>
  affiliate_code: string
  discount_rate: number
  wallet_balance: number
  membership: Record<string, unknown> | null
  membership_purchases: unknown[]
}>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('store_users')
    .update(updates)
    .eq('shop_id', shopId)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as DbStoreUser
}

export async function deleteStoreUser(shopId: string, id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('store_users')
    .delete()
    .eq('shop_id', shopId)
    .eq('id', id)

  if (error) throw new Error(error.message)
}

// ── Store Wallet Entry CRUD ─────────────────────────

export async function getStoreWalletEntries(shopId: string, storeUserId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('store_user_wallet_entries')
    .select('*')
    .eq('shop_id', shopId)
    .eq('store_user_id', storeUserId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data as DbStoreWalletEntry[]
}

export async function createStoreWalletEntry(shopId: string, input: {
  store_user_id: string
  date?: string
  type: 'credit' | 'debit'
  category?: string
  description?: string
  amount: number
  reference?: string
  receipt_file?: string
  status?: string
}) {
  const supabase = await createClient()

  // Get current balance to compute new balance
  const { data: user } = await supabase
    .from('store_users')
    .select('wallet_balance')
    .eq('id', input.store_user_id)
    .single()

  const currentBalance = (user?.wallet_balance as number) ?? 0
  const newBalance = input.type === 'credit'
    ? currentBalance + input.amount
    : currentBalance - input.amount

  const { data, error } = await supabase
    .from('store_user_wallet_entries')
    .insert({
      shop_id: shopId,
      store_user_id: input.store_user_id,
      date: input.date ?? new Date().toISOString().slice(0, 10),
      type: input.type,
      category: input.category ?? '',
      description: input.description ?? '',
      amount: input.amount,
      balance: newBalance,
      reference: input.reference ?? '',
      receipt_file: input.receipt_file ?? '',
      status: input.status ?? 'completed',
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  // Update user's wallet balance
  if (input.status !== 'pending') {
    await supabase
      .from('store_users')
      .update({ wallet_balance: newBalance })
      .eq('id', input.store_user_id)
  }

  return data as DbStoreWalletEntry
}

// ── Store Cart CRUD ─────────────────────────────────

export async function getStoreCart(shopId: string, storeUserId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('store_carts')
    .select('*')
    .eq('shop_id', shopId)
    .eq('store_user_id', storeUserId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as DbStoreCart | null
}

export async function getStoreCartBySession(shopId: string, sessionId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('store_carts')
    .select('*')
    .eq('shop_id', shopId)
    .eq('session_id', sessionId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as DbStoreCart | null
}

export async function saveStoreCart(shopId: string, input: {
  store_user_id?: string | null
  session_id?: string | null
  items: unknown[]
}) {
  const supabase = await createClient()

  // Upsert: if user has a cart, update it; otherwise create
  if (input.store_user_id) {
    const existing = await getStoreCart(shopId, input.store_user_id)
    if (existing) {
      const { data, error } = await supabase
        .from('store_carts')
        .update({ items: input.items })
        .eq('id', existing.id)
        .select()
        .single()
      if (error) throw new Error(error.message)
      return data as DbStoreCart
    }
  }

  const { data, error } = await supabase
    .from('store_carts')
    .insert({
      shop_id: shopId,
      store_user_id: input.store_user_id ?? null,
      session_id: input.session_id ?? null,
      items: input.items,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as DbStoreCart
}

export async function clearStoreCart(shopId: string, storeUserId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('store_carts')
    .delete()
    .eq('shop_id', shopId)
    .eq('store_user_id', storeUserId)

  if (error) throw new Error(error.message)
}
