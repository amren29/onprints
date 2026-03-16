'use client'

import { useState, useEffect, useRef } from 'react'
import { type PageSection, type GlobalSettings, type SectionCtx, SECTION_REGISTRY } from '@/lib/store-builder'
import { RenderSection } from './Renderers'
import { type CatalogItem } from '@/lib/catalog-store' // type-only import — keep until catalog-store is fully deleted
import { calcBasePrice, computeOptionPrice } from '@/lib/option-pricing'
// TODO: Migrate to DB calls — these are customer-facing order operations in the public storefront
import { createOrder, uid, getOrderById } from '@/lib/order-store'
import { getDiscounts, updateDiscount, initDiscountData, type Discount } from '@/lib/discount-store'
import { addNotification } from '@/lib/notification-store'

/* ── Icons ─────────────────────────────────────────────── */
const PackageIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>)
const StarIcon = () => (<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>)
const SearchIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>)
const CartIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 001.98 1.61h9.72a2 2 0 001.98-1.61L23 6H6"/></svg>)
const TrashIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>)

/* ── Cart item type ──────────────────────────────────── */
type CartItem = {
  id: string
  catalogId: string
  name: string
  sku: string
  qty: number
  unitPrice: number
  total: number
  optionSummary: string
  artworkOption: 'upload' | 'free-design' | 'create-design' | ''
  artworkFileName: string
}

type PreviewView = 'home' | 'products' | 'detail' | 'about' | 'contact' | 'quote' | 'cart' | 'checkout' | 'order-success' | 'track'

type Props = {
  sections: PageSection[]
  globalSettings: GlobalSettings
  isMobile: boolean
  catalogItems: CatalogItem[]
  enabledMap: Record<string, boolean>
  selectedSectionId: string | null
  onSelectSection: (id: string) => void
  onInlineEdit?: (sectionId: string, propPath: string, value: string) => void
  isPublic?: boolean
}

