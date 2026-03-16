'use server'

import { createClient } from '@/lib/supabase/server'

// ── Types ───────────────────────────────────────────

export type DbDiscount = {
  id: string
  shop_id: string
  seq_id: string
  code: string
  type: string
  value: number
  min_order: number
  max_uses: number
  used_count: number
  expiry: string
  status: string
  notes: string
  created_at: string
  updated_at: string
}

// ── Discount CRUD ───────────────────────────────────

export async function getDiscounts(shopId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('discounts')
    .select('*')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data as DbDiscount[]
}

export async function getDiscountById(shopId: string, id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('discounts')
    .select('*')
    .eq('shop_id', shopId)
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as DbDiscount | null
}

export async function getDiscountByCode(shopId: string, code: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('discounts')
    .select('*')
    .eq('shop_id', shopId)
    .eq('code', code)
    .eq('status', 'Active')
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as DbDiscount | null
}

export async function createDiscount(shopId: string, input: {
  code: string
  type?: string
  value?: number
  min_order?: number
  max_uses?: number
  expiry?: string
  status?: string
  notes?: string
}) {
  const supabase = await createClient()

  const { data: seqData, error: seqErr } = await supabase
    .rpc('next_seq', { p_shop_id: shopId, p_prefix: 'DSC', p_pad: 1 })
  if (seqErr) throw new Error(seqErr.message)

  const { data, error } = await supabase
    .from('discounts')
    .insert({
      shop_id: shopId,
      seq_id: seqData,
      code: input.code,
      type: input.type ?? 'percentage',
      value: input.value ?? 0,
      min_order: input.min_order ?? 0,
      max_uses: input.max_uses ?? 0,
      expiry: input.expiry ?? '',
      status: input.status ?? 'Active',
      notes: input.notes ?? '',
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as DbDiscount
}

export async function updateDiscount(shopId: string, id: string, updates: Partial<{
  code: string
  type: string
  value: number
  min_order: number
  max_uses: number
  used_count: number
  expiry: string
  status: string
  notes: string
}>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('discounts')
    .update(updates)
    .eq('shop_id', shopId)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as DbDiscount
}

export async function deleteDiscount(shopId: string, id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('discounts')
    .delete()
    .eq('shop_id', shopId)
    .eq('id', id)

  if (error) throw new Error(error.message)
}
