'use client'

import { useState, useEffect, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import SavingOverlay from '@/components/SavingOverlay'
import ConfirmModal from '@/components/ConfirmModal'
import CustomSelect from '@/components/CustomSelect'
import DatePicker from '@/components/DatePicker'
import { getOrderById, updateOrder as dbUpdateOrder, deleteOrder as dbDeleteOrder, duplicateOrder as dbDuplicateOrder, type DbOrder } from '@/lib/db/orders'
import { calcOrderTotals, type OrderItem, type OrderStatus, type ProductionStatus } from '@/lib/order-store'
import { useAuthStore } from '@/lib/store/auth-store'
import { addNotification } from '@/lib/notification-store'
import { getAgents } from '@/lib/db/agents'
import { printDocument, docHeader, docFooter, fields2, section, textBlock, badgeColors } from '@/lib/print-utils'
import { useShop } from '@/providers/shop-provider'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const BackIcon  = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>)
const TrashIcon = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>)
const PlusIcon  = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>)
const PrintIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>)
const CopyIcon  = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>)

const STATUSES:   OrderStatus[]      = ['Pending', 'Confirmed', 'Cancelled']
const PROD_STATS: ProductionStatus[] = ['Queued', 'In Progress', 'Quality Check', 'Completed', 'Shipped', 'Delivered', '—']

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  Pending:   { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  Confirmed: { bg: 'rgba(0,106,255,0.1)', color: 'var(--accent, #006AFF)' },
  Cancelled: { bg: 'var(--bg, #f1f5f9)', color: 'var(--text-secondary)' },
}
const PROD_STYLE: Record<string, { bg: string; color: string }> = {
  Queued:          { bg: 'var(--bg, #f1f5f9)', color: 'var(--text-secondary)' },
  'In Progress':   { bg: 'rgba(0,106,255,0.1)', color: 'var(--accent, #006AFF)' },
  'Quality Check': { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  Completed:       { bg: 'rgba(0,106,255,0.1)', color: '#006AFF' },
  Shipped:         { bg: '#e0f2fe', color: '#0369a1' },
  Delivered:       { bg: 'rgba(0,106,255,0.1)', color: '#1d4ed8' },
  '—':             { bg: 'transparent', color: 'var(--text-muted)' },
}
const PAY_BADGE: Record<string, string> = {
  Captured: 'badge badge-success',
  Pending:  'badge badge-warning',
  Failed:   'badge badge-pending',
}

const fmt      = (n: number) => `RM ${n.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`
const now      = () => new Date().toISOString().slice(0, 16).replace('T', ' ')
let _uid = 0
function uid(): string { return `oi-${Date.now()}-${++_uid}` }
const initials = (name: string) =>
  name.trim().split(/\s+/).map(w => w[0]?.toUpperCase() ?? '').slice(0, 2).join('')

type EditItem = { id: string; name: string; sku: string; qty: string; unitPrice: string; optionSummary?: string }

const SectionTitle = ({ children }: { children: string }) => (
  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--text-muted)', marginBottom: 12 }}>
    {children}
  </div>
)

// Local camelCase draft type to avoid rewriting the entire template
type DraftOrder = {
  customer: string; customerRef: string; agent: string; status: OrderStatus; production: ProductionStatus
  created: string; dueDate: string; deliveryMethod: 'Delivery' | 'Self-Pickup'; deliveryAddress: string
  notes: string; source: string; items: any[]; payments: any[]; timeline: any[]
  originalFiles?: any[]; discount: number; discountType: 'rm' | 'percent'; sstEnabled: boolean
  sstRate: number; sstAmount: number; rounding: number; shippingCost: number; subtotal: number
  grandTotal: number; currency: string; id: string; seqId: string
}

