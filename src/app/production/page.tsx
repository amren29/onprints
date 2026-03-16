'use client'

import { Suspense, useState, useRef, useCallback, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import AppShell from '@/components/AppShell'
import DateRangePicker from '@/components/DateRangePicker'
import KanbanColumn from '@/components/production/KanbanColumn'
import ProductionListView from '@/components/production/ProductionListView'
import AddColumnButton from '@/components/production/AddColumnButton'
import CardModal from '@/components/production/CardModal'
import { loadPrintingBoardColumns, loadBoardColumns } from '@/components/production/data'
import { getOrderById } from '@/lib/db/orders'
import {
  getBoards,
  addColumn as dbAddColumn,
  renameColumn as dbRenameColumn,
  deleteColumn as dbDeleteColumn,
  createCard as dbCreateCard,
  updateCard as dbUpdateCard,
  moveCard as dbMoveCard,
  type DbBoard,
} from '@/lib/db/production'
import { setProdCardState } from '@/lib/db/proofs'
import { addNotification } from '@/lib/db/notifications'
import type { KanbanColumn as KCol, KanbanItem } from '@/components/production/types'
import { formatAnyDate, isUrgent } from '@/components/production/utils'
import { isInAppEnabled } from '@/lib/notif-prefs-store' // TODO: migrate to Supabase
import { showToast } from '@/lib/toast'
import { useShop } from '@/providers/shop-provider'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const GhostChatIcon  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
const GhostGlobeIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
const GhostLinkIcon  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>

const GHOST_PRIORITY: Record<string, { bg: string; color: string }> = {
  high:   { bg: 'rgba(239,68,68,0.1)',  color: '#ef4444' },
  medium: { bg: 'rgba(245,158,11,0.1)', color: '#d97706' },
}
const GHOST_PROOF: Record<string, { bg: string; color: string; border: string; label: string }> = {
  none:                    { bg:'var(--bg, #f1f5f9)', color:'var(--text-muted)', border:'var(--border)', label:'No action' },
  artwork_proof_generated: { bg:'rgba(168,85,247,0.1)', color:'#9333ea', border:'rgba(168,85,247,0.25)', label:'Proof Generated' },
  approved:                { bg:'rgba(0,106,255,0.1)', color:'var(--accent, #006AFF)', border:'rgba(0,106,255,0.2)', label:'Approved' },
  sent:                    { bg:'rgba(0,106,255,0.1)', color:'var(--accent, #006AFF)', border:'rgba(0,106,255,0.2)', label:'Sent' },
  changes_requested:       { bg:'rgba(245,158,11,0.12)', color:'#f59e0b', border:'rgba(245,158,11,0.25)', label:'Changes' },
  rejected:                { bg:'rgba(239,68,68,0.06)', color:'#ef4444', border:'rgba(239,68,68,0.18)', label:'Rejected' },
  pending:                 { bg:'var(--bg, #f1f5f9)', color:'var(--text-secondary)', border:'var(--border)', label:'Pending' },
}
type Board = DbBoard

/* ── Icons ──────────────────────────────────────────── */
const ExportIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
)
const BoardSVG = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="11" rx="1"/><rect x="17" y="3" width="5" height="15" rx="1"/>
  </svg>
)
const ListSVG = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
)
const SortSVG = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="18" x2="12" y2="18"/>
  </svg>
)
const ChevDownSVG = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
)

