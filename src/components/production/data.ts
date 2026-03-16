import type { KanbanColumn, KanbanItem } from './types'
import { getColumns, getCards } from '@/lib/db/production'
import { getProofsByCard, getProdCardState } from '@/lib/db/proofs'
import { getOrders, type DbOrder } from '@/lib/db/orders'

/** Derive card-level proofStatus from the latest active proof version */
function deriveProofStatus(versions: import('./types').ProofVersion[]): KanbanItem['proofStatus'] | undefined {
  if (!versions || versions.length === 0) return undefined
  // Find the latest non-AMEND_DONE version
  const active = [...versions].reverse().find(v => v.status !== 'AMEND_DONE')
  if (!active) return undefined
  const map: Record<string, KanbanItem['proofStatus']> = {
    APPROVED:        'approved',
    AMEND_REQUESTED: 'changes_requested',
    SENT:            'sent',
    GENERATED:       'artwork_proof_generated',
  }
  return map[active.status]
}

/* Map Order.production → board systemKey */
function prodToSystemKey(production: string): string {
  switch (production) {
    case 'In Progress':   return 'printing_production'
    case 'Quality Check': return 'qa'
    case 'Completed':
    case 'Shipped':
    case 'Delivered':     return 'collected_completed'
    default:              return 'new_order'   // '—', 'Queued'
  }
}

/* Priority from due date */
function duePriority(dueDate: string): 'low' | 'medium' | 'high' {
  if (!dueDate) return 'medium'
  const days = (new Date(dueDate).getTime() - Date.now()) / 86400000
  if (days < 0 || days < 3) return 'high'
  if (days < 7) return 'medium'
  return 'low'
}

// BRD-1: Load production board columns with real order data from Supabase
export async function loadPrintingBoardColumns(shopId: string, boardId: string): Promise<KanbanColumn[]> {
  const [columns, allOrders] = await Promise.all([
    getColumns(shopId, boardId),
    getOrders(shopId),
  ])

  const realItems: Record<string, KanbanItem[]> = {}

  for (const o of allOrders) {
    if (o.status === 'Cancelled') continue

    const items = (o.items ?? []) as { id?: string; name?: string; qty?: number; artworkFileName?: string; artworkUrl?: string; optionSummary?: string; total?: number }[]
    const itemSummary = items
      .slice(0, 2)
      .map(i => `${(i.name ?? '').split(' — ')[0]} ×${(i.qty ?? 0).toLocaleString()}`)
      .join(', ') + (items.length > 2 ? ` +${items.length - 2} more` : '')

    // Fetch proof data + card state from Supabase
    let cardState: Awaited<ReturnType<typeof getProdCardState>> = null
    let proofData: Awaited<ReturnType<typeof getProofsByCard>> = []
    try {
      [cardState, proofData] = await Promise.all([
        getProdCardState(shopId, o.id),
        getProofsByCard(shopId, o.id),
      ])
    } catch { /* ignore */ }

    const latestProof = proofData.length > 0 ? proofData[0] : null
    const proofVersions = latestProof?.all_versions as import('./types').ProofVersion[] | undefined
    const jobsheets = latestProof?.jobsheets as import('./types').Jobsheet[] | undefined
    const historyEntries = latestProof?.history_entries as import('./types').HistoryEntry[] | undefined

    const derivedStatus = cardState?.proof_status
      ?? (proofVersions ? deriveProofStatus(proofVersions) : undefined)

    // Collect artwork files from order items
    const artworkAttachments = items
      .filter(i => i.artworkFileName)
      .map(i => ({
        id: `art-${i.id}`,
        type: 'file' as const,
        name: i.artworkFileName!,
        url: i.artworkUrl || '',
        createdAt: o.created_at,
      }))

    // Map artwork attachments to OrderAsset format for CardModal
    const artworkAssets: import('./types').OrderAsset[] = artworkAttachments.map(a => ({
      id: a.id,
      type: 'file' as const,
      name: a.name,
      url: a.url,
      createdAt: a.createdAt,
    }))

    // Include order's originalFiles
    const origFiles = (o.original_files ?? []) as { id: string; type: string; name: string; url?: string }[]
    const origFileAssets: import('./types').OrderAsset[] = origFiles.map(f => ({
      id: f.id,
      type: f.type as 'file' | 'link',
      name: f.name,
      url: f.url || '',
      createdAt: o.created_at,
    }))

    // Merge persisted card assets (added via production card UI)
    const persistedAssets = (cardState?.order_assets ?? []) as import('./types').OrderAsset[]

    // Combine all, deduplicate by id
    const assetMap = new Map<string, import('./types').OrderAsset>()
    for (const a of [...artworkAssets, ...origFileAssets, ...persistedAssets]) assetMap.set(a.id, a)
    const orderAssets = Array.from(assetMap.values())

    const item: KanbanItem = {
      id:           o.id,
      task:         itemSummary || o.seq_id,
      priority:     duePriority(o.due_date),
      owner:        o.agent_name || o.customer_name,
      due:          o.due_date || o.created_at,
      files:        artworkAttachments.length,
      comments:     0,
      links:        0,
      progress:     '0/1',
      tags:         o.source === 'online-store' ? ['online', 'store'] : ['manual'],
      description:  items.map(i => i.optionSummary || '').filter(Boolean).join(' | ') || items.map(i => i.name ?? '').join(', ') || '',
      attachments:  artworkAttachments,
      orderAssets,
      commentsData: [],
      proofStatus:  (derivedStatus as KanbanItem['proofStatus']) ?? 'none',
      proofVersions,
      jobsheets,
      historyEntries,
      assignees:    [],
    }

    // Pending orders are always locked in "New Order" column
    const key = o.status === 'Pending' ? 'new_order' : (cardState?.column_system_key || prodToSystemKey(o.production))
    if (!realItems[key]) realItems[key] = []
    realItems[key].push(item)
  }

  return columns.map(col => {
    const realItemsForCol = realItems[col.system_key ?? ''] ?? []
    return {
      id:    col.id,
      name:  col.name,
      tone:  col.tone,
      systemKey: col.system_key,
      visibleToRoles: col.visible_to_roles,
      items: realItemsForCol,
    }
  })
}

// BRD-2+: Load general board columns with real card data from Supabase
export async function loadBoardColumns(shopId: string, boardId: string): Promise<KanbanColumn[]> {
  const [columns, cards] = await Promise.all([
    getColumns(shopId, boardId),
    getCards(shopId, boardId),
  ])

  return columns.map(col => ({
    id:   col.id,
    name: col.name,
    tone: col.tone,
    systemKey: col.system_key,
    visibleToRoles: col.visible_to_roles,
    items: cards
      .filter(c => c.column_id === col.id)
      .sort((a, b) => a.position - b.position)
      .map(cardToItem),
  }))
}

function cardToItem(c: import('@/lib/db/production').DbBoardCard): KanbanItem {
  return {
    id:           c.id,
    task:         c.task,
    priority:     c.priority as 'low' | 'medium' | 'high',
    owner:        c.owner,
    due:          c.due,
    files:        0,
    comments:     0,
    links:        0,
    progress:     '0/1',
    tags:         c.tags,
    description:  c.description,
    attachments:  c.attachments as KanbanItem['attachments'],
    commentsData: c.comments_data as KanbanItem['commentsData'],
    proofStatus:  c.proof_status as KanbanItem['proofStatus'],
    assignees:    c.assignees,
    subtasks:     c.subtasks as KanbanItem['subtasks'],
    startDate:    c.start_date,
    trackedTime:  c.tracked_time,
  }
}
