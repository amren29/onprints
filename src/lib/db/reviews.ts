'use server'

import { createClient } from '@/lib/supabase/server'

// ── Types ───────────────────────────────────────────

export type DbReview = {
  id: string
  shop_id: string
  product_id: string | null
  customer_name: string
  company: string
  product: string
  rating: number
  comment: string
  status: string
  pinned: boolean
  date: string
  created_at: string
}

// ── Review CRUD ─────────────────────────────────────

export async function getReviews(shopId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data as DbReview[]
}

export async function getReviewById(shopId: string, id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('shop_id', shopId)
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as DbReview | null
}

export async function getReviewsByProduct(shopId: string, productId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('shop_id', shopId)
    .eq('product_id', productId)
    .eq('status', 'Approved')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data as DbReview[]
}

export async function createReview(shopId: string, input: {
  product_id?: string | null
  customer_name?: string
  company?: string
  product?: string
  rating?: number
  comment?: string
  status?: string
  pinned?: boolean
  date?: string
}) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('reviews')
    .insert({
      shop_id: shopId,
      product_id: input.product_id ?? null,
      customer_name: input.customer_name ?? '',
      company: input.company ?? '',
      product: input.product ?? '',
      rating: input.rating ?? 5,
      comment: input.comment ?? '',
      status: input.status ?? 'Pending',
      pinned: input.pinned ?? false,
      date: input.date ?? '',
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as DbReview
}

export async function updateReview(shopId: string, id: string, updates: Partial<{
  customer_name: string
  company: string
  product: string
  rating: number
  comment: string
  status: string
  pinned: boolean
  date: string
}>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('reviews')
    .update(updates)
    .eq('shop_id', shopId)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as DbReview
}

export async function deleteReview(shopId: string, id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('shop_id', shopId)
    .eq('id', id)

  if (error) throw new Error(error.message)
}
