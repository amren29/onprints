'use client'

import { useState, useEffect, useMemo, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import SavingOverlay from '@/components/SavingOverlay'
import ConfirmModal from '@/components/ConfirmModal'
import CustomSelect from '@/components/CustomSelect'
import { getCategories, getProductById, updateProduct, deleteProduct, type DbProduct, type DbCategory } from '@/lib/db/catalog'
import type { CatalogItem, SizeMode, ProductImage } from '@/lib/catalog-store'
import { MainImageUpload, VariantImagesUpload } from '@/components/ImageUploader'
import BulkVariantBuilder from '@/components/BulkVariantBuilder'
import { calcBasePrice, applyModifiers } from '@/lib/option-pricing'
import { useShop } from '@/providers/shop-provider'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const BackIcon  = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>)
const TrashIcon = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>)
const PlusIcon       = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>)
const HelpCircleIcon   = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>)
const ImagePreviewIcon = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>)
const EyeIcon          = () => (<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>)
const PriceTagIcon     = () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>)

const STATUSES: CatalogItem['status'][]         = ['Active', 'Paused']
const VISIBILITIES: CatalogItem['visibility'][] = ['published', 'draft']
const MOD_TYPES      = [{ value: 'add', label: '+Add' }, { value: 'multiply', label: '×Multiply' }]
const SEL_TYPES      = [{ value: 'single', label: 'Single' }, { value: 'multi', label: 'Multi' }]
const DISPLAY_TYPES  = [{ value: 'radio', label: 'Radio / Checkbox' }, { value: 'dropdown', label: 'Dropdown' }, { value: 'image', label: 'Image Cards' }]
const SIZE_MODES     = [{ value: 'fixed', label: 'Fixed sizes only' }, { value: 'custom', label: 'Custom size only' }, { value: 'both', label: 'Fixed + Custom' }]
const SIZE_UNITS     = [{ value: 'mm', label: 'mm' }, { value: 'cm', label: 'cm' }, { value: 'in', label: 'in' }, { value: 'ft', label: 'ft' }]
const SQFT_UNITS     = [{ value: 'ft', label: 'ft' }, { value: 'in', label: 'in' }, { value: 'cm', label: 'cm' }, { value: 'm', label: 'm' }]

// ── Local row types ────────────────────────────────────────────────────────

type TierRow      = { minQty: string; maxQty: string; unitPrice: string }
type VTierRow     = { minQty: string; unitPrice: string }
type FixedSizeRow = { label: string; width: string; height: string; unit: string; basePrice: string; tiers: TierRow[]; vTiers: VTierRow[]; expanded: boolean; customQtyEnabled: boolean; customQtyOptions: string }
type OptValRow = { label: string; modifierType: 'add' | 'multiply'; modifierValue: string; imageUrl: string }
type OptGrpRow = { groupName: string; selectionType: 'single' | 'multi'; displayType: 'radio' | 'dropdown' | 'image'; required: boolean; options: OptValRow[]; helpText: string; previewImage: string }

const emptySize   = (): FixedSizeRow => ({ label: '', width: '', height: '', unit: 'mm', basePrice: '', tiers: [{ minQty: '1', maxQty: '100', unitPrice: '' }], vTiers: [{ minQty: '1', unitPrice: '' }], expanded: false, customQtyEnabled: false, customQtyOptions: '' })
const emptyOptVal = (): OptValRow => ({ label: '', modifierType: 'add', modifierValue: '', imageUrl: '' })
const emptyGroup  = (): OptGrpRow => ({ groupName: '', selectionType: 'single', displayType: 'radio', required: false, options: [emptyOptVal()], helpText: '', previewImage: '' })

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14 }}>{children}</div>
}

/* ── Inline custom dropdown for storefront preview ─────────────────────── */
function PreviewDropdown({ value, onChange, options, placeholder = '— Select —' }: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find(o => o.value === value)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={{
        width: '100%', padding: '7px 12px', fontSize: 11, borderRadius: 8,
        border: `1.5px solid ${open ? '#006AFF' : '#e5e7eb'}`, background: '#fff', color: selected ? '#374151' : '#9ca3af',
        fontFamily: 'inherit', cursor: 'pointer', outline: 'none', textAlign: 'left',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, transition: 'border-color .15s',
      }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected ? selected.label : placeholder}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, width: '100%', zIndex: 20,
          background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: 180, overflowY: 'auto',
        }}>
          {options.map(o => (
            <button key={o.value} type="button" onMouseDown={e => e.preventDefault()} onClick={() => { onChange(o.value); setOpen(false) }} style={{
              display: 'block', width: '100%', padding: '7px 12px', textAlign: 'left', fontSize: 11,
              fontFamily: 'inherit', border: 'none', cursor: 'pointer',
              color: o.value === value ? '#006AFF' : '#374151', fontWeight: o.value === value ? 600 : 400,
              background: o.value === value ? 'rgba(0,106,255,0.06)' : 'transparent',
            }}
              onMouseEnter={e => { if (o.value !== value) e.currentTarget.style.background = '#f9fafb' }}
              onMouseLeave={e => { if (o.value !== value) e.currentTarget.style.background = 'transparent' }}
            >{o.label}</button>
          ))}
        </div>
      )}
    </div>
  )
}

// Helper: convert DbProduct → CatalogItem-like form state
function dbToFormItem(p: DbProduct, catIdToName: Record<string, string>): CatalogItem {
  const pricing = p.pricing as Record<string, unknown> ?? {}
  const sizes = p.sizes as Record<string, unknown> ?? {}
  const pi = p.product_info as Record<string, string> ?? {}
  return {
    id: p.id,
    name: p.name,
    sku: p.sku,
    category: catIdToName[p.category_id ?? ''] ?? '',
    price: p.base_price > 0 ? `RM ${p.base_price.toFixed(2)}` : '',
    pricingType: (p.pricing_type as CatalogItem['pricingType']) || 'volume',
    status: p.status as CatalogItem['status'],
    visibility: p.visibility as CatalogItem['visibility'],
    description: p.description,
    notes: p.notes,
    mainImage: p.main_image ? { id: 'main', url: p.main_image, name: 'main' } : null,
    variantImages: (p.variant_images as ProductImage[]) ?? [],
    bulkVariant: p.bulk_variant || undefined,
    volumeTiers: (pricing.volumeTiers as CatalogItem['volumeTiers']) ?? undefined,
    optionGroups: (p.option_groups as CatalogItem['optionGroups']) ?? undefined,
    sizes: Object.keys(sizes).length > 0 ? sizes as unknown as CatalogItem['sizes'] : undefined,
    productInfo: Object.keys(pi).length > 0 ? pi as CatalogItem['productInfo'] : undefined,
  }
}

