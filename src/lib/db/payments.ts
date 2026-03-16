'use server'

import { createClient } from '@/lib/supabase/server'

// ── Types ───────────────────────────────────────────

export type DbPayment = {
  id: string
  shop_id: string
  seq_id: string
  client: string
  invoice_id: string
  method: string
  amount_due: number
  amount_paid: number
  status: string
  date: string
  ref: string
  notes: string
  attachment: string
  attachment_url: string
  created_at: string
  updated_at: string
}

// ── Payment CRUD ────────────────────────────────────

export async function getPayments(shopId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data as DbPayment[]
}

export async function getPaymentById(shopId: string, id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('shop_id', shopId)
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as DbPayment | null
}

export async function createPayment(shopId: string, input: {
  client?: string
  invoice_id?: string
  method?: string
  amount_due?: number
  amount_paid?: number
  status?: string
  date?: string
  ref?: string
  notes?: string
  attachment?: string
  attachment_url?: string
}) {
  const supabase = await createClient()

  const { data: seqData, error: seqErr } = await supabase
    .rpc('next_seq', { p_shop_id: shopId, p_prefix: 'PAY', p_pad: 4 })
  if (seqErr) throw new Error(seqErr.message)

  const { data, error } = await supabase
    .from('payments')
    .insert({
      shop_id: shopId,
      seq_id: seqData,
      client: input.client ?? '',
      invoice_id: input.invoice_id ?? '',
      method: input.method ?? 'Cash',
      amount_due: input.amount_due ?? 0,
      amount_paid: input.amount_paid ?? 0,
      status: input.status ?? 'Pending',
      date: input.date ?? '',
      ref: input.ref ?? '',
      notes: input.notes ?? '',
      attachment: input.attachment ?? '',
      attachment_url: input.attachment_url ?? '',
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as DbPayment
}

export async function updatePayment(shopId: string, id: string, updates: Partial<{
  client: string
  invoice_id: string
  method: string
  amount_due: number
  amount_paid: number
  status: string
  date: string
  ref: string
  notes: string
  attachment: string
  attachment_url: string
}>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('payments')
    .update(updates)
    .eq('shop_id', shopId)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as DbPayment
}

export async function deletePayment(shopId: string, id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('payments')
    .delete()
    .eq('shop_id', shopId)
    .eq('id', id)

  if (error) throw new Error(error.message)
}
