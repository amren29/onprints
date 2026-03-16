'use server'

import { createClient } from '@/lib/supabase/server'

// ── Types ───────────────────────────────────────────

export type DbProof = {
  id: string
  shop_id: string
  card_id: string
  token: string
  task_name: string
  proof_version: Record<string, unknown>
  all_versions: unknown[]
  jobsheets: unknown[]
  history_entries: unknown[]
  created_at: string
  updated_at: string
}

export type DbProdCardState = {
  id: string
  shop_id: string
  card_id: string
  proof_status: string
  column_system_key: string
  order_assets: unknown[]
}

// ── Proof CRUD ──────────────────────────────────────

export async function getProofByToken(token: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('proofs')
    .select('*')
    .eq('token', token)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as DbProof | null
}

export async function getProofsByCard(shopId: string, cardId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('proofs')
    .select('*')
    .eq('shop_id', shopId)
    .eq('card_id', cardId)

  if (error) throw new Error(error.message)
  return data as DbProof[]
}

export async function saveProof(shopId: string, input: {
  card_id: string
  token: string
  task_name?: string
  proof_version?: Record<string, unknown>
  all_versions?: unknown[]
  jobsheets?: unknown[]
  history_entries?: unknown[]
}) {
  const supabase = await createClient()

  // Upsert by token
  const { data, error } = await supabase
    .from('proofs')
    .upsert({
      shop_id: shopId,
      card_id: input.card_id,
      token: input.token,
      task_name: input.task_name ?? '',
      proof_version: input.proof_version ?? {},
      all_versions: input.all_versions ?? [],
      jobsheets: input.jobsheets ?? [],
      history_entries: input.history_entries ?? [],
    }, { onConflict: 'token' })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as DbProof
}

export async function updateProofByToken(token: string, updates: Partial<{
  proof_version: Record<string, unknown>
  all_versions: unknown[]
  jobsheets: unknown[]
  history_entries: unknown[]
}>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('proofs')
    .update(updates)
    .eq('token', token)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as DbProof
}

// ── Production Card State ───────────────────────────

export async function getProdCardState(shopId: string, cardId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('prod_card_states')
    .select('*')
    .eq('shop_id', shopId)
    .eq('card_id', cardId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as DbProdCardState | null
}

export async function setProdCardState(shopId: string, cardId: string, update: Partial<{
  proof_status: string
  column_system_key: string
  order_assets: unknown[]
}>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('prod_card_states')
    .upsert({
      shop_id: shopId,
      card_id: cardId,
      ...update,
    }, { onConflict: 'shop_id,card_id' })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as DbProdCardState
}
