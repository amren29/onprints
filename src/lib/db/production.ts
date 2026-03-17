'use server'

import { createClient } from '@/lib/supabase/server'

// ── Types ───────────────────────────────────────────

export type DbBoard = {
  id: string
  shop_id: string
  seq_id: string
  team_space_id: string
  type: string
  name: string
  is_renameable: boolean
  is_system: boolean
  created_at: string
  updated_at: string
}

export type DbBoardColumn = {
  id: string
  shop_id: string
  board_id: string
  name: string
  position: number
  is_locked: boolean
  system_key: string
  tone: string
  visible_to_roles: string[]
  created_at: string
}

export type DbBoardCard = {
  id: string
  shop_id: string
  board_id: string
  column_id: string
  position: number
  task: string
  priority: string
  owner: string
  due: string
  tags: string[]
  description: string
  attachments: unknown[]
  comments_data: unknown[]
  start_date: string
  tracked_time: string
  subtasks: unknown[]
  custom_fields: unknown[]
  dependencies: string[]
  assignees: string[]
  proof_status: string
  created_at: string
  updated_at: string
}

// ── Board CRUD ──────────────────────────────────────

export async function getBoards(shopId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('boards')
    .select('*')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return data as DbBoard[]
}

export async function getBoardById(shopId: string, id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('boards')
    .select('*')
    .eq('shop_id', shopId)
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as DbBoard | null
}