function dbOrderToDraft(o: DbOrder): DraftOrder {
  return {
    id: o.id, seqId: o.seq_id,
    customer: o.customer_name, customerRef: o.customer_id || '', agent: o.agent_name,
    status: o.status as OrderStatus, production: o.production as ProductionStatus,
    created: o.created_at, dueDate: o.due_date, deliveryMethod: o.delivery_method as 'Delivery' | 'Self-Pickup',
    deliveryAddress: o.delivery_address, notes: o.notes, source: o.source,
    items: o.items as any[], payments: o.payments as any[], timeline: o.timeline as any[],
    originalFiles: o.original_files as any[], discount: o.discount, discountType: o.discount_type as 'rm' | 'percent',
    sstEnabled: o.sst_enabled, sstRate: o.sst_rate, sstAmount: o.sst_amount,
    rounding: o.rounding, shippingCost: o.shipping_cost, subtotal: o.subtotal, grandTotal: o.grand_total,
    currency: o.currency,
  }
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { shopId } = useShop()
  const qc = useQueryClient()

  const { data: dbOrder, isLoading: orderLoading } = useQuery({
    queryKey: ['order', shopId, id],
    queryFn: () => getOrderById(shopId, id),
    enabled: !!shopId && !!id,
  })

  const { data: dbAgents = [] } = useQuery({
    queryKey: ['agents', shopId],
    queryFn: () => getAgents(shopId),
    enabled: !!shopId,
  })
  const agentNames = dbAgents.filter(a => a.status === 'Active').map(a => a.full_name)

  const updateMut = useMutation({
    mutationFn: (updates: Parameters<typeof dbUpdateOrder>[2]) => dbUpdateOrder(shopId, id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', shopId, id] })
      qc.invalidateQueries({ queryKey: ['orders', shopId] })
    },
  })

  const deleteMut = useMutation({
    mutationFn: () => dbDeleteOrder(shopId, id),
    onSuccess: () => router.push('/orders'),
  })

  const dupMut = useMutation({
    mutationFn: () => dbDuplicateOrder(shopId, id),
    onSuccess: (newOrder) => { if (newOrder) router.push(`/orders/${newOrder.id}`) },
  })

  // Local state initialized from server data
  const [order, setOrder]           = useState<DraftOrder | null>(null)
  const [draft, setDraft]           = useState<DraftOrder | null>(null)
  const [editItems, setEditItems]   = useState<EditItem[]>([])
  const [showDel, setShowDel]       = useState(false)
  const [showCancel, setShowCancel] = useState(false)
  const [saving, setSaving]         = useState(false)
  const [showReceipt, setShowReceipt] = useState<string | null>(null)
  const [paymentApproved, setPaymentApproved] = useState(false)
  const [initialized, setInitialized] = useState(false)

  // Original files
  const [origFiles, setOrigFiles] = useState<{ id: string; type: 'file' | 'link'; name: string; url?: string }[]>([])
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkInput, setLinkInput] = useState('')
  const origFileRef = useRef<HTMLInputElement>(null)

  // Financial state
  const [discount, setDiscount]         = useState(0)
  const [discountType, setDiscountType] = useState<'rm' | 'percent'>('rm')
  const [sstEnabled, setSstEnabled]     = useState(true)
  const [sstRate, setSstRate]           = useState(6)
  const [rounding, setRounding]         = useState(0)
  const [shippingCost, setShippingCost] = useState(0)

  // Initialize local state from DB data
  useEffect(() => {
    if (!dbOrder || initialized) return
    const o = dbOrderToDraft(dbOrder)
    setOrder(o)
    setDraft({ ...o })
    setEditItems(o.items.map((i: any) => ({ id: i.id, name: i.name, sku: i.sku, qty: String(i.qty), unitPrice: String(i.unitPrice), optionSummary: i.optionSummary })))
    setDiscount(o.discount ?? 0)
    setDiscountType(o.discountType ?? 'rm')
    setSstEnabled(o.sstEnabled ?? true)
    setSstRate(o.sstRate ?? 6)
    setRounding(o.rounding ?? 0)
    setShippingCost(o.shippingCost ?? 0)
    setOrigFiles(o.originalFiles ?? [])
    setInitialized(true)
  }, [dbOrder, initialized])

  const parsedItems: OrderItem[] = editItems.map(r => ({
    id: r.id, name: r.name, sku: r.sku,
    qty: Number(r.qty) || 0, unitPrice: Number(r.unitPrice) || 0,
    total: (Number(r.qty) || 0) * (Number(r.unitPrice) || 0),
    optionSummary: r.optionSummary || undefined,
  }))
  const t = calcOrderTotals({ items: parsedItems, discount, discountType, sstEnabled, sstRate, rounding, shippingCost })
  const subtotal   = t.subtotal
  const grandTotal = t.grandTotal
  const paid       = (order?.payments ?? []).filter(p => p.status === 'Captured').reduce((s, p) => s + p.amount, 0)
  const balance    = grandTotal - paid

  const origItemsStr = JSON.stringify((order?.items ?? []).map(i => ({ id: i.id, name: i.name, sku: i.sku, qty: String(i.qty), unitPrice: String(i.unitPrice) })))
  const currItemsStr = JSON.stringify(editItems)
  const finChanged = order !== null && (
    discount !== (order.discount ?? 0) || discountType !== (order.discountType ?? 'rm') ||
    sstEnabled !== (order.sstEnabled ?? true) || sstRate !== (order.sstRate ?? 6) ||
    rounding !== (order.rounding ?? 0) || shippingCost !== (order.shippingCost ?? 0)
  )
  const dirty = draft !== null && order !== null && (
    JSON.stringify({ ...draft, items: [], timeline: [], discount: 0, discountType: 'rm', sstEnabled: true, sstRate: 6, sstAmount: 0, rounding: 0, shippingCost: 0, subtotal: 0, grandTotal: 0 }) !==
    JSON.stringify({ ...order, items: [], timeline: [], discount: 0, discountType: 'rm', sstEnabled: true, sstRate: 6, sstAmount: 0, rounding: 0, shippingCost: 0, subtotal: 0, grandTotal: 0 }) ||
    currItemsStr !== origItemsStr || finChanged
  )

  if (orderLoading || !order || !draft) {
    return (
      <AppShell>
        <Link href="/orders" className="back-btn"><BackIcon /> Orders</Link>
        <div className="empty-state" style={{ paddingTop: 80 }}>{orderLoading ? 'Loading…' : 'Order not found'}</div>
      </AppShell>
    )
  }

  const field = <K extends keyof DraftOrder>(key: K, value: DraftOrder[K]) =>
    setDraft(prev => prev ? { ...prev, [key]: value } : prev)

  const addEditItem = () =>
    setEditItems(p => [...p, { id: uid(), name: '', sku: '', qty: '1', unitPrice: '0' }])

  const removeEditItem = (id: string) => setEditItems(p => p.filter(r => r.id !== id))

  const updateEditItem = (id: string, f: keyof EditItem, v: string) =>
    setEditItems(p => p.map(r => r.id === id ? { ...r, [f]: v } : r))

  const persistSave = (overrides?: Partial<DraftOrder>) => {
    if (!draft) return
    // Build a map of original items to preserve artwork fields not in editItems
    const origItemMap = new Map(order.items.map((i: any) => [i.id, i]))
    const savedItems: OrderItem[] = editItems.map(r => {
      const orig: any = origItemMap.get(r.id)
      return {
        id: r.id, name: r.name, sku: r.sku,
        qty:       Number(r.qty) || 0,
        unitPrice: Number(r.unitPrice) || 0,
        total:     (Number(r.qty) || 0) * (Number(r.unitPrice) || 0),
        optionSummary: r.optionSummary || undefined,
        // Preserve artwork, spec, and bulk variant fields from original item
        ...(orig?.artworkFileName ? { artworkFileName: orig.artworkFileName } : {}),
        ...(orig?.artworkUrl ? { artworkUrl: orig.artworkUrl } : {}),
        ...(orig?.selectedSpecs ? { selectedSpecs: orig.selectedSpecs } : {}),
        ...(orig?.productSlug ? { productSlug: orig.productSlug } : {}),
        ...(orig?.bulkVariant ? { bulkVariant: orig.bulkVariant } : {}),
        ...(orig?.variantRows ? { variantRows: orig.variantRows } : {}),
      }
    })
    const merged = { ...draft, items: savedItems, discount, discountType, sstEnabled, sstRate, sstAmount: t.sstAmt, rounding, shippingCost, subtotal: t.subtotal, grandTotal: t.grandTotal, ...overrides }

    // Convert camelCase draft to snake_case for DB
    const dbUpdates = {
      customer_name: merged.customer,
      customer_id: merged.customerRef || null,
      agent_name: merged.agent,
      status: merged.status,
      production: merged.production,
      due_date: merged.dueDate,
      delivery_method: merged.deliveryMethod,
      delivery_address: merged.deliveryAddress,
      notes: merged.notes,
      source: merged.source,
      items: merged.items,
      payments: merged.payments,
      timeline: merged.timeline,
      original_files: merged.originalFiles ?? [],
      discount: merged.discount,
      discount_type: merged.discountType,
      sst_enabled: merged.sstEnabled,
      sst_rate: merged.sstRate,
      sst_amount: merged.sstAmount,
      rounding: merged.rounding,
      shipping_cost: merged.shippingCost,
      subtotal: merged.subtotal,
      grand_total: merged.grandTotal,
    }
    updateMut.mutate(dbUpdates)

    // Sync to online store auth store
    if (order.source === 'online-store') {
      useAuthStore.getState().updateOrderStatus(order.id, merged as any)
    }

    setOrder(merged)
    setDraft({ ...merged })
    setEditItems(parsedItems.map(i => ({ id: i.id, name: i.name, sku: i.sku, qty: String(i.qty), unitPrice: String(i.unitPrice), optionSummary: i.optionSummary })))
  }

  const handleSave = () => {
    if (saving) return
    setSaving(true)
    setTimeout(() => { persistSave(); router.push('/orders?saved=1') }, 1500)
  }
  const handleConfirm = () => {
    const timeline = [...draft.timeline, { id: uid(), date: now(), event: 'Order confirmed', by: draft.agent || 'Admin' }]
    const payments = (draft.payments || []).map(p => p.status === 'Pending' ? { ...p, status: 'Captured' as const } : p)
    persistSave({ status: 'Confirmed', payments, timeline })
  }
  const handleCancel = () => {
    const timeline = [...draft.timeline, { id: uid(), date: now(), event: 'Order cancelled', by: draft.agent || 'Admin' }]
    const payments = (draft.payments || []).map(p => p.status === 'Pending' ? { ...p, status: 'Failed' as const } : p)
    persistSave({ status: 'Cancelled', production: '—', payments, timeline })
    setShowCancel(false)
  }
  const handleDelete = () => { deleteMut.mutate(); useAuthStore.getState().removeOrder(order.id) }

  // Original file handlers
  const saveOrigFiles = (files: typeof origFiles) => {
    setOrigFiles(files)
    const updatedFiles = files.length > 0 ? files : []
    updateMut.mutate({ original_files: updatedFiles })
    setOrder({ ...order, originalFiles: updatedFiles })
    setDraft(prev => prev ? { ...prev, originalFiles: updatedFiles } : prev)
  }
  const handleOrigFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = Array.from(e.target.files ?? [])
    Promise.all(fileList.map((f, i) => new Promise<{ id: string; type: 'file' | 'link'; name: string; url: string }>(resolve => {
      const reader = new FileReader()
      reader.onload = () => resolve({ id: uid(), type: 'file', name: f.name, url: reader.result as string })
      reader.readAsDataURL(f)
    }))).then(newFiles => saveOrigFiles([...origFiles, ...newFiles]))
    e.target.value = ''
  }
  const handleOrigLinkAdd = () => {
    const url = linkInput.trim()
    if (!url) return
    saveOrigFiles([...origFiles, { id: uid(), type: 'link', name: url, url }])
    setLinkInput('')
    setShowLinkInput(false)
  }
  const handleOrigFileDelete = (fileId: string) => saveOrigFiles(origFiles.filter(f => f.id !== fileId))

  const handleDownloadQuotation = () => {
    if (!order) return
    const quoId = order.seqId.replace('ORD', 'QUO')
    const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' })
    const [bg, color] = badgeColors(order.status)
    const lineRows = order.items.map(i =>
      `<tr><td>${i.name}</td><td class="text-mono">${i.sku || '—'}</td><td style="text-align:right">${i.qty.toLocaleString()}</td><td class="text-right">${fmt(i.unitPrice)}</td><td class="text-right">${fmt(i.total)}</td></tr>`
    ).join('')
    const body =
      docHeader('QUOTATION', quoId, 'Valid', '#dbeafe', '#006AFF') +
      section('Quotation Details', fields2([
        { label: 'Customer', value: order.customer || '—' },
        { label: 'Agent', value: order.agent || '—' },
        { label: 'Order Ref', value: order.seqId },
        { label: 'Valid Until', value: validUntil },
      ])) +
      section('Items', `<table>
        <thead><tr><th>Product</th><th>SKU</th><th style="text-align:right">Qty</th><th class="text-right">Unit Price</th><th class="text-right">Total</th></tr></thead>
        <tbody>${lineRows}</tbody>
        <tbody class="total-section">
          <tr class="total-row"><td colspan="4" style="text-align:right;font-weight:600">Subtotal</td><td class="text-right">${fmt(subtotal)}</td></tr>
          ${t.discountAmt > 0 ? `<tr><td colspan="4" style="text-align:right;color:#6b7280">Discount</td><td class="text-right" style="color:#ef4444">−${fmt(t.discountAmt)}</td></tr>` : ''}
          ${sstEnabled ? `<tr><td colspan="4" style="text-align:right;color:#6b7280">SST (${sstRate}%)</td><td class="text-right" style="color:#6b7280">${fmt(t.sstAmt)}</td></tr>` : ''}
          ${shippingCost > 0 ? `<tr><td colspan="4" style="text-align:right;color:#6b7280">Shipping</td><td class="text-right" style="color:#6b7280">${fmt(shippingCost)}</td></tr>` : ''}
          ${rounding !== 0 ? `<tr><td colspan="4" style="text-align:right;color:#6b7280">Rounding</td><td class="text-right" style="color:#6b7280">${rounding > 0 ? '+' : ''}${fmt(rounding)}</td></tr>` : ''}
          <tr class="grand-row"><td colspan="4" style="text-align:right">Grand Total</td><td class="text-right accent">${fmt(grandTotal)}</td></tr>
        </tbody>
      </table>`) +
      section('Terms', `<div class="text-block">This quotation is valid for 30 days from the date of issue.<br>Prices are in Malaysian Ringgit (RM).<br>Payment terms as agreed upon confirmation.</div>`) +
      (order.notes ? section('Notes', textBlock(order.notes)) : '') +
      docFooter()
    printDocument(`Quotation ${quoId}`, body)
  }

  const handleDownloadInvoice = () => {
    if (!order) return
    const invId = order.seqId.replace('ORD', 'INV')
    const capturedAmount = (order.payments ?? []).filter(p => p.status === 'Captured').reduce((sum, p) => sum + p.amount, 0)
    const invoiceTotal = order.grandTotal ?? grandTotal
    const balanceDue = invoiceTotal - capturedAmount
    const paymentStatus = capturedAmount <= 0 ? 'Unpaid' : capturedAmount >= invoiceTotal ? 'Paid' : 'Partially Paid'
    const [bg, color] = badgeColors(paymentStatus === 'Unpaid' ? 'Overdue' : paymentStatus)
    const lineRows = order.items.map(i =>
      `<tr><td>${i.name}</td><td class="text-mono">${i.sku || '—'}</td><td style="text-align:right">${i.qty.toLocaleString()}</td><td class="text-right">${fmt(i.unitPrice)}</td><td class="text-right">${fmt(i.total)}</td></tr>`
    ).join('')
    const body =
      docHeader('INVOICE', invId, paymentStatus, bg, color) +
      section('Bill To', fields2([
        { label: 'Customer', value: order.customer || '—' },
        { label: 'Agent', value: order.agent || '—' },
        { label: 'Order Ref', value: order.seqId },
        { label: 'Date', value: order.created || '—' },
      ])) +
      section('Items', `<table>
        <thead><tr><th>Product</th><th>SKU</th><th style="text-align:right">Qty</th><th class="text-right">Unit Price</th><th class="text-right">Total</th></tr></thead>
        <tbody>${lineRows}</tbody>
        <tbody class="total-section">
          <tr class="total-row"><td colspan="4" style="text-align:right;font-weight:600">Subtotal</td><td class="text-right">${fmt(subtotal)}</td></tr>
          ${t.discountAmt > 0 ? `<tr><td colspan="4" style="text-align:right;color:#6b7280">Discount</td><td class="text-right" style="color:#ef4444">−${fmt(t.discountAmt)}</td></tr>` : ''}
          ${sstEnabled ? `<tr><td colspan="4" style="text-align:right;color:#6b7280">SST (${sstRate}%)</td><td class="text-right" style="color:#6b7280">${fmt(t.sstAmt)}</td></tr>` : ''}
          ${shippingCost > 0 ? `<tr><td colspan="4" style="text-align:right;color:#6b7280">Shipping</td><td class="text-right" style="color:#6b7280">${fmt(shippingCost)}</td></tr>` : ''}
          ${rounding !== 0 ? `<tr><td colspan="4" style="text-align:right;color:#6b7280">Rounding</td><td class="text-right" style="color:#6b7280">${rounding > 0 ? '+' : ''}${fmt(rounding)}</td></tr>` : ''}
          <tr class="grand-row"><td colspan="4" style="text-align:right">Grand Total</td><td class="text-right accent">${fmt(grandTotal)}</td></tr>
        </tbody>
      </table>`) +
      section('Payment Summary', fields2([
        { label: 'Amount Paid', value: fmt(capturedAmount), accent: capturedAmount > 0 },
        { label: 'Balance Due', value: balanceDue > 0 ? fmt(balanceDue) : 'Settled', accent: balanceDue <= 0 },
      ])) +
      (order.notes ? section('Notes', textBlock(order.notes)) : '') +
      docFooter()
    printDocument(`Invoice ${invId}`, body)
  }

  const handlePrint = () => {
    if (!order) return
    const [bg, color] = badgeColors(order.status)
    const lineRows = order.items.map(i =>
      `<tr><td>${i.name}</td><td class="text-mono">${i.sku || '—'}</td><td style="text-align:right">${i.qty.toLocaleString()}</td><td class="text-right">${fmt(i.unitPrice)}</td><td class="text-right">${fmt(i.total)}</td></tr>`
    ).join('')
    const body =
      docHeader('ORDER', order.seqId, order.status, bg, color) +
      section('Order Details', fields2([
        { label: 'Customer',   value: order.customer || '—' },
        { label: 'Agent',      value: order.agent    || '—' },
        { label: 'Status',     value: order.status,          accent: true },
        { label: 'Production', value: order.production || '—' },
        { label: 'Created',    value: order.created  || '—' },
        { label: 'Due Date',   value: order.dueDate  || '—' },
        { label: 'Delivery',   value: order.deliveryMethod || '—' },
        { label: 'Address',    value: order.deliveryAddress && order.deliveryAddress !== '—' ? order.deliveryAddress : '—' },
      ])) +
      section('Order Items', `<table>
        <thead><tr><th>Product</th><th>SKU</th><th style="text-align:right">Qty</th><th class="text-right">Unit Price</th><th class="text-right">Total</th></tr></thead>
        <tbody>${lineRows}</tbody>
        <tbody class="total-section">
          <tr class="total-row"><td colspan="4" style="text-align:right;font-weight:600">Subtotal</td><td class="text-right">${fmt(subtotal)}</td></tr>
          ${t.discountAmt > 0 ? `<tr><td colspan="4" style="text-align:right;color:#6b7280">Discount</td><td class="text-right" style="color:#ef4444">−${fmt(t.discountAmt)}</td></tr>` : ''}
          ${sstEnabled ? `<tr><td colspan="4" style="text-align:right;color:#6b7280">SST (${sstRate}%)</td><td class="text-right" style="color:#6b7280">${fmt(t.sstAmt)}</td></tr>` : ''}
          ${shippingCost > 0 ? `<tr><td colspan="4" style="text-align:right;color:#6b7280">Shipping</td><td class="text-right" style="color:#6b7280">${fmt(shippingCost)}</td></tr>` : ''}
          ${rounding !== 0 ? `<tr><td colspan="4" style="text-align:right;color:#6b7280">Rounding</td><td class="text-right" style="color:#6b7280">${rounding > 0 ? '+' : ''}${fmt(rounding)}</td></tr>` : ''}
          <tr class="grand-row"><td colspan="4" style="text-align:right">Grand Total</td><td class="text-right accent">${fmt(grandTotal)}</td></tr>
        </tbody>
      </table>`) +
      (order.notes ? section('Notes', textBlock(order.notes)) : '') +
      docFooter()
    printDocument(`Order ${order.seqId}`, body)
  }

  const handleDuplicate = () => {
    if (!order) return
    dupMut.mutate()
  }

  const handleApprovePayment = () => {
    if (!draft) return
    const updatedPayments = draft.payments.map((p) =>
      p.method === 'Bank Transfer' && p.status === 'Pending'
        ? { ...p, status: 'Captured' as const }
        : p
    )
    const timeline = [...draft.timeline, { id: uid(), date: now(), event: 'Payment approved — bank transfer verified', by: draft.agent || 'Admin' }]
    persistSave({ status: 'Confirmed', payments: updatedPayments, timeline })
    // Also sync to customer store
    if (order.source === 'online-store') {
      useAuthStore.getState().updateOrderStatus(order.id, { status: 'Confirmed', payments: updatedPayments })
    }
    addNotification({
      type: 'success',
      title: 'Payment approved',
      message: `Bank transfer for ${order.seqId} (${fmt(grandTotal)}) has been verified.`,
      link: `/orders/${order.id}`,
      source: 'payment',
    })
    setPaymentApproved(true)
    setTimeout(() => setPaymentApproved(false), 3000)
  }

  const hasPendingTransferWithReceipt = (draft?.payments ?? []).some(
    (p) => p.method === 'Bank Transfer' && p.status === 'Pending' && p.receiptData
  )

  const d = draft
  const ss = STATUS_STYLE[d.status] ?? STATUS_STYLE.Cancelled
  const ps = PROD_STYLE[d.production]   ?? PROD_STYLE['—']

  return (
    <AppShell>
      {saving && <SavingOverlay message="Saving changes…" />}
      {/* ── Page header bar ── */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <Link href="/orders" className="back-btn"><BackIcon /> Orders</Link>
        <div className="page-actions">
          <button className="btn-secondary" onClick={handlePrint}><PrintIcon /> Print</button>
          <button className="btn-secondary" onClick={handleDuplicate}><CopyIcon /> Duplicate</button>
          <button className="btn-secondary" onClick={() => setShowDel(true)} style={{ color: 'var(--negative)' }}>Delete</button>
          <Link href="/orders" className="btn-secondary" style={{ textDecoration: 'none' }}>Cancel</Link>
          <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ opacity: saving ? 0.5 : 1 }}>Save Changes</button>
        </div>
      </div>

      {/* ── Hero identity card ── */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', marginBottom: 16 }}>
        {/* Avatar */}
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: 'var(--accent, #006AFF)', color: 'white', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, fontWeight: 700, letterSpacing: -0.5,
        }}>
          {initials(d.customer) || '?'}
        </div>
        {/* Name + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: -0.4, lineHeight: 1.2 }}>
            {d.customer || '—'}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>
            {d.agent && <span>{d.agent} · </span>}
            <span>{order.seqId}</span>
            <span> · Due {d.dueDate}</span>
          </div>
        </div>
        {/* Status dropdown */}
        <CustomSelect value={d.status} onChange={v => field('status', v as OrderStatus)} options={STATUSES} style={{ width: 130 }} />
      </div>

      {/* ── Body ── */}
      <div className="page-scroll">
        <div className="detail-grid">

          {/* ── LEFT — one combined card ── */}
          <div className="detail-main" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Customer + Order Details + Items — single card */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>

              {/* Customer & Order Details */}
              <div style={{ padding: '16px 20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

                  {/* Left col: customer */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <SectionTitle>Customer</SectionTitle>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div>
                        <label className="form-label">Name</label>
                        <input className="form-input" value={d.customer} onChange={e => field('customer', e.target.value)} />
                      </div>
                      <div>
                        <label className="form-label">Customer Ref</label>
                        <input className="form-input" value={d.customerRef} onChange={e => field('customerRef', e.target.value)} placeholder="CUS-001" />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div>
                        <label className="form-label">Delivery Method</label>
                        <CustomSelect value={d.deliveryMethod} onChange={v => field('deliveryMethod', v as 'Delivery' | 'Self-Pickup')} options={['Self-Pickup', 'Delivery']} />
                      </div>
                      <div>
                        <label className="form-label">Due Date</label>
                        <DatePicker value={d.dueDate} onChange={v => field('dueDate', v)} placeholder="Select due date" />
                      </div>
                    </div>
                    {d.deliveryMethod === 'Delivery' && (
                      <div>
                        <label className="form-label">Delivery Address</label>
                        <textarea className="form-input" rows={2} value={d.deliveryAddress}
                          onChange={e => field('deliveryAddress', e.target.value)} style={{ resize: 'vertical' }} />
                      </div>
                    )}
                  </div>

                  {/* Right col: order details */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <SectionTitle>Order Details</SectionTitle>
                    <div>
                      <label className="form-label">Agent</label>
                      <CustomSelect value={d.agent} onChange={v => field('agent', v)} placeholder="— Select —" options={agentNames.map(a => ({ value: a, label: a }))} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div>
                        <label className="form-label">Production</label>
                        <CustomSelect value={d.production} onChange={v => field('production', v as ProductionStatus)} options={PROD_STATS} />
                      </div>
                    </div>
                    <div>
                      <label className="form-label">Internal Notes</label>
                      <textarea className="form-input" rows={2} value={d.notes}
                        onChange={e => field('notes', e.target.value)} placeholder="Notes…" style={{ resize: 'vertical' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: 'var(--border)' }} />

              {/* Order Items table */}
              <div style={{ padding: '0 0 4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px 10px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--text-muted)' }}>Order Items</div>
                  <button className="btn-secondary" style={{ fontSize: 12, padding: '4px 12px', gap: 4 }} onClick={addEditItem}>
                    <PlusIcon /> Add Item
                  </button>
                </div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th style={{ width: 110 }}>SKU</th>
                      <th style={{ textAlign: 'right', width: 80 }}>Qty</th>
                      <th style={{ textAlign: 'right', width: 100 }}>Unit Price</th>
                      <th style={{ textAlign: 'right', width: 110 }}>Total</th>
                      <th style={{ width: 36 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {editItems.map(row => {
                      const rowTotal = (Number(row.qty) || 0) * (Number(row.unitPrice) || 0)
                      const origItem = order.items.find(i => i.id === row.id)
                      return (
                        <tr key={row.id}>
                          <td>
                            <input className="form-input" value={row.name}
                              onChange={e => updateEditItem(row.id, 'name', e.target.value)}
                              placeholder="Product name" style={{ fontSize: 13, padding: '5px 10px' }} />
                            {row.optionSummary && (
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, paddingLeft: 2 }}>{row.optionSummary}</div>
                            )}
                            {origItem?.bulkVariant && origItem.variantRows && origItem.variantRows.length > 0 && (
                              <div style={{ marginTop: 6, borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
                                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', padding: '4px 8px', background: 'var(--bg-secondary, #f9fafb)', borderBottom: '1px solid var(--border)' }}>
                                  Variant Breakdown
                                </div>
                                {origItem.variantRows.map((vr: any) => (
                                  <div key={vr.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', fontSize: 10.5, borderBottom: '1px solid var(--border)' }}>
                                    <span style={{ color: 'var(--text-primary)' }}>
                                      <strong>{vr.qty}</strong> × {vr.optionSummary}
                                    </span>
                                    <span style={{ color: 'var(--text-muted)', flexShrink: 0, marginLeft: 8 }}>
                                      {fmt(vr.unitPrice)}/pc = <strong>{fmt(vr.rowTotal)}</strong>
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                          <td>
                            <input className="form-input" value={row.sku}
                              onChange={e => updateEditItem(row.id, 'sku', e.target.value)}
                              placeholder="SKU" style={{ fontSize: 11.5, padding: '5px 8px', fontFamily: 'monospace' }} />
                          </td>
                          <td>
                            <input type="number" className="form-input" value={row.qty} min={1}
                              onChange={e => updateEditItem(row.id, 'qty', e.target.value)}
                              style={{ textAlign: 'right', fontSize: 13, padding: '5px 8px' }} />
                          </td>
                          <td>
                            <input type="number" className="form-input" value={row.unitPrice} step={0.01} min={0}
                              onChange={e => updateEditItem(row.id, 'unitPrice', e.target.value)}
                              style={{ textAlign: 'right', fontSize: 13, padding: '5px 8px' }} />
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600, fontSize: 13, color: 'var(--accent)' }}>
                            {fmt(rowTotal)}
                          </td>
                          <td>
                            <button className="btn-ghost" style={{ padding: 4, color: 'var(--negative)' }}
                              onClick={() => removeEditItem(row.id)} disabled={editItems.length === 1}>
                              <TrashIcon />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-muted)', paddingTop: 12 }}>Subtotal</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, paddingTop: 12 }}>{fmt(subtotal)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>

                {/* ── Artwork Files ── */}
                {order.items.some(i => i.artworkFileName) && (
                  <div style={{ padding: '14px 20px 16px', borderTop: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--text-muted)', marginBottom: 10 }}>Artwork Files</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                      {order.items.filter(i => i.artworkFileName).map(i => {
                        const isImage = /\.(jpe?g|png|gif|webp|svg)$/i.test(i.artworkFileName!)
                        return (
                          <div key={i.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 8, width: 160 }}>
                            {isImage && i.artworkUrl ? (
                              <img src={i.artworkUrl} alt={i.artworkFileName!} style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 6, marginBottom: 6, cursor: 'pointer' }}
                                onClick={() => setShowReceipt(i.artworkUrl!)} />
                            ) : (
                              <div style={{ width: '100%', height: 100, background: 'var(--bg)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                              </div>
                            )}
                            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.artworkFileName}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{i.name}</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* ── Financial Summary ── */}
                <div style={{ padding: '14px 20px 16px', borderTop: '1px solid var(--border)' }}>
                  {/* Discount */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <label style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 70 }}>Discount</label>
                    <input className="form-input" type="number" min={0} value={discount}
                      onChange={e => setDiscount(Number(e.target.value))}
                      style={{ width: 80, fontSize: 12, padding: '4px 8px' }} />
                    <CustomSelect
                      value={discountType}
                      onChange={v => setDiscountType(v as 'rm' | 'percent')}
                      options={[{ value: 'rm', label: 'RM' }, { value: 'percent', label: '%' }]}
                      style={{ fontSize: 12, padding: '4px 8px', width: 70, minHeight: 0, height: 28 }}
                    />
                  </div>

                  {/* SST Toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={sstEnabled} onChange={e => setSstEnabled(e.target.checked)} />
                      Enable SST
                    </label>
                    {sstEnabled && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input className="form-input" type="number" min={0} step={0.5} value={sstRate}
                          onChange={e => setSstRate(Number(e.target.value))}
                          style={{ width: 60, fontSize: 12, padding: '4px 8px' }} />
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>%</span>
                      </div>
                    )}
                  </div>

                  {/* Shipping */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <label style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 70 }}>Shipping</label>
                    <input className="form-input" type="number" min={0} value={shippingCost}
                      onChange={e => setShippingCost(Number(e.target.value))}
                      style={{ width: 80, fontSize: 12, padding: '4px 8px' }} />
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>RM</span>
                  </div>

                  {/* Rounding */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <label style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 70 }}>Rounding</label>
                    <input className="form-input" type="number" step={0.01} value={rounding}
                      onChange={e => setRounding(Number(e.target.value))}
                      style={{ width: 80, fontSize: 12, padding: '4px 8px' }} />
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>RM</span>
                  </div>

                  {/* Totals Breakdown */}
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                    {t.discountAmt > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 48, padding: '4px 0', fontSize: 12.5 }}>
                        <span style={{ color: 'var(--text-muted)' }}>Discount</span>
                        <span style={{ color: 'var(--negative)', minWidth: 110, textAlign: 'right' }}>−{fmt(t.discountAmt)}</span>
                      </div>
                    )}
                    {sstEnabled && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 48, padding: '4px 0', fontSize: 12.5 }}>
                        <span style={{ color: 'var(--text-muted)' }}>SST ({sstRate}%)</span>
                        <span style={{ minWidth: 110, textAlign: 'right' }}>{fmt(t.sstAmt)}</span>
                      </div>
                    )}
                    {shippingCost > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 48, padding: '4px 0', fontSize: 12.5 }}>
                        <span style={{ color: 'var(--text-muted)' }}>Shipping</span>
                        <span style={{ minWidth: 110, textAlign: 'right' }}>{fmt(shippingCost)}</span>
                      </div>
                    )}
                    {rounding !== 0 && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 48, padding: '4px 0', fontSize: 12.5 }}>
                        <span style={{ color: 'var(--text-muted)' }}>Rounding</span>
                        <span style={{ minWidth: 110, textAlign: 'right' }}>{rounding > 0 ? '+' : ''}{fmt(rounding)}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 48, padding: '8px 0 0', fontSize: 14, fontWeight: 700, borderTop: '1.5px solid var(--border)', marginTop: 4 }}>
                      <span>Grand Total</span>
                      <span style={{ color: 'var(--accent)', minWidth: 110, textAlign: 'right' }}>{fmt(grandTotal)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment history */}
            <div className="card">
              <div className="card-header"><div className="card-title">Payment History</div></div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th><th>Method</th><th>Reference</th><th>Receipt</th><th>Status</th>
                    <th style={{ textAlign: 'right' }}>Amount</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {order.payments.length === 0 ? (
                    <tr><td colSpan={7}><div className="empty-state" style={{ padding: '20px 0' }}>No payments recorded</div></td></tr>
                  ) : order.payments.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{p.date}</td>
                      <td style={{ fontSize: 12.5 }}>{p.method}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>{p.ref}</td>
                      <td>
                        {p.receiptData ? (
                          <button
                            onClick={() => setShowReceipt(p.receiptData!)}
                            style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', background: 'rgba(0,106,255,0.08)', border: '1px solid rgba(0,106,255,0.2)', borderRadius: 6, padding: '3px 10px', cursor: 'pointer' }}
                          >
                            View
                          </button>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>&mdash;</span>
                        )}
                      </td>
                      <td><span className={PAY_BADGE[p.status]}>{p.status}</span></td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--positive)' }}>{fmt(p.amount)}</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {p.status === 'Pending' && (
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => {
                                const payments = order.payments.map(pay => pay.id === p.id ? { ...pay, status: 'Captured' as const } : pay)
                                const timeline = [...order.timeline, { id: uid(), date: now(), event: `Payment ${p.method} approved (${fmt(p.amount)})`, by: 'Admin' }]
                                persistSave({ payments, timeline })
                              }}
                              style={{ fontSize: 11, fontWeight: 600, color: '#fff', background: 'var(--positive)', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                const payments = order.payments.map(pay => pay.id === p.id ? { ...pay, status: 'Failed' as const } : pay)
                                const timeline = [...order.timeline, { id: uid(), date: now(), event: `Payment ${p.method} rejected (${fmt(p.amount)})`, by: 'Admin' }]
                                persistSave({ payments, timeline })
                              }}
                              style={{ fontSize: 11, fontWeight: 600, color: 'var(--negative)', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'right', fontSize: 12.5, color: 'var(--text-muted)', paddingTop: 8 }}>Balance Due</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: balance > 0 ? 'var(--negative)' : 'var(--positive)', paddingTop: 8 }}>
                      {balance > 0 ? fmt(balance) : '—'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* ── RIGHT sidebar ── */}
          <div className="detail-side" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Payment tiles */}
            <div className="card" style={{ padding: '14px 16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                {[
                  { label: 'Total',   value: fmt(grandTotal), color: 'var(--text-primary)' },
                  { label: 'Paid',    value: fmt(paid),       color: 'var(--positive)' },
                  { label: 'Balance', value: balance > 0 ? fmt(balance) : 'Settled', color: balance > 0 ? 'var(--negative)' : 'var(--text-muted)' },
                ].map(m => (
                  <div key={m.label} style={{ background: 'var(--bg-card)', padding: '10px 8px', textAlign: 'center' }}>
                    <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)', marginBottom: 4 }}>{m.label}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: m.color, wordBreak: 'break-all', lineHeight: 1.3 }}>{m.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {d.status === 'Pending' && (
                <button
                  onClick={handleConfirm}
                  style={{ width: '100%', padding: '7px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, background: 'var(--cta)', color: 'white', cursor: 'pointer', transition: 'background 0.12s', textAlign: 'center', justifyContent: 'center', display: 'flex', alignItems: 'center' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--cta-hover)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--cta)' }}
                >Confirm Order</button>
              )}
              {hasPendingTransferWithReceipt && !paymentApproved && (
                <button
                  onClick={handleApprovePayment}
                  style={{ width: '100%', padding: '7px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, background: 'rgba(22,163,74,0.1)', color: '#16a34a', border: '1.5px solid #86efac', cursor: 'pointer', transition: 'background 0.12s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(22,163,74,0.18)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(22,163,74,0.1)' }}
                >
                  Approve Payment
                </button>
              )}
              {paymentApproved && (
                <div style={{ width: '100%', padding: '7px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, background: 'rgba(22,163,74,0.1)', color: '#16a34a', border: '1.5px solid #86efac', textAlign: 'center' }}>
                  Payment Approved
                </div>
              )}
              <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center', border: '1.5px solid var(--border)' }} onClick={handleDownloadQuotation}>
                Download Quotation
              </button>
              <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center', border: '1.5px solid var(--border)' }} onClick={handleDownloadInvoice}>
                Download Invoice
              </button>
              <Link
                href={`/track/${d.id}`}
                target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, background: 'rgba(0,106,255,0.07)', color: 'var(--accent)', border: '1.5px solid rgba(0,106,255,0.2)', textDecoration: 'none' }}>
                Customer Tracking Link
              </Link>
              {d.status !== 'Cancelled' && (
                <button onClick={() => setShowCancel(true)}
                  style={{ width: '100%', padding: '7px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 500, background: 'transparent', color: 'var(--negative)', border: '1px solid #fecaca', cursor: 'pointer', transition: 'background 0.12s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                  Cancel Order
                </button>
              )}
            </div>

            {/* Original Files */}
            <div className="card">
              <div className="card-header"><div className="card-title">Original Files</div></div>
              <div style={{ padding: '0 20px 14px' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>All file types &middot; Max 500MB</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: origFiles.length > 0 || showLinkInput ? 10 : 0 }}>
                  <button onClick={() => origFileRef.current?.click()} style={{
                    padding: '4px 12px', borderRadius: 6, border: '1px solid var(--border)',
                    background: 'var(--bg-card)', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)',
                    cursor: 'pointer', fontFamily: 'var(--font)',
                  }}>+ Add File</button>
                  <button onClick={() => setShowLinkInput(v => !v)} style={{
                    padding: '4px 12px', borderRadius: 6, border: '1px solid var(--border)',
                    background: 'var(--bg-card)', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)',
                    cursor: 'pointer', fontFamily: 'var(--font)',
                  }}>+ Add Link</button>
                </div>
                <input ref={origFileRef} type="file" multiple style={{ display: 'none' }} onChange={handleOrigFileAdd} />
                {showLinkInput && (
                  <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                    <input value={linkInput} onChange={e => setLinkInput(e.target.value)} placeholder="Paste URL here..." autoFocus
                      onKeyDown={e => { if (e.key === 'Enter') handleOrigLinkAdd() }}
                      style={{ flex: 1, padding: '5px 10px', fontSize: 12, fontFamily: 'var(--font)', border: '1px solid var(--border)', borderRadius: 6, outline: 'none', color: 'var(--text-primary)' }} />
                    <button onClick={handleOrigLinkAdd} style={{
                      padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                      background: '#006AFF', color: 'white', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)',
                    }}>Save</button>
                  </div>
                )}
                {origFiles.map(f => (
                  <div key={f.id} style={{ display: 'flex', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)', gap: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4, flexShrink: 0,
                      color: f.type === 'link' ? 'var(--accent)' : 'var(--text-secondary)',
                      background: f.type === 'link' ? 'rgba(0,106,255,0.08)' : 'var(--bg)',
                    }}>{f.type === 'link' ? 'LINK' : 'FILE'}</span>
                    <span style={{ fontSize: 12.5, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{f.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                      {f.type === 'link' && f.url && (
                        <a href={f.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'var(--accent)', padding: 4 }}>Open</a>
                      )}
                      {f.type === 'file' && (
                        <a
                          href={f.url || '#'}
                          download={f.url ? f.name : undefined}
                          onClick={e => { if (!f.url) e.preventDefault() }}
                          style={{ color: f.url ? 'var(--accent)' : 'var(--text-muted)', padding: 4, display: 'flex', alignItems: 'center', cursor: f.url ? 'pointer' : 'default', opacity: f.url ? 1 : 0.4 }}
                          title={f.url ? 'Download file' : 'File not available for download'}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        </a>
                      )}
                      <button onClick={() => handleOrigFileDelete(f.id)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline */}
            <div className="card">
              <div className="card-header"><div className="card-title">Timeline</div></div>
              <div style={{ padding: '4px 0 8px' }}>
                {(d.timeline ?? []).map((t, i) => (
                  <div key={t.id} style={{ display: 'flex', gap: 12 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 18 }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%', marginTop: 4, flexShrink: 0,
                        background: i === d.timeline.length - 1 ? 'var(--accent)' : 'var(--border)',
                        border: `2px solid ${i === d.timeline.length - 1 ? 'var(--accent)' : 'var(--border)'}`,
                        boxShadow: i === d.timeline.length - 1 ? '0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent)' : 'none',
                      }} />
                      {i < d.timeline.length - 1 && (
                        <div style={{ width: 1, flex: 1, background: 'var(--border)', minHeight: 18, marginTop: 3 }} />
                      )}
                    </div>
                    <div style={{ paddingBottom: i < d.timeline.length - 1 ? 14 : 0, flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.4 }}>{t.event}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{t.date} · {t.by}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showDel && (
        <ConfirmModal
          title={`Delete ${order.seqId}?`}
          message={`This will permanently remove the order for ${order.customer}.`}
          confirmLabel="Delete Order"
          onConfirm={handleDelete}
          onCancel={() => setShowDel(false)}
        />
      )}
      {showCancel && (
        <ConfirmModal
          title="Cancel this order?"
          message={`${order.seqId} will be marked as Cancelled. You can change this later by editing the status.`}
          confirmLabel="Cancel Order"
          onConfirm={handleCancel}
          onCancel={() => setShowCancel(false)}
        />
      )}

      {/* Receipt viewer modal */}
      {showReceipt && (
        <div
          onClick={() => setShowReceipt(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'relative', background: 'var(--bg-card, white)', borderRadius: 16, padding: 16, maxWidth: 600, maxHeight: '85vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
          >
            <button
              onClick={() => setShowReceipt(null)}
              style={{ position: 'absolute', top: 12, right: 12, width: 30, height: 30, borderRadius: '50%', border: 'none', background: 'var(--bg, #f1f5f9)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700 }}
            >
              &times;
            </button>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Transfer Receipt</div>
            {showReceipt.startsWith('data:image') ? (
              <img src={showReceipt} alt="Transfer receipt" style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid var(--border)' }} />
            ) : showReceipt.startsWith('data:application/pdf') ? (
              <iframe src={showReceipt} style={{ width: '100%', height: 500, borderRadius: 8, border: '1px solid var(--border)' }} title="Receipt PDF" />
            ) : (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                Receipt file uploaded (unsupported preview format)
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  )
}