/* ── Inner page (uses useSearchParams) ─────────────── */
function ProductionContent() {
  const searchParams = useSearchParams()
  const boardIdParam = searchParams.get('board')
  const { shopId } = useShop()
  const qc = useQueryClient()

  /* ── Fetch boards ── */
  const { data: allBoards = [] } = useQuery({
    queryKey: ['boards', shopId],
    queryFn: () => getBoards(shopId),
    enabled: !!shopId,
  })

  const targetId = boardIdParam ?? allBoards.find(b => b.type === 'production')?.seq_id ?? allBoards[0]?.seq_id
  const activeBoard = allBoards.find(b => b.seq_id === targetId) ?? allBoards[0] ?? null

  /* ── Fetch columns for active board ── */
  const { data: boardColumns = [], refetch: refetchColumns } = useQuery({
    queryKey: ['boardColumns', shopId, activeBoard?.id, activeBoard?.type],
    queryFn: () => {
      if (!activeBoard) return [] as KCol[]
      return activeBoard.type === 'production'
        ? loadPrintingBoardColumns(shopId, activeBoard.id)
        : loadBoardColumns(shopId, activeBoard.id)
    },
    enabled: !!shopId && !!activeBoard,
  })

  /* ── Local columns for optimistic drag ── */
  const [localColumns, setLocalColumns] = useState<KCol[] | null>(null)
  const displayColumns = localColumns ?? boardColumns

  // Sync localColumns back to null when query data changes
  useEffect(() => { setLocalColumns(null) }, [boardColumns])

  /* ── Modal ── */
  const [activeCard, setActiveCard]       = useState<KanbanItem | null>(null)
  const [activeCardCol, setActiveCardCol] = useState<string>('')
  const [modalOpen, setModalOpen]         = useState(false)

  /* ── View / filter ── */
  const [view, setView]             = useState<'board' | 'list'>('board')
  const [filterStatus, setFilterStatus] = useState('All')
  const [sortBy, setSortBy]         = useState<'due' | 'priority' | 'created'>('due')
  const [filterProof, setFilterProof] = useState<'All' | 'none' | 'artwork_proof_generated' | 'approved' | 'changes_requested' | 'sent'>('All')
  const [sortOpen, setSortOpen]     = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [proofOpen, setProofOpen]   = useState(false)

  /* ── Drag ── */
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropPos, setDropPos]       = useState<{ colId: string; index: number } | null>(null)

  /* ── Column rename ── */
  const [renamingColId, setRenamingColId]     = useState<string | null>(null)
  const [renamingColName, setRenamingColName] = useState('')

  /* ── Drag refs ── */
  const ghostRef   = useRef<HTMLDivElement>(null)
  const dragMeta   = useRef<{ cardId: string; offsetX: number; offsetY: number; cardWidth: number; startX: number; startY: number; dragging: boolean } | null>(null)
  const dropPosRef = useRef<{ colId: string; index: number } | null>(null)
  const rafRef     = useRef<number | null>(null)
  const animState  = useRef({ targetX:0, targetY:0, currX:0, currY:0, vx:0, vy:0, tilt:0, scale:1, lastPX:0, lastPY:0 })

  /* ── Drag handlers ── */
  const DRAG_THRESHOLD = 6

  /* Physics RAF loop — lerps position, tilt, and scale based on velocity */
  const runRaf = useCallback(function tick() {
    const s     = animState.current
    const ghost = ghostRef.current
    if (!ghost) return

    // Lerp position toward cursor target
    s.currX += (s.targetX - s.currX) * 0.2
    s.currY += (s.targetY - s.currY) * 0.2

    // Tilt derived from horizontal velocity, clamped ±15°
    const targetTilt = Math.max(-15, Math.min(15, s.vx * 0.35))
    s.tilt += (targetTilt - s.tilt) * 0.12

    // Ramp scale up to 1.03 (lifted feel)
    s.scale += (1.03 - s.scale) * 0.15

    // Natural velocity decay between frames
    s.vx *= 0.85
    s.vy *= 0.85

    ghost.style.transform = `translate3d(${s.currX}px,${s.currY}px,0) rotate(${s.tilt}deg) scale(${s.scale})`

    rafRef.current = requestAnimationFrame(tick)
  }, [])

  const onPointerMove = useCallback((e: PointerEvent) => {
    const dm = dragMeta.current
    if (!dm || !ghostRef.current) return

    // Activate drag only after threshold
    if (!dm.dragging) {
      const dx = e.clientX - dm.startX
      const dy = e.clientY - dm.startY
      if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return
      dm.dragging = true
      document.body.classList.add('is-dragging')
      setDraggingId(dm.cardId)
      ghostRef.current.style.width   = `${dm.cardWidth}px`
      ghostRef.current.style.display = 'flex'

      // Seed animation state at current position (no teleport)
      const s = animState.current
      const initX = e.clientX - dm.offsetX
      const initY = e.clientY - dm.offsetY
      s.currX = initX; s.targetX = initX
      s.currY = initY; s.targetY = initY
      s.vx = 0; s.vy = 0; s.tilt = 0; s.scale = 1
      s.lastPX = e.clientX; s.lastPY = e.clientY

      // Apply initial transform so ghost appears at correct position immediately
      ghostRef.current.style.transform = `translate3d(${initX}px,${initY}px,0) rotate(0deg) scale(1.03)`

      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(runRaf)
    }

    // Update velocity from delta since last frame
    const s = animState.current
    const dx = e.clientX - s.lastPX
    const dy = e.clientY - s.lastPY
    s.vx = s.vx * 0.6 + dx * 0.4   // smoothed velocity
    s.vy = s.vy * 0.6 + dy * 0.4
    s.lastPX = e.clientX
    s.lastPY = e.clientY
    s.targetX = e.clientX - dm.offsetX
    s.targetY = e.clientY - dm.offsetY

    // Drop position calculation
    const colEls = document.querySelectorAll('[data-col-id]')
    let found = false
    for (const colEl of colEls) {
      const r = colEl.getBoundingClientRect()
      if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
        const hColId  = colEl.getAttribute('data-col-id')!
        const cardEls = Array.from(colEl.querySelectorAll('[data-card-id]'))
          .filter(el => el.getAttribute('data-card-id') !== dm.cardId)
        let idx = cardEls.length
        for (let i = 0; i < cardEls.length; i++) {
          const cr = cardEls[i].getBoundingClientRect()
          if (e.clientY < cr.top + cr.height / 2) { idx = i; break }
        }
        const next = { colId: hColId, index: idx }
        dropPosRef.current = next
        setDropPos(prev => (prev?.colId === next.colId && prev?.index === next.index) ? prev : next)
        found = true
        break
      }
    }
    if (!found) { dropPosRef.current = null; setDropPos(null) }
  }, [runRaf])

  const onPointerUp = useCallback(() => {
    document.body.classList.remove('is-dragging')
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }

    const dp    = dropPosRef.current
    const dm    = dragMeta.current
    const ghost = ghostRef.current
    const s     = animState.current

    // No real drag — clean up immediately
    if (!dm?.dragging) {
      if (ghost) ghost.style.display = 'none'
      dragMeta.current = null; dropPosRef.current = null
      return
    }

    // ── Find snap target in screen coordinates ────────────────
    let snapX = s.currX
    let snapY = s.currY

    if (dp) {
      const colEl = document.querySelector(`[data-col-id="${dp.colId}"]`)
      if (colEl) {
        const cardEls = Array.from(colEl.querySelectorAll('[data-card-id]'))
          .filter(el => el.getAttribute('data-card-id') !== dm.cardId)
        if (cardEls[dp.index]) {
          const r = (cardEls[dp.index] as HTMLElement).getBoundingClientRect()
          snapX = r.left; snapY = r.top
        } else if (cardEls.length > 0) {
          const r = (cardEls[cardEls.length - 1] as HTMLElement).getBoundingClientRect()
          snapX = r.left; snapY = r.bottom + 8
        } else {
          const body = colEl.querySelector('.kanban-lane-body')
          const r = (body ?? colEl).getBoundingClientRect()
          snapX = r.left + 12; snapY = r.top + 12
        }
      }
    }

    s.targetX = snapX
    s.targetY = snapY
    let frames = 0

    // ── Snap-back RAF ─────────────────────────────────────────
    function snapTick() {
      if (!ghost) return
      frames++

      s.currX  += (s.targetX - s.currX) * 0.28
      s.currY  += (s.targetY - s.currY) * 0.28
      s.tilt   += (0         - s.tilt)  * 0.25
      s.scale  += (1.0       - s.scale) * 0.25
      s.vx     *= 0.7

      ghost.style.transform =
        `translate3d(${s.currX}px,${s.currY}px,0) rotate(${s.tilt}deg) scale(${s.scale})`

      const done =
        frames > 45 ||
        (Math.abs(s.targetX - s.currX) < 1.5 &&
         Math.abs(s.targetY - s.currY) < 1.5 &&
         Math.abs(s.tilt) < 0.3)

      if (!done) {
        rafRef.current = requestAnimationFrame(snapTick)
        return
      }

      // ── Commit drop ───────────────────────────────────────
      ghost.style.display = 'none'

      if (dp && dm && activeBoard) {
        // Capture card & column info before state update for notification
        const fromCol = displayColumns.find(c => c.items.some(i => i.id === dm.cardId))
        const toCol = displayColumns.find(c => c.id === dp.colId)
        const movedCard = fromCol?.items.find(i => i.id === dm.cardId)

        // Helper to commit the move
        const commitMove = () => {
          if (activeBoard.type === 'production') {
            const cardId = dm.cardId
            const destCol = displayColumns.find(c => c.id === dp.colId)
            if (destCol?.systemKey) setProdCardState(shopId, cardId, { column_system_key: destCol.systemKey }).catch(() => {})
            setLocalColumns(prev => {
              const cols = prev ?? displayColumns
              const fc = cols.find(c => c.items.some(i => i.id === cardId))
              if (!fc) return cols
              const moving = fc.items.find(i => i.id === cardId)
              if (!moving) return cols
              return cols.map(col => {
                let items = col.items.filter(i => i.id !== cardId)
                if (col.id === dp.colId) {
                  items = [...items.slice(0, dp.index), { ...moving }, ...items.slice(dp.index)]
                }
                return { ...col, items }
              })
            })
          } else {
            dbMoveCard(shopId, dm.cardId, dp.colId, dp.index).then(() => refetchColumns()).catch(() => {})
            // Optimistic local update
            setLocalColumns(prev => {
              const cols = prev ?? displayColumns
              const fc = cols.find(c => c.items.some(i => i.id === dm!.cardId))
              if (!fc) return cols
              const moving = fc.items.find(i => i.id === dm!.cardId)
              if (!moving) return cols
              return cols.map(col => {
                let items = col.items.filter(i => i.id !== dm!.cardId)
                if (col.id === dp!.colId) {
                  items = [...items.slice(0, dp!.index), { ...moving }, ...items.slice(dp!.index)]
                }
                return { ...col, items }
              })
            })
          }
          // Fire notification when card moves to a different column
          if (movedCard && fromCol && toCol && fromCol.id !== toCol.id && isInAppEnabled('prodMove')) {
            addNotification(shopId, {
              type: 'info',
              title: movedCard.task,
              message: `${movedCard.owner || 'Unknown'} · ${fromCol.name} → ${toCol.name}`,
              link: '/production',
              source: 'prod_move',
            }).catch(() => {})
          }
        }

        // Block moving cards for Pending orders on production board
        if (activeBoard.type === 'production' && fromCol?.id !== toCol?.id) {
          getOrderById(shopId, dm.cardId).then(orderData => {
            if (orderData && orderData.status === 'Pending') {
              showToast('Order must be Confirmed before moving in production')
            } else {
              commitMove()
            }
            dragMeta.current = null; dropPosRef.current = null; rafRef.current = null
            setDraggingId(null); setDropPos(null)
          }).catch(() => {
            commitMove()
            dragMeta.current = null; dropPosRef.current = null; rafRef.current = null
            setDraggingId(null); setDropPos(null)
          })
          return // exit early; cleanup happens in .then()
        }

        commitMove()
      }

      dragMeta.current   = null
      dropPosRef.current = null
      rafRef.current     = null
      setDraggingId(null)
      setDropPos(null)
    }

    rafRef.current = requestAnimationFrame(snapTick)
  }, [onPointerMove, activeBoard])

  const handlePointerDown = useCallback((e: React.PointerEvent, item: KanbanItem) => {
    const el   = e.currentTarget as HTMLElement
    const rect = el.getBoundingClientRect()
    const offsetX = e.clientX - rect.left
    const offsetY = e.clientY - rect.top

    dragMeta.current = {
      cardId: item.id, offsetX, offsetY, cardWidth: rect.width,
      startX: e.clientX, startY: e.clientY, dragging: false,
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }, [onPointerMove, onPointerUp])

  useEffect(() => () => {
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    document.body.classList.remove('is-dragging')
  }, [onPointerMove, onPointerUp])

  /* ── Card actions ── */
  async function handleAddCard(colId: string) {
    if (!activeBoard || activeBoard.type === 'production') return
    await dbCreateCard(shopId, {
      board_id:     activeBoard.id,
      column_id:    colId,
      position:     999,
      task:         'New task',
      priority:     'medium',
      owner:        'You',
      due:          new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      tags:         [],
      description:  '',
      assignees:    ['You'],
    })
    refetchColumns()
  }

  async function handleAddColumn(name: string) {
    if (!activeBoard || activeBoard.type === 'production') return
    await dbAddColumn(shopId, activeBoard.id, name)
    refetchColumns()
  }

  async function handleCardUpdate(id: string, updates: Partial<KanbanItem>) {
    if (!activeBoard) return

    // Handle status change (move card to different column)
    const statusVal = (updates as Record<string, unknown>).status as string | undefined
    if (statusVal) {
      const targetCol = displayColumns.find(c => c.name === statusVal)
      if (targetCol) {
        const currentCol = displayColumns.find(c => c.items.some(i => i.id === id))
        if (currentCol && currentCol.id !== targetCol.id) {
          // Block moving Pending orders on production board
          if (activeBoard.type === 'production') {
            const orderData = await getOrderById(shopId, id)
            if (orderData && orderData.status === 'Pending') {
              showToast('Order must be Confirmed before moving in production')
              return
            }
          }
          if (activeBoard.type === 'production') {
            // Production board: move in local state + persist column override
            const card = currentCol.items.find(i => i.id === id)
            if (card) {
              setLocalColumns(prev => (prev ?? displayColumns).map(col => {
                if (col.id === currentCol.id) return { ...col, items: col.items.filter(i => i.id !== id) }
                if (col.id === targetCol.id) return { ...col, items: [...col.items, card] }
                return col
              }))
              if (targetCol.systemKey) setProdCardState(shopId, id, { column_system_key: targetCol.systemKey }).catch(() => {})
            }
          } else {
            // Team board: persist via Supabase
            dbMoveCard(shopId, id, targetCol.id, targetCol.items.length).then(() => refetchColumns()).catch(() => {})
          }
          setActiveCardCol(targetCol.name)
          const movedCard = currentCol.items.find(i => i.id === id)
          if (movedCard && isInAppEnabled('prodMove')) {
            addNotification(shopId, {
              type: 'info',
              title: movedCard.task,
              message: `${movedCard.owner || 'Unknown'} · ${currentCol.name} → ${targetCol.name}`,
              link: '/production',
              source: 'prod_move',
            }).catch(() => {})
          }
        }
      }
      const { status, ...rest } = updates as Record<string, unknown>
      if (Object.keys(rest).length === 0) return
      updates = rest as Partial<KanbanItem>
    }

    // Map camelCase to snake_case for DB
    const dbUpdates: Record<string, unknown> = {}
    if (updates.task !== undefined) dbUpdates.task = updates.task
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority
    if (updates.owner !== undefined) dbUpdates.owner = updates.owner
    if (updates.due !== undefined) dbUpdates.due = updates.due
    if (updates.tags !== undefined) dbUpdates.tags = updates.tags
    if (updates.description !== undefined) dbUpdates.description = updates.description
    if (updates.proofStatus !== undefined) dbUpdates.proof_status = updates.proofStatus
    if (updates.assignees !== undefined) dbUpdates.assignees = updates.assignees

    if (activeBoard.type !== 'production' && Object.keys(dbUpdates).length > 0) {
      dbUpdateCard(shopId, id, dbUpdates as Parameters<typeof dbUpdateCard>[2]).then(() => refetchColumns()).catch(() => {})
    }

    if (activeCard?.id === id) {
      setActiveCard(prev => prev ? { ...prev, ...updates } : prev)
    }
    if (activeBoard.type !== 'production') {
      // Will be refreshed by refetchColumns above
    } else {
      // Persist any proofStatus change for production board cards
      if ((updates as Record<string, unknown>).proofStatus) {
        setProdCardState(shopId, id, { proof_status: (updates as Record<string, unknown>).proofStatus as string }).catch(() => {})
      }
      setLocalColumns(prev =>
        (prev ?? displayColumns).map(col => ({
          ...col,
          items: col.items.map(i => i.id === id ? { ...i, ...updates } : i),
        }))
      )
    }
  }

  /* ── Column rename ── */
  async function handleColRenameCommit() {
    if (!activeBoard || !renamingColId) return
    const trimmed = renamingColName.trim()
    if (trimmed) {
      await dbRenameColumn(shopId, renamingColId, trimmed)
      refetchColumns()
    }
    setRenamingColId(null)
    setRenamingColName('')
  }

  /* ── Filtered columns ── */
  const applyProofFilter = (items: typeof displayColumns[0]['items']) =>
    filterProof === 'All' ? items : items.filter(i => (i.proofStatus ?? 'none') === filterProof)

  const visibleColumns = displayColumns
    .filter(c => filterStatus === 'All' || c.id === filterStatus || c.name === filterStatus)
    .map(c => ({ ...c, items: applyProofFilter(c.items) }))

  /* ── Ghost card ── */
  const ghostCard = draggingId
    ? displayColumns.flatMap(c => c.items).find(i => i.id === draggingId)
    : null

  const subtitle = activeBoard?.name ?? 'No board selected'

  return (
    <AppShell>
      {/* ── Page header ── */}
      <div className="page-header">
        <div>
          <div className="page-title">Production</div>
          <div className="page-subtitle">{subtitle}</div>
        </div>
        <div className="page-actions">
          <DateRangePicker />
          <button className="topbar-btn">
            <ExportIcon /><span>Export</span>
          </button>
        </div>
      </div>

      {/* ── Board area ── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden', flexDirection: 'column' }}>

        {/* ── Toolbar ── */}
        <div style={{
          padding: '10px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          gap: 10,
          flexWrap: 'wrap',
        }}>
          {/* Left: view toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', background: 'var(--bg, #f1f5f9)', borderRadius: 6, padding: 2, gap: 2, flexShrink: 0 }}>
              {(['board', 'list'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '4px 12px', borderRadius: 4, fontSize: 12, fontWeight: 600,
                    background: view === v ? 'var(--bg-card)' : 'transparent',
                    color: view === v ? 'var(--text-primary)' : 'var(--text-secondary)',
                    boxShadow: view === v ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                    border: 'none', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'var(--font)',
                  }}
                >
                  {v === 'board' ? <BoardSVG /> : <ListSVG />}
                  {v === 'board' ? 'Board' : 'List'}
                </button>
              ))}
            </div>
          </div>

          {/* Right: Status + Proof + Sort */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>

            {/* All Statuses custom dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => { setStatusOpen(v => !v); setProofOpen(false); setSortOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px',
                  borderRadius: 6, fontSize: 12, fontWeight: 500,
                  border: '1px solid var(--border)', background: 'var(--bg-card)',
                  color: filterStatus === 'All' ? 'var(--text-secondary)' : 'var(--text-primary)',
                  cursor: 'pointer', fontFamily: 'var(--font)',
                }}
              >
                {filterStatus === 'All' ? 'All Statuses' : (displayColumns.find(c => c.id === filterStatus)?.name ?? filterStatus)}
                <ChevDownSVG />
              </button>
              {statusOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 4px)', right: 0,
                  background: 'var(--bg-card)', borderRadius: 8,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)', border: '1px solid var(--border)',
                  zIndex: 50, minWidth: 180, padding: 6,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 8px 6px' }}>
                    Filter by status
                  </div>
                  {(['All', ...displayColumns.map(c => c.id)] as string[]).map(id => {
                    const label = id === 'All' ? 'All Statuses' : (displayColumns.find(c => c.id === id)?.name ?? id)
                    const isActive = filterStatus === id
                    return (
                      <button
                        key={id}
                        onClick={() => { setFilterStatus(id); setStatusOpen(false) }}
                        style={{
                          display: 'block', width: '100%', textAlign: 'left',
                          fontSize: 12, padding: '5px 8px', borderRadius: 4,
                          background: isActive ? 'rgba(0,106,255,0.08)' : 'transparent',
                          color: isActive ? 'var(--accent)' : 'var(--text-primary)',
                          fontWeight: isActive ? 600 : 400, border: 'none',
                          cursor: 'pointer', fontFamily: 'var(--font)',
                        }}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Proof Status custom dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => { setProofOpen(v => !v); setStatusOpen(false); setSortOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px',
                  borderRadius: 6, fontSize: 12, fontWeight: 500,
                  border: '1px solid var(--border)', background: 'var(--bg-card)',
                  color: filterProof === 'All' ? 'var(--text-secondary)' : 'var(--text-primary)',
                  cursor: 'pointer', fontFamily: 'var(--font)',
                }}
              >
                {({ All: 'Proof Status', none: 'No action', artwork_proof_generated: 'Proof Generated', sent: 'Sent', changes_requested: 'Changes', approved: 'Approved' } as Record<string,string>)[filterProof]}
                <ChevDownSVG />
              </button>
              {proofOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 4px)', right: 0,
                  background: 'var(--bg-card)', borderRadius: 8,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)', border: '1px solid var(--border)',
                  zIndex: 50, minWidth: 160, padding: 6,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 8px 6px' }}>
                    Proof status
                  </div>
                  {([
                    { value: 'All',                     label: 'All' },
                    { value: 'none',                     label: 'No action' },
                    { value: 'artwork_proof_generated',  label: 'Proof Generated' },
                    { value: 'sent',                     label: 'Sent' },
                    { value: 'changes_requested',        label: 'Changes' },
                    { value: 'approved',                 label: 'Approved' },
                  ] as { value: typeof filterProof; label: string }[]).map(({ value, label }) => {
                    const isActive = filterProof === value
                    return (
                      <button
                        key={value}
                        onClick={() => { setFilterProof(value); setProofOpen(false) }}
                        style={{
                          display: 'block', width: '100%', textAlign: 'left',
                          fontSize: 12, padding: '5px 8px', borderRadius: 4,
                          background: isActive ? 'rgba(0,106,255,0.08)' : 'transparent',
                          color: isActive ? 'var(--accent)' : 'var(--text-primary)',
                          fontWeight: isActive ? 600 : 400, border: 'none',
                          cursor: 'pointer', fontFamily: 'var(--font)',
                        }}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Sort */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => { setSortOpen(v => !v); setStatusOpen(false); setProofOpen(false) }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 500,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font)',
                }}
              >
                <SortSVG />
                Sort: {{ due: 'Due date', priority: 'Priority', created: 'Created' }[sortBy]}
              </button>
              {sortOpen && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  right: 0,
                  background: 'var(--bg-card)',
                  borderRadius: 8,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  border: '1px solid var(--border)',
                  zIndex: 50,
                  minWidth: 170,
                  padding: 6,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 8px 6px' }}>
                    Sort by
                  </div>
                  {(['due', 'priority', 'created'] as const).map(s => {
                    const labels = { due: 'Due date', priority: 'Priority', created: 'Created' }
                    const isActive = sortBy === s
                    return (
                      <button
                        key={s}
                        onClick={() => { setSortBy(s); setSortOpen(false) }}
                        style={{
                          display: 'block',
                          width: '100%',
                          textAlign: 'left',
                          fontSize: 12,
                          padding: '5px 8px',
                          borderRadius: 4,
                          background: isActive ? 'rgba(0,106,255,0.08)' : 'transparent',
                          color: isActive ? 'var(--accent)' : 'var(--text-primary)',
                          fontWeight: isActive ? 600 : 400,
                          border: 'none',
                          cursor: 'pointer',
                          fontFamily: 'var(--font)',
                        }}
                      >
                        {labels[s]}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Scrollable board/list content ── */}
        <div className="page-scroll" style={{ padding: '14px 0' }}>

          {/* ══ BOARD VIEW ══ */}
          {view === 'board' && (
            <div className="kanban-board">
              {visibleColumns.map(col => (
                <div key={col.id} style={{ position: 'relative' }}>
                  {renamingColId === col.id ? (
                    <div className="kanban-lane" style={{ minHeight: 0, gap: 8, padding: '10px 12px' }}>
                      <input
                        autoFocus
                        value={renamingColName}
                        onChange={e => setRenamingColName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleColRenameCommit()
                          if (e.key === 'Escape') { setRenamingColId(null); setRenamingColName('') }
                        }}
                        onBlur={handleColRenameCommit}
                        style={{
                          width: '100%',
                          padding: '5px 8px',
                          borderRadius: 6,
                          border: '1px solid var(--accent)',
                          fontSize: 12,
                          fontFamily: 'var(--font)',
                          background: 'var(--bg-card)',
                          color: 'var(--text-primary)',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  ) : (
                    <KanbanColumn
                      column={col}
                      draggingId={draggingId}
                      dropOver={dropPos ? { colId: dropPos.colId, index: dropPos.index } : null}
                      isProduction={activeBoard?.type === 'production'}
                      onCardClick={item => {
                        setActiveCard(item)
                        setActiveCardCol(col.name)
                        setModalOpen(true)
                      }}
                      onCardPointerDown={(e, item) => handlePointerDown(e, item)}
                      onColPointerEnter={() => {
                        if (dragMeta.current && dropPosRef.current) {
                          setDropPos(prev => prev?.colId === col.id ? prev : { colId: col.id, index: 0 })
                        }
                      }}
                      onRenameColumn={colId => {
                        setRenamingColId(colId)
                        setRenamingColName(displayColumns.find(c => c.id === colId)?.name ?? '')
                      }}
                      onDeleteColumn={async colId => {
                        await dbDeleteColumn(shopId, colId)
                        if (activeBoard && activeBoard.type !== 'production') {
                          refetchColumns()
                        }
                      }}
                      onPermissionsColumn={() => {}}
                      onAddCard={handleAddCard}
                      onDeleteCard={cardId => {
                        const deletedCard = displayColumns.flatMap(c => c.items).find(i => i.id === cardId)
                        setLocalColumns(prev =>
                          (prev ?? displayColumns).map(c => ({ ...c, items: c.items.filter(i => i.id !== cardId) }))
                        )
                        addNotification(shopId, {
                          type: 'danger',
                          title: `Card ${deletedCard?.task ?? cardId} deleted`,
                          message: `Production card #${cardId}${deletedCard ? ` (${deletedCard.task})` : ''} has been removed from the board.`,
                          link: '/production',
                        }).catch(() => {})
                        showToast('Card deleted')
                      }}
                    />
                  )}
                </div>
              ))}

              {activeBoard?.type !== 'production' && (
                <AddColumnButton onAdd={handleAddColumn} />
              )}
            </div>
          )}

          {/* ══ LIST VIEW ══ */}
          {view === 'list' && (
            <ProductionListView
              columns={displayColumns}
              filterStatus={filterStatus}
              filterPriority="All"
              sortBy={sortBy}
              onCardClick={item => {
                const col = displayColumns.find(c => c.items.some(i => i.id === item.id))
                setActiveCard(item)
                setActiveCardCol(col?.name ?? '')
                setModalOpen(true)
              }}
            />
          )}
        </div>
      </div>

      {/* ── Drag ghost ── */}
      <div ref={ghostRef} className="kanban-drag-ghost">
        {ghostCard && (() => {
          const urgent = isUrgent(ghostCard.due)
          const ps = ghostCard.proofStatus ?? 'none'
          const proofCfg = GHOST_PROOF[ps]
          const priCfg = GHOST_PRIORITY[ghostCard.priority]
          return (
            <>
              {/* ROW 1 — Badges */}
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                {urgent && <span style={{ width:7, height:7, borderRadius:'50%', background:'#ef4444', boxShadow:'0 0 0 2px rgba(239,68,68,0.2)', flexShrink:0 }} />}
                {ghostCard.priority !== 'low' && priCfg && (
                  <span style={{ fontSize:9, fontWeight:600, padding:'1px 5px', borderRadius:3, background:priCfg.bg, color:priCfg.color }}>
                    {ghostCard.priority}
                  </span>
                )}
                {proofCfg && (
                  <span style={{ fontSize:9, fontWeight:600, padding:'1px 5px', borderRadius:3, background:proofCfg.bg, color:proofCfg.color, border:`1px solid ${proofCfg.border}` }}>
                    {proofCfg.label}
                  </span>
                )}
              </div>
              {/* ROW 2 — ID */}
              <div style={{ fontSize:10, fontWeight:600, color:'var(--text-muted)', letterSpacing:'0.02em', lineHeight:1 }}>#{ghostCard.id}</div>
              {/* ROW 3 — Title */}
              <div style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)', lineHeight:1.3, marginTop:1, marginBottom:1, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>{ghostCard.task}</div>
              {/* ROW 4 — Description */}
              {ghostCard.description && (
                <div style={{ fontSize:10, color:'var(--text-muted)', lineHeight:1.3, marginTop:1, marginBottom:6, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:1, WebkitBoxOrient:'vertical' }}>{ghostCard.description}</div>
              )}
              {/* ROW 5 — Meta */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:3, fontSize:10, fontWeight:500, color:'var(--text-muted)' }}>
                  {formatAnyDate(ghostCard.due)}
                </div>
                <div style={{ display:'flex', alignItems:'center' }}>
                  {(ghostCard.assignees ?? [ghostCard.owner]).slice(0,3).map((name, i) => (
                    <div key={name+i} style={{ width:18, height:18, borderRadius:'50%', background:'var(--border, #e2e8f0)', border:'1.5px solid var(--bg-card)', fontSize:8, fontWeight:700, color:'var(--text-secondary)', display:'flex', alignItems:'center', justifyContent:'center', marginLeft:i===0?0:-4, flexShrink:0 }}>
                      {name[0]}
                    </div>
                  ))}
                </div>
              </div>
              {/* Divider */}
              <div style={{ height:1, background:'var(--border)', margin:'2px 0' }} />
              {/* ROW 6 — Footer */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', fontSize:10, fontWeight:500, color:'var(--text-muted)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:4 }}><GhostChatIcon />{ghostCard.comments}</div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:4 }}><GhostGlobeIcon />{ghostCard.links}</div>
                  <div style={{ display:'flex', alignItems:'center', gap:4 }}><GhostLinkIcon />{ghostCard.files}</div>
                </div>
              </div>
            </>
          )
        })()}
      </div>

      {/* ── Card modal ── */}
      {modalOpen && activeCard && (
        <CardModal
          item={activeCard}
          columnName={activeCardCol}
          isProduction={activeBoard?.type === 'production'}
          columns={displayColumns.map(c => ({ id: c.id, name: c.name }))}
          onClose={() => setModalOpen(false)}
          onUpdate={handleCardUpdate}
        />
      )}
    </AppShell>
  )
}

/* ── Page export wrapped in Suspense ────────────────── */
export default function ProductionPage() {
  return (
    <Suspense>
      <ProductionContent />
    </Suspense>
  )
}