export async function createBoard(shopId: string, input: {
  name: string
  type?: string
  is_system?: boolean
  is_renameable?: boolean
  team_space_id?: string
}) {
  const supabase = await createClient()

  const { data: seqData, error: seqErr } = await supabase
    .rpc('next_seq', { p_shop_id: shopId, p_prefix: 'BRD', p_pad: 1 })
  if (seqErr) throw new Error(seqErr.message)

  const { data, error } = await supabase
    .from('boards')
    .insert({
      shop_id: shopId,
      seq_id: seqData,
      team_space_id: input.team_space_id ?? 'ts-default',
      type: input.type ?? 'general',
      name: input.name,
      is_renameable: input.is_renameable ?? true,
      is_system: input.is_system ?? false,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  // Seed default columns for general boards
  if ((input.type ?? 'general') === 'general') {
    const defaultCols = [
      { name: 'Backlog', tone: 'neutral', position: 0 },
      { name: 'In Progress', tone: 'info', position: 1 },
      { name: 'Review', tone: 'warning', position: 2 },
      { name: 'Done', tone: 'success', position: 3 },
    ]
    await supabase.from('board_columns').insert(
      defaultCols.map(c => ({
        shop_id: shopId,
        board_id: data.id,
        name: c.name,
        position: c.position,
        tone: c.tone,
        is_locked: false,
        system_key: '',
        visible_to_roles: [],
      }))
    )
  }

  return data as DbBoard
}

/** Auto-seed the mandatory Printing Production board (BRD-1) with 11 locked columns */
export async function seedPrintingProductionBoard(shopId: string) {
  const supabase = await createClient()

  // Check if a production board already exists
  const { data: existing } = await supabase
    .from('boards')
    .select('id')
    .eq('shop_id', shopId)
    .eq('type', 'production')
    .limit(1)

  if (existing && existing.length > 0) return existing[0]

  // Create the board
  let seqId = 'BRD-1'
  try {
    const { data: seqData } = await supabase
      .rpc('next_seq', { p_shop_id: shopId, p_prefix: 'BRD', p_pad: 1 })
    if (seqData) seqId = seqData
  } catch { /* use default */ }

  const { data: board, error } = await supabase
    .from('boards')
    .insert({
      shop_id: shopId,
      seq_id: seqId,
      team_space_id: 'ts-default',
      type: 'production',
      name: 'Printing Production',
      is_renameable: false,
      is_system: true,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  // Seed the 11 locked columns
  const columns = [
    { name: 'New Order',       system_key: 'new_order',             tone: 'neutral',  position: 0 },
    { name: 'Artwork Check',   system_key: 'artwork_check',         tone: 'info',     position: 1 },
    { name: 'Pre-Press',       system_key: 'pre_press',             tone: 'info',     position: 2 },
    { name: 'Plate Making',    system_key: 'plate_making',          tone: 'info',     position: 3 },
    { name: 'Printing',        system_key: 'printing_production',   tone: 'warning',  position: 4 },
    { name: 'Cutting',         system_key: 'cutting',               tone: 'warning',  position: 5 },
    { name: 'Finishing',       system_key: 'finishing',             tone: 'warning',  position: 6 },
    { name: 'Quality Check',   system_key: 'qa',                    tone: 'warning',  position: 7 },
    { name: 'Packing',         system_key: 'packing',               tone: 'success',  position: 8 },
    { name: 'Ready',           system_key: 'ready',                 tone: 'success',  position: 9 },
    { name: 'Collected / Completed', system_key: 'collected_completed', tone: 'success', position: 10 },
  ]

  await supabase.from('board_columns').insert(
    columns.map(c => ({
      shop_id: shopId,
      board_id: board.id,
      name: c.name,
      position: c.position,
      is_locked: true,
      system_key: c.system_key,
      tone: c.tone,
      visible_to_roles: [],
    }))
  )

  return board as DbBoard
}

export async function renameBoard(shopId: string, id: string, name: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('boards')
    .update({ name })
    .eq('shop_id', shopId)
    .eq('id', id)
    .eq('is_renameable', true)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as DbBoard
}

export async function deleteBoard(shopId: string, id: string) {
  const supabase = await createClient()
  // Prevent deleting system boards
  const { error } = await supabase
    .from('boards')
    .delete()
    .eq('shop_id', shopId)
    .eq('id', id)
    .eq('is_system', false)

  if (error) throw new Error(error.message)
}

// ── Column CRUD ─────────────────────────────────────

export async function getColumns(shopId: string, boardId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('board_columns')
    .select('*')
    .eq('shop_id', shopId)
    .eq('board_id', boardId)
    .order('position', { ascending: true })

  if (error) throw new Error(error.message)
  return data as DbBoardColumn[]
}

export async function addColumn(shopId: string, boardId: string, name: string) {
  const supabase = await createClient()
  const cols = await getColumns(shopId, boardId)

  const { data, error } = await supabase
    .from('board_columns')
    .insert({
      shop_id: shopId,
      board_id: boardId,
      name,
      position: cols.length,
      is_locked: false,
      system_key: '',
      tone: 'neutral',
      visible_to_roles: [],
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as DbBoardColumn
}

export async function renameColumn(shopId: string, id: string, name: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('board_columns')
    .update({ name })
    .eq('shop_id', shopId)
    .eq('id', id)

  if (error) throw new Error(error.message)
}

export async function deleteColumn(shopId: string, id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('board_columns')
    .delete()
    .eq('shop_id', shopId)
    .eq('id', id)
    .eq('is_locked', false)

  if (error) throw new Error(error.message)
}

// ── Card CRUD ───────────────────────────────────────

export async function getCards(shopId: string, boardId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('board_cards')
    .select('*')
    .eq('shop_id', shopId)
    .eq('board_id', boardId)
    .order('position', { ascending: true })

  if (error) throw new Error(error.message)
  return data as DbBoardCard[]
}

export async function getCardById(shopId: string, id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('board_cards')
    .select('*')
    .eq('shop_id', shopId)
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as DbBoardCard | null
}

export async function createCard(shopId: string, input: {
  board_id: string
  column_id: string
  task: string
  position?: number
  priority?: string
  owner?: string
  due?: string
  tags?: string[]
  description?: string
  assignees?: string[]
}) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('board_cards')
    .insert({
      shop_id: shopId,
      board_id: input.board_id,
      column_id: input.column_id,
      task: input.task,
      position: input.position ?? 0,
      priority: input.priority ?? 'medium',
      owner: input.owner ?? '',
      due: input.due ?? '',
      tags: input.tags ?? [],
      description: input.description ?? '',
      assignees: input.assignees ?? [],
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as DbBoardCard
}

export async function updateCard(shopId: string, id: string, updates: Partial<{
  column_id: string
  position: number
  task: string
  priority: string
  owner: string
  due: string
  tags: string[]
  description: string
  attachments: unknown[]
  comments_data: unknown[]
  start_date: string
  tracked_time: string
  subtasks: unknown[]
  custom_fields: unknown[]
  dependencies: string[]
  assignees: string[]
  proof_status: string
}>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('board_cards')
    .update(updates)
    .eq('shop_id', shopId)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as DbBoardCard
}

export async function deleteCard(shopId: string, id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('board_cards')
    .delete()
    .eq('shop_id', shopId)
    .eq('id', id)

  if (error) throw new Error(error.message)
}

export async function moveCard(shopId: string, cardId: string, toColumnId: string, toPosition: number) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('board_cards')
    .update({ column_id: toColumnId, position: toPosition })
    .eq('shop_id', shopId)
    .eq('id', cardId)

  if (error) throw new Error(error.message)
}
