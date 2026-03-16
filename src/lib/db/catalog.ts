'use server'

import { createClient } from '@/lib/supabase/server'

// ── Category types ──────────────────────────────────────

export type DbCategory = {
  id: string
  shop_id: string
  seq_id: string
  name: string
  status: string
  visibility: string
  notes: string
  parent_id: string | null
  position: number
  created_at: string
  updated_at: string
}

// ── Product types ───────────────────────────────────────

export type DbProduct = {
  id: string
  shop_id: string
  seq_id: string
  category_id: string | null
  name: string
  sku: string
  description: string
  notes: string
  pricing_type: string
  base_price: number
  pricing: Record<string, unknown>
  option_groups: unknown[]
  sizes: Record<string, unknown>
  main_image: string
  variant_images: unknown[]
  bulk_variant: boolean
  product_info: Record<string, unknown>
  status: string
  visibility: string
  created_at: string
  updated_at: string
}

// ── Category CRUD ───────────────────────────────────────

export async function getCategories(shopId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('shop_id', shopId)
    .order('position', { ascending: true })

  if (error) throw new Error(error.message)
  return data as DbCategory[]
}

export async function getCategoryById(shopId: string, id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('shop_id', shopId)
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as DbCategory | null
}

export async function createCategory(shopId: string, input: {
  name: string
  status?: string
  visibility?: string
  notes?: string
  parent_id?: string | null
  position?: number
}) {
  const supabase = await createClient()

  const { data: seqData, error: seqErr } = await supabase
    .rpc('next_seq', { p_shop_id: shopId, p_prefix: 'CGRP', p_pad: 2 })

  if (seqErr) throw new Error(seqErr.message)

  const { data, error } = await supabase
    .from('categories')
    .insert({
      shop_id: shopId,
      seq_id: seqData,
      name: input.name,
      status: input.status ?? 'Active',
      visibility: input.visibility ?? 'published',
      notes: input.notes ?? '',
      parent_id: input.parent_id ?? null,
      position: input.position ?? 0,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as DbCategory
}

export async function updateCategory(shopId: string, id: string, updates: Partial<{
  name: string
  status: string
  visibility: string
  notes: string
  parent_id: string | null
  position: number
}>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('categories')
    .update(updates)
    .eq('shop_id', shopId)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as DbCategory
}

export async function deleteCategory(shopId: string, id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('shop_id', shopId)
    .eq('id', id)

  if (error) throw new Error(error.message)
}

// ── Product CRUD ────────────────────────────────────────

export async function getProducts(shopId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data as DbProduct[]
}

export async function getProductById(shopId: string, id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('shop_id', shopId)
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as DbProduct | null
}

export async function createProduct(shopId: string, input: {
  category_id?: string | null
  name: string
  sku?: string
  description?: string
  notes?: string
  pricing_type?: string
  base_price?: number
  pricing?: Record<string, unknown>
  option_groups?: unknown[]
  sizes?: Record<string, unknown>
  main_image?: string
  variant_images?: unknown[]
  bulk_variant?: boolean
  product_info?: Record<string, unknown>
  status?: string
  visibility?: string
}) {
  const supabase = await createClient()

  const { data: seqData, error: seqErr } = await supabase
    .rpc('next_seq', { p_shop_id: shopId, p_prefix: 'CAT', p_pad: 3 })

  if (seqErr) throw new Error(seqErr.message)

  const { data, error } = await supabase
    .from('products')
    .insert({
      shop_id: shopId,
      seq_id: seqData,
      category_id: input.category_id ?? null,
      name: input.name,
      sku: input.sku ?? '',
      description: input.description ?? '',
      notes: input.notes ?? '',
      pricing_type: input.pricing_type ?? 'fixed',
      base_price: input.base_price ?? 0,
      pricing: input.pricing ?? {},
      option_groups: input.option_groups ?? [],
      sizes: input.sizes ?? {},
      main_image: input.main_image ?? '',
      variant_images: input.variant_images ?? [],
      bulk_variant: input.bulk_variant ?? false,
      product_info: input.product_info ?? {},
      status: input.status ?? 'Active',
      visibility: input.visibility ?? 'published',
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as DbProduct
}

export async function updateProduct(shopId: string, id: string, updates: Partial<{
  category_id: string | null
  name: string
  sku: string
  description: string
  notes: string
  pricing_type: string
  base_price: number
  pricing: Record<string, unknown>
  option_groups: unknown[]
  sizes: Record<string, unknown>
  main_image: string
  variant_images: unknown[]
  bulk_variant: boolean
  product_info: Record<string, unknown>
  status: string
  visibility: string
}>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('shop_id', shopId)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as DbProduct
}

export async function deleteProduct(shopId: string, id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('shop_id', shopId)
    .eq('id', id)

  if (error) throw new Error(error.message)
}
