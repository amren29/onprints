'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import type { KanbanItem, ProofVersion, OrderAsset, Jobsheet, HistoryEntry } from './types'
import {
  formatAnyDate, getCalendarCells, WEEKDAYS, teamOptions,
  PROOF_STATUS_BADGE, TONE_COLOR, formatTime,
  generateJobsheetTxt, generateJobsheetHtml,
} from './utils'
import { saveProofLink, syncCardProofLinks, getCardProofDataAsync } from '@/lib/proof-store'
import { type Order } from '@/lib/order-store'
import { getOrderById as dbGetOrderById } from '@/lib/db/orders'
import { addNotification as dbAddNotification } from '@/lib/db/notifications'
import { useShop } from '@/providers/shop-provider'
import { showToast } from '@/lib/toast'

/* ── Icons ─────────────────────────────────────────────── */
const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)
const ExternalIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
    <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
)
const CircleIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10"/>
  </svg>
)
const ChevDownIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
)
const CalIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)
const FlagIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
  </svg>
)
const PersonIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
)
const StatusIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
)
const UploadIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
)
const AtIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 006 0v-1a10 10 0 10-3.92 7.94"/>
  </svg>
)
const PaperclipIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
  </svg>
)
const SendIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
)
const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
  </svg>
)
const CopyIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
  </svg>
)
const ChevLeftIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
)
const ChevRightIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 6 15 12 9 18"/>
  </svg>
)
const FileIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
  </svg>
)
const CheckSquareIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
  </svg>
)
const SquareIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
  </svg>
)
const DownloadIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
)
const PrinterIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
  </svg>
)
const LinkIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
  </svg>
)
const EyeIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
)

/* ── Priority colour map ──────────────────────────────── */
const PRIORITY_COLOR: Record<string, string> = {
  high:   '#ef4444',
  medium: '#f59e0b',
  low:    '#006AFF',
}

/* ── Props ───────────────────────────────────────────── */
interface Props {
  item: KanbanItem
  columnName: string
  isProduction: boolean
  columns?: { id: string; name: string }[]
  onClose: () => void
  onUpdate: (id: string, updates: Partial<KanbanItem>) => void
}