export default function CatalogDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { shopId } = useShop()
  const qc = useQueryClient()

  // Fetch product and categories from DB
  const { data: dbProduct, isLoading: loadingProduct } = useQuery({
    queryKey: ['product', shopId, id],
    queryFn: () => getProductById(shopId, id),
    enabled: !!shopId && !!id,
  })
  const { data: dbCategories = [] } = useQuery({
    queryKey: ['categories', shopId],
    queryFn: () => getCategories(shopId),
    enabled: !!shopId,
  })

  const catIdToName = useMemo(() => Object.fromEntries(dbCategories.map(c => [c.id, c.name])), [dbCategories])
  const catNameToId = useMemo(() => Object.fromEntries(dbCategories.map(c => [c.name, c.id])), [dbCategories])
  const categoryOptions = useMemo(() => {
    const active = dbCategories.filter(c => c.status === 'Active')
    return active.map(c => c.name)
  }, [dbCategories])

  // Mutations
  const updateMut = useMutation({
    mutationFn: (updates: Parameters<typeof updateProduct>[2]) => updateProduct(shopId, id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products', shopId] })
      qc.invalidateQueries({ queryKey: ['product', shopId, id] })
      router.push('/catalog?saved=1')
    },
  })
  const deleteMut = useMutation({
    mutationFn: () => deleteProduct(shopId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products', shopId] })
      router.push('/catalog')
    },
  })

  // Convert DB product to form-friendly CatalogItem
  const formItem = useMemo(() => dbProduct ? dbToFormItem(dbProduct, catIdToName) : null, [dbProduct, catIdToName])

  const [item, setItem]       = useState<CatalogItem | null>(null)
  const [draft, setDraft]     = useState<CatalogItem | null>(null)
  const [showDel, setShowDel] = useState(false)
  const [saving, setSaving]   = useState(false)

  const [groups, setGroups] = useState<OptGrpRow[]>([])
  const [pricingMode, setPricingMode] = useState<'standard' | 'bulk'>('standard')
  const [bulkVTiers, setBulkVTiers]   = useState<VTierRow[]>([{ minQty: '1', unitPrice: '' }])
  const [sizeMode, setSizeMode]   = useState<SizeMode>('fixed')
  const [fixedSizes, setFixedSizes] = useState<FixedSizeRow[]>([emptySize()])
  const [sizesEnabled, setSizesEnabled] = useState(false)
  const origGroupsRef = useRef('')
  const origSizesRef  = useRef('')
  const origBulkRef   = useRef('')
  const initDoneRef   = useRef(false)

  // Test calculator (preview)
  const [testQty, setTestQty]       = useState('1')
  const [testQtyMode, setTestQtyMode] = useState<'preset' | 'custom'>('preset')
  const [testW, setTestW]           = useState('')
  const [testH, setTestH]           = useState('')
  const [testSel, setTestSel]       = useState<Record<number, Set<number>>>({})
  const [testSize, setTestSize]     = useState<string>('') // selected fixed size label or 'custom'
  const [testSizeUnit, setTestSizeUnit] = useState<string>('ft')
  const [sqftPrice, setSqftPrice]   = useState('')
  const [sqftMin,   setSqftMin]     = useState('')
  const [hoveredHelp,    setHoveredHelp]    = useState<number | null>(null)
  const [hoveredPreview, setHoveredPreview] = useState<number | null>(null)
  const [helpModal,    setHelpModal]    = useState<{ gi: number; text: string } | null>(null)
  const [previewModal, setPreviewModal] = useState<{ gi: number; image: string } | null>(null)

  // Product info tabs (editable)
  const INFO_TAB_KEYS = ['overview', 'printSpec', 'artworkGuidelines', 'processDuration', 'howToOrder', 'delivery'] as const
  const INFO_TAB_LABELS: Record<string, string> = {
    overview: 'Product Overview', printSpec: 'Print Spec & Artwork',
    artworkGuidelines: 'Artwork Guidelines', processDuration: 'Process Duration',
    howToOrder: 'How to Order', delivery: 'Delivery & Collection',
  }
  const [activeInfoTab, setActiveInfoTab] = useState<string>('overview')
  const [productInfo, setProductInfo] = useState<Record<string, string>>({
    overview: '', printSpec: '', artworkGuidelines: '', processDuration: '', howToOrder: '', delivery: '',
  })

  // Initialize form state from DB product (only once after data loads)
  useEffect(() => {
    if (!formItem || initDoneRef.current) return
    initDoneRef.current = true
    const c = formItem
    setItem(c)
    setDraft({ ...c })
    const initGroups = c.optionGroups?.length ? c.optionGroups.map(g => ({
      groupName: g.groupName, selectionType: g.selectionType, displayType: g.displayType ?? 'radio', required: g.required,
      options: g.options.map(o => ({ label: o.label, modifierType: o.modifierType, modifierValue: String(o.modifierValue), imageUrl: o.imageUrl ?? '' })),
      helpText: g.helpText ?? '', previewImage: g.previewImage ?? '',
    })) : []
    setGroups(initGroups)
    origGroupsRef.current = JSON.stringify(initGroups)
    // Detect bulk variant mode
    if (c.bulkVariant) {
      setPricingMode('bulk')
      const initBulk = c.volumeTiers?.length
        ? c.volumeTiers.map(t => ({ minQty: String(t.minQty), unitPrice: String(t.unitPrice) }))
        : [{ minQty: '1', unitPrice: '' }]
      setBulkVTiers(initBulk)
      origBulkRef.current = JSON.stringify(initBulk)
    }
    if (c.sizes) {
      setSizesEnabled(true)
      setSizeMode(c.sizes.mode)
      const initSizes = c.sizes.fixed.length ? c.sizes.fixed.map(s => ({
        label: s.label, width: s.width, height: s.height, unit: s.unit,
        basePrice: s.basePrice ?? '',
        tiers:  s.tiers?.length  ? s.tiers.map(t  => ({ minQty: String(t.minQty), maxQty: String(t.maxQty), unitPrice: String(t.unitPrice) })) : [{ minQty: '1', maxQty: '100', unitPrice: '' }],
        vTiers: s.volumeTiers?.length ? s.volumeTiers.map(t => ({ minQty: String(t.minQty), unitPrice: String(t.unitPrice) }))
          : (c.volumeTiers?.length ? c.volumeTiers.map(t => ({ minQty: String(t.minQty), unitPrice: String(t.unitPrice) }))
          : [{ minQty: '1', unitPrice: '' }]),
        expanded: false,
        customQtyEnabled: !!(s.customQtyOptions?.length),
        customQtyOptions: s.customQtyOptions?.join(', ') ?? '',
      })) : [emptySize()]
      setFixedSizes(initSizes)
      origSizesRef.current = JSON.stringify(initSizes)
      if (c.sizes.sqft) {
        setSqftPrice(String(c.sizes.sqft.pricePerSqft || ''))
        setSqftMin(String(c.sizes.sqft.minCharge || ''))
      }
    }
    if (c.productInfo) {
      setProductInfo({
        overview: c.productInfo.overview ?? '',
        printSpec: c.productInfo.printSpec ?? '',
        artworkGuidelines: c.productInfo.artworkGuidelines ?? '',
        processDuration: c.productInfo.processDuration ?? '',
        howToOrder: c.productInfo.howToOrder ?? '',
        delivery: c.productInfo.delivery ?? '',
      })
    }
  }, [formItem])

  // ── All derived state must be before early return (hooks rule) ────────

  // Selected size row for per-size pricing
  const selectedSizeRow = useMemo(
    () => (sizesEnabled && testSize && testSize !== 'custom')
      ? (fixedSizes.find(s => s.label === testSize) ?? null)
      : null,
    [sizesEnabled, testSize, fixedSizes]
  )

  // Live test calculator
  const testCalc = useMemo(() => {
    const qty = parseFloat(testQty) || 0

    // Bulk variant mode — use product-level volume tiers directly
    if (pricingMode === 'bulk') {
      const bTiers = bulkVTiers.map(t => ({ minQty: Number(t.minQty), unitPrice: Number(t.unitPrice) })).filter(t => t.unitPrice > 0)
      if (bTiers.length === 0) return { error: 'Add volume tiers to see pricing.' }
      const br = calcBasePrice('volume', qty, { volumeTiers: bTiers })
      if (!br.ok) return { error: br.error }
      const selOpts: { modifierType: 'add' | 'multiply'; modifierValue: number }[] = []
      groups.forEach((g, gi) => {
        const sel = testSel[gi]; if (!sel) return
        g.options.forEach((o, oi) => { if (sel.has(oi)) selOpts.push({ modifierType: o.modifierType, modifierValue: Number(o.modifierValue) || 0 }) })
      })
      const { finalTotal } = applyModifiers(br.price, selOpts)
      const perPc = br.price / qty
      return { basePrice: br.price, baseLabel: br.label, perPc, addTotal: 0, multTotal: 1, finalTotal }
    }

    const isCustom = testSize === 'custom' || sizeMode === 'custom'
    // No size selected yet — qty is visible but price stays blank
    if (!isCustom && sizesEnabled && (sizeMode === 'fixed' || sizeMode === 'both') && !testSize)
      return { idle: true as const }

    let br: ReturnType<typeof calcBasePrice>
    if (isCustom) {
      const w = parseFloat(testW) || 0
      const h = parseFloat(testH) || 0
      if (!w || !h) return { error: 'Enter width and height to calculate price.' }
      if (!sqftPrice) return { error: 'No custom size price configured.' }
      br = calcBasePrice('sqft', 1, {
        sqft: { pricePerSqft: Number(sqftPrice), minCharge: Number(sqftMin) || 0 },
        width: w, height: h, unit: testSizeUnit as 'ft' | 'in' | 'cm' | 'm',
      })
    } else {
      const effectiveVTiers = (selectedSizeRow?.vTiers ?? [])
        .map(t => ({ minQty: Number(t.minQty), unitPrice: Number(t.unitPrice) }))
        .filter(t => t.unitPrice > 0)
      if (effectiveVTiers.length > 0) {
        br = calcBasePrice('volume', qty, { volumeTiers: effectiveVTiers })
      } else {
        const bp = parseFloat(selectedSizeRow?.basePrice ?? '') || 0
        br = bp > 0
          ? { ok: true as const, price: bp * qty, label: `RM ${bp.toFixed(2)} × ${qty}` }
          : calcBasePrice('volume', qty, { volumeTiers: [] })
      }
    }

    if (!br.ok) return { error: br.error }
    const selOpts: { modifierType: 'add' | 'multiply'; modifierValue: number }[] = []
    groups.forEach((g, gi) => {
      const sel = testSel[gi]
      if (!sel) return
      g.options.forEach((o, oi) => {
        if (sel.has(oi)) selOpts.push({ modifierType: o.modifierType, modifierValue: Number(o.modifierValue) || 0 })
      })
    })
    const { addTotal, multTotal, finalTotal } = applyModifiers(br.price, selOpts)
    const perPc = isCustom ? null : br.price / qty
    return { basePrice: br.price, baseLabel: br.label, perPc, addTotal, multTotal, finalTotal }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pricingMode, bulkVTiers, sizesEnabled, sizeMode, testSize, testW, testH, testSizeUnit, sqftPrice, sqftMin, selectedSizeRow, testQty, testSel, groups])

  if (loadingProduct || !item) {
    return (
      <AppShell>
        <Link href="/catalog" className="back-btn"><BackIcon /> Catalog</Link>
        <div className="empty-state" style={{ paddingTop: 80 }}>{loadingProduct ? 'Loading…' : 'Product not found'}</div>
      </AppShell>
    )
  }

  const field = <K extends keyof CatalogItem>(key: K, value: CatalogItem[K]) => {
    setDraft(prev => prev ? { ...prev, [key]: value } : prev)
  }

  // ── Option group helpers ──────────────────────────────────────────────
  const addGroup    = () => setGroups(p => [...p, emptyGroup()])
  const removeGroup = (gi: number) => {
    setGroups(p => p.filter((_, i) => i !== gi))
    setTestSel(p => { const n = { ...p }; delete n[gi]; return n })
  }
  const updateGroup  = (gi: number, patch: Partial<OptGrpRow>) =>
    setGroups(p => p.map((g, i) => i === gi ? { ...g, ...patch } : g))
  const addOption    = (gi: number) =>
    setGroups(p => p.map((g, i) => i === gi ? { ...g, options: [...g.options, emptyOptVal()] } : g))
  const removeOption = (gi: number, oi: number) =>
    setGroups(p => p.map((g, i) => i === gi ? { ...g, options: g.options.filter((_, j) => j !== oi) } : g))
  const updateOption = (gi: number, oi: number, patch: Partial<OptValRow>) =>
    setGroups(p => p.map((g, i) =>
      i === gi ? { ...g, options: g.options.map((o, j) => j === oi ? { ...o, ...patch } : o) } : g))

  // ── Test selection toggle ────────────────────────────────────────────
  const toggleTest = (gi: number, oi: number, single: boolean) =>
    setTestSel(prev => {
      const cur = prev[gi] ? new Set(prev[gi]) : new Set<number>()
      if (single) return { ...prev, [gi]: cur.has(oi) ? new Set<number>() : new Set([oi]) }
      if (cur.has(oi)) cur.delete(oi); else cur.add(oi)
      return { ...prev, [gi]: new Set(cur) }
    })

  // ── Dirty detection ──────────────────────────────────────────────────
  const origInfo = item?.productInfo ?? {}
  const infoDirty = INFO_TAB_KEYS.some(k => (productInfo[k] || '') !== (origInfo[k as keyof typeof origInfo] || ''))
  const groupsDirty = JSON.stringify(groups) !== origGroupsRef.current
  const bulkDirty   = JSON.stringify(bulkVTiers) !== origBulkRef.current
  const sizesDirty  = JSON.stringify(fixedSizes) !== origSizesRef.current
  const origSizeMode = item?.sizes?.mode ?? 'fixed'
  const origSqftPrice = String(item?.sizes?.sqft?.pricePerSqft || '')
  const origSqftMin = String(item?.sizes?.sqft?.minCharge || '')
  const origSizesEnabled = !!(item?.sizes)
  const sizeConfigDirty = sizeMode !== origSizeMode || sqftPrice !== origSqftPrice || sqftMin !== origSqftMin || sizesEnabled !== origSizesEnabled
  const origPricingMode = item?.bulkVariant ? 'bulk' : 'standard'
  const dirty = draft !== null && (JSON.stringify(draft) !== JSON.stringify(item) || infoDirty || groupsDirty || bulkDirty || sizesDirty || sizeConfigDirty || pricingMode !== origPricingMode)

  // ── Save ─────────────────────────────────────────────────────────────
  const handleSave = () => {
    if (saving) return
    if (!draft) return
    setSaving(true)
    setTimeout(() => {
      const parsedGroups = groups.map(g => ({
        groupName: g.groupName, selectionType: g.selectionType, displayType: g.displayType, required: g.required,
        options: g.options.map(o => ({ label: o.label, modifierType: o.modifierType, modifierValue: Number(o.modifierValue) || 0, imageUrl: o.imageUrl || undefined })),
        helpText: g.helpText || undefined, previewImage: g.previewImage || undefined,
      }))
      const isBulk = pricingMode === 'bulk'
      const parsedBulkVTiers = bulkVTiers.map(t => ({ minQty: Number(t.minQty), unitPrice: Number(t.unitPrice) })).filter(t => t.unitPrice > 0)
      const sizesPayload = isBulk
        ? { mode: 'fixed', fixed: [{ label: 'Standard', width: '0', height: '0', unit: 'mm' }] }
        : sizesEnabled ? {
          mode: sizeMode,
          fixed: fixedSizes.filter(s => s.label || s.width || s.height).map(s => ({
            label: s.label, width: s.width, height: s.height, unit: s.unit,
            ...(s.basePrice ? { basePrice: s.basePrice } : {}),
            volumeTiers: s.vTiers.map(t => ({ minQty: Number(t.minQty), unitPrice: Number(t.unitPrice) })).filter(t => t.unitPrice > 0),
            ...(s.customQtyEnabled && s.customQtyOptions.trim()
              ? { customQtyOptions: s.customQtyOptions.split(',').map(v => Number(v.trim())).filter(n => n > 0) }
              : {}),
          })),
          ...((sizeMode === 'custom' || sizeMode === 'both') && sqftPrice
            ? { sqft: { pricePerSqft: Number(sqftPrice), minCharge: Number(sqftMin) || 0 } }
            : {}),
        } : undefined
      const productInfoPayload = Object.values(productInfo).some(v => v.trim()) ? {
        overview: productInfo.overview || undefined,
        printSpec: productInfo.printSpec || undefined,
        artworkGuidelines: productInfo.artworkGuidelines || undefined,
        processDuration: productInfo.processDuration || undefined,
        howToOrder: productInfo.howToOrder || undefined,
        delivery: productInfo.delivery || undefined,
      } : undefined

      // Build pricing object with volume tiers if applicable
      const pricing: Record<string, unknown> = {}
      if (isBulk && parsedBulkVTiers.length > 0) pricing.volumeTiers = parsedBulkVTiers

      updateMut.mutate({
        name: draft.name,
        sku: draft.sku,
        category_id: catNameToId[draft.category] ?? null,
        base_price: parseFloat(draft.price?.replace(/[^0-9.]/g, '') || '0') || 0,
        pricing_type: 'volume',
        status: draft.status,
        visibility: draft.visibility,
        description: draft.description,
        notes: draft.notes,
        main_image: draft.mainImage?.url ?? '',
        variant_images: (draft.variantImages ?? []) as unknown[],
        bulk_variant: isBulk || false,
        pricing,
        option_groups: parsedGroups.length > 0 ? parsedGroups as unknown[] : [],
        sizes: sizesPayload as Record<string, unknown> ?? {},
        product_info: productInfoPayload as Record<string, unknown> ?? {},
      })
    }, 1500)
  }

  const handleDelete = () => {
    deleteMut.mutate()
  }

  const canSave = dirty
  const statusStyle: Record<string, { border: string; color: string }> = {
    Active: { border: '#006AFF', color: '#006AFF' },
    Paused: { border: '#f59e0b', color: '#f59e0b' },
  }
  const ss = statusStyle[draft?.status ?? item.status] ?? { border: 'var(--text-secondary)', color: 'var(--text-secondary)' }
  const avatarInitial = (draft?.name || item.name || '?')[0].toUpperCase()

  return (
    <AppShell>
      {saving && <SavingOverlay message="Saving changes\u2026" />}

      {/* ── Page header bar ── */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <Link href="/catalog" className="back-btn"><BackIcon /> Catalog</Link>
        <div className="page-actions">
          <button className="btn-secondary" onClick={() => setShowDel(true)} style={{ color: 'var(--negative)' }}>Delete</button>
          <Link href="/catalog" className="btn-secondary" style={{ textDecoration: 'none' }}>Cancel</Link>
          <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ opacity: saving ? 0.5 : 1 }}>Save Changes</button>
        </div>
      </div>

      <div className="page-scroll">
        {/* ── Hero identity card ── */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px' }}>
          {/* Avatar */}
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'var(--accent)', color: 'white', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 700, letterSpacing: -0.5,
          }}>
            {avatarInitial}
          </div>
          {/* Name + meta */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: -0.4, lineHeight: 1.2 }}>
              {draft?.name || item.name}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>
              {draft?.category || item.category} · {dbProduct?.seq_id ?? item.id} · {draft?.sku || item.sku}
            </div>
          </div>
          {/* Status badge — outlined pill */}
          <span style={{
            padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, flexShrink: 0,
            border: `1.5px solid ${ss.border}`, color: ss.color, background: 'transparent',
          }}>
            {draft?.status ?? item.status}
          </span>
        </div>

        {draft && (
          <>
            {/* Product details */}
            <div className="card" style={{ padding: 20, marginBottom: 16 }}>
              <SectionTitle>Product Details</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group"><label className="form-label">Name</label><input className="form-input" value={draft.name} onChange={e => field('name', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">SKU</label><input className="form-input" value={draft.sku} onChange={e => field('sku', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Category</label><CustomSelect value={draft.category} onChange={v => field('category', v)} options={categoryOptions} /></div>
                <div className="form-group"><label className="form-label">Price (display)</label><input className="form-input" value={draft.price} onChange={e => field('price', e.target.value)} placeholder="e.g. RM 0.18/pc" /></div>
                <div className="form-group"><label className="form-label">Status</label><CustomSelect value={draft.status} onChange={v => field('status', v as CatalogItem['status'])} options={STATUSES} /></div>
                <div className="form-group"><label className="form-label">Visibility</label><CustomSelect value={draft.visibility} onChange={v => field('visibility', v as CatalogItem['visibility'])} options={VISIBILITIES.map(v => ({ value: v, label: v === 'published' ? 'Published' : 'Draft' }))} /></div>
              </div>
            </div>

            {/* Images */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div className="card" style={{ padding: 20 }}>
                <MainImageUpload image={draft.mainImage ?? null} onChange={img => field('mainImage', img)} />
              </div>
              <div className="card" style={{ padding: 20 }}>
                <VariantImagesUpload images={draft.variantImages ?? []} onChange={imgs => field('variantImages', imgs)} />
              </div>
            </div>

            {/* Description + Notes */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div className="card" style={{ padding: 20 }}>
                <SectionTitle>Description</SectionTitle>
                <textarea className="form-input" rows={4} value={draft.description} onChange={e => field('description', e.target.value)} placeholder="Short product description…" style={{ resize: 'vertical' }} />
              </div>
              <div className="card" style={{ padding: 20 }}>
                <SectionTitle>Notes</SectionTitle>
                <textarea className="form-input" rows={4} value={draft.notes} onChange={e => field('notes', e.target.value)} placeholder="Internal notes…" style={{ resize: 'vertical' }} />
              </div>
            </div>

            {/* Pricing engine + Option groups — side by side */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16, alignItems: 'start' }}>
            <div className="card" style={{ padding: 20 }}>
              <SectionTitle>Pricing Engine</SectionTitle>

              {/* ── Pricing mode toggle ── */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                {[
                  { value: 'standard', label: 'Standard' },
                  { value: 'bulk', label: 'Bulk Variant (Apparel)' },
                ].map(m => {
                  const active = pricingMode === m.value
                  return (
                    <button key={m.value} onClick={() => setPricingMode(m.value as 'standard' | 'bulk')}
                      style={{ padding: '6px 16px', borderRadius: 20, border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border)'}`, background: active ? 'var(--accent)' : 'transparent', color: active ? '#fff' : 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
                      {m.label}
                    </button>
                  )
                })}
              </div>

              {/* ── Bulk Variant pricing ── */}
              {pricingMode === 'bulk' && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Volume Pricing</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
                    All-inclusive pricing (garment + print). Tier is based on <strong>total quantity per design</strong>.
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 8 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        {['Min Qty', 'Unit Price (RM)', ''].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '5px 8px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: 12 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {bulkVTiers.map((t, ti) => (
                        <tr key={ti} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '5px 8px' }}><input className="form-input" type="number" min="0" value={t.minQty} onChange={e => setBulkVTiers(p => p.map((x, k) => k === ti ? { ...x, minQty: e.target.value } : x))} /></td>
                          <td style={{ padding: '5px 8px' }}><input className="form-input" type="number" min="0" step="0.01" value={t.unitPrice} onChange={e => setBulkVTiers(p => p.map((x, k) => k === ti ? { ...x, unitPrice: e.target.value } : x))} /></td>
                          <td style={{ padding: '5px 8px', width: 36 }}>
                            {bulkVTiers.length > 1 && <button onClick={() => setBulkVTiers(p => p.filter((_, k) => k !== ti))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}><TrashIcon /></button>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button onClick={() => setBulkVTiers(p => { const last = p[p.length - 1]; const next = last ? Number(last.minQty) + 50 : 1; return [...p, { minQty: String(next), unitPrice: '' }] })} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    <PlusIcon /> Add Breakpoint
                  </button>
                  <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg)', borderRadius: 8, padding: '10px 14px', border: '1px solid var(--border)' }}>
                    Option group modifiers (collar, sleeve, size, add-ons, etc.) are applied on top of the volume tier price.
                  </div>
                </div>
              )}

              {/* ── Standard: Sizes ── */}
              {pricingMode === 'standard' && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Sizes</div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, cursor: 'pointer', color: 'var(--text-secondary)' }}>
                    <input type="checkbox" checked={sizesEnabled} onChange={e => setSizesEnabled(e.target.checked)} />
                    Enable sizes
                  </label>
                </div>
                {sizesEnabled && (
                  <>
                    {/* Mode pills */}
                    <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
                      {SIZE_MODES.map(m => {
                        const active = sizeMode === m.value
                        return (
                          <button key={m.value} onClick={() => setSizeMode(m.value as SizeMode)}
                            style={{ padding: '5px 14px', borderRadius: 20, border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border)'}`, background: active ? 'var(--accent)' : 'transparent', color: active ? '#fff' : 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
                            {m.label}
                          </button>
                        )
                      })}
                    </div>

                    {/* Fixed sizes table with per-size pricing accordion */}
                    {(sizeMode === 'fixed' || sizeMode === 'both') && (
                      <>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 8 }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                              {['Label', 'Width', 'Height', 'Unit', 'Pricing', ''].map(h => (
                                <th key={h} style={{ textAlign: 'left', padding: '5px 8px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: 12 }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {fixedSizes.flatMap((s, i) => {
                              const rows = []
                              // ── Main size row ──
                              rows.push(
                                <tr key={`s-${i}`} style={{ borderBottom: s.expanded ? 'none' : '1px solid var(--border)' }}>
                                  <td style={{ padding: '5px 8px' }}><input className="form-input" value={s.label} onChange={e => setFixedSizes(p => p.map((r, j) => j === i ? { ...r, label: e.target.value } : r))} placeholder="e.g. A5" /></td>
                                  <td style={{ padding: '5px 8px' }}><input className="form-input" type="number" min="0" step="0.1" value={s.width} onChange={e => setFixedSizes(p => p.map((r, j) => j === i ? { ...r, width: e.target.value } : r))} placeholder="148" /></td>
                                  <td style={{ padding: '5px 8px' }}><input className="form-input" type="number" min="0" step="0.1" value={s.height} onChange={e => setFixedSizes(p => p.map((r, j) => j === i ? { ...r, height: e.target.value } : r))} placeholder="210" /></td>
                                  <td style={{ padding: '5px 8px', width: 90 }}><CustomSelect value={s.unit} onChange={v => setFixedSizes(p => p.map((r, j) => j === i ? { ...r, unit: v } : r))} options={SIZE_UNITS} /></td>
                                  <td style={{ padding: '5px 8px', width: 36 }}>
                                    <button
                                      onClick={() => setFixedSizes(p => p.map((r, j) => j === i ? { ...r, expanded: !r.expanded } : r))}
                                      title={s.expanded ? 'Collapse pricing' : 'Set pricing for this size'}
                                      style={{ width: 26, height: 26, borderRadius: 6, background: s.expanded ? 'var(--accent)' : (s.vTiers.some(t => t.unitPrice) ? 'rgba(0,106,255,0.1)' : 'var(--bg)'), color: s.expanded ? '#fff' : (s.vTiers.some(t => t.unitPrice) ? '#006AFF' : 'var(--text-muted)'), border: `1px solid ${s.expanded ? 'var(--accent)' : 'var(--border)'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    ><PriceTagIcon /></button>
                                  </td>
                                  <td style={{ padding: '5px 8px', width: 36 }}>
                                    {fixedSizes.length > 1 && (
                                      <button onClick={() => setFixedSizes(p => p.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}><TrashIcon /></button>
                                    )}
                                  </td>
                                </tr>
                              )
                              // ── Accordion pricing row ──
                              if (s.expanded) {
                                rows.push(
                                  <tr key={`e-${i}`} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td colSpan={6} style={{ padding: '12px 10px 16px', background: 'var(--bg)', borderTop: '1px dashed var(--border)' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                                          Pricing for <span style={{ color: 'var(--accent)' }}>{s.label || `Size ${i + 1}`}</span>
                                          <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>— overrides global pricing when this size is selected</span>
                                        </div>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)', userSelect: 'none' }}>
                                          <input
                                            type="checkbox"
                                            checked={s.customQtyEnabled}
                                            onChange={e => setFixedSizes(p => p.map((r, j) => j === i ? { ...r, customQtyEnabled: e.target.checked } : r))}
                                            style={{ accentColor: 'var(--accent)', width: 14, height: 14, cursor: 'pointer' }}
                                          />
                                          Custom qty options
                                        </label>
                                      </div>
                                      {s.customQtyEnabled && (
                                        <div style={{ marginBottom: 12, padding: '10px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }}>
                                          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                                            Qty options shown in storefront dropdown
                                          </div>
                                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
                                            Enter comma-separated values (e.g. <code style={{ background: 'var(--bg)', padding: '1px 5px', borderRadius: 4 }}>100, 500, 1000, 5000</code>)
                                          </div>
                                          <input
                                            className="form-input"
                                            value={s.customQtyOptions}
                                            onChange={e => setFixedSizes(p => p.map((r, j) => j === i ? { ...r, customQtyOptions: e.target.value } : r))}
                                            placeholder="e.g. 100, 500, 1000, 5000"
                                            style={{ fontSize: 12 }}
                                          />
                                          {s.customQtyOptions.trim() && (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
                                              {s.customQtyOptions.split(',').map(v => v.trim()).filter(v => Number(v) > 0).map(v => (
                                                <span key={v} style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
                                                  {Number(v).toLocaleString()}
                                                </span>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {/* Base price per size */}
                                      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Base Price (RM)</label>
                                        <input
                                          className="form-input"
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={s.basePrice}
                                          onChange={e => setFixedSizes(p => p.map((r, j) => j === i ? { ...r, basePrice: e.target.value } : r))}
                                          placeholder="e.g. 159"
                                          style={{ fontSize: 12, maxWidth: 160 }}
                                        />
                                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Fixed price per unit for this size</span>
                                      </div>

                                      {/* Volume pricing per size */}
                                      <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Volume Tiers <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional — overrides base price at higher quantities)</span></div>
                                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 8 }}>
                                        <thead>
                                          <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                            {['Min Qty', 'Unit Price (RM)', ''].map(h => (
                                              <th key={h} style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: 11 }}>{h}</th>
                                            ))}
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {s.vTiers.map((t, ti) => (
                                            <tr key={ti} style={{ borderBottom: '1px solid var(--border)' }}>
                                              <td style={{ padding: '4px 8px' }}><input className="form-input" type="number" min="0" value={t.minQty} onChange={e => setFixedSizes(p => p.map((r, j) => j === i ? { ...r, vTiers: r.vTiers.map((x, k) => k === ti ? { ...x, minQty: e.target.value } : x) } : r))} /></td>
                                              <td style={{ padding: '4px 8px' }}><input className="form-input" type="number" min="0" step="0.01" value={t.unitPrice} onChange={e => setFixedSizes(p => p.map((r, j) => j === i ? { ...r, vTiers: r.vTiers.map((x, k) => k === ti ? { ...x, unitPrice: e.target.value } : x) } : r))} /></td>
                                              <td style={{ padding: '4px 8px', width: 30 }}>
                                                {s.vTiers.length > 1 && <button onClick={() => setFixedSizes(p => p.map((r, j) => j === i ? { ...r, vTiers: r.vTiers.filter((_, k) => k !== ti) } : r))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}><TrashIcon /></button>}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                      <button onClick={() => setFixedSizes(p => p.map((r, j) => { if (j !== i) return r; const last = r.vTiers[r.vTiers.length - 1]; const next = last ? Number(last.minQty) + 100 : 1; return { ...r, vTiers: [...r.vTiers, { minQty: String(next), unitPrice: '' }] } }))} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                        <PlusIcon /> Add Breakpoint
                                      </button>
                                    </td>
                                  </tr>
                                )
                              }
                              return rows
                            })}
                          </tbody>
                        </table>
                        <button onClick={() => setFixedSizes(p => {
                          const first = p[0]
                          const base = emptySize()
                          if (first?.vTiers.some(t => t.unitPrice)) {
                            base.vTiers = first.vTiers.map(t => ({ ...t }))
                          }
                          return [...p, base]
                        })} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                          <PlusIcon /> Add Size
                        </button>
                      </>
                    )}
                    {sizeMode === 'custom' && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Customer will enter custom W × H dimensions in the storefront.</div>
                    )}

                    {/* Custom size sqft pricing */}
                    {(sizeMode === 'custom' || sizeMode === 'both') && (
                      <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px dashed var(--border)' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>
                          Custom Size Pricing
                          <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>— price = area × RM/sqft</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">RM per sqft</label>
                            <input className="form-input" type="number" min="0" step="0.01" value={sqftPrice} onChange={e => setSqftPrice(e.target.value)} placeholder="12.00" />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Min charge (RM)</label>
                            <input className="form-input" type="number" min="0" step="0.01" value={sqftMin} onChange={e => setSqftMin(e.target.value)} placeholder="0.00" />
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
              )}

            </div>

            {/* Option groups */}
            <div className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <SectionTitle>Option Groups</SectionTitle>
                <button onClick={addGroup} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  <PlusIcon /> Add Group
                </button>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
                Formula: <strong>FINAL = (basePrice + Σ add modifiers) × Π multiply modifiers</strong>. Add modifiers stack; multiply modifiers chain.
              </div>

              {groups.length === 0 && (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>No option groups. Click "+ Add Group" to create one.</div>
              )}

              {groups.map((g, gi) => (
                <div key={gi} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 12 }}>
                  {/* Group header */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                    <input className="form-input" value={g.groupName} onChange={e => updateGroup(gi, { groupName: e.target.value })} placeholder="Group name (e.g. Material, Finishing, Turnaround)" style={{ flex: 1 }} />
                    <CustomSelect value={g.displayType} onChange={v => {
                      const dt = v as OptGrpRow['displayType']
                      updateGroup(gi, { displayType: dt, ...(dt === 'dropdown' ? { selectionType: 'single' } : {}) })
                    }} options={DISPLAY_TYPES} />
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap', cursor: 'pointer' }}>
                      <input type="checkbox" checked={g.required} onChange={e => updateGroup(gi, { required: e.target.checked })} />
                      Required
                    </label>
                    {(g.displayType === 'radio' || g.displayType === 'image' || !g.displayType) && (
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap', cursor: 'pointer' }}>
                        <input type="checkbox" checked={g.selectionType === 'multi'} onChange={e => updateGroup(gi, { selectionType: e.target.checked ? 'multi' : 'single' })} />
                        Multiple
                      </label>
                    )}
                    {/* Help button */}
                    <button
                      onClick={() => setHelpModal({ gi, text: g.helpText })}
                      title={g.helpText ? 'Edit help content' : 'Add help content'}
                      style={{ width: 30, height: 30, borderRadius: 8, background: g.helpText ? '#eff6ff' : 'transparent', color: g.helpText ? '#3b82f6' : 'var(--text-muted)', border: `1.5px solid ${g.helpText ? '#93c5fd' : 'var(--border)'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                    ><HelpCircleIcon /></button>
                    {/* Preview image button */}
                    <button
                      onClick={() => setPreviewModal({ gi, image: g.previewImage })}
                      title={g.previewImage ? 'Edit preview image' : 'Add preview image'}
                      style={{ width: 30, height: 30, borderRadius: 8, background: g.previewImage ? '#f5f3ff' : 'transparent', color: g.previewImage ? '#7c3aed' : 'var(--text-muted)', border: `1.5px solid ${g.previewImage ? '#c4b5fd' : 'var(--border)'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                    ><ImagePreviewIcon /></button>
                    <button onClick={() => removeGroup(gi)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4 }}><TrashIcon /></button>
                  </div>

                  {/* Options table */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: 12 }}>Option Label</th>
                        {g.displayType === 'image' && <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: 12, width: 80 }}>Image</th>}
                        <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: 12, width: 130 }}>Modifier</th>
                        <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: 12, width: 150 }}>Value</th>
                        <th style={{ width: 36 }} />
                      </tr>
                    </thead>
                    <tbody>
                      {g.options.map((o, oi) => (
                        <tr key={oi} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '5px 8px' }}>
                            <input className="form-input" value={o.label} onChange={e => updateOption(gi, oi, { label: e.target.value })} placeholder="e.g. Gloss Laminate" />
                          </td>
                          {g.displayType === 'image' && (
                            <td style={{ padding: '5px 8px' }}>
                              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 52, height: 52, borderRadius: 8, border: '1.5px dashed var(--border)', cursor: 'pointer', overflow: 'hidden', background: o.imageUrl ? 'transparent' : 'var(--bg)' }}>
                                {o.imageUrl ? (
                                  <img src={o.imageUrl} alt={o.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  <span style={{ fontSize: 18, color: 'var(--text-muted)' }}>+</span>
                                )}
                                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                                  const file = e.target.files?.[0]
                                  if (!file) return
                                  const reader = new FileReader()
                                  reader.onload = ev => updateOption(gi, oi, { imageUrl: ev.target?.result as string })
                                  reader.readAsDataURL(file)
                                }} />
                              </label>
                            </td>
                          )}
                          <td style={{ padding: '5px 8px' }}>
                            <CustomSelect value={o.modifierType} onChange={v => updateOption(gi, oi, { modifierType: v as 'add' | 'multiply' })} options={MOD_TYPES} />
                          </td>
                          <td style={{ padding: '5px 8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: o.modifierType === 'add' ? '#006AFF' : '#7c3aed', minWidth: 28 }}>
                                {o.modifierType === 'add' ? '+RM' : '×'}
                              </span>
                              <input className="form-input" type="number" step="0.01" value={o.modifierValue} onChange={e => updateOption(gi, oi, { modifierValue: e.target.value })} placeholder={o.modifierType === 'add' ? '10.00' : '1.20'} style={{ flex: 1 }} />
                            </div>
                          </td>
                          <td style={{ padding: '5px 8px' }}>
                            {g.options.length > 1 && (
                              <button onClick={() => removeOption(gi, oi)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}><TrashIcon /></button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <button onClick={() => addOption(gi)} style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    <PlusIcon /> Add Option
                  </button>
                </div>
              ))}
            </div>
            </div>{/* end pricing + options grid */}

            {/* Product Information Tabs */}
            <div className="card" style={{ padding: 20, marginBottom: 16 }}>
              <SectionTitle>Product Information</SectionTitle>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
                Edit the content shown under each tab on the storefront product page. Leave blank to use default content.
              </div>

              {/* Tab bar */}
              <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 16, overflowX: 'auto' }}>
                {INFO_TAB_KEYS.map(k => (
                  <button key={k} onClick={() => setActiveInfoTab(k)} style={{
                    padding: '8px 14px', fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap',
                    borderBottom: activeInfoTab === k ? '2px solid var(--accent)' : '2px solid transparent',
                    color: activeInfoTab === k ? 'var(--accent)' : 'var(--text-muted)',
                    background: 'none', border: 'none', borderBottomStyle: 'solid', cursor: 'pointer',
                    fontFamily: 'var(--font)', transition: 'all .15s',
                  }}>{INFO_TAB_LABELS[k]}</button>
                ))}
              </div>

              {/* Active tab editor */}
              {INFO_TAB_KEYS.map(k => activeInfoTab === k && (
                <div key={k}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>{INFO_TAB_LABELS[k]}</div>
                  <textarea
                    className="form-input"
                    rows={8}
                    style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6, fontSize: 12.5, width: '100%' }}
                    value={productInfo[k]}
                    onChange={e => setProductInfo(prev => ({ ...prev, [k]: e.target.value }))}
                    placeholder={
                      k === 'overview' ? 'Describe the product features, materials, and use cases...' :
                      k === 'printSpec' ? 'Trim size, document size with bleed, bleed mm, safe area, min DPI, color mode...' :
                      k === 'artworkGuidelines' ? 'File formats accepted, resolution requirements, bleed and safe area details...' :
                      k === 'processDuration' ? 'Artwork verification time, production days, quality check & packing...' :
                      k === 'howToOrder' ? 'Step 1: Configure product, Step 2: Upload artwork, Step 3: Checkout, Step 4: We deliver...' :
                      'Self pick-up details, Peninsular Malaysia delivery, East Malaysia & international shipping...'
                    }
                  />
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, opacity: 0.7 }}>
                    Tip: Use line breaks to separate points. Each line will be displayed as a separate item on the storefront.
                  </div>
                </div>
              ))}
            </div>

            {/* Storefront Preview — always light */}
            <div className="card" data-theme="light" style={{ padding: 0, marginBottom: 16, overflow: 'hidden', colorScheme: 'light' }}>
              {/* Preview header bar */}
              <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg)' }}>
                <div style={{ display: 'flex', gap: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#fe5f57' }} />
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }} />
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
                </div>
                <div style={{ flex: 1, background: 'var(--bg-card)', borderRadius: 6, padding: '3px 10px', fontSize: 11, color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                  saasprint.my/product/{draft.sku?.toLowerCase() || draft.id}
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: 0.5, textTransform: 'uppercase' }}>Storefront Preview</span>
              </div>

              {/* Product layout — matches storefront detail view */}
              {(() => {
                const allImages = [draft.mainImage, ...(draft.variantImages || [])].filter(Boolean) as ProductImage[]
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: allImages.length > 0 ? '1.1fr 1fr' : '1fr', gap: 0, minHeight: 420 }}>

                    {/* Left — images */}
                    {allImages.length > 0 && (
                      <div style={{ padding: 20, borderRight: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #f0f0f0', height: 260, background: '#f9fafb' }}>
                          <img src={allImages[0].url} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} alt={draft.name} />
                        </div>
                        {allImages.length > 1 && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            {allImages.slice(0, 4).map((img, i) => (
                              <div key={i} style={{ width: 52, height: 52, borderRadius: 7, overflow: 'hidden', border: `2px solid ${i === 0 ? 'var(--accent)' : '#f0f0f0'}`, flexShrink: 0 }}>
                                <img src={img.url} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} alt="" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Right — details */}
                    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', maxHeight: 560 }}>
                      {/* Category + name + stars */}
                      <div>
                        <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em', background: 'rgba(0,106,255,0.08)', display: 'inline-block', padding: '2px 8px', borderRadius: 10, marginBottom: 6 }}>{draft.category || 'Uncategorised'}</div>
                        <div style={{ fontSize: 17, fontWeight: 800, color: '#111', lineHeight: 1.25, marginBottom: 4 }}>{draft.name || 'Product Name'}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ color: '#f59e0b', fontSize: 11, letterSpacing: 1 }}>★★★★★</span>
                          <span style={{ fontSize: 10, color: '#9ca3af' }}>(24 reviews)</span>
                        </div>
                      </div>

                      {/* Description */}
                      {draft.description && (
                        <div style={{ fontSize: 11.5, color: '#6b7280', lineHeight: 1.6 }}>
                          {draft.description.slice(0, 160)}{draft.description.length > 160 ? '…' : ''}
                        </div>
                      )}

                      {/* Size dropdown — hide in bulk mode (size is an option group) */}
                      {pricingMode !== 'bulk' && sizesEnabled && (sizeMode === 'fixed' || sizeMode === 'both') && (
                        <div>
                          <div style={{ fontSize: 10.5, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Size <span style={{ color: '#ef4444' }}>*</span></div>
                          <PreviewDropdown
                            value={testSize}
                            onChange={v => { setTestSize(v); setTestQtyMode('preset') }}
                            placeholder="— Select size —"
                            options={[
                              ...fixedSizes.filter(s => s.label).map(s => ({ value: s.label, label: `${s.label}${s.width && s.height ? ` — ${s.width}×${s.height} ${s.unit}` : ''}` })),
                              ...(sizeMode === 'both' ? [{ value: 'custom', label: 'Custom Size' }] : []),
                            ]}
                          />
                          {testSize === 'custom' && (
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                              <input className="form-input" type="number" min="0" step="0.1" placeholder="Width" value={testW} onChange={e => setTestW(e.target.value)} style={{ width: 80, fontSize: 11 }} />
                              <span style={{ color: '#9ca3af' }}>×</span>
                              <input className="form-input" type="number" min="0" step="0.1" placeholder="Height" value={testH} onChange={e => setTestH(e.target.value)} style={{ width: 80, fontSize: 11 }} />
                              <PreviewDropdown
                                value={testSizeUnit}
                                onChange={v => setTestSizeUnit(v)}
                                options={SQFT_UNITS.map(u => ({ value: u.value, label: u.label }))}
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* BULK MODE: Variant Builder */}
                      {pricingMode === 'bulk' ? (
                        <BulkVariantBuilder
                          groups={groups.map(g => ({
                            groupName: g.groupName,
                            selectionType: g.selectionType as 'single' | 'multi',
                            displayType: (g.options.some(o => o.modifierType === 'multiply') ? 'dropdown' : g.displayType) as 'radio' | 'dropdown' | 'image',
                            options: g.options.map(o => ({
                              label: o.label,
                              modifierType: o.modifierType,
                              modifierValue: parseFloat(o.modifierValue) || 0,
                            })),
                          }))}
                          volumeTiers={bulkVTiers.map(t => ({
                            minQty: parseInt(t.minQty) || 0,
                            unitPrice: parseFloat(t.unitPrice) || 0,
                          })).filter(t => t.unitPrice > 0)}
                        />
                      ) : (
                        <>
                      {/* Quantity dropdown */}
                      {(testSize !== 'custom' && sizeMode !== 'custom') && (
                        <div>
                          <div style={{ fontSize: 10.5, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Quantity <span style={{ color: '#ef4444' }}>*</span></div>
                          <PreviewDropdown
                            value={testQty}
                            onChange={v => { setTestQtyMode('preset'); setTestQty(v) }}
                            options={(() => {
                              const sr = selectedSizeRow ?? fixedSizes[0]
                              const cqo = sr?.customQtyOptions
                              const list = cqo && cqo.trim()
                                ? cqo.split(',').map(v => v.trim()).filter(v => Number(v) > 0).map(v => Number(v))
                                : (sr?.vTiers.filter(t => t.minQty && t.unitPrice).map(t => Number(t.minQty)) ?? [])
                              const opts = list.length > 0 ? list : [1, 10, 25, 50, 100, 250, 500, 1000]
                              return opts.map(q => ({ value: String(q), label: `${q.toLocaleString()}` }))
                            })()}
                          />
                        </div>
                      )}

                      {/* Option groups — displayType-aware, same as storefront */}
                      {groups.map((g, gi) => {
                        const hasMultiply = g.options.some(o => o.modifierType === 'multiply')
                        const dt = hasMultiply ? 'dropdown' : (g.displayType ?? 'radio')
                        const curSel = testSel[gi] ?? new Set<number>()
                        const isMulti = g.selectionType === 'multi'
                        const toggle = (oi: number) => toggleTest(gi, oi, !isMulti)
                        const curVal = curSel.size > 0 ? String([...curSel][0]) : ''
                        return (
                          <div key={gi}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                              <span style={{ fontSize: 10.5, fontWeight: 700, color: '#374151' }}>{g.groupName || `Option ${gi + 1}`}</span>
                              {g.required && <span style={{ color: '#ef4444', fontSize: 10.5 }}>*</span>}
                              {g.helpText && (
                                <span style={{ position: 'relative', display: 'inline-flex' }} onMouseEnter={() => setHoveredHelp(gi)} onMouseLeave={() => setHoveredHelp(null)}>
                                  <span style={{ width: 14, height: 14, borderRadius: '50%', background: 'var(--text-muted)', color: '#fff', fontSize: 9, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'default' }}>?</span>
                                  {hoveredHelp === gi && (
                                    <div style={{ position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)', background: '#1e293b', color: 'var(--bg, #f1f5f9)', fontSize: 11, lineHeight: 1.55, borderRadius: 8, padding: '8px 12px', whiteSpace: 'pre-wrap', maxWidth: 240, boxShadow: '0 4px 20px rgba(0,0,0,0.25)', zIndex: 50, pointerEvents: 'none' }}>
                                      {g.helpText}
                                      <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid #1e293b' }} />
                                    </div>
                                  )}
                                </span>
                              )}
                            </div>

                            {dt === 'dropdown' && (
                              <PreviewDropdown
                                value={curVal}
                                onChange={v => setTestSel(prev => ({ ...prev, [gi]: v !== '' ? new Set([Number(v)]) : new Set<number>() }))}
                                placeholder={`— Select ${g.groupName} —`}
                                options={g.options.map((o, oi) => ({ value: String(oi), label: o.label || `Option ${oi + 1}` }))}
                              />
                            )}

                            {dt === 'image' && (
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {g.options.map((o, oi) => {
                                  const active = curSel.has(oi)
                                  return (
                                    <div key={oi} onClick={() => toggle(oi)} style={{ width: 58, cursor: 'pointer', textAlign: 'center' }}>
                                      <div style={{ width: '100%', aspectRatio: '1', borderRadius: 7, overflow: 'hidden', border: `2px solid ${active ? 'var(--accent)' : '#e5e7eb'}`, background: '#f9fafb', marginBottom: 3, transition: 'border-color 0.15s' }}>
                                        {o.imageUrl ? <img src={o.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} alt={o.label} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🎨</div>}
                                      </div>
                                      <div style={{ fontSize: 9, fontWeight: active ? 700 : 400, color: active ? 'var(--accent)' : '#6b7280' }}>{o.label}</div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}

                            {dt === 'radio' && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {g.options.map((o, oi) => {
                                  const active = curSel.has(oi)
                                  return (
                                    <button key={oi} onClick={() => toggle(oi)} style={{ padding: '6px 16px', borderRadius: 20, fontSize: 11, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s', border: active ? '1.5px solid var(--accent)' : '1.5px solid #e5e7eb', background: active ? 'var(--accent)' : '#fff', color: active ? '#fff' : '#374151', fontFamily: 'inherit', lineHeight: 1.4 }}>
                                      {o.label || `Option ${oi + 1}`}
                                    </button>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })}

                      {/* Price box */}
                      {'idle' in testCalc ? null : 'error' in testCalc ? (
                        <div style={{ fontSize: 10.5, color: '#ef4444', background: 'rgba(239,68,68,0.06)', border: '1px solid #fecaca', borderRadius: 7, padding: '7px 10px' }}>⚠ {testCalc.error}</div>
                      ) : (
                        <div style={{ background: '#f9fafb', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '14px 16px' }}>
                          {/* Unit price + Total */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 }}>
                            <div>
                              <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 2 }}>Unit price</div>
                              <div style={{ fontSize: 22, fontWeight: 800, color: '#111' }}>
                                RM {testCalc.perPc != null ? testCalc.perPc.toFixed(2) : testCalc.finalTotal.toFixed(2)}<span style={{ fontSize: 11, fontWeight: 400, color: '#9ca3af' }}>/pc</span>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 2 }}>Total ({Number(testQty).toLocaleString()})</div>
                              <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--accent)' }}>RM {testCalc.finalTotal.toFixed(2)}</div>
                            </div>
                          </div>
                          {/* Production estimate */}
                          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 10, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#6b7280' }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            Estimated production: 3–5 working days
                          </div>
                        </div>
                      )}
                        </>
                      )}

                      {/* Artwork */}
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Artwork</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          <button disabled style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 0', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: 11, fontWeight: 600, cursor: 'default', fontFamily: 'inherit' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                            Upload Your Design
                          </button>
                          <button disabled style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 0', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: 11, fontWeight: 600, cursor: 'default', fontFamily: 'inherit' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                            Design with Canva
                          </button>
                          <button disabled style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 0', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: 11, fontWeight: 600, cursor: 'default', fontFamily: 'inherit' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                            Request Design
                          </button>
                          <button disabled style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 0', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: 11, fontWeight: 600, cursor: 'default', fontFamily: 'inherit' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                            Send via WhatsApp
                          </button>
                        </div>
                        <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 6 }}>You can also add to cart now and upload artwork later.</div>
                      </div>

                      {/* Add to Cart / Buy Now */}
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button disabled style={{ flex: 1, background: '#fff', color: '#111', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '11px 0', fontSize: 12, fontWeight: 700, cursor: 'default', fontFamily: 'inherit' }}>Add to Cart</button>
                        <button disabled style={{ flex: 1.3, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 0', fontSize: 12, fontWeight: 700, cursor: 'default', fontFamily: 'inherit' }}>Buy Now</button>
                      </div>

                    </div>
                  </div>
                )
              })()}
            </div>

          </>
        )}
      </div>

      {showDel && (
        <ConfirmModal title={`Delete ${dbProduct?.seq_id ?? item.id}?`} message={`This will permanently remove "${item.name}".`} confirmLabel="Delete Product" onConfirm={handleDelete} onCancel={() => setShowDel(false)} />
      )}

      {/* ── Help content modal ── */}
      {helpModal !== null && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setHelpModal(null) }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: 28, width: 520, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Help Content</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
              Write helpful info for customers. It will appear as a tooltip when they hover the <strong>?</strong> icon next to the option group name in the storefront.
            </div>
            <textarea
              className="form-input"
              rows={8}
              style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
              value={helpModal.text}
              onChange={e => setHelpModal(prev => prev ? { ...prev, text: e.target.value } : null)}
              placeholder="e.g. Choose the finish that best suits your design. Gloss gives a shiny look; Matte is more subtle and reduces fingerprints."
              autoFocus
            />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, textAlign: 'right' }}>{helpModal.text.length} chars</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
              <button onClick={() => setHelpModal(null)} style={{ padding: '8px 18px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              {helpModal.text && (
                <button onClick={() => { updateGroup(helpModal.gi, { helpText: '' }); setHelpModal(null) }} style={{ padding: '8px 18px', borderRadius: 8, border: '1.5px solid #fecaca', background: 'transparent', color: '#ef4444', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Remove</button>
              )}
              <button onClick={() => { updateGroup(helpModal.gi, { helpText: helpModal.text }); setHelpModal(null) }} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#006AFF', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Preview image modal ── */}
      {previewModal !== null && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setPreviewModal(null) }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: 28, width: 480, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Preview Image</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
              Upload an image that helps customers understand this option group. It will appear above the options in the storefront.
            </div>
            {previewModal.image ? (
              <div style={{ marginBottom: 16, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', position: 'relative' }}>
                <img src={previewModal.image} style={{ width: '100%', maxHeight: 260, objectFit: 'contain', display: 'block', background: 'var(--bg)' }} alt="Preview" />
                <button
                  onClick={() => setPreviewModal(prev => prev ? { ...prev, image: '' } : null)}
                  style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 6, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                ><TrashIcon /></button>
              </div>
            ) : (
              <label style={{ display: 'block', border: '2px dashed var(--border)', borderRadius: 10, padding: '40px 20px', textAlign: 'center', cursor: 'pointer', marginBottom: 16, color: 'var(--text-muted)', fontSize: 13, transition: 'border-color 0.15s' }}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault()
                  const file = e.dataTransfer.files?.[0]
                  if (!file || !file.type.startsWith('image/')) return
                  const reader = new FileReader()
                  reader.onload = ev => setPreviewModal(prev => prev ? { ...prev, image: ev.target?.result as string } : null)
                  reader.readAsDataURL(file)
                }}
              >
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const reader = new FileReader()
                  reader.onload = ev => setPreviewModal(prev => prev ? { ...prev, image: ev.target?.result as string } : null)
                  reader.readAsDataURL(file)
                }} />
                <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Click to upload or drag & drop</div>
                <div style={{ fontSize: 11 }}>PNG, JPG, WebP — any size</div>
              </label>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setPreviewModal(null)} style={{ padding: '8px 18px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => { updateGroup(previewModal.gi, { previewImage: previewModal.image }); setPreviewModal(null) }} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#006AFF', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
