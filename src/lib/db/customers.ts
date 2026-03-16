'use server'

import { createClient } from '@/lib/supabase/server'

export type DbCustomer = {
  id: string
  shop_id: string
  seq_id: string
  name: string
  company: string
  email: string
  phone: string
  billing_address: string
  sst_no: string
  customer_type: string
  status: string
  location: string
  payment_terms: string
  credit_limit: number
  notes: string
  created_at: string
  updated_at: string
}

export async function getCustomers(shopId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data as DbCustomer[]
}

export async function getCustomerById(shopId: string, id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('shop_id', shopId)
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as DbCustomer | null
}

export async function findCustomerByName(shopId: string, name: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('shop_id', shopId)
    .ilike('name', name.trim())
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as DbCustomer | null
}

export async function createCustomer(shopId: string, input: {
  name: string
  company?: string
  email?: string
  phone?: string
  billing_address?: string
  sst_no?: string
  customer_type?: string
  status?: string
  location?: string
  payment_terms?: string
  credit_limit?: number
  notes?: string
}) {
  const supabase = await createClient()

  // Generate sequential ID
  const { data: seqData, error: seqErr } = await supabase
    .rpc('next_seq', { p_shop_id: shopId, p_prefix: 'C', p_pad: 3 })

  if (seqErr) throw new Error(seqErr.message)

  const { data, error } = await supabase
    .from('customers')
    .insert({
      shop_id: shopId,
      seq_id: seqData,
      name: input.name,
      company: input.company ?? '',
      email: input.email ?? '',
      phone: input.phone ?? '',
      billing_address: input.billing_address ?? '',
      sst_no: input.sst_no ?? '',
      customer_type: input.customer_type ?? 'Individual',
      status: input.status ?? 'Active',
      location: input.location ?? '',
      payment_terms: input.payment_terms ?? '',
      credit_limit: input.credit_limit ?? 0,
      notes: input.notes ?? '',
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as DbCustomer
}

export async function updateCustomer(shopId: string, id: string, updates: Partial<{
  name: string
  company: string
  email: string
  phone: string
  billing_address: string
  sst_no: string
  customer_type: string
  status: string
  location: string
  payment_terms: string
  credit_limit: number
  notes: string
}>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('customers')
    .update(updates)
    .eq('shop_id', shopId)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as DbCustomer
}

export async function deleteCustomer(shopId: string, id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('shop_id', shopId)
    .eq('id', id)

  if (error) throw new Error(error.message)
}

export async function upsertCustomerFromForm(shopId: string, fields: {
  name: string
  company: string
  email: string
  phone: string
  billing_address: string
  sst_no: string
  customer_type: string
}) {
  if (!fields.name.trim()) return null

  const existing = await findCustomerByName(shopId, fields.name)
  if (existing) {
    return updateCustomer(shopId, existing.id, {
      company: fields.company,
      email: fields.email,
      phone: fields.phone,
      billing_address: fields.billing_address,
      sst_no: fields.sst_no,
      customer_type: fields.customer_type,
    })
  } else {
    return createCustomer(shopId, fields)
  }
}
