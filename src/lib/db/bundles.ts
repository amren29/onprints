'use server'

import { createClient } from '@/lib/supabase/server'

// ── Types ───────────────────────────────────────────

export type DbBundle = {
  id: string
  shop_id: string
  seq_id: string
  name: string
  description: string
  items: unknown[]
  discount_type: string
  discount_value: number
  original_price: number
  status: string
  featured: boolean
  created_at: string
  updated_at: string
}

// ── Bundle CRUD ─────────────────────────────────────

export async function getBundles(shopId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('bundles')
    .select('*')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data as DbBundle[]
}

export async function getBundleById(shopId: string, id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('bundles')
    .select('*')
    .eq('shop_id', shopId)
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as DbBundle | null
}

export async function createBundle(shopId: string, input: {
  name: string
  description?: string
  items?: unknown[]
  discount_type?: string
  discount_value?: number
  original_price?: number
  status?: string
  featured?: boolean
}) {
  const supabase = await createClient()

  const { data: seqData, error: seqErr } = await supabase
    .rpc('next_seq', { p_shop_id: shopId, p_prefix: 'BDL', p_pad: 3 })
  if (seqErr) throw new Error(seqErr.message)

  const { data, error } = await supabase
    .from('bundles')
    .insert({
      shop_id: shopId,
      seq_id: seqData,
      name: input.name,
      description: input.description ?? '',
      items: input.items ?? [],
      discount_type: input.discount_type ?? 'percentage',
      discount_value: input.discount_value ?? 0,
      original_price: input.original_price ?? 0,
      status: input.status ?? 'Active',
      featured: input.featured ?? false,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as DbBundle
}

export async function updateBundle(shopId: string, id: string, updates: Partial<{
  name: string
  description: string
  items: unknown[]
  discount_type: string
  discount_value: number
  original_price: number
  status: string
  featured: boolean
}>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('bundles')
    .update(updates)
    .eq('shop_id', shopId)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as DbBundle
}

export async function deleteBundle(shopId: string, id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('bundles')
    .delete()
    .eq('shop_id', shopId)
    .eq('id', id)

  if (error) throw new Error(error.message)
}
