'use server'

import { createClient } from '@/lib/supabase/server'

// ── Types ───────────────────────────────────────────

export type DbContentPage = {
  id: string
  shop_id: string
  seq_id: string
  title: string
  slug: string
  type: string
  status: string
  body: string
  updated: string
  created_at: string
  updated_at: string
}

export type DbMessageTemplate = {
  id: string
  shop_id: string
  key: string
  channel: string
  subject: string
  body: string
}

// ── Content Page CRUD ───────────────────────────────

export async function getContentPages(shopId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('content_pages')
    .select('*')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data as DbContentPage[]
}

export async function getContentPageById(shopId: string, id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('content_pages')
    .select('*')
    .eq('shop_id', shopId)
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as DbContentPage | null
}

export async function createContentPage(shopId: string, input: {
  title: string
  slug: string
  type?: string
  status?: string
  body?: string
}) {
  const supabase = await createClient()

  const { data: seqData, error: seqErr } = await supabase
    .rpc('next_seq', { p_shop_id: shopId, p_prefix: 'CNT', p_pad: 1 })
  if (seqErr) throw new Error(seqErr.message)

  const { data, error } = await supabase
    .from('content_pages')
    .insert({
      shop_id: shopId,
      seq_id: seqData,
      title: input.title,
      slug: input.slug,
      type: input.type ?? 'Page',
      status: input.status ?? 'Draft',
      body: input.body ?? '',
      updated: new Date().toISOString().slice(0, 10),
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as DbContentPage
}

export async function updateContentPage(shopId: string, id: string, updates: Partial<{
  title: string
  slug: string
  type: string
  status: string
  body: string
}>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('content_pages')
    .update({ ...updates, updated: new Date().toISOString().slice(0, 10) })
    .eq('shop_id', shopId)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as DbContentPage
}

export async function deleteContentPage(shopId: string, id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('content_pages')
    .delete()
    .eq('shop_id', shopId)
    .eq('id', id)

  if (error) throw new Error(error.message)
}

// ── Message Template CRUD ───────────────────────────

export async function getMessageTemplates(shopId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('message_templates')
    .select('*')
    .eq('shop_id', shopId)

  if (error) throw new Error(error.message)
  return data as DbMessageTemplate[]
}

export async function saveMessageTemplate(shopId: string, input: {
  key: string
  channel?: string
  subject?: string
  body: string
}) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('message_templates')
    .upsert({
      shop_id: shopId,
      key: input.key,
      channel: input.channel ?? 'WhatsApp',
      subject: input.subject ?? '',
      body: input.body,
    }, { onConflict: 'shop_id,key' })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as DbMessageTemplate
}

export async function deleteMessageTemplate(shopId: string, key: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('message_templates')
    .delete()
    .eq('shop_id', shopId)
    .eq('key', key)

  if (error) throw new Error(error.message)
}
