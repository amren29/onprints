'use server'

import { createClient } from '@/lib/supabase/server'

// ── Types ───────────────────────────────────────────

export type DbAgent = {
  id: string
  shop_id: string
  seq_id: string
  full_name: string
  email: string
  phone: string
  region: string
  status: string
  discount_rate: number
  payment_method: string
  bank_name: string
  bank_account_name: string
  bank_account_number: string
  start_date: string
  notes: string
  created_at: string
  updated_at: string
}

export type DbWalletEntry = {
  id: string
  shop_id: string
  agent_id: string | null
  agent_name: string
  date: string
  type: string
  category: string
  description: string
  amount: number
  balance: number
  created_at: string
}

export type DbTopupRequest = {
  id: string
  shop_id: string
  agent_name: string
  agent_email: string
  amount: number
  payment_method: string
  status: string
  receipt_file: string
  submitted_at: string
  reviewed_at: string
  created_at: string
  updated_at: string
}

// ── Agent CRUD ──────────────────────────────────────

export async function getAgents(shopId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data as DbAgent[]
}

export async function getAgentById(shopId: string, id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('shop_id', shopId)
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as DbAgent | null
}

export async function createAgent(shopId: string, input: {
  full_name: string
  email?: string
  phone?: string
  region?: string
  status?: string
  discount_rate?: number
  payment_method?: string
  bank_name?: string
  bank_account_name?: string
  bank_account_number?: string
  start_date?: string
  notes?: string
}) {
  const supabase = await createClient()

  const { data: seqData, error: seqErr } = await supabase
    .rpc('next_seq', { p_shop_id: shopId, p_prefix: 'AG', p_pad: 2 })
  if (seqErr) throw new Error(seqErr.message)

  const { data, error } = await supabase
    .from('agents')
    .insert({
      shop_id: shopId,
      seq_id: seqData,
      full_name: input.full_name,
      email: input.email ?? '',
      phone: input.phone ?? '',
      region: input.region ?? '',
      status: input.status ?? 'Active',
      discount_rate: input.discount_rate ?? 0,
      payment_method: input.payment_method ?? '',
      bank_name: input.bank_name ?? '',
      bank_account_name: input.bank_account_name ?? '',
      bank_account_number: input.bank_account_number ?? '',
      start_date: input.start_date ?? '',
      notes: input.notes ?? '',
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as DbAgent
}

export async function updateAgent(shopId: string, id: string, updates: Partial<{
  full_name: string
  email: string
  phone: string
  region: string
  status: string
  discount_rate: number
  payment_method: string
  bank_name: string
  bank_account_name: string
  bank_account_number: string
  start_date: string
  notes: string
}>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('agents')
    .update(updates)
    .eq('shop_id', shopId)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as DbAgent
}

export async function deleteAgent(shopId: string, id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('agents')
    .delete()
    .eq('shop_id', shopId)
    .eq('id', id)

  if (error) throw new Error(error.message)
}

// ── Wallet Entry CRUD ───────────────────────────────

export async function getWalletEntries(shopId: string, agentId?: string) {
  const supabase = await createClient()
  let query = supabase
    .from('wallet_entries')
    .select('*')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false })

  if (agentId) {
    query = query.eq('agent_id', agentId)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data as DbWalletEntry[]
}

export async function createWalletEntry(shopId: string, input: {
  agent_id?: string | null
  agent_name?: string
  date: string
  type: 'credit' | 'debit'
  category?: string
  description?: string
  amount: number
}) {
  const supabase = await createClient()

  // Calculate running balance
  const entries = await getWalletEntries(shopId, input.agent_id ?? undefined)
  const lastBalance = entries.length > 0 ? entries[0].balance : 0
  const balance = input.type === 'credit'
    ? lastBalance + input.amount
    : lastBalance - input.amount

  const { data, error } = await supabase
    .from('wallet_entries')
    .insert({
      shop_id: shopId,
      agent_id: input.agent_id ?? null,
      agent_name: input.agent_name ?? '',
      date: input.date,
      type: input.type,
      category: input.category ?? '',
      description: input.description ?? '',
      amount: input.amount,
      balance,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as DbWalletEntry
}

export async function deleteWalletEntry(shopId: string, id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('wallet_entries')
    .delete()
    .eq('shop_id', shopId)
    .eq('id', id)

  if (error) throw new Error(error.message)
}

// ── Topup Request CRUD ──────────────────────────────

export async function getTopupRequests(shopId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('topup_requests')
    .select('*')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data as DbTopupRequest[]
}

export async function createTopupRequest(shopId: string, input: {
  agent_name?: string
  agent_email?: string
  amount: number
  payment_method?: string
  receipt_file?: string
  submitted_at?: string
}) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('topup_requests')
    .insert({
      shop_id: shopId,
      agent_name: input.agent_name ?? '',
      agent_email: input.agent_email ?? '',
      amount: input.amount,
      payment_method: input.payment_method ?? 'bank-transfer',
      status: 'pending',
      receipt_file: input.receipt_file ?? '',
      submitted_at: input.submitted_at ?? new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as DbTopupRequest
}

export async function updateTopupRequest(shopId: string, id: string, updates: Partial<{
  status: string
  reviewed_at: string
}>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('topup_requests')
    .update(updates)
    .eq('shop_id', shopId)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as DbTopupRequest
}

export async function deleteTopupRequest(shopId: string, id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('topup_requests')
    .delete()
    .eq('shop_id', shopId)
    .eq('id', id)

  if (error) throw new Error(error.message)
}
