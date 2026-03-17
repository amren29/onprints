'use server'

import { createClient } from '@/lib/supabase/server'

// ── Types ───────────────────────────────────────────

export type DbAbandonedCart = {
  id: string
  shop_id: string
  session_id: string
  customer_name: string
  customer_email: string
  is_guest: boolean
  items: unknown[]
  total_value: number
  item_count: number
  created_at: string
  updated_at: string
}

export type DbStoreSettings = {
  id: string
  shop_id: string
  config: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type DbStorePage = {
  id: string
  shop_id: string
  page_id: string
  sections: unknown[]
  globals: Record<string, unknown>
  updated_at: string
}

// ── Abandoned Cart CRUD ─────────────────────────────

export async function getAbandonedCarts(shopId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('abandoned_carts')
    .select('*')
    .eq('shop_id', shopId)
    .order('updated_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data as DbAbandonedCart[]
}

export async function upsertAbandonedCart(shopId: string, input: {
  session_id: string
  customer_name?: string
  customer_email?: string
  is_guest?: boolean
  items: unknown[]
  total_value?: number
  item_count?: number
}) {
  const supabase = await createClient()

  // Check if a row already exists for this session
  const { data: existing } = await supabase
    .from('abandoned_carts')
    .select('id')
    .eq('shop_id', shopId)
    .eq('session_id', input.session_id)
    .maybeSingle()

  const payload = {
    shop_id: shopId,
    session_id: input.session_id,
    customer_name: input.customer_name ?? '',
    customer_email: input.customer_email ?? '',
    is_guest: input.is_guest ?? true,
    items: input.items,
    total_value: input.total_value ?? 0,
    item_count: input.item_count ?? 0,
  }

  if (existing) {
    const { data, error } = await supabase
      .from('abandoned_carts')
      .update(payload)
      .eq('id', existing.id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data as DbAbandonedCart
  } else {
    const { data, error } = await supabase
      .from('abandoned_carts')
      .insert(payload)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data as DbAbandonedCart
  }
}

export async function deleteAbandonedCart(shopId: string, id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('abandoned_carts')
    .delete()
    .eq('shop_id', shopId)
    .eq('id', id)

  if (error) throw new Error(error.message)
}

export async function deleteAbandonedCartBySession(shopId: string, sessionId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('abandoned_carts')
    .delete()
    .eq('shop_id', shopId)
    .eq('session_id', sessionId)

  if (error) throw new Error(error.message)
}

export async function clearAllAbandonedCarts(shopId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('abandoned_carts')
    .delete()
    .eq('shop_id', shopId)

  if (error) throw new Error(error.message)
}

// ── Store Settings CRUD ─────────────────────────────

export async function getStoreSettings(shopId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('store_settings')
    .select('*')
    .eq('shop_id', shopId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as DbStoreSettings | null
}

export async function saveStoreSettings(shopId: string, config: Record<string, unknown>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('store_settings')
    .upsert({
      shop_id: shopId,
      config,
    }, { onConflict: 'shop_id' })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as DbStoreSettings
}

// ── Store Pages (Page Builder) CRUD ─────────────────

export async function getStorePages(shopId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('store_pages')
    .select('*')
    .eq('shop_id', shopId)

  if (error) throw new Error(error.message)
  return data as DbStorePage[]
}

export async function getStorePage(shopId: string, pageId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('store_pages')
    .select('*')
    .eq('shop_id', shopId)
    .eq('page_id', pageId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as DbStorePage | null
}

export async function saveStorePage(shopId: string, pageId: string, sections: unknown[], globals?: Record<string, unknown>) {
  const supabase = await createClient()
  const upsertData: Record<string, unknown> = {
    shop_id: shopId,
    page_id: pageId,
    sections,
  }
  if (globals !== undefined) {
    upsertData.globals = globals
  }

  const { data, error } = await supabase
    .from('store_pages')
    .upsert(upsertData, { onConflict: 'shop_id,page_id' })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as DbStorePage
}

export async function saveStoreGlobals(shopId: string, globals: Record<string, unknown>) {
  const supabase = await createClient()
  // Update globals on all pages for this shop
  const { error } = await supabase
    .from('store_pages')
    .update({ globals })
    .eq('shop_id', shopId)

  if (error) throw new Error(error.message)
}