export default function PreviewRenderer({
  sections, globalSettings, isMobile, catalogItems, enabledMap,
  selectedSectionId, onSelectSection, onInlineEdit, isPublic,
}: Props) {
  const { shopName, tagline, accentColor, showPrices, published, slug,
    contactEmail, contactPhone, contactWhatsapp, contactAddress, showWhatsapp } = globalSettings

  const [view, setView] = useState<PreviewView>('home')
  const [selected, setSelected] = useState<CatalogItem | null>(null)
  const [filterCat, setFilterCat] = useState('')
  const [searchQ, setSearchQ] = useState('')
  const [activeImg, setActiveImg] = useState(0)
  const [chosenOpts, setChosenOpts] = useState<Record<string, string>>({})
  const [chosenMulti, setChosenMulti] = useState<Record<string, string[]>>({})
  const [qName, setQName] = useState(''); const [qEmail, setQEmail] = useState('')
  const [qPhone, setQPhone] = useState(''); const [qMsg, setQMsg] = useState('')
  const [qSent, setQSent] = useState(false)
  const [cName, setCName] = useState(''); const [cEmail, setCEmail] = useState('')
  const [cPhone, setCPhone] = useState(''); const [cProduct, setCProduct] = useState('')
  const [cSize, setCSize] = useState(''); const [cQty, setCQty] = useState('')
  const [cMaterial, setCMaterial] = useState(''); const [cTurnaround, setCTurnaround] = useState('Normal')
  const [cNotes, setCNotes] = useState(''); const [cFile, setCFile] = useState('')
  const [cMsg, setCMsg] = useState(''); const [cSent, setCSent] = useState(false)
  const [qty, setQty] = useState(1)
  const [customW, setCustomW] = useState('')
  const [customH, setCustomH] = useState('')
  const [customUnit, setCustomUnit] = useState<'ft' | 'in' | 'cm' | 'm'>('ft')
  const scrollRef = useRef<HTMLDivElement>(null)

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([])
  const [artworkStep, setArtworkStep] = useState(false)
  const [artworkOption, setArtworkOpt] = useState<CartItem['artworkOption']>('')
  const [artworkFile, setArtworkFile] = useState<File | null>(null)
  const [toast, setToast] = useState('')

  // Checkout state
  const [couponCode, setCouponCode] = useState('')
  const [couponApplied, setCouponApplied] = useState<Discount | null>(null)
  const [couponError, setCouponError] = useState('')
  const [contact, setContact] = useState({ name: '', email: '', phone: '', company: '' })
  const [delivery, setDelivery] = useState<'Delivery' | 'Self-Pickup'>('Self-Pickup')
  const [address, setAddress] = useState('')
  const [payMethod, setPayMethod] = useState('Online Banking')
  const [placing, setPlacing] = useState(false)
  const [orderId, setOrderId] = useState('')
  const [checkoutError, setCheckoutError] = useState('')

  // Order tracking state
  const [trackInput, setTrackInput]   = useState('')
  const [trackedOrder, setTrackedOrder] = useState<ReturnType<typeof getOrderById>>(null)
  const [trackError, setTrackError]   = useState('')

  useEffect(() => { setActiveImg(0); setChosenOpts({}); setChosenMulti({}); setQty(1); setArtworkStep(false); setArtworkOpt(''); setArtworkFile(null) }, [selected?.id])
  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }) }, [view, selected])
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 3000); return () => clearTimeout(t) }, [toast])
  useEffect(() => { initDiscountData() }, [])

  const enabledItems = catalogItems.filter(p =>
    enabledMap[p.id] !== false &&
    (enabledMap[p.id] === true || (p.visibility === 'published' && p.status === 'Active'))
  )
  const categories = [...new Set(enabledItems.map(p => p.category))]
  const filtered = enabledItems.filter(p => {
    if (filterCat && p.category !== filterCat) return false
    if (searchQ && !p.name.toLowerCase().includes(searchQ.toLowerCase())) return false
    return true
  })

  const nav = (v: string) => setView(v as PreviewView)
  const goDetail = (p: CatalogItem) => { setSelected(p); setView('detail') }
  const goProducts = (cat = '') => { setFilterCat(cat); setSearchQ(''); setView('products') }

  const ctx: SectionCtx = {
    accentColor, isMobile, showPrices, shopName, tagline,
    enabledItems, categories,
    goProducts: (cat?: string) => goProducts(cat || ''),
    goDetail, nav,
    contactEmail, contactPhone, contactWhatsapp, contactAddress,
    editingSectionId: selectedSectionId,
    onInlineEdit,
  }

  /* ── Scaling for editor vs public ───────────────── */
  const s = isPublic ? 1 : 1 // scale factor (kept for future use)

  /* ── Live price calc ───────────────────────────── */
  const calcFinalPrice = () => {
    if (!selected) return null
    const activeSizeLbl = chosenOpts['__size__'] ?? selected.sizes?.fixed[0]?.label
    const isCustomSize = activeSizeLbl === '__custom__' || selected.sizes?.mode === 'custom'
    const activeSize = isCustomSize ? undefined : selected.sizes?.fixed.find(sz => sz.label === activeSizeLbl)
    const selections: Record<string, string | string[]> = {}
    for (const [k, v] of Object.entries(chosenOpts)) { if (k !== '__size__') selections[k] = v }
    for (const [k, v] of Object.entries(chosenMulti)) { selections[k] = v }
    const pt = selected.pricingType
    let baseResult
    if (isCustomSize) {
      const w = parseFloat(customW) || 0
      const h = parseFloat(customH) || 0
      if (w <= 0 || h <= 0) return { error: 'Enter width and height for custom size.' }
      baseResult = calcBasePrice('sqft', qty, { sqft: selected.sqft ?? selected.sizes?.sqft, width: w, height: h, unit: customUnit })
    } else if (pt === 'volume') {
      const tiers = activeSize?.volumeTiers ?? selected.volumeTiers
      baseResult = calcBasePrice('volume', qty, { volumeTiers: tiers })
    } else if (pt === 'tier') {
      const tiers = activeSize?.tiers ?? selected.tiers
      baseResult = calcBasePrice('tier', qty, { tiers })
    } else if (pt === 'sqft') {
      const w = parseFloat(activeSize?.width ?? '0')
      const h = parseFloat(activeSize?.height ?? '0')
      const u = (activeSize?.unit ?? 'ft') as 'ft' | 'in' | 'cm' | 'm'
      baseResult = calcBasePrice('sqft', qty, { sqft: selected.sqft, width: w, height: h, unit: u })
    } else {
      baseResult = calcBasePrice('fixed', qty, { basePrice: activeSize?.basePrice ?? selected.basePrice })
    }
    if (!baseResult.ok) return { error: baseResult.error }
    const finalTotal = computeOptionPrice(baseResult.price, selected.optionGroups, selections)
    return { total: finalTotal, breakdown: baseResult.label }
  }

  /* ── URL bar text ─────────────────────────────── */
  const urlPath =
    view === 'home' ? '' :
    view === 'products' ? '/products' + (filterCat ? `?cat=${encodeURIComponent(filterCat)}` : '') :
    view === 'detail' ? `/p/${selected?.id.toLowerCase() ?? ''}` :
    view === 'about' ? '/about' :
    view === 'contact' ? '/contact' :
    view === 'cart' ? '/cart' :
    view === 'checkout' ? '/checkout' :
    view === 'order-success' ? `/order/${orderId}` :
    view === 'track' ? '/track' :
    '/quote'

  /* ── Date helpers ──────────────────────────────── */
  const todayStr = () => new Date().toISOString().slice(0, 10)
  const nowStr   = () => new Date().toISOString().slice(0, 16).replace('T', ' ')

  /* ── Coupon handler ────────────────────────────── */
  const handleApplyCoupon = () => {
    const discounts = getDiscounts()
    const found = discounts.find(d => d.code.toLowerCase() === couponCode.trim().toLowerCase())
    if (!found || found.status !== 'Active') { setCouponError('Invalid or inactive code'); return }
    if (found.expiry && new Date(found.expiry) < new Date()) { setCouponError('Code has expired'); return }
    if (found.usageLimit > 0 && found.usageCount >= found.usageLimit) { setCouponError('Code usage limit reached'); return }
    const subtotal = cart.reduce((s, c) => s + c.total, 0)
    if (found.minOrder > 0 && subtotal < found.minOrder) { setCouponError(`Minimum order RM ${found.minOrder.toFixed(2)} required`); return }
    setCouponApplied(found)
    setCouponError('')
  }

  /* ── Place order handler ───────────────────────── */
  const handlePlaceOrder = () => {
    if (!contact.name || !contact.email || !contact.phone) { setCheckoutError('Name, email and phone are required'); return }
    if (delivery === 'Delivery' && !address.trim()) { setCheckoutError('Please enter a delivery address'); return }
    if (cart.length === 0) { setCheckoutError('Cart is empty'); return }
    setCheckoutError('')
    setPlacing(true)
    const items = cart.map(c => ({
      id: uid(), name: c.name, sku: c.sku,
      qty: c.qty, unitPrice: c.unitPrice, total: c.total,
      optionSummary: c.optionSummary || undefined,
    }))
    const artworkNotes = cart.filter(c => c.artworkFileName).map(c => `${c.name}: ${c.artworkFileName}`).join('\n')
    const order = createOrder({
      customer:        contact.name,
      customerRef:     '',
      agent:           '',
      status:          'Pending',
      production:      '—',
      created:         todayStr(),
      dueDate:         '',
      deliveryMethod:  delivery,
      deliveryAddress: delivery === 'Delivery' ? address : '—',
      notes: [
        contact.email   && `Email: ${contact.email}`,
        contact.phone   && `Phone: ${contact.phone}`,
        contact.company && `Company: ${contact.company}`,
        payMethod       && `Payment: ${payMethod}`,
        delivery === 'Delivery' && `Courier: J&T Express (RM 8.00 flat rate)`,
        couponApplied   && `Coupon: ${couponApplied.code}`,
        artworkNotes    && `Artwork:\n${artworkNotes}`,
      ].filter(Boolean).join('\n'),
      source:   'online-store',
      items,
      payments:  [],
      timeline: [{ id: uid(), date: nowStr(), event: 'Order placed via Online Store', by: contact.name }],
      discount: 0, discountType: 'rm', sstEnabled: true, sstRate: 6,
      sstAmount: 0, rounding: 0, shippingCost: delivery === 'Delivery' ? 8 : 0,
      subtotal: 0, grandTotal: 0, currency: 'MYR',
    })
    if (couponApplied) updateDiscount(couponApplied.id, { usageCount: couponApplied.usageCount + 1 })
    const _sub = cart.reduce((s, c) => s + c.total, 0)
    const _ship = delivery === 'Delivery' ? 8 : 0
    const _disc = couponApplied
      ? couponApplied.type === 'percentage' ? _sub * (couponApplied.value / 100) : couponApplied.value
      : 0
    const orderTotal = _sub * 1.08 + _ship - _disc
    addNotification({
      type: 'success',
      title: `New order ${order.id} via Online Store`,
      message: `${contact.name} placed an order for RM ${orderTotal.toFixed(2)}. ${cart.length} item(s). Payment: ${payMethod}.`,
      link: `/orders/${order.id}`,
    })
    setOrderId(order.id)
    setCart([])
    setPlacing(false)
    nav('order-success')
  }

  /* ── Button helper ────────────────────────────── */
  const btnStyle = (active: boolean): React.CSSProperties => ({
    border: 'none', background: active ? `${accentColor}12` : 'transparent',
    cursor: 'pointer', fontSize: 12, color: active ? accentColor : '#6b7280',
    fontFamily: 'Inter,sans-serif', padding: '5px 12px', fontWeight: active ? 600 : 500,
    borderRadius: 8, transition: 'all 0.15s',
  })

  /* ── Input style helper ─────────────────────────── */
  const inputSt = (): React.CSSProperties => ({
    padding: isMobile ? '9px 12px' : '10px 14px', fontSize: isMobile ? 12 : 13, borderRadius: 10,
    border: '1.5px solid #e5e7eb', outline: 'none', fontFamily: 'Inter, sans-serif',
    transition: 'border-color 0.15s', background: '#fafafa', color: '#111', width: '100%',
    boxSizing: 'border-box',
  })

  /* ── Shell wrapper (browser chrome + nav + footer) ── */
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const Navbar = () => (
    <div style={{
      padding: isPublic ? (isMobile ? '14px 20px' : '16px 40px') : (isMobile ? '10px 14px' : '14px 24px'),
      borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      position: 'sticky', top: 0, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
      zIndex: 10,
    }}>
      <button onClick={() => { nav('home'); setMobileMenuOpen(false) }} style={{
        fontWeight: 800, fontSize: isPublic ? (isMobile ? 18 : 22) : (isMobile ? 13 : 16),
        color: accentColor, border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, fontFamily: 'Inter,sans-serif',
      }}>
        {shopName}
      </button>
      {!isMobile && (
        <div style={{ display: 'flex', gap: isPublic ? 6 : 4 }}>
          <button onClick={() => goProducts()} style={btnStyle(view === 'products')}>Products</button>
          <button onClick={() => nav('about')} style={btnStyle(view === 'about')}>About</button>
          <button onClick={() => nav('contact')} style={btnStyle(view === 'contact')}>Contact</button>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {!isMobile && <button onClick={() => { setTrackInput(''); setTrackedOrder(null); setTrackError(''); nav('track') }} style={btnStyle(view === 'track')}>Track Order</button>}
        <button onClick={() => nav('cart')} style={{ position: 'relative', border: 'none', background: 'transparent', cursor: 'pointer', padding: 6, color: '#374151', display: 'flex', alignItems: 'center' }}>
          <CartIcon />
          {cart.length > 0 && (
            <span style={{ position: 'absolute', top: -4, right: -4, background: '#ef4444', color: '#fff', borderRadius: '50%', width: 17, height: 17, fontSize: 9.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
              {cart.length}
            </span>
          )}
        </button>
        <button onClick={() => { setQSent(false); nav('quote') }} style={{
          background: accentColor, color: '#fff', border: 'none', borderRadius: 10,
          padding: isPublic ? (isMobile ? '8px 16px' : '10px 22px') : (isMobile ? '5px 10px' : '7px 16px'),
          fontSize: isPublic ? (isMobile ? 13 : 14) : (isMobile ? 10 : 12), fontWeight: 700, cursor: 'pointer',
          boxShadow: `0 2px 8px ${accentColor}33`,
        }}>
          Get Quote
        </button>
        {isMobile && (
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{
            border: 'none', background: 'transparent', cursor: 'pointer', padding: 4,
            fontSize: isPublic ? 22 : 16, color: '#374151',
          }}>
            {mobileMenuOpen ? '\u2715' : '\u2630'}
          </button>
        )}
      </div>
    </div>
  )

  const MobileMenu = () => (
    isMobile && mobileMenuOpen ? (
      <div style={{ position: 'sticky', top: isPublic ? 56 : 44, zIndex: 9, background: '#fff', borderBottom: '1px solid #f0f0f0', padding: '6px 20px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {[
          { label: 'Products', fn: () => goProducts() },
          { label: 'About', fn: () => nav('about') },
          { label: 'Contact', fn: () => nav('contact') },
        ].map(item => (
          <button key={item.label} onClick={() => { item.fn(); setMobileMenuOpen(false) }} style={{
            border: 'none', background: 'transparent', cursor: 'pointer', padding: '10px 0',
            fontSize: isPublic ? 15 : 12, fontWeight: 500, color: '#374151', textAlign: 'left',
            fontFamily: 'Inter,sans-serif', borderBottom: '1px solid #f7f7f7',
          }}>
            {item.label}
          </button>
        ))}
      </div>
    ) : null
  )

  const FooterContent = () => (
    <div style={{
      background: '#111',
      padding: isPublic ? (isMobile ? '28px 20px' : '36px 40px') : (isMobile ? '14px 14px' : '20px 24px'),
    }}>
      <div style={{
        display: 'flex', flexDirection: isPublic && !isMobile ? 'row' : 'column',
        justifyContent: 'space-between', gap: isPublic ? (isMobile ? 20 : 0) : 10,
        marginBottom: isPublic ? 20 : 10,
      }}>
        <div>
          <div style={{ fontSize: isPublic ? (isMobile ? 16 : 18) : 12, fontWeight: 800, color: '#fff', marginBottom: 4 }}>{shopName}</div>
          <div style={{ fontSize: isPublic ? 13 : 10, color: '#9ca3af', maxWidth: 300 }}>{tagline}</div>
        </div>
        <div style={{ display: 'flex', gap: isPublic ? 40 : 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: isPublic ? 10 : 8.5, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Links</div>
            {[['Products', () => goProducts()], ['About', () => nav('about')], ['Contact', () => nav('contact')]].map(([label, fn]) => (
              <button key={label as string} onClick={fn as () => void} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: isPublic ? 13 : 10, color: '#9ca3af', padding: 0, fontFamily: 'Inter,sans-serif', textAlign: 'left' }}
                onMouseEnter={e => { (e.currentTarget).style.color = '#fff' }}
                onMouseLeave={e => { (e.currentTarget).style.color = '#9ca3af' }}>
                {label as string}
              </button>
            ))}
          </div>
          {(contactEmail || contactPhone) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontSize: isPublic ? 10 : 8.5, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Contact</div>
              {contactEmail && <div style={{ fontSize: isPublic ? 13 : 10, color: '#9ca3af' }}>{contactEmail}</div>}
              {contactPhone && <div style={{ fontSize: isPublic ? 13 : 10, color: '#9ca3af' }}>{contactPhone}</div>}
            </div>
          )}
        </div>
      </div>
      <div style={{ borderTop: '1px solid #222', paddingTop: isPublic ? 14 : 8, fontSize: isPublic ? 12 : 9, color: '#6b7280', textAlign: 'center' }}>
        &copy; {new Date().getFullYear()} {shopName}. All rights reserved.
      </div>
    </div>
  )

  const Shell = ({ children }: { children: React.ReactNode }) => {
    if (isPublic) return (
      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 16, lineHeight: 1.6, color: '#111', background: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <MobileMenu />
        <div ref={scrollRef} style={{ flex: 1 }}>{children}</div>
        <FooterContent />
        {toast && (
          <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', background: '#111', color: '#fff', padding: '12px 22px', borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.25)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#4ade80' }}>✓</span> {toast}
          </div>
        )}
      </div>
    )

    return (
      <div style={{
        background: '#f8f9fa', borderRadius: 12, overflow: 'hidden',
        border: '1px solid var(--border)',
        width: isMobile ? 300 : '100%', margin: isMobile ? '0 auto' : 0,
        fontFamily: 'Inter, sans-serif', fontSize: 13, display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ background: '#e5e7eb', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#fc5c65' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#fed330' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#26de81' }} />
          <div style={{ flex: 1, background: '#fff', borderRadius: 4, padding: '3px 10px', marginLeft: 8, fontSize: 10.5, color: '#6b7280', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            saasprint.my/s/{slug}{urlPath}
            {!published && view === 'home' && <span style={{ marginLeft: 6, color: '#f59e0b', fontFamily: 'Inter,sans-serif', fontWeight: 600 }}>[Draft]</span>}
          </div>
        </div>
        <div ref={scrollRef} style={{ background: '#fff', overflowY: 'auto', flex: 1 }}>
          <Navbar />
          <MobileMenu />
          {children}
          <FooterContent />
        </div>
        {toast && (
          <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', background: '#111', color: '#fff', padding: '10px 18px', borderRadius: 10, fontSize: 12, fontWeight: 600, zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.25)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#4ade80' }}>✓</span> {toast}
          </div>
        )}
      </div>
    )
  }

  /* ── ProductCard (modernized) ────────────────────── */
  const ProductCard = ({ p }: { p: CatalogItem }) => (
    <div onClick={() => goDetail(p)}
      style={{
        background: '#fff', borderRadius: 14, overflow: 'hidden', cursor: 'pointer',
        transition: 'box-shadow 0.2s, transform 0.2s',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        border: '1px solid #f0f0f0',
      }}
      onMouseEnter={e => { const el = e.currentTarget; el.style.boxShadow = '0 8px 28px rgba(0,0,0,0.12)'; el.style.transform = 'translateY(-3px)' }}
      onMouseLeave={e => { const el = e.currentTarget; el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'; el.style.transform = 'none' }}
    >
      <div style={{ height: isMobile ? 100 : 160, overflow: 'hidden', position: 'relative', background: `linear-gradient(135deg, ${accentColor}15, ${accentColor}05)` }}>
        {p.mainImage?.url
          ? <img src={p.mainImage.url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.3s' }}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
              onMouseEnter={e => { (e.target as HTMLImageElement).style.transform = 'scale(1.05)' }}
              onMouseLeave={e => { (e.target as HTMLImageElement).style.transform = 'scale(1)' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: accentColor, opacity: 0.5 }}><PackageIcon /></div>
        }
        <div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(4px)', color: '#374151', fontSize: 9.5, fontWeight: 600, padding: '3px 8px', borderRadius: 20 }}>{p.category}</div>
      </div>
      <div style={{ padding: isMobile ? '10px 12px 12px' : '14px 16px 16px' }}>
        <div style={{ fontSize: isMobile ? 12 : 13.5, fontWeight: 700, color: '#111', lineHeight: 1.3, marginBottom: 6 }}>{p.name}</div>
        {showPrices && <div style={{ fontSize: isMobile ? 11 : 13, color: accentColor, fontWeight: 800 }}>{p.price}</div>}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: isMobile ? 8 : 10 }}>
          <div style={{ display: 'flex', gap: 2, color: '#f59e0b' }}><StarIcon /><StarIcon /><StarIcon /><StarIcon /><StarIcon /></div>
          <div style={{
            background: `${accentColor}12`, color: accentColor, borderRadius: 8,
            padding: '4px 10px', fontSize: isMobile ? 9.5 : 10.5, fontWeight: 700, letterSpacing: '0.02em',
          }}>View</div>
        </div>
      </div>
    </div>
  )

  /* ═══════════════════════════════════════════════════
     HOME — renders sections[] from builder
  ═══════════════════════════════════════════════════ */
  if (view === 'home') return (
    <Shell>
      {sections.map(sec => {
        if (!sec.visible) return null
        if (isPublic) return <div key={sec.id}>{RenderSection(sec, ctx, sec.id)}</div>
        const isSelected = selectedSectionId === sec.id
        return (
          <div
            key={sec.id}
            onClick={() => onSelectSection(sec.id)}
            style={{
              position: 'relative', cursor: 'pointer',
              outline: isSelected ? '2px solid #3b82f6' : undefined,
              outlineOffset: -2,
              transition: 'outline 0.15s',
            }}
          >
            {isSelected && (
              <div style={{
                position: 'absolute', top: 0, left: 0, zIndex: 20,
                background: '#3b82f6', color: '#fff',
                fontSize: 10, fontWeight: 600,
                padding: '2px 8px', lineHeight: '18px',
                borderBottomRightRadius: 6,
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
              }}>
                {SECTION_REGISTRY[sec.type]?.label || sec.type}
              </div>
            )}
            {RenderSection(sec, ctx, sec.id)}
          </div>
        )
      })}
      {sections.filter(s => s.visible).length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>&#128196;</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No sections yet</div>
          <div style={{ fontSize: 12 }}>Add sections from the left panel to build your page</div>
        </div>
      )}
    </Shell>
  )

  /* ═══════════════════════════════════════════════════
     PRODUCTS (modernized)
  ═══════════════════════════════════════════════════ */
  if (view === 'products') return (
    <Shell>
      <div style={{ padding: isMobile ? '18px 14px' : '28px 28px' }}>
        {/* Header area */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: isMobile ? 18 : 24, fontWeight: 800, color: '#111', marginBottom: 4, letterSpacing: '-0.02em' }}>{filterCat || 'All Products'}</div>
          <div style={{ fontSize: isMobile ? 11.5 : 13, color: '#9ca3af' }}>{filtered.length} product{filtered.length !== 1 ? 's' : ''} available</div>
        </div>

        {/* Search bar */}
        <div style={{ position: 'relative', marginBottom: 16, maxWidth: isMobile ? '100%' : 320 }}>
          <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', display: 'flex' }}><SearchIcon /></div>
          <input
            value={searchQ} onChange={e => setSearchQ(e.target.value)}
            placeholder="Search products..."
            style={{ ...inputSt(), paddingLeft: 34, background: '#f9fafb' }}
          />
        </div>

        {/* Category filters */}
        {categories.length > 1 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
            <button onClick={() => setFilterCat('')} style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
              border: !filterCat ? 'none' : '1.5px solid #e5e7eb',
              background: !filterCat ? accentColor : '#fff', color: !filterCat ? '#fff' : '#6b7280',
              fontFamily: 'Inter,sans-serif', transition: 'all 0.15s',
              boxShadow: !filterCat ? `0 2px 8px ${accentColor}33` : 'none',
            }}>All</button>
            {categories.map(cat => (
              <button key={cat} onClick={() => setFilterCat(cat)} style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                border: filterCat === cat ? 'none' : '1.5px solid #e5e7eb',
                background: filterCat === cat ? accentColor : '#fff', color: filterCat === cat ? '#fff' : '#6b7280',
                fontFamily: 'Inter,sans-serif', transition: 'all 0.15s',
                boxShadow: filterCat === cat ? `0 2px 8px ${accentColor}33` : 'none',
              }}>
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Product grid */}
        {filtered.length === 0
          ? <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>&#128269;</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>No products found</div>
              <div style={{ fontSize: 12 }}>Try a different search or category</div>
            </div>
          : <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: isMobile ? 10 : 16 }}>
              {filtered.map(p => <ProductCard key={p.id} p={p} />)}
            </div>
        }
      </div>
    </Shell>
  )

  /* ═══════════════════════════════════════════════════
     DETAIL (modernized)
  ═══════════════════════════════════════════════════ */
  if (view === 'detail' && selected) {
    const allImages = [selected.mainImage, ...(selected.variantImages || [])].filter(Boolean) as { url: string; name: string }[]
    const curImg = allImages[activeImg]
    const opts = selected.optionGroups || []
    return (
      <Shell>
        {/* Breadcrumb */}
        <div style={{ padding: isMobile ? '10px 14px' : '12px 28px', borderBottom: '1px solid #f7f7f7', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, flexWrap: 'wrap' }}>
          <button onClick={() => nav('home')} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 11, color: accentColor, padding: 0, fontFamily: 'Inter,sans-serif', fontWeight: 500 }}>Home</button>
          <span style={{ color: '#d1d5db' }}>&rsaquo;</span>
          <button onClick={() => goProducts(selected.category)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 11, color: accentColor, padding: 0, fontFamily: 'Inter,sans-serif', fontWeight: 500 }}>{selected.category}</button>
          <span style={{ color: '#d1d5db' }}>&rsaquo;</span>
          <span style={{ color: '#374151', fontWeight: 600 }}>{selected.name}</span>
        </div>

        <div style={{ padding: isMobile ? '18px 14px' : '28px 28px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.1fr 1fr', gap: isMobile ? 18 : 28 }}>
          {/* Images */}
          <div>
            <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid #f0f0f0', marginBottom: 10, height: isMobile ? 180 : 280, background: `linear-gradient(135deg, ${accentColor}12, ${accentColor}04)` }}>
              {curImg
                ? <img src={curImg.url} alt={curImg.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: accentColor, opacity: 0.4 }}><PackageIcon /></div>
              }
            </div>
            {allImages.length > 1 && (
              <div style={{ display: 'flex', gap: 8 }}>
                {allImages.slice(0, 4).map((img, i) => (
                  <div key={i} onClick={() => setActiveImg(i)} style={{
                    width: isMobile ? 48 : 62, height: isMobile ? 48 : 62, borderRadius: 10, overflow: 'hidden',
                    border: `2.5px solid ${i === activeImg ? accentColor : '#f0f0f0'}`, flexShrink: 0, cursor: 'pointer',
                    transition: 'border-color 0.15s',
                  }}>
                    <img src={img.url} alt={img.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 12 : 16 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: accentColor, textTransform: 'uppercase', letterSpacing: '0.06em', background: `${accentColor}12`, display: 'inline-block', padding: '3px 10px', borderRadius: 20, marginBottom: 8 }}>{selected.category}</div>
              <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, color: '#111', lineHeight: 1.2, marginBottom: 6, letterSpacing: '-0.02em' }}>{selected.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ display: 'flex', gap: 2, color: '#f59e0b' }}><StarIcon /><StarIcon /><StarIcon /><StarIcon /><StarIcon /></div>
                <span style={{ fontSize: 11, color: '#9ca3af' }}>(24 reviews)</span>
              </div>
            </div>

            {/* Pricing display */}
            {showPrices && (() => {
              const pt = selected.pricingType
              if (pt === 'tier' && selected.tiers && selected.tiers.length > 0) {
                return (
                  <div style={{ background: `${accentColor}08`, border: `1.5px solid ${accentColor}20`, borderRadius: 12, padding: '12px 14px' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Pricing Tiers</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {selected.tiers.map((t, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#374151' }}>
                          <span style={{ color: '#6b7280' }}>{t.minQty}&ndash;{t.maxQty}</span>
                          <span style={{ fontWeight: 700, color: accentColor }}>RM {t.unitPrice.toFixed(2)} / pc</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              }
              if (pt === 'volume' && selected.volumeTiers && selected.volumeTiers.length > 0) {
                return (
                  <div style={{ background: `${accentColor}08`, border: `1.5px solid ${accentColor}20`, borderRadius: 12, padding: '12px 14px' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Volume Pricing</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {selected.volumeTiers.map((t, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#374151' }}>
                          <span style={{ color: '#6b7280' }}>{t.minQty}+</span>
                          <span style={{ fontWeight: 700, color: accentColor }}>RM {t.unitPrice.toFixed(2)} / pc</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              }
              if (pt === 'sqft' && selected.sqft) {
                return (
                  <div style={{ background: `${accentColor}08`, border: `1.5px solid ${accentColor}20`, borderRadius: 12, padding: '12px 14px' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Sqft Pricing</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: accentColor }}>RM {selected.sqft.pricePerSqft.toFixed(2)} / sqft</div>
                    {selected.sqft.minCharge ? <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>Min. charge: RM {selected.sqft.minCharge.toFixed(2)}</div> : null}
                  </div>
                )
              }
              return <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: accentColor }}>{selected.price}</div>
            })()}

            {selected.description && (
              <div style={{ fontSize: isMobile ? 12 : 13, color: '#6b7280', lineHeight: 1.7 }}>
                {selected.description.slice(0, isMobile ? 120 : 200)}{selected.description.length > (isMobile ? 120 : 200) ? '\u2026' : ''}
              </div>
            )}

            {/* Sizes dropdown / custom size inputs */}
            {selected.sizes && (selected.sizes.mode === 'custom' ? (
              /* Custom size only mode — show width × height inputs */
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Custom Size <span style={{ color: '#ef4444' }}>*</span></div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input type="number" placeholder="Width" value={customW} onChange={e => setCustomW(e.target.value)} style={{ ...inputSt(), flex: 1 }} min="0" step="0.1" />
                  <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600 }}>×</span>
                  <input type="number" placeholder="Height" value={customH} onChange={e => setCustomH(e.target.value)} style={{ ...inputSt(), flex: 1 }} min="0" step="0.1" />
                  <select value={customUnit} onChange={e => setCustomUnit(e.target.value as typeof customUnit)} style={{ ...inputSt(), width: 60 }}>
                    <option value="ft">ft</option><option value="in">in</option><option value="cm">cm</option><option value="m">m</option>
                  </select>
                </div>
              </div>
            ) : selected.sizes.fixed && selected.sizes.fixed.length > 0 ? (
              /* Fixed or Both mode — show dropdown with optional custom entry */
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Size <span style={{ color: '#ef4444' }}>*</span></div>
                <select
                  value={chosenOpts['__size__'] ?? selected.sizes.fixed[0]?.label ?? ''}
                  onChange={e => setChosenOpts(prev => ({ ...prev, '__size__': e.target.value }))}
                  style={{ ...inputSt(), cursor: 'pointer' }}
                >
                  {selected.sizes.fixed.map(sz => (
                    <option key={sz.label} value={sz.label}>
                      {sz.label}{sz.width && sz.height ? ` \u2014 ${sz.width}\u00D7${sz.height}${sz.unit}` : ''}
                    </option>
                  ))}
                  {selected.sizes.mode === 'both' && (
                    <option value="__custom__">Custom Size</option>
                  )}
                </select>
                {/* Show custom size inputs when "Custom Size" is selected in both mode */}
                {chosenOpts['__size__'] === '__custom__' && (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 8 }}>
                    <input type="number" placeholder="Width" value={customW} onChange={e => setCustomW(e.target.value)} style={{ ...inputSt(), flex: 1 }} min="0" step="0.1" />
                    <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600 }}>×</span>
                    <input type="number" placeholder="Height" value={customH} onChange={e => setCustomH(e.target.value)} style={{ ...inputSt(), flex: 1 }} min="0" step="0.1" />
                    <select value={customUnit} onChange={e => setCustomUnit(e.target.value as typeof customUnit)} style={{ ...inputSt(), width: 60 }}>
                      <option value="ft">ft</option><option value="in">in</option><option value="cm">cm</option><option value="m">m</option>
                    </select>
                  </div>
                )}
              </div>
            ) : null)}

            {/* Quantity */}
            {(() => {
              const activeSizeLbl = chosenOpts['__size__'] ?? selected.sizes?.fixed[0]?.label
              const activeSize = selected.sizes?.fixed.find(sz => sz.label === activeSizeLbl)
              const tiers = activeSize?.volumeTiers ?? activeSize?.tiers?.map(t => ({ minQty: t.minQty })) ?? selected.volumeTiers
              const qtyOptions: number[] = activeSize?.customQtyOptions?.length
                ? [...activeSize.customQtyOptions]
                : tiers && tiers.length > 0
                  ? tiers.map(t => t.minQty)
                  : [1, 10, 25, 50, 100, 250, 500, 1000]
              if (!qtyOptions.includes(qty)) qtyOptions.unshift(qty)
              return (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Quantity <span style={{ color: '#ef4444' }}>*</span></div>
                  <select value={qty} onChange={e => setQty(Number(e.target.value))} style={{ ...inputSt(), cursor: 'pointer' }}>
                    {qtyOptions.map(q => <option key={q} value={q}>{q.toLocaleString()}</option>)}
                  </select>
                </div>
              )
            })()}

            {/* Option groups */}
            {opts.map(grp => {
              const isMulti = grp.selectionType === 'multi'
              const hasMultiply = grp.options.some(o => o.modifierType === 'multiply')
              const dt = hasMultiply ? 'dropdown' : (grp.displayType ?? 'radio')
              const curVal = chosenOpts[grp.groupName] ?? grp.options[0]?.label ?? ''
              const curMulti = chosenMulti[grp.groupName] || []
              const toggle = (label: string) => isMulti
                ? setChosenMulti(prev => { const arr = prev[grp.groupName] || []; return { ...prev, [grp.groupName]: arr.includes(label) ? arr.filter(x => x !== label) : [...arr, label] } })
                : setChosenOpts(prev => ({ ...prev, [grp.groupName]: label }))
              const isActive = (label: string) => isMulti ? curMulti.includes(label) : curVal === label

              return (
                <div key={grp.groupName}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>{grp.groupName}{grp.required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}</div>
                    {!isMulti && curVal && dt !== 'dropdown' && <div style={{ fontSize: 10.5, color: accentColor, fontWeight: 600 }}>{curVal}</div>}
                  </div>
                  {dt === 'dropdown' && (
                    <select value={isMulti ? '' : curVal} onChange={e => toggle(e.target.value)} style={{ ...inputSt(), cursor: 'pointer' }}>
                      {grp.options.map(opt => <option key={opt.label} value={opt.label}>{opt.label}</option>)}
                    </select>
                  )}
                  {dt === 'image' && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {grp.options.map(opt => {
                        const active = isActive(opt.label)
                        return (
                          <div key={opt.label} onClick={() => toggle(opt.label)} style={{ width: isMobile ? 52 : 62, cursor: 'pointer', textAlign: 'center' }}>
                            <div style={{ width: '100%', aspectRatio: '1', borderRadius: 10, overflow: 'hidden', border: `2.5px solid ${active ? accentColor : '#e5e7eb'}`, background: '#f9fafb', marginBottom: 4, transition: 'border-color 0.15s' }}>
                              {opt.imageUrl
                                ? <img src={opt.imageUrl} alt={opt.label} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>&#127912;</div>}
                            </div>
                            <div style={{ fontSize: 9.5, fontWeight: active ? 700 : 400, color: active ? accentColor : '#6b7280', lineHeight: 1.2 }}>{opt.label}</div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {dt === 'radio' && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {grp.options.map(opt => {
                        const active = isActive(opt.label)
                        return (
                          <div key={opt.label} onClick={() => toggle(opt.label)} style={{
                            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8,
                            fontSize: 11, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
                            border: `1.5px solid ${active ? accentColor : '#e5e7eb'}`,
                            background: active ? `${accentColor}10` : '#fafafa', color: active ? accentColor : '#374151',
                          }}>
                            {isMulti
                              ? <div style={{ width: 12, height: 12, borderRadius: 3, border: `1.5px solid ${active ? accentColor : '#cbd5e1'}`, background: active ? accentColor : 'transparent', flexShrink: 0 }} />
                              : <div style={{ width: 12, height: 12, borderRadius: '50%', border: `1.5px solid ${active ? accentColor : '#cbd5e1'}`, background: 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {active && <div style={{ width: 6, height: 6, borderRadius: '50%', background: accentColor }} />}
                                </div>}
                            {opt.label}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Live price estimate */}
            {showPrices && (() => {
              const fp = calcFinalPrice()
              if (!fp) return null
              if ('error' in fp) return (
                <div style={{ fontSize: 11, color: '#ef4444', background: 'rgba(239,68,68,0.06)', border: '1.5px solid #fecaca', borderRadius: 10, padding: '10px 12px' }}>
                  &#9888; {fp.error}
                </div>
              )
              return (
                <div style={{
                  background: `${accentColor}0a`, border: `2px solid ${accentColor}25`, borderRadius: 12,
                  padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div>
                    <div style={{ fontSize: 10.5, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Estimated Total</div>
                    <div style={{ fontSize: 10, color: '#9ca3af' }}>{fp.breakdown}</div>
                  </div>
                  <div style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, color: accentColor }}>RM {fp.total.toFixed(2)}</div>
                </div>
              )
            })()}

            {/* Delivery method selector */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Delivery Method</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['Self-Pickup', 'Delivery'] as const).map(d => (
                  <button key={d} onClick={() => setDelivery(d)} style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: `2px solid ${delivery === d ? accentColor : '#e5e7eb'}`, background: delivery === d ? `${accentColor}10` : '#fff', color: delivery === d ? accentColor : '#6b7280', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'Inter,sans-serif' }}>
                    {d === 'Self-Pickup' ? '🏪 Self Collect' : '🚚 Delivery (J&T)'}
                  </button>
                ))}
              </div>
              {delivery === 'Delivery' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, padding: '10px 12px', background: '#fff8f0', border: '1.5px solid #fed7aa', borderRadius: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 7, background: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: '#fff', fontSize: 10, fontWeight: 900, letterSpacing: '-0.02em' }}>J&T</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: '#9a3412' }}>J&T Express</div>
                    <div style={{ fontSize: 10.5, color: '#c2410c' }}>2–5 business days · Flat rate RM 8.00</div>
                  </div>
                </div>
              )}
              {delivery === 'Self-Pickup' && (
                <div style={{ fontSize: 10.5, color: '#6b7280', marginTop: 6, paddingLeft: 2 }}>📍 Collect at our premise — we'll notify you when ready.</div>
              )}
            </div>

            {/* Artwork step OR normal CTAs */}
            {artworkStep ? (
              <div style={{ background: '#f9fafb', borderRadius: 14, padding: '20px 18px', border: '1.5px solid #e5e7eb' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 4 }}>How would you like to provide your artwork?</div>
                <div style={{ fontSize: 11.5, color: '#9ca3af', marginBottom: 16 }}>Select an option to continue</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {([
                    { key: 'upload' as const, icon: '📤', label: 'Upload Your Design', desc: 'Upload your ready artwork file (PDF, AI, PNG, etc.)' },
                    { key: 'free-design' as const, icon: '🎨', label: 'Free Design Service', desc: "We'll create a design for you — our team will contact you." },
                    { key: 'create-design' as const, icon: '✏️', label: 'Create Design', desc: 'Use our online editor — coming soon.' },
                  ] as const).map(opt => {
                    const active = artworkOption === opt.key
                    return (
                      <div key={opt.key} onClick={() => setArtworkOpt(opt.key)} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', borderRadius: 12, border: `2px solid ${active ? accentColor : '#e5e7eb'}`, background: active ? `${accentColor}08` : '#fff', cursor: 'pointer', transition: 'all 0.15s' }}>
                        <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{opt.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 700, color: active ? accentColor : '#111', marginBottom: 2 }}>{opt.label}</div>
                          <div style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.4 }}>{opt.desc}</div>
                        </div>
                        <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${active ? accentColor : '#d1d5db'}`, flexShrink: 0, marginTop: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {active && <div style={{ width: 8, height: 8, borderRadius: '50%', background: accentColor }} />}
                        </div>
                      </div>
                    )
                  })}
                  {artworkOption === 'upload' && (
                    <div style={{ marginTop: 4 }}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 6, display: 'block' }}>Attach your artwork file</label>
                      <input type="file" accept=".pdf,.ai,.eps,.png,.jpg,.jpeg,.tif,.tiff" onChange={e => setArtworkFile(e.target.files?.[0] || null)} style={{ ...inputSt(), padding: '8px 10px', fontSize: 11 }} />
                      {artworkFile && <div style={{ fontSize: 10.5, color: accentColor, marginTop: 4, fontWeight: 600 }}>Selected: {artworkFile.name}</div>}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
                  <button onClick={() => setArtworkStep(false)} style={{ flex: 1, background: 'transparent', color: '#6b7280', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '10px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>← Back</button>
                  <button
                    disabled={!artworkOption}
                    onClick={() => {
                      if (!artworkOption || !selected) return
                      const fp = calcFinalPrice()
                      if (!fp || 'error' in fp) return
                      const rawSizeLbl = chosenOpts['__size__'] ?? selected.sizes?.fixed[0]?.label ?? ''
                      const isCustomSz = rawSizeLbl === '__custom__' || selected.sizes?.mode === 'custom'
                      const activeSizeLbl = isCustomSz ? `Custom ${customW}×${customH}${customUnit}` : rawSizeLbl
                      const name = selected.name + (activeSizeLbl ? ` — ${activeSizeLbl}` : '')
                      const optParts: string[] = []
                      if (activeSizeLbl) optParts.push(activeSizeLbl)
                      Object.entries(chosenOpts).forEach(([k, v]) => { if (k !== '__size__') optParts.push(`${k}: ${v}`) })
                      Object.entries(chosenMulti).forEach(([k, arr]) => { if (arr.length > 0) optParts.push(`${k}: ${arr.join(', ')}`) })
                      const item: CartItem = {
                        id: uid(), catalogId: selected.id, name, sku: selected.sku || selected.id,
                        qty, unitPrice: fp.total / qty, total: fp.total,
                        optionSummary: optParts.join(' · '),
                        artworkOption, artworkFileName: artworkFile?.name || '',
                      }
                      setCart(prev => [...prev, item])
                      setArtworkStep(false); setArtworkOpt(''); setArtworkFile(null)
                      setToast('Added to cart!')
                    }}
                    style={{ flex: 2, background: artworkOption ? accentColor : '#d1d5db', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 0', fontSize: 13, fontWeight: 700, cursor: artworkOption ? 'pointer' : 'not-allowed', boxShadow: artworkOption ? `0 2px 10px ${accentColor}33` : 'none', transition: 'all 0.15s' }}
                  >Add to Cart →</button>
                </div>
              </div>
            ) : (
              <>
                {/* CTAs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                  <button onClick={() => { setQSent(false); nav('quote') }} style={{
                    background: accentColor, color: '#fff', border: 'none', borderRadius: 10,
                    padding: isMobile ? '11px 0' : '13px 0', fontSize: isMobile ? 13 : 14, fontWeight: 700,
                    cursor: 'pointer', width: '100%', boxShadow: `0 2px 10px ${accentColor}33`,
                  }}>Get a Quote</button>
                  <button onClick={() => setArtworkStep(true)} style={{
                    background: 'transparent', color: accentColor, border: `2px solid ${accentColor}`,
                    borderRadius: 10, padding: isMobile ? '9px 0' : '11px 0', fontSize: isMobile ? 13 : 14,
                    fontWeight: 600, cursor: 'pointer', width: '100%',
                  }}>Add to Cart</button>
                </div>
                {selected.notes && !isMobile && (
                  <div style={{ fontSize: 11.5, color: '#9ca3af', background: '#f9fafb', borderRadius: 10, padding: '10px 14px', lineHeight: 1.5 }}>&#128204; {selected.notes}</div>
                )}
              </>
            )}
          </div>
        </div>
      </Shell>
    )
  }

  /* ═══════════════════════════════════════════════════
     ABOUT (modernized)
  ═══════════════════════════════════════════════════ */
  if (view === 'about') return (
    <Shell>
      <div style={{ background: `linear-gradient(135deg, ${accentColor}30, ${accentColor}10)`, padding: isMobile ? '36px 16px' : '48px 28px', textAlign: 'center', borderBottom: `2px solid ${accentColor}18` }}>
        <div style={{ fontSize: isMobile ? 22 : 30, fontWeight: 800, color: '#111', marginBottom: 10, letterSpacing: '-0.02em' }}>About {shopName}</div>
        <div style={{ fontSize: isMobile ? 12.5 : 14, color: '#6b7280', maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}>{tagline}</div>
      </div>
      <div style={{ padding: isMobile ? '20px 16px' : '32px 28px', display: 'flex', flexDirection: 'column', gap: 28 }}>
        {/* Intro */}
        <div>
          <div style={{ fontSize: isMobile ? 12.5 : 14, color: '#374151', lineHeight: 1.8 }}>
            {shopName} is a full-service printing company based in Kuala Lumpur, serving businesses and individuals across Malaysia. From business cards to large-format banners, we handle every print job with precision, speed, and care. Our state-of-the-art equipment and experienced team ensure top-quality results every time.
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 12 }}>
          {[{ label: 'Years', value: '8+' }, { label: 'Clients', value: '2,400+' }, { label: 'Products', value: `${enabledItems.length}` }, { label: 'Orders', value: '18,000+' }].map(s => (
            <div key={s.label} style={{ textAlign: 'center', padding: '16px 10px', background: `${accentColor}12`, borderRadius: 14, border: `1.5px solid ${accentColor}30` }}>
              <div style={{ fontSize: isMobile ? 24 : 28, fontWeight: 800, color: accentColor, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4, fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Our Mission */}
        <div>
          <div style={{ fontSize: isMobile ? 16 : 18, fontWeight: 800, color: '#111', marginBottom: 10, letterSpacing: '-0.02em' }}>Our Mission</div>
          <div style={{ fontSize: isMobile ? 12 : 13.5, color: '#6b7280', lineHeight: 1.8 }}>
            To provide fast, affordable, and high-quality printing solutions that help businesses grow and individuals express their creativity. We believe great print should be accessible to everyone &mdash; from startups to established enterprises.
          </div>
        </div>

        {/* Why Choose Us */}
        <div>
          <div style={{ fontSize: isMobile ? 16 : 18, fontWeight: 800, color: '#111', marginBottom: 12, letterSpacing: '-0.02em' }}>Why Choose Us</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              'Premium materials and eco-friendly printing options',
              'Express turnaround \u2014 as fast as next-day for urgent orders',
              'Competitive pricing with bulk discounts',
              'Free design check and artwork adjustment',
              'Doorstep delivery across Peninsular Malaysia',
              'Dedicated account manager for corporate clients',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: isMobile ? 12 : 13, color: '#374151', lineHeight: 1.6 }}>
                <span style={{ color: accentColor, fontWeight: 700, fontSize: 14, marginTop: 1, flexShrink: 0 }}>&#10003;</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Our Machines & Materials */}
        <div>
          <div style={{ fontSize: isMobile ? 16 : 18, fontWeight: 800, color: '#111', marginBottom: 12, letterSpacing: '-0.02em' }}>Our Machines &amp; Materials</div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 14 }}>
            {[
              { title: 'Digital Printing', desc: 'High-speed HP Indigo and Konica Minolta for vibrant, consistent colour output.' },
              { title: 'Wide Format', desc: 'Roland and Mimaki large-format printers for banners, signage, and wall graphics.' },
              { title: 'Finishing Line', desc: 'Lamination, die-cutting, UV coating, foil stamping, and binding in-house.' },
            ].map(v => (
              <div key={v.title} style={{ padding: 18, background: '#fff', borderRadius: 14, border: `1.5px solid ${accentColor}20`, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: accentColor, marginBottom: 6 }}>{v.title}</div>
                <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>{v.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Service Coverage */}
        <div style={{ background: `${accentColor}08`, borderRadius: 14, padding: isMobile ? '16px 16px' : '20px 24px', border: `1.5px solid ${accentColor}18` }}>
          <div style={{ fontSize: isMobile ? 16 : 18, fontWeight: 800, color: '#111', marginBottom: 8, letterSpacing: '-0.02em' }}>Service Coverage</div>
          <div style={{ fontSize: isMobile ? 12 : 13, color: '#6b7280', lineHeight: 1.8 }}>
            We serve the entire Peninsular Malaysia with standard delivery. Klang Valley orders enjoy same-day or next-day delivery options. For East Malaysia (Sabah &amp; Sarawak), we ship via courier with 3&ndash;5 business day delivery. Self-pickup is available at our KL office.
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <button onClick={() => goProducts()} style={{
            background: accentColor, color: '#fff', border: 'none', borderRadius: 10,
            padding: '12px 28px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            boxShadow: `0 4px 14px ${accentColor}40`,
          }}>Browse Our Products</button>
        </div>
      </div>
    </Shell>
  )

  /* ═══════════════════════════════════════════════════
     CONTACT (modernized)
  ═══════════════════════════════════════════════════ */
  if (view === 'contact') {
    const waNum = contactWhatsapp?.replace(/[^0-9]/g, '') || ''
    const buildWhatsAppMsg = () => {
      const lines = [`Hi, I'd like to request a quote.`]
      if (cName) lines.push(`Name: ${cName}`)
      if (cPhone) lines.push(`Phone: ${cPhone}`)
      if (cEmail) lines.push(`Email: ${cEmail}`)
      if (cProduct) lines.push(`Product: ${cProduct}`)
      if (cSize) lines.push(`Size: ${cSize}`)
      if (cQty) lines.push(`Quantity: ${cQty}`)
      if (cMaterial) lines.push(`Material: ${cMaterial}`)
      if (cTurnaround) lines.push(`Turnaround: ${cTurnaround}`)
      if (cNotes) lines.push(`Notes: ${cNotes}`)
      return encodeURIComponent(lines.join('\n'))
    }
    const resetForm = () => { setCName(''); setCEmail(''); setCPhone(''); setCProduct(''); setCSize(''); setCQty(''); setCMaterial(''); setCTurnaround('Normal'); setCNotes(''); setCFile(''); setCSent(false) }
    const labelSt: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' }

    return (
      <Shell>
        <div style={{ padding: isMobile ? '20px 16px' : '28px 28px' }}>
          <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: '#111', marginBottom: 4, letterSpacing: '-0.02em' }}>Get in Touch</div>
          <div style={{ fontSize: 12.5, color: '#9ca3af', marginBottom: 24 }}>We&apos;d love to hear from you</div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1.2fr', gap: 24 }}>
            {/* Left column — contact info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[{ icon: '\u2709\uFE0F', label: 'Email', value: contactEmail }, { icon: '\uD83D\uDCDE', label: 'Phone', value: contactPhone }, ...(showWhatsapp ? [{ icon: '\uD83D\uDCAC', label: 'WhatsApp', value: contactWhatsapp }] : []), { icon: '\uD83D\uDCCD', label: 'Address', value: contactAddress }].map(row => (
                <div key={row.label} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 14px', background: '#fafafa', borderRadius: 12, border: '1px solid #f0f0f0' }}>
                  <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{row.icon}</span>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>{row.label}</div>
                    <div style={{ fontSize: 12.5, color: '#374151', fontWeight: 500, lineHeight: 1.5 }}>{row.value}</div>
                  </div>
                </div>
              ))}
              {/* WhatsApp CTA */}
              {showWhatsapp && waNum && (
                <button onClick={() => window.open(`https://wa.me/${waNum}`, '_blank')} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: '#25D366', color: '#fff', border: 'none', borderRadius: 10,
                  padding: '12px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 2px 10px rgba(37,211,102,0.3)',
                }}>
                  <span style={{ fontSize: 16 }}>{'\uD83D\uDCAC'}</span> Chat on WhatsApp
                </button>
              )}
              {/* Map placeholder */}
              <div style={{ background: '#f0f0f0', borderRadius: 12, height: isMobile ? 140 : 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 12, border: '1px solid #e5e7eb' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 28, marginBottom: 4 }}>{'\uD83D\uDDFA\uFE0F'}</div>
                  <div>Map Placeholder</div>
                </div>
              </div>
              {/* Opening Hours */}
              <div style={{ background: `${accentColor}08`, borderRadius: 12, padding: '14px 16px', border: `1.5px solid ${accentColor}25` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: accentColor, marginBottom: 8 }}>Opening Hours</div>
                {[['Mon \u2013 Fri', '9:00am \u2013 6:00pm'], ['Saturday', '9:00am \u2013 2:00pm'], ['Sunday', 'Closed']].map(([day, hrs]) => (
                  <div key={day} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#6b7280', marginBottom: 4 }}>
                    <span>{day}</span><span style={{ fontWeight: 600 }}>{hrs}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Right column — quote form */}
            <div id="quote">
              {cSent ? (
                <div style={{ textAlign: 'center', padding: '36px 20px', background: `${accentColor}06`, borderRadius: 14, border: `1.5px solid ${accentColor}25` }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>&#9989;</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: accentColor, marginBottom: 6 }}>Thanks! We&apos;ll contact you shortly.</div>
                  <div style={{ fontSize: 12.5, color: '#6b7280', marginBottom: 18 }}>We&apos;ll reply within 1 business day.</div>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                    {waNum && (
                      <button onClick={() => window.open(`https://wa.me/${waNum}?text=${buildWhatsAppMsg()}`, '_blank')} style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        background: '#25D366', color: '#fff', border: 'none', borderRadius: 10,
                        padding: '10px 20px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      }}>
                        {'\uD83D\uDCAC'} Send via WhatsApp
                      </button>
                    )}
                    <button onClick={resetForm} style={{ background: accentColor, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>New Request</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 2 }}>Request a Quote</div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
                    <div><label style={labelSt}>Name <span style={{ color: '#ef4444' }}>*</span></label><input value={cName} onChange={e => setCName(e.target.value)} placeholder="Your name" style={inputSt()} /></div>
                    <div><label style={labelSt}>Phone <span style={{ color: '#ef4444' }}>*</span></label><input value={cPhone} onChange={e => setCPhone(e.target.value)} placeholder="Phone number" style={inputSt()} /></div>
                  </div>
                  <div><label style={labelSt}>Email</label><input value={cEmail} onChange={e => setCEmail(e.target.value)} placeholder="Email address" type="email" style={inputSt()} /></div>
                  <div>
                    <label style={labelSt}>Product</label>
                    <select value={cProduct} onChange={e => setCProduct(e.target.value)} style={{ ...inputSt(), cursor: 'pointer' }}>
                      <option value="">Select a product...</option>
                      {enabledItems.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
                    <div><label style={labelSt}>Size</label><input value={cSize} onChange={e => setCSize(e.target.value)} placeholder="e.g. A4, 85x54mm" style={inputSt()} /></div>
                    <div><label style={labelSt}>Quantity</label><input value={cQty} onChange={e => setCQty(e.target.value)} placeholder="e.g. 500" type="number" style={inputSt()} /></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
                    <div><label style={labelSt}>Material</label><input value={cMaterial} onChange={e => setCMaterial(e.target.value)} placeholder="e.g. Art Card 350gsm" style={inputSt()} /></div>
                    <div>
                      <label style={labelSt}>Turnaround</label>
                      <select value={cTurnaround} onChange={e => setCTurnaround(e.target.value)} style={{ ...inputSt(), cursor: 'pointer' }}>
                        <option value="Normal">Normal (5-7 days)</option>
                        <option value="Express">Express (next day)</option>
                      </select>
                    </div>
                  </div>
                  <div><label style={labelSt}>Notes</label><textarea value={cNotes} onChange={e => setCNotes(e.target.value)} placeholder="Special instructions, design requirements..." rows={3} style={{ ...inputSt(), resize: 'vertical' }} /></div>
                  <div>
                    <label style={labelSt}>Attach File</label>
                    <div style={{ position: 'relative' }}>
                      <input type="file" onChange={e => setCFile(e.target.files?.[0]?.name || '')} style={{ ...inputSt(), padding: '8px 12px' }} />
                      {cFile && <div style={{ fontSize: 10.5, color: accentColor, marginTop: 4, fontWeight: 500 }}>Selected: {cFile}</div>}
                    </div>
                  </div>
                  <button onClick={e => {
                    e.preventDefault()
                    if (!cName || !cPhone) return
                    const cOrd = createOrder({
                      customer: cName, customerRef: '', agent: '', status: 'Pending', production: '—',
                      created: todayStr(), dueDate: '', deliveryMethod: 'Self-Pickup', deliveryAddress: '—',
                      notes: [
                        cEmail      && `Email: ${cEmail}`,
                        `Phone: ${cPhone}`,
                        cProduct    && `Product: ${cProduct}`,
                        cSize       && `Size: ${cSize}`,
                        cQty        && `Qty: ${cQty}`,
                        cMaterial   && `Material: ${cMaterial}`,
                        cTurnaround && `Turnaround: ${cTurnaround}`,
                        cNotes      && `Notes: ${cNotes}`,
                        cFile       && `File: ${cFile}`,
                      ].filter(Boolean).join('\n'),
                      source: 'online-store', items: [], payments: [],
                      timeline: [{ id: uid(), date: nowStr(), event: 'Quote request submitted via Contact form', by: cName }],
                      discount: 0, discountType: 'rm', sstEnabled: true, sstRate: 6,
                      sstAmount: 0, rounding: 0, shippingCost: 0,
                      subtotal: 0, grandTotal: 0, currency: 'MYR',
                    })
                    addNotification({
                      type: 'info',
                      title: `Contact quote from ${cName}`,
                      message: `${cName} submitted a quote request${cProduct ? ` for ${cProduct}` : ''} via the Contact page. Order ${cOrd.id} created.`,
                      link: `/orders/${cOrd.id}`,
                    })
                    setCSent(true)
                  }} style={{
                    background: accentColor, color: '#fff', border: 'none', borderRadius: 10,
                    padding: '12px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer', marginTop: 4,
                    boxShadow: `0 4px 14px ${accentColor}40`,
                  }}>Submit Quote Request</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </Shell>
    )
  }

  /* ═══════════════════════════════════════════════════
     CART
  ═══════════════════════════════════════════════════ */
  if (view === 'cart') {
    const subtotal = cart.reduce((s, c) => s + c.total, 0)
    const sstAmt   = subtotal * 0.08
    const grandTotal = subtotal + sstAmt
    return (
      <Shell>
        <div style={{ padding: isMobile ? '18px 14px' : '28px 28px', maxWidth: 720, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, color: '#111', letterSpacing: '-0.02em' }}>Your Cart</div>
              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{cart.length} item{cart.length !== 1 ? 's' : ''}</div>
            </div>
            <button onClick={() => nav('products')} style={{ background: 'transparent', color: accentColor, border: `1.5px solid ${accentColor}`, borderRadius: 10, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>← Continue Shopping</button>
          </div>

          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🛒</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#111', marginBottom: 6 }}>Your cart is empty</div>
              <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 20 }}>Browse our products and add items to your cart.</div>
              <button onClick={() => nav('products')} style={{ background: accentColor, color: '#fff', border: 'none', borderRadius: 10, padding: '12px 28px', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: `0 4px 14px ${accentColor}40` }}>Browse Products</button>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                {cart.map(item => (
                  <div key={item.id} style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #f0f0f0', padding: isMobile ? '14px' : '18px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 4 }}>{item.name}</div>
                        {item.optionSummary && <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>{item.optionSummary}</div>}
                        {item.artworkFileName && (
                          <div style={{ fontSize: 11, color: '#6b7280', background: '#f3f4f6', borderRadius: 6, padding: '3px 8px', display: 'inline-block', marginBottom: 4 }}>
                            📎 {item.artworkFileName}
                          </div>
                        )}
                        {item.artworkOption === 'free-design' && <div style={{ fontSize: 11, color: '#f59e0b', background: '#fef3c7', borderRadius: 6, padding: '3px 8px', display: 'inline-block' }}>🎨 Free Design Requested</div>}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: accentColor, marginBottom: 4 }}>RM {(item.unitPrice * item.qty).toFixed(2)}</div>
                        <div style={{ fontSize: 10.5, color: '#9ca3af' }}>RM {item.unitPrice.toFixed(4)} / pc</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <button onClick={() => setCart(prev => prev.map(c => c.id === item.id ? { ...c, qty: Math.max(1, c.qty - 1), total: c.unitPrice * Math.max(1, c.qty - 1) } : c))} style={{ width: 30, height: 30, borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                        <div style={{ minWidth: 52, textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#111' }}>{item.qty.toLocaleString()}</div>
                        <button onClick={() => setCart(prev => prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1, total: c.unitPrice * (c.qty + 1) } : c))} style={{ width: 30, height: 30, borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                        <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 6 }}></span>
                      </div>
                      <button onClick={() => setCart(prev => prev.filter(c => c.id !== item.id))} style={{ display: 'flex', alignItems: 'center', gap: 5, border: 'none', background: 'transparent', cursor: 'pointer', color: '#ef4444', fontSize: 11.5, fontWeight: 600, padding: '4px 8px', borderRadius: 6 }}>
                        <TrashIcon /> Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div style={{ background: '#fafafa', borderRadius: 14, padding: isMobile ? '16px' : '20px', border: '1.5px solid #f0f0f0', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
                  <span>Subtotal</span><span style={{ fontWeight: 600, color: '#111' }}>RM {subtotal.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6b7280', marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #e5e7eb' }}>
                  <span>SST (8%)</span><span style={{ fontWeight: 600, color: '#111' }}>RM {sstAmt.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800, color: '#111' }}>
                  <span>Grand Total</span><span style={{ color: accentColor }}>RM {grandTotal.toFixed(2)}</span>
                </div>
              </div>

              <button onClick={() => nav('checkout')} style={{ width: '100%', background: accentColor, color: '#fff', border: 'none', borderRadius: 12, padding: '14px 0', fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: `0 4px 16px ${accentColor}40` }}>
                Proceed to Checkout →
              </button>
            </>
          )}
        </div>
      </Shell>
    )
  }

  /* ═══════════════════════════════════════════════════
     CHECKOUT
  ═══════════════════════════════════════════════════ */
  if (view === 'checkout') {
    const subtotal = cart.reduce((s, c) => s + c.total, 0)
    const sstAmt   = subtotal * 0.08
    const shippingFee = delivery === 'Delivery' ? 8 : 0
    const discountAmt = couponApplied
      ? couponApplied.type === 'percentage'
        ? subtotal * (couponApplied.value / 100)
        : Math.min(couponApplied.value, subtotal)
      : 0
    const grandTotal = subtotal + sstAmt + shippingFee - discountAmt
    const labelSt: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' }
    const payOptions = ['Online Banking', 'Credit Card', 'E-Wallet (Boost)', 'E-Wallet (GrabPay)', 'E-Wallet (TNG)', 'Cash on Pickup']
    return (
      <Shell>
        <div style={{ padding: isMobile ? '18px 14px' : '28px 28px' }}>
          <button onClick={() => nav('cart')} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: accentColor, fontSize: 13, fontWeight: 600, marginBottom: 18, padding: 0, fontFamily: 'Inter,sans-serif' }}>← Back to Cart</button>
          <div style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, color: '#111', letterSpacing: '-0.02em', marginBottom: 24 }}>Checkout</div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.4fr 1fr', gap: 28, alignItems: 'start' }}>
            {/* Left — form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Contact */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 12 }}>Contact Information</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
                    <div><label style={labelSt}>Full Name <span style={{ color: '#ef4444' }}>*</span></label><input value={contact.name} onChange={e => setContact(p => ({ ...p, name: e.target.value }))} placeholder="Your full name" style={inputSt()} /></div>
                    <div><label style={labelSt}>Phone Number <span style={{ color: '#ef4444' }}>*</span></label><input value={contact.phone} onChange={e => setContact(p => ({ ...p, phone: e.target.value }))} placeholder="+60 12-345 6789" style={inputSt()} /></div>
                  </div>
                  <div><label style={labelSt}>Email Address <span style={{ color: '#ef4444' }}>*</span></label><input value={contact.email} onChange={e => setContact(p => ({ ...p, email: e.target.value }))} placeholder="your@email.com" type="email" style={inputSt()} /></div>
                  <div><label style={labelSt}>Company <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span></label><input value={contact.company} onChange={e => setContact(p => ({ ...p, company: e.target.value }))} placeholder="Company name" style={inputSt()} /></div>
                </div>
              </div>

              {/* Delivery */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 12 }}>Delivery Method</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  {(['Self-Pickup', 'Delivery'] as const).map(d => (
                    <button key={d} onClick={() => setDelivery(d)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: `2px solid ${delivery === d ? accentColor : '#e5e7eb'}`, background: delivery === d ? `${accentColor}10` : '#fff', color: delivery === d ? accentColor : '#6b7280', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'Inter,sans-serif' }}>
                      {d === 'Self-Pickup' ? '🏪 Self Collect' : '🚚 Delivery (J&T)'}
                    </button>
                  ))}
                </div>
                {delivery === 'Delivery' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                      <label style={labelSt}>Delivery Address <span style={{ color: '#ef4444' }}>*</span></label>
                      <textarea value={address} onChange={e => setAddress(e.target.value)} placeholder="Full delivery address including postcode and state" rows={3} style={{ ...inputSt(), resize: 'vertical' }} />
                    </div>
                    {/* J&T info card */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', background: '#fff8f0', border: '1.5px solid #fed7aa', borderRadius: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ color: '#fff', fontSize: 11, fontWeight: 900, letterSpacing: '-0.03em' }}>J&T</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: '#9a3412', marginBottom: 2 }}>J&T Express</div>
                        <div style={{ fontSize: 11, color: '#c2410c', lineHeight: 1.5 }}>Estimated delivery: 2–5 business days · Flat rate RM 8.00</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Artwork files summary */}
              {cart.some(c => c.artworkFileName || c.artworkOption === 'free-design') && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 10 }}>Artwork Files</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {cart.map(c => (
                      <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid #f0f0f0' }}>
                        <span style={{ fontSize: 12 }}>{c.artworkFileName ? '📎' : '🎨'}</span>
                        <div style={{ flex: 1, fontSize: 11.5, color: '#374151' }}>
                          <span style={{ fontWeight: 600 }}>{c.name}</span>
                          {c.artworkFileName && <span style={{ color: '#9ca3af' }}>: {c.artworkFileName}</span>}
                          {c.artworkOption === 'free-design' && !c.artworkFileName && <span style={{ color: '#f59e0b' }}> — Free design requested</span>}
                        </div>
                      </div>
                    ))}
                    {cart.some(c => !c.artworkFileName && c.artworkOption !== 'free-design') && (
                      <div style={{ fontSize: 11, color: '#f59e0b', background: '#fef3c7', borderRadius: 8, padding: '8px 12px' }}>⚠ Some items don't have artwork. We'll contact you to confirm.</div>
                    )}
                  </div>
                </div>
              )}

              {/* Coupon */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 10 }}>Coupon Code</div>
                {couponApplied ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f0fdf4', borderRadius: 10, border: '1.5px solid #86efac' }}>
                    <span style={{ color: '#16a34a', fontSize: 14 }}>✓</span>
                    <div style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: '#16a34a' }}>{couponApplied.code} applied — {couponApplied.type === 'percentage' ? `${couponApplied.value}% off` : `RM ${couponApplied.value} off`}</div>
                    <button onClick={() => { setCouponApplied(null); setCouponCode('') }} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9ca3af', fontSize: 14, padding: 2 }}>✕</button>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input value={couponCode} onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponError('') }} placeholder="Enter coupon code" style={{ ...inputSt(), flex: 1 }} onKeyDown={e => { if (e.key === 'Enter') handleApplyCoupon() }} />
                      <button onClick={handleApplyCoupon} style={{ background: accentColor, color: '#fff', border: 'none', borderRadius: 10, padding: '0 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>Apply</button>
                    </div>
                    {couponError && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 5 }}>✕ {couponError}</div>}
                  </div>
                )}
              </div>

              {/* Payment method */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 10 }}>Payment Method</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {payOptions.map(opt => (
                    <div key={opt} onClick={() => setPayMethod(opt)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: `2px solid ${payMethod === opt ? accentColor : '#e5e7eb'}`, background: payMethod === opt ? `${accentColor}08` : '#fff', cursor: 'pointer', transition: 'all 0.15s' }}>
                      <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${payMethod === opt ? accentColor : '#d1d5db'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {payMethod === opt && <div style={{ width: 8, height: 8, borderRadius: '50%', background: accentColor }} />}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: payMethod === opt ? 600 : 400, color: payMethod === opt ? accentColor : '#374151' }}>{opt}</span>
                    </div>
                  ))}
                </div>
              </div>

              {checkoutError && <div style={{ fontSize: 12, color: '#ef4444', background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 10, padding: '10px 14px' }}>⚠ {checkoutError}</div>}
            </div>

            {/* Right — order summary (sticky) */}
            <div style={{ position: isMobile ? 'static' : 'sticky', top: 90 }}>
              <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #f0f0f0', padding: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 16 }}>Order Summary</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid #f0f0f0' }}>
                  {cart.map(item => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ flex: 1, fontSize: 12, color: '#374151', lineHeight: 1.4 }}>
                        <span style={{ fontWeight: 600 }}>{item.name}</span>
                        <span style={{ color: '#9ca3af' }}> × {item.qty.toLocaleString()}</span>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#111', flexShrink: 0 }}>RM {item.total.toFixed(2)}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#6b7280' }}>
                    <span>Subtotal</span><span style={{ color: '#111' }}>RM {subtotal.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#6b7280' }}>
                    <span>SST (8%)</span><span style={{ color: '#111' }}>RM {sstAmt.toFixed(2)}</span>
                  </div>
                  {delivery === 'Delivery' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#6b7280' }}>
                      <span>Shipping (J&T Express)</span><span style={{ color: '#111' }}>RM {shippingFee.toFixed(2)}</span>
                    </div>
                  )}
                  {couponApplied && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#16a34a' }}>
                      <span>Discount ({couponApplied.code})</span><span>−RM {discountAmt.toFixed(2)}</span>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800, color: '#111', paddingTop: 14, borderTop: '2px solid #f0f0f0', marginBottom: 20 }}>
                  <span>Total</span><span style={{ color: accentColor }}>RM {grandTotal.toFixed(2)}</span>
                </div>
                <button onClick={handlePlaceOrder} disabled={placing} style={{ width: '100%', background: placing ? '#d1d5db' : accentColor, color: '#fff', border: 'none', borderRadius: 12, padding: '14px 0', fontSize: 14, fontWeight: 700, cursor: placing ? 'not-allowed' : 'pointer', boxShadow: placing ? 'none' : `0 4px 16px ${accentColor}40`, marginBottom: 10 }}>
                  {placing ? 'Placing Order…' : 'Place Order'}
                </button>
                <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center' }}>🔒 Secure checkout · RM protected</div>
              </div>
            </div>
          </div>
        </div>
      </Shell>
    )
  }

  /* ═══════════════════════════════════════════════════
     ORDER SUCCESS
  ═══════════════════════════════════════════════════ */
  if (view === 'order-success') {
    const waNum = contactWhatsapp?.replace(/[^0-9]/g, '') || ''
    const waMsg = encodeURIComponent(`Hi! I just placed order ${orderId} via the online store. Looking forward to hearing from you!`)
    return (
      <Shell>
        <div style={{ padding: isMobile ? '40px 20px' : '60px 28px', maxWidth: 500, margin: '0 auto', textAlign: 'center' }}>
          {/* Animated checkmark */}
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#f0fdf4', border: '3px solid #86efac', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', animation: 'checkPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <style>{`@keyframes checkPop { 0% { transform: scale(0); opacity: 0 } 70% { transform: scale(1.15) } 100% { transform: scale(1); opacity: 1 } }`}</style>
          <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800, color: '#111', marginBottom: 10, letterSpacing: '-0.02em' }}>Order Placed!</div>
          <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: accentColor, marginBottom: 20, letterSpacing: '0.02em' }}>{orderId}</div>
          <div style={{ fontSize: 13.5, color: '#6b7280', lineHeight: 1.7, marginBottom: 28 }}>
            We'll review your order and send a confirmation to your email within 1 business day. Thank you for choosing {shopName}!
          </div>
          <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 24, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {showWhatsapp && waNum && (
              <button onClick={() => window.open(`https://wa.me/${waNum}?text=${waMsg}`, '_blank')} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#25D366', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 10px rgba(37,211,102,0.3)' }}>
                💬 WhatsApp Us
              </button>
            )}
            <button onClick={() => { nav('products'); setContact({ name: '', email: '', phone: '', company: '' }); setDelivery('Self-Pickup'); setAddress(''); setPayMethod('Online Banking'); setCouponApplied(null); setCouponCode(''); setOrderId('') }} style={{ background: accentColor, color: '#fff', border: 'none', borderRadius: 10, padding: '12px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: `0 2px 10px ${accentColor}33` }}>
              Continue Shopping
            </button>
          </div>
        </div>
      </Shell>
    )
  }

  /* ═══════════════════════════════════════════════════
     ORDER TRACKING
  ═══════════════════════════════════════════════════ */
  if (view === 'track') {
    const PROD_STEPS: Array<{ key: string; label: string; icon: string }> = [
      { key: 'Pending',      label: 'Order Received',   icon: '📋' },
      { key: 'Confirmed',    label: 'Confirmed',         icon: '✅' },
      { key: 'Queued',       label: 'In Queue',          icon: '🗂️' },
      { key: 'In Progress',  label: 'Printing',          icon: '🖨️' },
      { key: 'Quality Check',label: 'Quality Check',     icon: '🔍' },
      { key: 'Completed',    label: 'Completed',         icon: '📦' },
      { key: 'Shipped',      label: 'Shipped',           icon: '🚚' },
      { key: 'Delivered',    label: 'Delivered',         icon: '🏠' },
    ]
    const PROD_ORDER = PROD_STEPS.map(s => s.key)
    const currentStepIdx = trackedOrder
      ? Math.max(
          PROD_ORDER.indexOf(trackedOrder.status),
          PROD_ORDER.indexOf(trackedOrder.production),
        )
      : -1

    const handleTrack = () => {
      const id = trackInput.trim().toUpperCase()
      if (!id) return
      const found = getOrderById(id)
      if (found) { setTrackedOrder(found); setTrackError('') }
      else { setTrackedOrder(null); setTrackError(`No order found with ID "${id}". Please check and try again.`) }
    }

    return (
      <Shell>
        <div style={{ padding: isMobile ? '28px 16px' : '40px 28px', maxWidth: 620, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📦</div>
            <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800, color: '#111', letterSpacing: '-0.02em', marginBottom: 6 }}>Track Your Order</div>
            <div style={{ fontSize: 13.5, color: '#9ca3af' }}>Enter your order ID to check the status</div>
          </div>

          {/* Search input */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
            <input
              value={trackInput}
              onChange={e => setTrackInput(e.target.value.toUpperCase())}
              onKeyDown={e => { if (e.key === 'Enter') handleTrack() }}
              placeholder="e.g. ORD-2513"
              style={{ ...inputSt(), flex: 1, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.06em', fontSize: 14 }}
            />
            <button onClick={handleTrack} style={{ background: accentColor, color: '#fff', border: 'none', borderRadius: 10, padding: '0 22px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', flexShrink: 0, boxShadow: `0 2px 10px ${accentColor}33` }}>
              Track
            </button>
          </div>

          {trackError && (
            <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 12, padding: '14px 18px', color: '#ef4444', fontSize: 13, marginBottom: 20, textAlign: 'center' }}>
              {trackError}
            </div>
          )}

          {trackedOrder && (
            <div>
              {/* Order header card */}
              <div style={{ background: `${accentColor}08`, border: `1.5px solid ${accentColor}20`, borderRadius: 14, padding: '18px 20px', marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Order ID</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: accentColor, letterSpacing: '0.02em' }}>{trackedOrder.id}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Customer</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>{trackedOrder.customer}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16, marginTop: 14, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 10.5, fontWeight: 600, color: '#9ca3af', marginBottom: 2 }}>Order Date</div>
                    <div style={{ fontSize: 12.5, color: '#374151' }}>{trackedOrder.created}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10.5, fontWeight: 600, color: '#9ca3af', marginBottom: 2 }}>Delivery</div>
                    <div style={{ fontSize: 12.5, color: '#374151' }}>{trackedOrder.deliveryMethod}</div>
                  </div>
                  {trackedOrder.dueDate && (
                    <div>
                      <div style={{ fontSize: 10.5, fontWeight: 600, color: '#9ca3af', marginBottom: 2 }}>Due Date</div>
                      <div style={{ fontSize: 12.5, color: '#374151' }}>{trackedOrder.dueDate}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress stepper */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 16 }}>Order Progress</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {PROD_STEPS.map((step, i) => {
                    const done    = i <= currentStepIdx
                    const current = i === currentStepIdx
                    const isLast  = i === PROD_STEPS.length - 1
                    return (
                      <div key={step.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                        {/* Line + dot */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 24 }}>
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: done ? accentColor : '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.3s', boxShadow: current ? `0 0 0 4px ${accentColor}25` : 'none' }}>
                            {done ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                              : <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#d1d5db' }} />}
                          </div>
                          {!isLast && <div style={{ width: 2, height: 28, background: done ? `${accentColor}40` : '#e5e7eb', marginTop: 2 }} />}
                        </div>
                        {/* Label */}
                        <div style={{ paddingBottom: isLast ? 0 : 18, paddingTop: 2 }}>
                          <div style={{ fontSize: 13, fontWeight: current ? 700 : done ? 500 : 400, color: current ? accentColor : done ? '#374151' : '#9ca3af' }}>
                            {step.icon} {step.label}
                          </div>
                          {current && (
                            <div style={{ fontSize: 11, color: accentColor, marginTop: 2, fontWeight: 600 }}>← Current status</div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Items */}
              {trackedOrder.items.length > 0 && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 12 }}>Items</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {trackedOrder.items.map(item => (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f9fafb', borderRadius: 10, border: '1px solid #f0f0f0' }}>
                        <div>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: '#111' }}>{item.name}</div>
                          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>Qty: {item.qty.toLocaleString()}</div>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: accentColor }}>RM {item.total.toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* WhatsApp button */}
              {showWhatsapp && contactWhatsapp && (
                <div style={{ marginTop: 24, textAlign: 'center' }}>
                  <button onClick={() => window.open(`https://wa.me/${contactWhatsapp.replace(/[^0-9]/g,'')}?text=${encodeURIComponent(`Hi, I'd like to check on order ${trackedOrder.id}. Could you give me an update?`)}`, '_blank')} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#25D366', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 22px', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 10px rgba(37,211,102,0.3)' }}>
                    💬 Ask via WhatsApp
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </Shell>
    )
  }

  /* ═══════════════════════════════════════════════════
     QUOTE (modernized)
  ═══════════════════════════════════════════════════ */
  return (
    <Shell>
      <div style={{ padding: isMobile ? '20px 16px' : '28px 28px', maxWidth: 560, margin: '0 auto' }}>
        {qSent ? (
          <div style={{ textAlign: 'center', padding: '44px 20px' }}>
            <div style={{ fontSize: 42, marginBottom: 14 }}>&#127881;</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#111', marginBottom: 8 }}>Quote Request Sent!</div>
            <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6, marginBottom: 24 }}>We&apos;ll send a detailed quote to your email within 1 business day.</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setQSent(false)} style={{ background: 'transparent', color: accentColor, border: `2px solid ${accentColor}`, borderRadius: 10, padding: '9px 20px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>New Quote</button>
              <button onClick={() => nav('home')} style={{ background: accentColor, color: '#fff', border: 'none', borderRadius: 10, padding: '9px 20px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', boxShadow: `0 2px 10px ${accentColor}33` }}>Back to Home</button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: '#111', marginBottom: 6, letterSpacing: '-0.02em' }}>Request a Quote</div>
              <div style={{ fontSize: 12.5, color: '#9ca3af' }}>Fill in your details and we&apos;ll get back to you shortly</div>
            </div>
            {selected && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: `${accentColor}06`, borderRadius: 12, border: `1.5px solid ${accentColor}18`, marginBottom: 18 }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: '#f0f0f0' }}>
                  {selected.mainImage?.url && <img src={selected.mainImage.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </div>
                <div><div style={{ fontSize: 12.5, fontWeight: 600, color: '#111' }}>{selected.name}</div><div style={{ fontSize: 11.5, color: accentColor, fontWeight: 500 }}>{selected.price}</div></div>
                <button onClick={() => setSelected(null)} style={{ marginLeft: 'auto', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 16, color: '#9ca3af', padding: 4 }}>&#10005;</button>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                <input value={qName} onChange={e => setQName(e.target.value)} placeholder="Full name *" style={inputSt()} />
                <input value={qEmail} onChange={e => setQEmail(e.target.value)} placeholder="Email address *" type="email" style={inputSt()} />
              </div>
              <input value={qPhone} onChange={e => setQPhone(e.target.value)} placeholder="Phone number" style={inputSt()} />
              <textarea value={qMsg} onChange={e => setQMsg(e.target.value)} placeholder="Describe your print requirements (size, quantity, material, deadline\u2026)" rows={isMobile ? 3 : 4} style={{ ...inputSt(), resize: 'vertical' }} />
              <button onClick={() => {
                if (!qName || !qEmail) return
                const qOrd = createOrder({
                  customer: qName, customerRef: '', agent: '', status: 'Pending', production: '—',
                  created: todayStr(), dueDate: '', deliveryMethod: 'Self-Pickup', deliveryAddress: '—',
                  notes: [
                    `Email: ${qEmail}`,
                    qPhone && `Phone: ${qPhone}`,
                    qMsg   && `Message: ${qMsg}`,
                    selected && `Product: ${selected.name}`,
                  ].filter(Boolean).join('\n'),
                  source: 'online-store', items: [], payments: [],
                  timeline: [{ id: uid(), date: nowStr(), event: 'Quote request submitted via Online Store', by: qName }],
                  discount: 0, discountType: 'rm', sstEnabled: true, sstRate: 6,
                  sstAmount: 0, rounding: 0, shippingCost: 0,
                  subtotal: 0, grandTotal: 0, currency: 'MYR',
                })
                addNotification({
                  type: 'info',
                  title: `Quote request from ${qName}`,
                  message: `${qName} requested a quote${selected ? ` for ${selected.name}` : ''} via the online store. Order ${qOrd.id} created.`,
                  link: `/orders/${qOrd.id}`,
                })
                setQSent(true)
              }} style={{
                background: accentColor, color: '#fff', border: 'none', borderRadius: 10,
                padding: '13px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                boxShadow: `0 2px 10px ${accentColor}33`,
              }}>Submit Quote Request</button>
              <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center' }}>By submitting you agree to our Terms of Service</div>
            </div>
          </>
        )}
      </div>
    </Shell>
  )
}