/* ── Component ───────────────────────────────────────── */
export default function CardModal({ item, columnName, isProduction, columns, onClose, onUpdate }: Props) {
  const { shopId } = useShop()

  /* ── Description ── */
  const [editDescription, setEditDescription] = useState(item.description ?? '')

  /* ── Mount guard ── */
  const [mounted, setMounted] = useState(false)

  /* ── Dropdowns ── */
  const [statusOpen, setStatusOpen]     = useState(false)
  const [priorityOpen, setPriorityOpen] = useState(false)
  const [assigneeOpen, setAssigneeOpen] = useState(false)

  /* ── Calendar ── */
  const [openPicker, setOpenPicker]       = useState<'start' | 'due' | null>(null)
  const [calendarMonth, setCalendarMonth] = useState(new Date())

  /* ── Proofing ── */
  const [proofVersions, setProofVersions]     = useState<ProofVersion[]>(item.proofVersions ?? [])
  const [pendingFiles, setPendingFiles]       = useState<File[]>([])
  const [proofDescription, setProofDescription] = useState('')
  const [previewFile, setPreviewFile]         = useState<{ url: string; name: string; version: ProofVersion } | null>(null)
  const [updatingVersionId, setUpdatingVersionId] = useState<string | null>(null)
  const [expandedAmendId, setExpandedAmendId] = useState<string | null>(null)
  const [copiedVersionId, setCopiedVersionId]  = useState<string | null>(null)

  /* ── Original files ── */
  const [assets, setAssets]           = useState<OrderAsset[]>(item.orderAssets ?? [])
  const [linkInput, setLinkInput]     = useState('')
  const [showLinkInput, setShowLinkInput] = useState(false)

  /* ── Subtasks ── */
  const [subtasks, setSubtasks]             = useState(item.subtasks ?? [])
  const [newSubtaskText, setNewSubtaskText] = useState('')
  const [showSubtaskInput, setShowSubtaskInput] = useState(false)

  /* ── Comments / Activity ── */
  const [commentText, setCommentText]       = useState('')
  const [comments, setComments]             = useState(item.commentsData ?? [])
  const [showMentionMenu, setShowMentionMenu] = useState(false)
  const [mentionQuery, setMentionQuery]     = useState('')
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>(item.historyEntries ?? [])

  /* ── Jobsheets ── */
  const [jobsheets, setJobsheets] = useState<Jobsheet[]>(item.jobsheets ?? [])
  const [viewingJobsheetId, setViewingJobsheetId] = useState<string | null>(null)
  const [order, setOrder] = useState<Order | null>(null)

  /* ── Refs ── */
  const proofInputRef   = useRef<HTMLInputElement>(null)
  const assetInputRef   = useRef<HTMLInputElement>(null)
  const commentInputRef = useRef<HTMLTextAreaElement>(null)
  const commentsEndRef  = useRef<HTMLDivElement>(null)

  /* ── Effects ── */

  // Mount + load order data
  useEffect(() => {
    setMounted(true)
    if (isProduction && shopId) {
      dbGetOrderById(shopId, item.id).then(dbOrd => {
        if (dbOrd) {
          // Map DB order to Order shape for jobsheet generation
          setOrder({
            id: dbOrd.seq_id ?? dbOrd.id,
            customer: dbOrd.customer_name,
            customerRef: '',
            agent: dbOrd.agent_name,
            status: dbOrd.status as any,
            production: dbOrd.production as any,
            created: dbOrd.created_at,
            dueDate: dbOrd.due_date,
            deliveryMethod: dbOrd.delivery_method as any,
            deliveryAddress: dbOrd.delivery_address,
            notes: dbOrd.notes,
            source: dbOrd.source as any,
            items: (dbOrd.items ?? []) as any[],
            payments: (dbOrd.payments ?? []) as any[],
            timeline: (dbOrd.timeline ?? []) as any[],
            discount: dbOrd.discount,
            discountType: dbOrd.discount_type as any,
            sstEnabled: dbOrd.sst_enabled,
            sstRate: dbOrd.sst_rate,
            sstAmount: dbOrd.sst_amount,
            rounding: dbOrd.rounding,
            shippingCost: dbOrd.shipping_cost,
            subtotal: dbOrd.subtotal,
            grandTotal: dbOrd.grand_total,
            currency: dbOrd.currency as any,
          })
        }
      }).catch(() => {})
    }
  }, [item.id, isProduction])

  // Escape key with capture phase — close innermost first
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (previewFile) { e.stopPropagation(); setPreviewFile(null); return }
      if (pendingFiles.length > 0) { e.stopPropagation(); setPendingFiles([]); setProofDescription(''); setUpdatingVersionId(null); return }
      if (openPicker) { e.stopPropagation(); setOpenPicker(null); return }
      if (statusOpen || priorityOpen || assigneeOpen) { e.stopPropagation(); closeAllDropdowns(); return }
      if (showMentionMenu) { e.stopPropagation(); setShowMentionMenu(false); return }
      onClose()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose, previewFile, pendingFiles, openPicker, statusOpen, priorityOpen, assigneeOpen, showMentionMenu])

  // Sync on item change
  useEffect(() => {
    setEditDescription(item.description ?? '')
    setComments(item.commentsData ?? [])
    setSubtasks(item.subtasks ?? [])
    setProofVersions(item.proofVersions ?? [])
    setAssets(item.orderAssets ?? [])
    setHistoryEntries(item.historyEntries ?? [])
    setJobsheets(item.jobsheets ?? [])

    // Hydrate blob data (idb: refs → actual data URLs) for artwork images
    getCardProofDataAsync(item.id).then(hydrated => {
      if (hydrated) {
        setProofVersions(hydrated.proofVersions)
        setJobsheets(hydrated.jobsheets)
        setHistoryEntries(hydrated.historyEntries)
      }
    })
  }, [item.id])

  // Sync card proofStatus badge whenever proof versions change
  useEffect(() => {
    if (proofVersions.length === 0) return
    const active = [...proofVersions].reverse().find(v => v.status !== 'AMEND_DONE')
    if (!active) return
    const statusMap: Record<string, KanbanItem['proofStatus']> = {
      APPROVED:        'approved',
      AMEND_REQUESTED: 'changes_requested',
      SENT:            'sent',
      GENERATED:       'artwork_proof_generated',
    }
    const derived = statusMap[active.status]
    if (derived && derived !== item.proofStatus) {
      onUpdate(item.id, { proofStatus: derived })
      // Auto-move column based on version status
      if (active.status === 'APPROVED') {
        ;(onUpdate as unknown as (id: string, u: Record<string, unknown>) => void)(
          item.id, { status: 'Ready for Print' }
        )
      } else if (active.status === 'AMEND_REQUESTED') {
        ;(onUpdate as unknown as (id: string, u: Record<string, unknown>) => void)(
          item.id, { status: 'Refine' }
        )
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proofVersions])

  // Toast auto-dismiss
  useEffect(() => {
    if (!copiedVersionId) return
    const t = setTimeout(() => setCopiedVersionId(null), 2000)
    return () => clearTimeout(t)
  }, [copiedVersionId])

  /* ── Helpers ── */

  const closeAllDropdowns = useCallback(() => {
    setStatusOpen(false)
    setPriorityOpen(false)
    setAssigneeOpen(false)
  }, [])

  const assignees = item.assignees && item.assignees.length > 0 ? item.assignees : []

  // Persist proofing state back to parent
  function persistProofing(
    newVersions: ProofVersion[],
    newJobsheets: Jobsheet[],
    newHistory: HistoryEntry[],
  ) {
    setProofVersions(newVersions)
    setJobsheets(newJobsheets)
    setHistoryEntries(newHistory)
    onUpdate(item.id, {
      proofVersions: newVersions,
      jobsheets: newJobsheets,
      historyEntries: newHistory,
    })
    // Sync all proof-link records for this card
    syncCardProofLinks(item.id, item.task, newVersions, newJobsheets, newHistory)
  }

  function addHistoryEntry(action: string, tone: 'info' | 'success' | 'warning' | 'neutral'): HistoryEntry {
    return {
      id: `HIS-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      action,
      tone,
      createdAt: new Date().toISOString(),
    }
  }

  /* ── Calendar handlers ── */

  function openCalendar(which: 'start' | 'due') {
    closeAllDropdowns()
    const currentDate = which === 'start' ? item.startDate : item.due
    if (currentDate) {
      const d = new Date(currentDate)
      if (!isNaN(d.getTime())) setCalendarMonth(new Date(d.getFullYear(), d.getMonth(), 1))
    } else {
      setCalendarMonth(new Date())
    }
    setOpenPicker(which)
  }

  function selectDate(day: number) {
    if (!openPicker) return
    const y = calendarMonth.getFullYear()
    const m = calendarMonth.getMonth()
    const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    if (openPicker === 'start') {
      onUpdate(item.id, { startDate: iso })
    } else {
      onUpdate(item.id, { due: iso })
    }
    setOpenPicker(null)
  }

  function setQuickDate(daysFromNow: number) {
    if (!openPicker) return
    const d = new Date(Date.now() + daysFromNow * 86400000)
    const iso = d.toISOString().slice(0, 10)
    if (openPicker === 'start') {
      onUpdate(item.id, { startDate: iso })
    } else {
      onUpdate(item.id, { due: iso })
    }
    setOpenPicker(null)
  }

  function clearDate() {
    if (!openPicker) return
    if (openPicker === 'start') {
      onUpdate(item.id, { startDate: '' })
    } else {
      onUpdate(item.id, { due: '' })
    }
    setOpenPicker(null)
  }

  /* ── Proofing handlers ── */

  function handleProofFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length > 0) setPendingFiles(files)
    e.target.value = ''
  }

  /** Convert a File to a base64 data URL so it persists in localStorage */
  function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.readAsDataURL(file)
    })
  }

  async function handleUploadProof() {
    if (pendingFiles.length === 0) return
    const nextVersion = proofVersions.length + 1
    const tokenHash = Math.random().toString(36).slice(2, 10)
    const proofLink = `${window.location.origin}/proofing/${tokenHash}`
    const fileEntries = await Promise.all(pendingFiles.map(async f => ({ name: f.name, url: await fileToDataUrl(f) })))
    const newVersion: ProofVersion = {
      id: `PV-${Date.now()}`,
      versionNo: nextVersion,
      status: 'GENERATED' as const,
      files: fileEntries,
      description: proofDescription || undefined,
      createdAt: new Date().toISOString(),
      proofLink,
    }
    const all = [...proofVersions, newVersion]
    const hist = addHistoryEntry(`Proof v${nextVersion} uploaded — awaiting link copy`, 'info')
    const newHistory = [...historyEntries, hist]
    persistProofing(all, jobsheets, newHistory)
    onUpdate(item.id, { proofStatus: 'artwork_proof_generated' })
    // Save proof link for public proofing page
    saveProofLink({
      token: tokenHash,
      cardId: item.id,
      taskName: item.task,
      proofVersion: newVersion,
      allVersions: all,
      jobsheets,
      historyEntries: newHistory,
    })
    if (shopId) dbAddNotification(shopId, {
      type: 'info',
      title: `Proof v${nextVersion} generated for ${item.task}`,
      message: `Proof version ${nextVersion} is ready. Copy the link to send it to the client.`,
      link: '/production',
    }).catch(() => {})
    showToast(`Proof v${nextVersion} uploaded — copy the link to send`)
    setPendingFiles([])
    setProofDescription('')
  }

  async function handleUpdateProof() {
    if (pendingFiles.length === 0 || !updatingVersionId) return
    const oldVer = proofVersions.find(v => v.id === updatingVersionId)
    if (!oldVer) return
    const nextVersion = proofVersions.length + 1
    const tokenHash = Math.random().toString(36).slice(2, 10)
    const proofLink = `${window.location.origin}/proofing/${tokenHash}`
    const fileEntries = await Promise.all(pendingFiles.map(async f => ({ name: f.name, url: await fileToDataUrl(f) })))
    const newVersion: ProofVersion = {
      id: `PV-${Date.now()}`,
      versionNo: nextVersion,
      status: 'GENERATED' as const,
      files: fileEntries,
      description: proofDescription || undefined,
      createdAt: new Date().toISOString(),
      proofLink,
    }
    const updated = proofVersions.map(v =>
      v.id === updatingVersionId ? { ...v, status: 'AMEND_DONE' as const } : v
    )
    const all = [...updated, newVersion]
    const hist1 = addHistoryEntry(`Proof v${oldVer.versionNo} marked as amend done`, 'neutral')
    const hist2 = addHistoryEntry(`Proof v${nextVersion} uploaded — awaiting link copy`, 'info')
    const newHistory = [...historyEntries, hist1, hist2]
    persistProofing(all, jobsheets, newHistory)
    onUpdate(item.id, { proofStatus: 'artwork_proof_generated' })
    // Save proof link for public proofing page
    saveProofLink({
      token: tokenHash,
      cardId: item.id,
      taskName: item.task,
      proofVersion: newVersion,
      allVersions: all,
      jobsheets,
      historyEntries: newHistory,
    })
    if (shopId) dbAddNotification(shopId, {
      type: 'info',
      title: `Proof v${nextVersion} amended for ${item.task}`,
      message: `Revised proof v${nextVersion} is ready. Copy the link to send it to the client.`,
      link: '/production',
    }).catch(() => {})
    showToast(`Proof v${nextVersion} amended — copy the link to send`)
    setPendingFiles([])
    setProofDescription('')
    setUpdatingVersionId(null)
  }

  /* ── Jobsheet handlers ── */

  function handleDownloadJobsheet(js: Jobsheet) {
    const txt = generateJobsheetTxt(js, order ?? undefined, { priority: item.priority, dueDate: item.due })
    const blob = new Blob([txt], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${js.id}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handlePrintJobsheet(js: Jobsheet) {
    const html = generateJobsheetHtml(js, order ?? undefined, { priority: item.priority, dueDate: item.due })
    const w = window.open('', '_blank')
    if (w) {
      w.document.write(html)
      w.document.close()
    }
  }

  /* ── Original file handlers ── */

  function handleAssetFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    const newAssets: OrderAsset[] = files.map((f, i) => ({
      id: `AST-${Date.now()}-${i}`,
      type: 'file' as const,
      name: f.name,
      url: URL.createObjectURL(f),
      createdAt: new Date().toISOString(),
    }))
    const all = [...assets, ...newAssets]
    setAssets(all)
    onUpdate(item.id, { orderAssets: all })
    e.target.value = ''
  }

  function handleAddLink() {
    const url = linkInput.trim()
    if (!url) return
    const newAsset: OrderAsset = {
      id: `AST-${Date.now()}`,
      type: 'link',
      name: url,
      url,
      createdAt: new Date().toISOString(),
    }
    const all = [...assets, newAsset]
    setAssets(all)
    onUpdate(item.id, { orderAssets: all })
    setLinkInput('')
    setShowLinkInput(false)
  }

  function handleDeleteAsset(id: string) {
    const all = assets.filter(a => a.id !== id)
    setAssets(all)
    onUpdate(item.id, { orderAssets: all })
  }

  /* ── Subtask handlers ── */

  function handleToggleSubtask(id: string) {
    const updated = subtasks.map(s => s.id === id ? { ...s, completed: !s.completed } : s)
    setSubtasks(updated)
    onUpdate(item.id, { subtasks: updated })
  }

  function handleAddSubtask() {
    const title = newSubtaskText.trim()
    if (!title) return
    const updated = [...subtasks, { id: `ST-${Date.now()}`, title, completed: false }]
    setSubtasks(updated)
    onUpdate(item.id, { subtasks: updated })
    setNewSubtaskText('')
  }

  function handleDeleteSubtask(id: string) {
    const updated = subtasks.filter(s => s.id !== id)
    setSubtasks(updated)
    onUpdate(item.id, { subtasks: updated })
  }

  /* ── Comment handlers ── */

  function handleCommentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    setCommentText(val)
    const lastAt = val.lastIndexOf('@')
    if (lastAt !== -1 && !val.slice(lastAt + 1).includes(' ')) {
      setMentionQuery(val.slice(lastAt + 1))
      setShowMentionMenu(true)
    } else {
      setShowMentionMenu(false)
    }
  }

  function handleMentionSelect(user: string) {
    const lastAt = commentText.lastIndexOf('@')
    setCommentText(commentText.slice(0, lastAt) + '@' + user + ' ')
    setShowMentionMenu(false)
    commentInputRef.current?.focus()
  }

  function handleAddComment() {
    const content = commentText.trim()
    if (!content) return
    const newComment = {
      id: `COM-${Date.now()}`,
      text: content,
      user: 'You',
      createdAt: new Date().toISOString(),
    }
    const updated = [...comments, newComment]
    setComments(updated)
    onUpdate(item.id, { commentsData: updated })
    if (shopId) dbAddNotification(shopId, {
      type: 'info',
      title: `New comment on ${item.task}`,
      message: `You commented: "${content.length > 60 ? content.slice(0, 60) + '...' : content}"`,
      link: '/production',
    }).catch(() => {})
    setCommentText('')
    setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  function handleCommentKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAddComment()
    }
  }

  /* ── Render helpers ── */

  function renderStatusDropdown() {
    if (!statusOpen || !columns) return null
    return (
      <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 19 }} onClick={() => setStatusOpen(false)} />
      <div style={{
        position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 20,
        background: 'var(--bg-card)', borderRadius: 8, padding: 6,
        boxShadow: 'var(--shadow-dropdown)', border: '1px solid var(--border-strong)',
        minWidth: 180,
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 8px 6px' }}>
          Move to
        </div>
        {columns.map(col => (
          <button
            key={col.id}
            onClick={() => {
              onUpdate(item.id, { status: col.name } as Partial<KanbanItem>)
              setStatusOpen(false)
            }}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              fontSize: 12, padding: '6px 8px', borderRadius: 4,
              background: col.name === columnName ? 'rgba(0,106,255,0.08)' : 'transparent',
              color: col.name === columnName ? '#006AFF' : 'var(--text-primary)',
              fontWeight: col.name === columnName ? 600 : 400,
              border: 'none', cursor: 'pointer', fontFamily: 'var(--font)',
            }}
          >
            {col.name}
          </button>
        ))}
      </div>
      </>
    )
  }

  function renderAssigneeDropdown() {
    if (!assigneeOpen) return null
    return (
      <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 19 }} onClick={() => setAssigneeOpen(false)} />
      <div style={{
        position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 20,
        background: 'var(--bg-card)', borderRadius: 8, padding: 6,
        boxShadow: 'var(--shadow-dropdown)', border: '1px solid var(--border-strong)',
        minWidth: 200,
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 8px 6px' }}>
          Assign members
        </div>
        {teamOptions.map(user => {
          const selected = assignees.includes(user)
          const initials = user.split(/\s+/).map(w => w[0]?.toUpperCase() ?? '').slice(0, 2).join('')
          return (
            <button
              key={user}
              onClick={() => {
                const updated = selected
                  ? assignees.filter(a => a !== user)
                  : [...assignees, user]
                onUpdate(item.id, { assignees: updated })
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
                fontSize: 12, padding: '6px 8px', borderRadius: 4,
                background: selected ? 'rgba(0,106,255,0.06)' : 'transparent',
                color: 'var(--text-primary)', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)',
              }}
            >
              <span style={{
                width: 22, height: 22, borderRadius: '50%',
                background: selected ? '#006AFF' : 'var(--border-strong)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: 9, fontWeight: 700, flexShrink: 0, letterSpacing: '-0.02em',
              }}>
                {initials}
              </span>
              <span style={{ fontWeight: selected ? 600 : 400 }}>{user}</span>
            </button>
          )
        })}
      </div>
      </>
    )
  }

  function renderPriorityDropdown() {
    if (!priorityOpen) return null
    return (
      <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 19 }} onClick={() => setPriorityOpen(false)} />
      <div style={{
        position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 20,
        background: 'var(--bg-card)', borderRadius: 8, padding: 6,
        boxShadow: 'var(--shadow-dropdown)', border: '1px solid var(--border-strong)',
        minWidth: 140,
      }}>
        {(['high', 'medium', 'low'] as const).map(p => (
          <button
            key={p}
            onClick={() => {
              onUpdate(item.id, { priority: p })
              setPriorityOpen(false)
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
              fontSize: 12, padding: '6px 8px', borderRadius: 4,
              background: item.priority === p ? 'rgba(0,106,255,0.06)' : 'transparent',
              color: 'var(--text-primary)', fontWeight: item.priority === p ? 600 : 400,
              border: 'none', cursor: 'pointer', fontFamily: 'var(--font)',
            }}
          >
            <span style={{ width: 10, height: 10, borderRadius: 2, background: PRIORITY_COLOR[p], flexShrink: 0 }} />
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>
      </>
    )
  }

  function renderCalendarPopover() {
    if (!openPicker) return null
    const year = calendarMonth.getFullYear()
    const month = calendarMonth.getMonth()
    const cells = getCalendarCells(year, month)
    const monthName = calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    const currentVal = openPicker === 'start' ? item.startDate : item.due
    const selectedDay = currentVal ? (() => {
      const d = new Date(currentVal)
      return d.getFullYear() === year && d.getMonth() === month ? d.getDate() : null
    })() : null

    const today = new Date()
    const todayDay = today.getFullYear() === year && today.getMonth() === month ? today.getDate() : null

    return (
      <div style={{
        position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 30,
        background: 'var(--bg-card)', borderRadius: 10, padding: 14,
        boxShadow: 'var(--shadow-dropdown)', border: '1px solid var(--border-strong)',
        width: 280,
      }} onClick={e => e.stopPropagation()}>
        {/* Current dates display */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, fontSize: 12, color: 'var(--text-secondary)' }}>
          <span style={{ padding: '2px 8px', borderRadius: 4, background: openPicker === 'start' ? '#eff6ff' : 'var(--border)', fontWeight: openPicker === 'start' ? 600 : 400 }}>
            {item.startDate ? formatAnyDate(item.startDate) : 'Start'}
          </span>
          <span style={{ color: 'var(--border-strong)' }}>&rarr;</span>
          <span style={{ padding: '2px 8px', borderRadius: 4, background: openPicker === 'due' ? '#eff6ff' : 'var(--border)', fontWeight: openPicker === 'due' ? 600 : 400 }}>
            {item.due ? formatAnyDate(item.due) : 'Due'}
          </span>
        </div>

        {/* Quick buttons */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
          {[
            { label: 'Today', days: 0 },
            { label: 'Tomorrow', days: 1 },
            { label: '+7d', days: 7 },
            { label: '+30d', days: 30 },
          ].map(q => (
            <button key={q.label} onClick={() => setQuickDate(q.days)} style={{
              padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500,
              border: '1px solid var(--border-strong)', background: 'var(--bg-subtle)', color: 'var(--text-secondary)',
              cursor: 'pointer', fontFamily: 'var(--font)',
            }}>
              {q.label}
            </button>
          ))}
        </div>

        {/* Month navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <button onClick={() => setCalendarMonth(new Date(year, month - 1, 1))} style={{
            width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 4, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)',
          }}>
            <ChevLeftIcon />
          </button>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{monthName}</span>
          <button onClick={() => setCalendarMonth(new Date(year, month + 1, 1))} style={{
            width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 4, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)',
          }}>
            <ChevRightIcon />
          </button>
        </div>

        {/* Weekday headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0, marginBottom: 2 }}>
          {WEEKDAYS.map((d, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', padding: '2px 0' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0 }}>
          {cells.map((day, i) => {
            if (day === null) return <div key={i} />
            const isSelected = day === selectedDay
            const isToday = day === todayDay
            return (
              <button
                key={i}
                onClick={() => selectDate(day)}
                style={{
                  width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 6, fontSize: 12, fontWeight: isSelected ? 700 : 400,
                  border: 'none', cursor: 'pointer', fontFamily: 'var(--font)',
                  background: isSelected ? '#006AFF' : isToday ? '#eff6ff' : 'transparent',
                  color: isSelected ? 'white' : isToday ? '#006AFF' : 'var(--text-primary)',
                  margin: '0 auto',
                }}
              >
                {day}
              </button>
            )
          })}
        </div>

        {/* Clear button */}
        <button onClick={clearDate} style={{
          width: '100%', padding: '6px 0', marginTop: 8, fontSize: 12, fontWeight: 500,
          color: 'var(--text-muted)', background: 'transparent', border: '1px solid var(--border-strong)',
          borderRadius: 6, cursor: 'pointer', fontFamily: 'var(--font)',
        }}>
          Clear date
        </button>
      </div>
    )
  }

  function renderProofingSection() {
    const isUpdating = !!updatingVersionId
    const updatingVer = isUpdating ? proofVersions.find(v => v.id === updatingVersionId) : null

    return (
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10 }}>Proofing</div>

        {/* Context banner when updating an amend */}
        {isUpdating && pendingFiles.length === 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px', borderRadius: 8, marginBottom: 10,
            background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', fontSize: 12,
          }}>
            <span>Updating proof for v{updatingVer?.versionNo} — select files below</span>
            <button onClick={() => setUpdatingVersionId(null)} style={{
              background: 'transparent', border: 'none', color: '#92400e', cursor: 'pointer', padding: 2, fontFamily: 'var(--font)', fontSize: 11, fontWeight: 600,
            }}>Cancel</button>
          </div>
        )}

        {/* Upload zone */}
        <div
          onClick={() => proofInputRef.current?.click()}
          style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '14px 16px', borderRadius: 8,
            background: 'var(--bg-subtle)', border: '1px solid var(--border-strong)', cursor: 'pointer',
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--text-muted)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
        >
          <div style={{ color: 'var(--text-muted)', flexShrink: 0 }}><UploadIcon /></div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              {isUpdating ? 'Select files for updated proof' : 'Upload new proof version'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              PDF, PNG, JPG, AI, EPS, PLT &middot; Max 1GB each
            </div>
          </div>
        </div>
        <input
          ref={proofInputRef}
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg,.ai,.eps"
          style={{ display: 'none' }}
          onChange={handleProofFilesSelected}
        />

        {/* Staging area */}
        {pendingFiles.length > 0 && (
          <div style={{ marginTop: 10, padding: 12, borderRadius: 8, border: '1px solid var(--border-strong)', background: 'var(--bg-subtle)' }}>
            {pendingFiles.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-primary)' }}>
                  <FileIcon /> {f.name}
                </div>
                <button onClick={() => setPendingFiles(prev => prev.filter((_, j) => j !== i))} style={{
                  background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4,
                }}>
                  <CloseIcon />
                </button>
              </div>
            ))}
            <textarea
              value={proofDescription}
              onChange={e => setProofDescription(e.target.value)}
              placeholder="Optional note about this version..."
              rows={3}
              style={{
                width: '100%', boxSizing: 'border-box', marginTop: 8,
                padding: '6px 10px', fontSize: 12, fontFamily: 'var(--font)',
                border: '1px solid var(--border-strong)', borderRadius: 6, outline: 'none',
                color: 'var(--text-primary)', background: 'var(--bg-card)', resize: 'vertical', lineHeight: 1.5,
              }}
            />
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <button onClick={isUpdating ? handleUpdateProof : handleUploadProof} style={{
                padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                background: '#006AFF', color: 'white', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)',
              }}>
                {isUpdating ? 'Update proof' : 'Upload'}
              </button>
              <button onClick={() => { setPendingFiles([]); setProofDescription(''); setUpdatingVersionId(null) }} style={{
                padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-strong)', cursor: 'pointer', fontFamily: 'var(--font)',
              }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Version history */}
        {proofVersions.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Version History
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[...proofVersions].reverse().map(ver => {
                const badge = PROOF_STATUS_BADGE[ver.status] ?? PROOF_STATUS_BADGE.SENT
                const isAmendDone = ver.status === 'AMEND_DONE'
                const isAmendRequested = ver.status === 'AMEND_REQUESTED'
                const js = ver.status === 'APPROVED' ? jobsheets.find(j => j.versionId === ver.id) : null
                const isAmendExpanded = expandedAmendId === ver.id

                return (
                  <div key={ver.id} style={{
                    padding: '10px 14px', borderRadius: 8,
                    border: `1px solid ${isAmendRequested ? '#fde68a' : 'var(--border-strong)'}`,
                    background: isAmendRequested ? '#fffef5' : 'var(--bg-card)',
                    opacity: isAmendDone ? 0.6 : 1,
                  }}>
                    {/* Header row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>v{ver.versionNo}</span>
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4,
                          background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`,
                        }}>
                          {badge.label}
                        </span>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {formatAnyDate(ver.createdAt)}
                      </span>
                    </div>

                    {/* Files list + copy link aligned right */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {ver.files.map((f, fi) => {
                          const isImg = f.url && /\.(jpe?g|png|gif|webp|svg)$/i.test(f.name)
                          return (
                            <div key={fi}>
                              {/* Thumbnail for images */}
                              {isImg && (
                                <div style={{ marginBottom: 4, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border-strong)', width: 120, height: 80, background: '#f5f5f7', flexShrink: 0 }}>
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={f.url!}
                                    alt={f.name}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', cursor: 'pointer' }}
                                    onClick={() => setPreviewFile({ url: f.url!, name: f.name, version: ver })}
                                  />
                                </div>
                              )}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0' }}>
                                <FileIcon />
                                {f.url ? (
                                  <button
                                    onClick={() => setPreviewFile({ url: f.url!, name: f.name, version: ver })}
                                    style={{
                                      fontSize: 12, color: 'var(--accent, #006AFF)', background: 'transparent', border: 'none',
                                      cursor: 'pointer', fontFamily: 'var(--font)', padding: 0,
                                      textDecoration: 'underline', textDecorationColor: 'rgba(0,106,255,0.3)',
                                    }}
                                  >
                                    {f.name}
                                  </button>
                                ) : (
                                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{f.name}</span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      {/* Copy link — aligned with file row */}
                      {copiedVersionId === ver.id ? (
                        <div style={{
                          ...proofBtnStyle,
                          flexShrink: 0,
                          background: '#f0fdf4', color: '#16a34a',
                          border: '1px solid #bbf7d0',
                        }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          Sent
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(ver.proofLink)
                            setCopiedVersionId(ver.id)
                            // Flip this version to SENT and update card proof status
                            const updated = proofVersions.map(v =>
                              v.id === ver.id && v.status === 'GENERATED' ? { ...v, status: 'SENT' as const } : v
                            )
                            const hist = addHistoryEntry(`Proof v${ver.versionNo} link copied & sent to client`, 'info')
                            persistProofing(updated, jobsheets, [...historyEntries, hist])
                            onUpdate(item.id, { proofStatus: 'sent' })
                            // Move card to Waiting Customer Feedback now that link is sent
                            ;(onUpdate as unknown as (id: string, u: Record<string, unknown>) => void)(
                              item.id, { status: 'Waiting Customer Feedback' }
                            )
                            showToast('Link copied — card moved to Waiting Customer Feedback')
                          }}
                          style={{
                            ...proofBtnStyle,
                            flexShrink: 0,
                            ...(ver.status === 'GENERATED' && !isAmendDone ? {
                              background: '#006AFF',
                              color: '#fff',
                              border: '1px solid #006AFF',
                              fontWeight: 700,
                            } : {}),
                            ...(isAmendDone ? { opacity: 0.6 } : {}),
                          }}
                        >
                          <CopyIcon /> Copy link & send
                        </button>
                      )}
                    </div>

                    {/* Description */}
                    {ver.description && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontStyle: 'italic' }}>
                        {ver.description}
                      </div>
                    )}

                    {/* Action buttons — jobsheet only */}
                    {ver.status === 'APPROVED' && js && (() => {
                      const isViewing = viewingJobsheetId === ver.id
                      return (
                        <>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                            <button onClick={() => handleDownloadJobsheet(js)} style={proofBtnStyle}>
                              <DownloadIcon /> Download
                            </button>
                            <button onClick={() => handlePrintJobsheet(js)} style={proofBtnStyle}>
                              <PrinterIcon /> Print
                            </button>
                            <button
                              onClick={() => setViewingJobsheetId(isViewing ? null : ver.id)}
                              style={{
                                ...proofBtnStyle,
                                ...(isViewing ? { background: 'rgba(0,106,255,0.08)', color: '#006AFF', borderColor: 'rgba(0,106,255,0.2)' } : {}),
                              }}
                            >
                              <EyeIcon /> {isViewing ? 'Hide' : 'View'}
                            </button>
                          </div>
                          {isViewing && (
                            <div style={{
                              marginTop: 8, padding: 14, borderRadius: 8,
                              border: '1px solid var(--border-strong)', background: 'var(--bg-subtle)',
                            }}>
                              {/* Order details — no pricing, production only */}
                              {order && (
                                <div style={{ marginBottom: 14 }}>
                                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Job Details</div>
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 14px', fontSize: 11, marginBottom: 8 }}>
                                    <div><span style={{ color: 'var(--text-muted)' }}>Order:</span> <span style={{ fontWeight: 600 }}>{order.id}</span></div>
                                    <div><span style={{ color: 'var(--text-muted)' }}>Customer:</span> <span style={{ fontWeight: 600 }}>{order.customer}</span></div>
                                    <div><span style={{ color: 'var(--text-muted)' }}>Created:</span> {formatAnyDate(order.created)}</div>
                                    <div><span style={{ color: 'var(--text-muted)' }}>Due:</span> {order.dueDate ? formatAnyDate(order.dueDate) : '—'}</div>
                                  </div>
                                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10, marginBottom: 6 }}>
                                    <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
                                      <th style={{ textAlign: 'left', padding: '3px 4px', fontWeight: 600, color: 'var(--text-muted)' }}>Item</th>
                                      <th style={{ textAlign: 'left', padding: '3px 4px', fontWeight: 600, color: 'var(--text-muted)' }}>Specs</th>
                                      <th style={{ textAlign: 'right', padding: '3px 4px', fontWeight: 600, color: 'var(--text-muted)' }}>Qty</th>
                                    </tr></thead>
                                    <tbody>{order.items.map(oi => (
                                      <tr key={oi.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '3px 4px' }}>{oi.name}</td>
                                        <td style={{ padding: '3px 4px', color: 'var(--text-secondary)' }}>{oi.optionSummary || '—'}</td>
                                        <td style={{ padding: '3px 4px', textAlign: 'right' }}>{oi.qty.toLocaleString()}</td>
                                      </tr>
                                    ))}</tbody>
                                  </table>
                                  {order.notes && <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 4 }}><span style={{ fontWeight: 600 }}>Notes:</span> {order.notes}</div>}
                                </div>
                              )}
                              {/* Approval info */}
                              <div style={{ fontSize: 11, display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 10 }}>
                                <div><span style={{ color: 'var(--text-muted)' }}>Approved by:</span> <span style={{ fontWeight: 600 }}>{js.approvedByName}</span></div>
                                <div><span style={{ color: 'var(--text-muted)' }}>Email:</span> {js.approvedByEmail}</div>
                                <div><span style={{ color: 'var(--text-muted)' }}>At:</span> {new Date(js.approvedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                              </div>
                              {/* Signature */}
                              {js.signatureImage && (
                                <div style={{ marginBottom: 10 }}>
                                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Signature</div>
                                  <div style={{ padding: 6, borderRadius: 4, border: '1px solid var(--border)', background: 'white', display: 'inline-block' }}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={js.signatureImage} alt="Signature" style={{ maxWidth: 200, maxHeight: 80, display: 'block' }} />
                                  </div>
                                </div>
                              )}
                              {/* Proof files preview */}
                              <div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Artwork Proof</div>
                                {js.files.map((f, fi) => {
                                  const isImg = f.url && (f.url.length > 10) && (/\.(jpe?g|png|gif|webp|svg)$/i.test(f.name) || f.url.startsWith('data:image/'))
                                  return (
                                    <div key={fi} style={{ marginBottom: 6 }}>
                                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 3 }}>{f.name}</div>
                                      {isImg && (
                                        <div style={{ borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)', display: 'inline-block' }}>
                                          {/* eslint-disable-next-line @next/next/no-img-element */}
                                          <img src={f.url!} alt={f.name} style={{ maxWidth: '100%', maxHeight: 260, display: 'block' }} />
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </>
                      )
                    })()}

                    {/* AMEND_REQUESTED: expandable feedback panel */}
                    {isAmendRequested && (
                      <div style={{ marginTop: 8 }}>
                        <button
                          onClick={() => setExpandedAmendId(isAmendExpanded ? null : ver.id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            fontSize: 11, fontWeight: 600, color: '#92400e',
                            background: 'transparent', border: 'none', cursor: 'pointer',
                            fontFamily: 'var(--font)', padding: 0,
                          }}
                        >
                          <ChevDownIcon /> {isAmendExpanded ? 'Hide client feedback' : 'View client feedback'}
                        </button>
                        {isAmendExpanded && (
                          <div style={{ marginTop: 8 }}>
                            {ver.amendRequest && (
                              <div style={{
                                padding: '8px 12px', borderRadius: 6, background: 'rgba(245,158,11,0.08)',
                                border: '1px solid rgba(245,158,11,0.25)', fontSize: 12, color: '#f59e0b',
                                marginBottom: 8, lineHeight: 1.5,
                              }}>
                                {ver.amendRequest}
                              </div>
                            )}
                            {!ver.amendRequest && (
                              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontStyle: 'italic' }}>
                                No feedback message provided.
                              </div>
                            )}
                            <button
                              onClick={() => {
                                setUpdatingVersionId(ver.id)
                                setExpandedAmendId(null)
                                proofInputRef.current?.click()
                              }}
                              style={{
                                padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                                background: '#006AFF', color: 'white', border: 'none', cursor: 'pointer',
                                fontFamily: 'var(--font)',
                              }}
                            >
                              Update the proof
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  function renderOriginalFilesSection() {
    return (
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10 }}>Original files</div>
        <div style={{ padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border-strong)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>All file types &middot; Max 500MB</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: assets.length > 0 ? 10 : 0 }}>
            <button onClick={() => assetInputRef.current?.click()} style={{
              padding: '4px 12px', borderRadius: 6, border: '1px solid var(--border-strong)',
              background: 'var(--bg-card)', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)',
              cursor: 'pointer', fontFamily: 'var(--font)',
            }}>+ Add File</button>
            <button onClick={() => setShowLinkInput(v => !v)} style={{
              padding: '4px 12px', borderRadius: 6, border: '1px solid var(--border-strong)',
              background: 'var(--bg-card)', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)',
              cursor: 'pointer', fontFamily: 'var(--font)',
            }}>+ Add Link</button>
          </div>
          <input
            ref={assetInputRef}
            type="file"
            multiple
            style={{ display: 'none' }}
            onChange={handleAssetFilesSelected}
          />

          {/* Link input */}
          {showLinkInput && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              <input
                value={linkInput}
                onChange={e => setLinkInput(e.target.value)}
                placeholder="Paste URL here..."
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') handleAddLink() }}
                style={{
                  flex: 1, padding: '5px 10px', fontSize: 12, fontFamily: 'var(--font)',
                  border: '1px solid var(--border-strong)', borderRadius: 6, outline: 'none', color: 'var(--text-primary)',
                }}
              />
              <button onClick={handleAddLink} style={{
                padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                background: '#006AFF', color: 'white', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)',
              }}>Save</button>
            </div>
          )}

          {/* Asset list */}
          {assets.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {assets.map(a => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-primary)', minWidth: 0, overflow: 'hidden' }}>
                    {a.type === 'link' ? <LinkIcon /> : <FileIcon />}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                    <a
                      href={a.url || '#'}
                      download={a.url ? a.name : undefined}
                      onClick={e => {
                        if (!a.url) { e.preventDefault(); return }
                        e.preventDefault()
                        const link = document.createElement('a')
                        link.href = a.url
                        link.download = a.name
                        document.body.appendChild(link)
                        link.click()
                        document.body.removeChild(link)
                      }}
                      style={{ background: 'transparent', border: 'none', color: a.url ? 'var(--accent)' : 'var(--text-muted)', cursor: a.url ? 'pointer' : 'default', padding: 4, display: 'flex', alignItems: 'center', opacity: a.url ? 1 : 0.4 }}
                      title={a.url ? 'Download file' : 'File not available for download'}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    </a>
                    <button onClick={() => handleDeleteAsset(a.id)} style={{
                      background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4,
                    }}>
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  function renderSubtasksSection() {
    const total = subtasks.length
    const done = subtasks.filter(s => s.completed).length
    const pct = total > 0 ? (done / total) * 100 : 0
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Subtasks</div>
          {total > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '1px 8px', borderRadius: 10,
              background: pct === 100 ? 'rgba(0,106,255,0.1)' : 'var(--border)',
              color: pct === 100 ? 'var(--accent, #006AFF)' : 'var(--text-secondary)',
            }}>
              {done}/{total}
            </span>
          )}
        </div>

        {/* Progress bar */}
        {total > 0 && (
          <div style={{ height: 4, borderRadius: 2, background: 'var(--border)', marginBottom: 10 }}>
            <div style={{ height: '100%', borderRadius: 2, background: '#006AFF', width: `${pct}%`, transition: 'width 0.2s' }} />
          </div>
        )}

        {/* Subtask list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {subtasks.map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0'}}>
              <button onClick={() => handleToggleSubtask(s.id)} style={{
                background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
                color: s.completed ? '#006AFF' : 'var(--text-muted)', flexShrink: 0,
              }}>
                {s.completed ? <CheckSquareIcon /> : <SquareIcon />}
              </button>
              <span style={{
                flex: 1, fontSize: 12, color: s.completed ? 'var(--text-muted)' : 'var(--text-primary)',
                textDecoration: s.completed ? 'line-through' : 'none',
              }}>
                {s.title}
              </span>
              <button onClick={() => handleDeleteSubtask(s.id)} style={{
                background: 'transparent', border: 'none', color: 'var(--border-strong)', cursor: 'pointer', padding: 2,
                flexShrink: 0, opacity: 0.5,
              }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}
              >
                <TrashIcon />
              </button>
            </div>
          ))}
        </div>

        {/* Add subtask */}
        {showSubtaskInput ? (
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <input
              value={newSubtaskText}
              onChange={e => setNewSubtaskText(e.target.value)}
              placeholder="New subtask name..."
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') handleAddSubtask(); if (e.key === 'Escape') { setShowSubtaskInput(false); setNewSubtaskText('') } }}
              style={{
                flex: 1, padding: '5px 10px', fontSize: 12, fontFamily: 'var(--font)',
                border: '1px solid var(--border-strong)', borderRadius: 6, outline: 'none', color: 'var(--text-primary)',
              }}
            />
            <button onClick={handleAddSubtask} style={{
              padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
              background: '#006AFF', color: 'white', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)',
            }}>Add</button>
          </div>
        ) : (
          <button onClick={() => setShowSubtaskInput(true)} style={{
            display: 'flex', alignItems: 'center', gap: 6, marginTop: 8,
            padding: '5px 0', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)',
            background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)',
          }}>
            + Add subtask
          </button>
        )}
      </div>
    )
  }

  function renderPreviewOverlay() {
    if (!previewFile) return null
    const badge = PROOF_STATUS_BADGE[previewFile.version.status] ?? PROOF_STATUS_BADGE.SENT
    const isPdf = previewFile.name.toLowerCase().endsWith('.pdf')
    return createPortal(
      <div
        onClick={() => setPreviewFile(null)}
        style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: 20,
        }}
      >
        {/* Header */}
        <div onClick={e => e.stopPropagation()} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: 900,
          marginBottom: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setPreviewFile(null)} style={{
              width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 6, border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer',
            }}>
              <CloseIcon />
            </button>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>
              Version {previewFile.version.versionNo} &mdash; {previewFile.name}
            </span>
            <span style={{
              fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
              background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`,
            }}>
              {badge.label}
            </span>
          </div>
        </div>

        {/* Content */}
        <div onClick={e => e.stopPropagation()} style={{
          flex: 1, width: '100%', maxWidth: 900, borderRadius: 8, overflow: 'hidden',
          background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {isPdf ? (
            <iframe src={previewFile.url} style={{ width: '100%', height: '100%', border: 'none' }} />
          ) : (
            <img src={previewFile.url} alt={previewFile.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          )}
        </div>
      </div>,
      document.body
    )
  }

  function renderMentionMenu() {
    if (!showMentionMenu) return null
    const filtered = teamOptions.filter(u => u.toLowerCase().startsWith(mentionQuery.toLowerCase()))
    if (filtered.length === 0) return null
    return (
      <div style={{
        position: 'absolute', bottom: '100%', left: 12, zIndex: 10,
        background: 'var(--bg-card)', borderRadius: 8, padding: 4,
        boxShadow: 'var(--shadow-dropdown)', border: '1px solid var(--border-strong)',
        minWidth: 180, marginBottom: 4,
      }}>
        {filtered.map(user => (
          <button
            key={user}
            onClick={() => handleMentionSelect(user)}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '6px 10px', fontSize: 13, color: 'var(--text-primary)',
              background: 'transparent', border: 'none', cursor: 'pointer',
              borderRadius: 4, fontFamily: 'var(--font)',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--border)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            {user}
          </button>
        ))}
      </div>
    )
  }

  function renderActivityFeed() {
    // Merge comments and history entries chronologically
    type FeedItem = { type: 'comment'; data: typeof comments[0]; at: number }
      | { type: 'history'; data: HistoryEntry; at: number }

    const feed: FeedItem[] = [
      ...comments.map(c => ({ type: 'comment' as const, data: c, at: new Date(c.createdAt).getTime() })),
      ...historyEntries.map(h => ({ type: 'history' as const, data: h, at: new Date(h.createdAt).getTime() })),
    ].sort((a, b) => a.at - b.at)

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Created entry */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--border-strong)', flexShrink: 0 }} />
            You created this task
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {feed.length > 0 ? (
          feed.map((entry, idx) => {
            if (entry.type === 'comment') {
              const c = entry.data as typeof comments[0]
              return (
                <div key={c.id} style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: 'var(--bg-invert)', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, flexShrink: 0,
                  }}>
                    {c.user[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{c.user}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {c.createdAt ? formatTime(c.createdAt) : ''}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{c.text}</div>
                  </div>
                </div>
              )
            } else {
              const h = entry.data as HistoryEntry
              return (
                <div key={h.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: TONE_COLOR[h.tone] ?? 'var(--border-strong)', flexShrink: 0 }} />
                    {h.action}
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {formatTime(h.createdAt)}
                  </span>
                </div>
              )
            }
          })
        ) : (
          <div style={{ textAlign: 'center', padding: '30px 16px', fontSize: 12, color: 'var(--text-muted)' }}>
            No activity yet
          </div>
        )}
        <div ref={commentsEndRef} />
      </div>
    )
  }

  /* ── Main render ── */

  const panel = (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div style={{ position: 'absolute', inset: 0, background: 'var(--modal-overlay)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }} />

      {/* Modal */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative', zIndex: 10000,
          width: '85vw', maxWidth: 1200,
          maxHeight: '90vh',
          background: 'var(--bg-card)',
          borderRadius: 12,
          display: 'flex',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-modal)',
        }}
      >

        {/* ======== LEFT PANEL ======== */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', minWidth: 0 }}>

          {/* Top bar */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>
              <CircleIcon />
              <span>{item.id} &middot; {columnName}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {isProduction && (
                <a
                  href={`/orders/${item.id}`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '5px 12px', borderRadius: 8,
                    border: '1px solid var(--border-strong)', background: 'var(--bg-card)',
                    fontSize: 12, fontWeight: 500, color: 'var(--text-primary)',
                    textDecoration: 'none', whiteSpace: 'nowrap',
                  }}
                >
                  <ExternalIcon /> View order
                </a>
              )}
              <button
                onClick={onClose}
                style={{
                  width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 6, color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer',
                }}
              >
                <CloseIcon />
              </button>
            </div>
          </div>

          {/* Title */}
          <div style={{ padding: '20px 32px 14px' }}>
            <h1
              contentEditable
              suppressContentEditableWarning
              onBlur={e => {
                const val = e.currentTarget.textContent?.trim() ?? ''
                if (val && val !== item.task) onUpdate(item.id, { task: val })
              }}
              style={{
                margin: 0, fontSize: 28, fontWeight: 700,
                color: 'var(--text-primary)', lineHeight: 1.2,
                outline: 'none', cursor: 'text', fontFamily: 'var(--font)',
              }}
            >
              {item.task}
            </h1>
          </div>

          {/* Meta grid — 2 cols x 2 rows */}
          <div style={{ padding: '0 32px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px' }}>

            {/* Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-muted)', fontSize: 13, minWidth: 80, flexShrink: 0 }}>
                <StatusIcon /> Status
              </div>
              <button
                onClick={() => { setStatusOpen(v => !v); setPriorityOpen(false); setAssigneeOpen(false); setOpenPicker(null) }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '4px 10px 4px 8px', borderRadius: 6,
                  background: 'var(--bg-invert)', color: 'white',
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
                  border: 'none', cursor: 'pointer', fontFamily: 'var(--font)',
                  whiteSpace: 'nowrap',
                }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-muted)', flexShrink: 0 }} />
                {columnName.toUpperCase()}
                <ChevDownIcon />
              </button>
              {renderStatusDropdown()}
            </div>

            {/* Assignees */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-muted)', fontSize: 13, minWidth: 80, flexShrink: 0 }}>
                <PersonIcon /> Assignees
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {assignees.slice(0, 3).map((name, i) => (
                  <div key={name + i} style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: 'var(--bg-invert)', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700,
                    border: '2px solid var(--bg-card)',
                    marginLeft: i === 0 ? 0 : -6,
                    flexShrink: 0,
                  }}>
                    {name[0]}
                  </div>
                ))}
                <button
                  onClick={() => { setAssigneeOpen(v => !v); setStatusOpen(false); setPriorityOpen(false); setOpenPicker(null) }}
                  style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: 'var(--bg-card)', border: '1.5px dashed var(--border-strong)',
                    color: 'var(--text-muted)', fontSize: 14, fontWeight: 400,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', marginLeft: 4,
                  }}>+</button>
              </div>
              {renderAssigneeDropdown()}
            </div>

            {/* Dates */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-muted)', fontSize: 13, minWidth: 80, flexShrink: 0 }}>
                <CalIcon /> Dates
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--text-secondary)' }}>
                <button
                  onClick={() => openCalendar('start')}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '2px 8px', borderRadius: 4, fontSize: 13,
                    border: '1px solid transparent', background: 'transparent',
                    color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--border)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <CalIcon />
                  {item.startDate ? formatAnyDate(item.startDate) : 'Start'}
                </button>
                <span style={{ color: 'var(--border-strong)' }}>&rarr;</span>
                <button
                  onClick={() => openCalendar('due')}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '2px 8px', borderRadius: 4, fontSize: 13,
                    border: '1px solid transparent', background: 'transparent',
                    color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--border)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <CalIcon />
                  {item.due ? formatAnyDate(item.due) : 'Due'}
                </button>
              </div>
              {renderCalendarPopover()}
            </div>

            {/* Priority */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-muted)', fontSize: 13, minWidth: 80, flexShrink: 0 }}>
                <FlagIcon /> Priority
              </div>
              <button
                onClick={() => { setPriorityOpen(v => !v); setStatusOpen(false); setAssigneeOpen(false); setOpenPicker(null) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, color: 'var(--text-primary)',
                  background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)',
                  padding: '2px 4px', borderRadius: 4,
                }}
              >
                <span style={{
                  width: 10, height: 10, borderRadius: 2,
                  background: PRIORITY_COLOR[item.priority] ?? 'var(--text-muted)', flexShrink: 0,
                }} />
                {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
                <ChevDownIcon />
              </button>
              {renderPriorityDropdown()}
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'var(--border)', margin: '0 32px 20px' }} />

          {/* Scrollable body */}
          <div style={{ padding: '0 32px 40px', display: 'flex', flexDirection: 'column', gap: 22 }}>

            {/* Description */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10 }}>Description</div>
              <textarea
                value={editDescription}
                onChange={e => setEditDescription(e.target.value)}
                onBlur={() => {
                  if (editDescription !== item.description) onUpdate(item.id, { description: editDescription })
                }}
                rows={4}
                placeholder="Add a description..."
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '10px 12px', fontSize: 13, fontFamily: 'var(--font)',
                  color: 'var(--text-primary)', background: 'var(--bg-card)',
                  border: '1px solid var(--border-strong)', borderRadius: 8,
                  resize: 'vertical', outline: 'none', lineHeight: 1.6,
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--text-muted)' }}
                onBlurCapture={e => { e.currentTarget.style.borderColor = 'var(--border-strong)' }}
              />
            </div>

            {/* Proofing */}
            {renderProofingSection()}

            {/* Original files */}
            {renderOriginalFilesSection()}

            {/* Divider */}
            <div style={{ height: 1, background: 'var(--border)' }} />

            {/* Subtasks */}
            {renderSubtasksSection()}
          </div>
        </div>

        {/* ======== RIGHT PANEL — Activity ======== */}
        <div style={{
          width: 340, flexShrink: 0,
          borderLeft: '1px solid var(--border)',
          background: 'var(--bg-elevated)',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Header */}
          <div style={{ padding: '18px 20px 14px', flexShrink: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Activity</div>
          </div>

          {/* Activity feed */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
            {renderActivityFeed()}
          </div>

          {/* Comment input */}
          <div style={{ borderTop: '1px solid var(--border)', flexShrink: 0, position: 'relative' }}>
            {renderMentionMenu()}
            <textarea
              ref={commentInputRef}
              value={commentText}
              onChange={handleCommentChange}
              onKeyDown={handleCommentKeyDown}
              placeholder="Mention @Brain to create, find, ask anything"
              rows={2}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '12px 16px', fontSize: 12, fontFamily: 'var(--font)',
                color: 'var(--text-primary)', background: 'transparent',
                border: 'none', resize: 'none', outline: 'none', lineHeight: 1.5,
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, padding: '6px 12px 10px' }}>
              <button
                onClick={() => { setShowMentionMenu(v => !v); setMentionQuery('') }}
                style={{
                  width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 6, color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer',
                }}
              >
                <AtIcon />
              </button>
              <button style={{
                width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 6, color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer',
              }}>
                <PaperclipIcon />
              </button>
              <button
                onClick={handleAddComment}
                style={{
                  width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 6, color: commentText.trim() ? '#006AFF' : 'var(--text-muted)',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                }}
              >
                <SendIcon />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Toast: Copied */}
      {copiedVersionId && (
        <div style={{
          position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--bg-invert)', color: 'white', padding: '8px 20px', borderRadius: 8,
          fontSize: 13, fontWeight: 500, zIndex: 10002,
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        }}>
          Link copied!
        </div>
      )}
    </div>
  )

  if (!mounted) return null
  return (
    <>
      {createPortal(panel, document.body)}
      {renderPreviewOverlay()}
    </>
  )
}

/* ── Shared inline button style for proof actions ── */
const proofBtnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500,
  border: '1px solid var(--border-strong)', background: 'var(--bg-subtle)', color: 'var(--text-secondary)',
  cursor: 'pointer', fontFamily: 'var(--font)',
}
