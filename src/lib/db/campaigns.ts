'use server'

import { createClient } from '@/lib/supabase/server'

// ── Types ───────────────────────────────────────────

export type DbCampaign = {
  id: string
  shop_id: string
  name: string
  type: string
  status: string
  date: string
  reach: number
  discount: string
  audience: string
  subject: string
  body: string
  notes: string
  created_at: string
  updated_at: string
}

// ── Campaign CRUD ───────────────────────────────────

export async function getCampaigns(shopId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data as DbCampaign[]
}

export async function getCampaignById(shopId: string, id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('shop_id', shopId)
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as DbCampaign | null
}

export async function createCampaign(shopId: string, input: {
  name: string
  type?: string
  status?: string
  date?: string
  reach?: number
  discount?: string
  audience?: string
  subject?: string
  body?: string
  notes?: string
}) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('campaigns')
    .insert({
      shop_id: shopId,
      name: input.name,
      type: input.type ?? 'Email',
      status: input.status ?? 'Draft',
      date: input.date ?? '',
      reach: input.reach ?? 0,
      discount: input.discount ?? '',
      audience: input.audience ?? '',
      subject: input.subject ?? '',
      body: input.body ?? '',
      notes: input.notes ?? '',
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as DbCampaign
}

export async function updateCampaign(shopId: string, id: string, updates: Partial<{
  name: string
  type: string
  status: string
  date: string
  reach: number
  discount: string
  audience: string
  subject: string
  body: string
  notes: string
}>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('campaigns')
    .update(updates)
    .eq('shop_id', shopId)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as DbCampaign
}

export async function deleteCampaign(shopId: string, id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('campaigns')
    .delete()
    .eq('shop_id', shopId)
    .eq('id', id)

  if (error) throw new Error(error.message)
}
