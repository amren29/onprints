'use server'

import { createClient } from '@/lib/supabase/server'

export type DbOrder = {
  id: string
  shop_id: string
  seq_id: string
  customer_id: string | null
  customer_name: string
  agent_name: string
  source: string
  status: string
  production: string
  due_date: string
  delivery_method: string
  delivery_address: string
  notes: string
  currency: string
  items: unknown[]
  payments: unknown[]
  timeline: unknown[]
  original_files: unknown[]
  discount: number
  discount_type: string
  sst_enabled: boolean
  sst_rate: number
  sst_amount: number
  rounding: number
  shipping_cost: number
  subtotal: number
  grand_total: number
  created_at: string
  updated_at: string
}

export async function getOrders(shopId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data as DbOrder[]
}

export async function getOrderById(shopId: string, id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('shop_id', shopId)
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as DbOrder | null
}

export async function createOrder(shopId: string, input: {
  customer_id?: string | null
  customer_name?: string
  agent_name?: string
  source?: string
  status?: string
  production?: string
  due_date?: string
  delivery_method?: string
  delivery_address?: string
  notes?: string
  currency?: string
  items?: unknown[]
  payments?: unknown[]
  timeline?: unknown[]
  original_files?: unknown[]
  discount?: number
  discount_type?: string
  sst_enabled?: boolean
  sst_rate?: number
  sst_amount?: number
  rounding?: number
  shipping_cost?: number
  subtotal?: number
  grand_total?: number
}) {
  const supabase = await createClient()

  const { data: seqData, error: seqErr } = await supabase
    .rpc('next_seq', { p_shop_id: shopId, p_prefix: 'ORD', p_pad: 4 })

  if (seqErr) throw new Error(seqErr.message)

  const { data, error } = await supabase
    .from('orders')
    .insert({
      shop_id: shopId,
      seq_id: seqData,
      customer_id: input.customer_id ?? null,
      customer_name: input.customer_name ?? '',
      agent_name: input.agent_name ?? '',
      source: input.source ?? 'manual',
      status: input.status ?? 'Pending',
      production: input.production ?? '—',
      due_date: input.due_date ?? '',
      delivery_method: input.delivery_method ?? 'Self-Pickup',
      delivery_address: input.delivery_address ?? '',
      notes: input.notes ?? '',
      currency: input.currency ?? 'MYR',
      items: input.items ?? [],
      payments: input.payments ?? [],
      timeline: input.timeline ?? [],
      original_files: input.original_files ?? [],
      discount: input.discount ?? 0,
      discount_type: input.discount_type ?? 'rm',
      sst_enabled: input.sst_enabled ?? false,
      sst_rate: input.sst_rate ?? 0,
      sst_amount: input.sst_amount ?? 0,
      rounding: input.rounding ?? 0,
      shipping_cost: input.shipping_cost ?? 0,
      subtotal: input.subtotal ?? 0,
      grand_total: input.grand_total ?? 0,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as DbOrder
}

export async function updateOrder(shopId: string, id: string, updates: Partial<{
  customer_id: string | null
  customer_name: string
  agent_name: string
  source: string
  status: string
  production: string
  due_date: string
  delivery_method: string
  delivery_address: string
  notes: string
  currency: string
  items: unknown[]
  payments: unknown[]
  timeline: unknown[]
  original_files: unknown[]
  discount: number
  discount_type: string
  sst_enabled: boolean
  sst_rate: number
  sst_amount: number
  rounding: number
  shipping_cost: number
  subtotal: number
  grand_total: number
}>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('orders')
    .update(updates)
    .eq('shop_id', shopId)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as DbOrder
}

export async function deleteOrder(shopId: string, id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('shop_id', shopId)
    .eq('id', id)

  if (error) throw new Error(error.message)
}

export async function duplicateOrder(shopId: string, sourceId: string) {
  const source = await getOrderById(shopId, sourceId)
  if (!source) return null

  return createOrder(shopId, {
    customer_id: source.customer_id,
    customer_name: source.customer_name,
    agent_name: source.agent_name,
    source: source.source,
    status: 'Pending',
    production: '—',
    due_date: '',
    delivery_method: source.delivery_method,
    delivery_address: source.delivery_address,
    notes: source.notes,
    currency: source.currency,
    items: source.items,
    payments: [],
    timeline: [{
      id: `tl_${Date.now()}`,
      date: new Date().toISOString().slice(0, 16).replace('T', ' '),
      event: `Duplicated from ${source.seq_id}`,
      by: 'Admin',
    }],
    original_files: source.original_files,
    discount: source.discount,
    discount_type: source.discount_type,
    sst_enabled: source.sst_enabled,
    sst_rate: source.sst_rate,
    sst_amount: source.sst_amount,
    rounding: source.rounding,
    shipping_cost: source.shipping_cost,
    subtotal: source.subtotal,
    grand_total: source.grand_total,
  })
}
