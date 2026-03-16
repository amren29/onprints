'use server'

import { createClient } from '@/lib/supabase/server'

// ── Types ───────────────────────────────────────────

export type DbStockItem = {
  id: string
  shop_id: string
  seq_id: string
  name: string
  sku: string
  unit: string
  supplier: string
  reorder_level: number
  current_stock: number
  status: string
  notes: string
  created_at: string
  updated_at: string
}

export type DbSupplier = {
  id: string
  shop_id: string
  seq_id: string
  name: string
  contact_person: string
  contact: string
  phone: string
  region: string
  rating: string
  lead: string
  payment_terms: string
  address: string
  notes: string
  created_at: string
  updated_at: string
}

export type DbStockLog = {
  id: string
  shop_id: string
  seq_id: string
  item_id: string | null
  item_name: string
  date: string
  type: string
  qty: number
  reason: string
  order_id: string
  by: string
  created_at: string
}

// ── Helpers ─────────────────────────────────────────

function computeStockStatus(current: number, reorder: number): string {
  if (current < reorder) return 'Critical'
  if (current < reorder * 1.8) return 'Low'
  return 'Healthy'
}

// ── Stock Item CRUD ─────────────────────────────────

export async function getStockItems(shopId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data as DbStockItem[]
}

export async function getStockItemById(shopId: string, id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('shop_id', shopId)
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as DbStockItem | null
}

export async function createStockItem(shopId: string, input: {
  name: string
  sku?: string
  unit?: string
  supplier?: string
  reorder_level?: number
  current_stock?: number
  notes?: string
}) {
  const supabase = await createClient()

  const { data: seqData, error: seqErr } = await supabase
    .rpc('next_seq', { p_shop_id: shopId, p_prefix: 'STK', p_pad: 3 })
  if (seqErr) throw new Error(seqErr.message)

  const currentStock = input.current_stock ?? 0
  const reorderLevel = input.reorder_level ?? 10

  const { data, error } = await supabase
    .from('inventory_items')
    .insert({
      shop_id: shopId,
      seq_id: seqData,
      name: input.name,
      sku: input.sku ?? '',
      unit: input.unit ?? 'pcs',
      supplier: input.supplier ?? '',
      reorder_level: reorderLevel,
      current_stock: currentStock,
      status: computeStockStatus(currentStock, reorderLevel),
      notes: input.notes ?? '',
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as DbStockItem
}

export async function updateStockItem(shopId: string, id: string, updates: Partial<{
  name: string
  sku: string
  unit: string
  supplier: string
  reorder_level: number
  current_stock: number
  notes: string
}>) {
  const supabase = await createClient()

  // Recompute status if stock or reorder changed
  if (updates.current_stock !== undefined || updates.reorder_level !== undefined) {
    const existing = await getStockItemById(shopId, id)
    if (existing) {
      const cs = updates.current_stock ?? existing.current_stock
      const rl = updates.reorder_level ?? existing.reorder_level
      ;(updates as Record<string, unknown>).status = computeStockStatus(cs, rl)
    }
  }

  const { data, error } = await supabase
    .from('inventory_items')
    .update(updates)
    .eq('shop_id', shopId)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as DbStockItem
}

export async function deleteStockItem(shopId: string, id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('inventory_items')
    .delete()
    .eq('shop_id', shopId)
    .eq('id', id)

  if (error) throw new Error(error.message)
}

// ── Stock Log CRUD ──────────────────────────────────

export async function getStockLogs(shopId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('stock_logs')
    .select('*')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data as DbStockLog[]
}

export async function createStockLog(shopId: string, input: {
  item_id?: string | null
  item_name: string
  date: string
  type: 'in' | 'out' | 'adjustment'
  qty: number
  reason?: string
  order_id?: string
  by?: string
}) {
  const supabase = await createClient()

  const { data: seqData, error: seqErr } = await supabase
    .rpc('next_seq', { p_shop_id: shopId, p_prefix: 'LOG', p_pad: 3 })
  if (seqErr) throw new Error(seqErr.message)

  const { data, error } = await supabase
    .from('stock_logs')
    .insert({
      shop_id: shopId,
      seq_id: seqData,
      item_id: input.item_id ?? null,
      item_name: input.item_name,
      date: input.date,
      type: input.type,
      qty: input.qty,
      reason: input.reason ?? '',
      order_id: input.order_id ?? '',
      by: input.by ?? '',
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  // Update stock on the referenced item
  if (input.item_id) {
    const item = await getStockItemById(shopId, input.item_id)
    if (item) {
      let updated: number
      if (input.type === 'in') updated = item.current_stock + input.qty
      else if (input.type === 'out') updated = Math.max(0, item.current_stock - input.qty)
      else updated = Math.max(0, item.current_stock + input.qty)
      await updateStockItem(shopId, item.id, { current_stock: updated })
    }
  }

  return data as DbStockLog
}

export async function deleteStockLog(shopId: string, id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('stock_logs')
    .delete()
    .eq('shop_id', shopId)
    .eq('id', id)

  if (error) throw new Error(error.message)
}

// ── Supplier CRUD ───────────────────────────────────

export async function getSuppliers(shopId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data as DbSupplier[]
}

export async function getSupplierById(shopId: string, id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('shop_id', shopId)
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as DbSupplier | null
}

export async function createSupplier(shopId: string, input: {
  name: string
  contact_person?: string
  contact?: string
  phone?: string
  region?: string
  rating?: string
  lead?: string
  payment_terms?: string
  address?: string
  notes?: string
}) {
  const supabase = await createClient()

  const { data: seqData, error: seqErr } = await supabase
    .rpc('next_seq', { p_shop_id: shopId, p_prefix: 'SUP', p_pad: 2 })
  if (seqErr) throw new Error(seqErr.message)

  const { data, error } = await supabase
    .from('suppliers')
    .insert({
      shop_id: shopId,
      seq_id: seqData,
      name: input.name,
      contact_person: input.contact_person ?? '',
      contact: input.contact ?? '',
      phone: input.phone ?? '',
      region: input.region ?? '',
      rating: input.rating ?? 'B',
      lead: input.lead ?? '',
      payment_terms: input.payment_terms ?? '',
      address: input.address ?? '',
      notes: input.notes ?? '',
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as DbSupplier
}

export async function updateSupplier(shopId: string, id: string, updates: Partial<{
  name: string
  contact_person: string
  contact: string
  phone: string
  region: string
  rating: string
  lead: string
  payment_terms: string
  address: string
  notes: string
}>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('suppliers')
    .update(updates)
    .eq('shop_id', shopId)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as DbSupplier
}

export async function deleteSupplier(shopId: string, id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('suppliers')
    .delete()
    .eq('shop_id', shopId)
    .eq('id', id)

  if (error) throw new Error(error.message)
}
