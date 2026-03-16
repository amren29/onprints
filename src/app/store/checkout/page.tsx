'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/store/Navbar'
import Footer from '@/components/store/Footer'
import { useCartStore } from '@/lib/store/cart-store'
import { useAuthStore } from '@/lib/store/auth-store'
import { formatMYR } from '@/lib/store/pricing-engine'
import { calculateTax, TAX_CONFIG } from '@/config/store/tax'
import { useAffiliateStore } from '@/lib/store/affiliate-store'
import { Order } from '@/types/store'
import { createOrder as createDbOrder } from '@/lib/db/orders'
// TODO (Batch G): Migrate discount-store to Supabase
import { getDiscounts, initDiscountData, updateDiscount, type Discount } from '@/lib/discount-store'
import { upsertOnlineCustomer } from '@/lib/store/customer-bridge'
import { removeCurrentSession } from '@/lib/store/abandoned-cart-tracker'
// TODO [Batch H]: Replace finance-store with db/affiliates — customer-facing checkout
import { createAffiliateOrder, getAffiliates, initFinanceData, createAffiliatePayout } from '@/lib/finance-store'
// TODO (Batch G): Migrate auth-store wallet operations to Supabase
import { creditStoreUserWallet, getStoreUserByAffiliateCode } from '@/lib/store/auth-store'
import { fetchStoreSettings, type StoreSettings, DEFAULTS as SETTINGS_DEFAULTS } from '@/lib/store-settings-store'
import { useStoreGlobal } from '@/hooks/useStoreGlobal'

const SHOP_ID = process.env.NEXT_PUBLIC_SHOP_ID!

// ── Types ────────────────────────────────────────────────────────────────────

type DeliveryMethod = 'pickup' | 'standard' | 'express'
type PaymentMethod = 'online' | 'transfer' | 'wallet'

interface ContactForm {
  name: string
  email: string
  phone: string
  company: string
}

interface AddressForm {
  line1: string
  line2: string
  city: string
  postcode: string
  state: string
}

function buildDeliveryOptions(ss: StoreSettings): { id: DeliveryMethod; label: string; desc: string; price: number; eta: string }[] {
  const options: { id: DeliveryMethod; label: string; desc: string; price: number; eta: string }[] = []
  if (ss.selfPickup) {
    options.push({ id: 'pickup', label: 'Self Pick-Up', desc: `Collect from our shop`, price: 0, eta: 'Ready when order is complete' })
  }
  const activeZones = ss.deliveryZones.filter((z) => z.active)
  if (ss.deliveryEnabled && activeZones.length > 0) {
    options.push({ id: 'standard', label: 'Delivery', desc: activeZones.map((z) => `${z.name} (${z.days})`).join(' · '), price: activeZones[0].price, eta: activeZones[0].days + ' after production' })
  }
  if (options.length === 0) {
    options.push({ id: 'pickup', label: 'Self Pick-Up', desc: 'Collect from our shop', price: 0, eta: 'Ready when order is complete' })
  }
  return options
}

const BASE_PAYMENT_OPTIONS: { id: PaymentMethod; label: string; desc: string; badges?: string[] }[] = [
  { id: 'online',   label: 'Pay Online',    desc: 'FPX, Card, ShopeePay, GrabPay, Touch \'n Go, Boost, DuitNow QR — powered by Billplz', badges: ['FPX', 'Visa', 'Mastercard', 'ShopeePay', 'GrabPay', 'TNG', 'DuitNow'] },
  { id: 'transfer', label: 'Bank Transfer', desc: 'Manual transfer — proof required' },
]

const STATES = [
  'Johor', 'Kedah', 'Kelantan', 'Kuala Lumpur', 'Labuan', 'Melaka',
  'Negeri Sembilan', 'Pahang', 'Penang', 'Perak', 'Perlis', 'Putrajaya',
  'Sabah', 'Sarawak', 'Selangor', 'Terengganu',
]

function generateOrderId(): string {
  const num = Math.floor(10000 + Math.random() * 90000)
  return `ORD-${num}`
}

// ── Field component ──────────────────────────────────────────────────────────

function Field({
  label, required, children,
}: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputBase =
  'w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition placeholder:text-gray-300'
const inputCls = `${inputBase} border-gray-200`
const inputErrCls = (hasError: boolean) => `${inputBase} ${hasError ? 'border-red-400' : 'border-gray-200'}`

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const router = useRouter()
  const { items, clearCart } = useCartStore()
  // TODO (Batch G): Migrate auth-store to Supabase auth
  const currentUser = useAuthStore((s) => s.currentUser)
  const addOrder = useAuthStore((s) => s.addOrder)
  const debitWallet = useAuthStore((s) => s.debitWallet)
  const globalSettings = useStoreGlobal()
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(SETTINGS_DEFAULTS)
  const [settingsLoaded, setSettingsLoaded] = useState(false)

  useEffect(() => {
    fetchStoreSettings().then((ss) => { setStoreSettings(ss); setSettingsLoaded(true) }).catch(() => setSettingsLoaded(true))
  }, [])

  const DELIVERY_OPTIONS = buildDeliveryOptions(storeSettings)

  const [contact, setContact] = useState<ContactForm>({ name: '', email: '', phone: '', company: '' })
  const [delivery, setDelivery] = useState<DeliveryMethod>(DELIVERY_OPTIONS[0]?.id ?? 'pickup')
  const [address, setAddress] = useState<AddressForm>({ line1: '', line2: '', city: '', postcode: '', state: 'Selangor' })
  const [payment, setPayment] = useState<PaymentMethod>('online')
  const [placing, setPlacing] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [discountCode, setDiscountCode] = useState('')
  const [appliedDiscount, setAppliedDiscount] = useState<Discount | null>(null)
  const [discountError, setDiscountError] = useState('')

  // Affiliate attribution
  const { getAttribution, clearAttribution } = useAffiliateStore()

  // Auto-fill contact & address from logged-in user
  useEffect(() => {
    if (!currentUser) return
    setContact({
      name: currentUser.name,
      email: currentUser.email,
      phone: currentUser.phone || '',
      company: currentUser.company || '',
    })
    const defaultAddr = currentUser.addresses.find((a) => a.isDefault) || currentUser.addresses[0]
    if (defaultAddr) {
      setAddress({
        line1: defaultAddr.line1,
        line2: defaultAddr.line2,
        city: defaultAddr.city,
        postcode: defaultAddr.postcode,
        state: defaultAddr.state,
      })
      setSelectedAddressId(defaultAddr.id)
    }
  }, [currentUser])

  const selectedDelivery = DELIVERY_OPTIONS.find((d) => d.id === delivery)!
  const subtotal = items.reduce((s, i) => s + i.total, 0)
  const shippingCost = selectedDelivery.price
  const affiliateAttribution = getAttribution()

  // Promo code discount calculation
  const discountAmount = appliedDiscount
    ? appliedDiscount.type === 'percentage'
      ? parseFloat((subtotal * (appliedDiscount.value / 100)).toFixed(2))
      : Math.min(appliedDiscount.value, subtotal)
    : 0
  const afterPromoDiscount = subtotal - discountAmount

  // Member / Agent discount (mutually exclusive — agent takes priority)
  const isAgent = currentUser?.role === 'agent' && (currentUser.discountRate ?? 0) > 0
  const hasMembership = !isAgent && currentUser?.membership && (currentUser.membership.status ?? 'active') === 'active' && new Date(currentUser.membership.expiryDate) > new Date()
  const memberAgentRate = isAgent
    ? currentUser!.discountRate!
    : hasMembership
      ? currentUser!.membership!.discountRate
      : 0
  const memberAgentLabel = isAgent
    ? `Agent discount (${Math.round(memberAgentRate * 100)}%)`
    : hasMembership
      ? `${currentUser!.membership!.tierName} member (${Math.round(memberAgentRate * 100)}%)`
      : ''
  const memberAgentDiscount = memberAgentRate > 0
    ? parseFloat((afterPromoDiscount * memberAgentRate).toFixed(2))
    : 0
  const afterDiscount = afterPromoDiscount - memberAgentDiscount

  const tax = calculateTax(afterDiscount, shippingCost)
  const total = tax.grandTotal

  const walletOk = currentUser && (currentUser.walletBalance ?? 0) >= total
  const PAYMENT_OPTIONS = [
    ...(walletOk ? [{ id: 'wallet' as PaymentMethod, label: 'Pay with Wallet', desc: `Wallet balance: ${formatMYR(currentUser!.walletBalance ?? 0)} — instant confirmation` }] : []),
    ...BASE_PAYMENT_OPTIONS,
  ]

  // Redirect if cart is empty
  if (!items.length) {
    return (
      <>
        <Navbar />
        <main className="max-w-lg mx-auto px-4 py-20 text-center">
          <p className="text-gray-500 mb-4">Your cart is empty.</p>
          <Link href="/store/products" className="text-accent font-semibold hover:underline">Browse products</Link>
        </main>
        <Footer />
      </>
    )
  }

  function handleApplyDiscount() {
    const code = discountCode.trim().toUpperCase()
    if (!code) { setDiscountError('Enter a discount code'); return }
    initDiscountData()
    const discounts = getDiscounts()
    const d = discounts.find((x) => x.code.toUpperCase() === code)
    if (!d) { setDiscountError('Invalid discount code'); return }
    if (d.status !== 'Active') { setDiscountError('This code is no longer active'); return }
    if (d.expiry && new Date(d.expiry) < new Date()) { setDiscountError('This code has expired'); return }
    if (d.usageLimit > 0 && d.usageCount >= d.usageLimit) { setDiscountError('This code has reached its usage limit'); return }
    if (d.minOrder > 0 && subtotal < d.minOrder) { setDiscountError(`Minimum order of ${formatMYR(d.minOrder)} required`); return }
    setAppliedDiscount(d)
    setDiscountError('')
  }

  function handleRemoveDiscount() {
    setAppliedDiscount(null)
    setDiscountCode('')
    setDiscountError('')
  }

  /** Write order to Supabase so admin panels see it */
  async function writeToAdminOrders(order: Order) {
    return createDbOrder(SHOP_ID, {
      customer_name: order.customer,
      customer_id: order.customerRef || null,
      agent_name: order.agent || '',
      status: order.status,
      production: order.production,
      due_date: order.dueDate || '',
      delivery_method: order.deliveryMethod,
      delivery_address: order.deliveryAddress,
      notes: order.notes || '',
      source: 'online-store',
      items: order.items.map((i) => ({
        id: i.id,
        name: i.name,
        sku: i.sku,
        qty: i.qty,
        unitPrice: i.unitPrice,
        total: i.total,
        optionSummary: i.optionSummary,
        artworkFileName: i.artworkFileName,
        artworkUrl: i.artworkUrl,
        selectedSpecs: i.selectedSpecs,
        productSlug: i.productSlug,
        bulkVariant: i.bulkVariant,
        variantRows: i.variantRows,
      })),
      payments: (order.payments ?? []).map((p) => ({
        id: p.id,
        date: p.date,
        method: p.method,
        ref: p.ref,
        amount: p.amount,
        status: p.status === 'Paid' ? 'Captured' : p.status,
      })),
      timeline: (order.timeline ?? []).map((t) => ({
        id: t.id,
        date: t.date,
        event: t.event,
        by: t.by,
      })),
      discount: discountAmount,
      discount_type: appliedDiscount?.type === 'percentage' ? 'percent' : 'rm',
      sst_enabled: order.sstEnabled ?? true,
      sst_rate: order.sstRate ?? 6,
      sst_amount: order.sstAmount ?? 0,
      rounding: 0,
      shipping_cost: order.shippingCost ?? 0,
      subtotal: order.subtotal ?? 0,
      grand_total: order.grandTotal ?? 0,
      currency: order.currency ?? 'MYR',
    })
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!contact.name.trim()) e.name = 'Full name is required'
    if (!contact.email.trim()) e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(contact.email)) e.email = 'Enter a valid email'
    if (!contact.phone.trim()) e.phone = 'Phone number is required'
    if (delivery !== 'pickup') {
      if (!address.line1.trim()) e.line1 = 'Address is required'
      if (!address.city.trim()) e.city = 'City is required'
      if (!address.postcode.trim()) e.postcode = 'Postcode is required'
      else if (!/^\d{5}$/.test(address.postcode)) e.postcode = 'Enter a valid 5-digit postcode'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handlePlaceOrder() {
    if (!validate()) return
    setPlacing(true)

    if (payment === 'wallet') {
      // ── Wallet payment flow ──────────────────────────────────
      const orderId = generateOrderId()
      const now = new Date().toISOString()

      if (currentUser) {
        const deliveryAddr = delivery !== 'pickup' ? `${address.line1}${address.line2 ? ', ' + address.line2 : ''}, ${address.postcode} ${address.city}, ${address.state}` : ''
        const order: Order = {
          id: orderId,
          customer: contact.name,
          customerRef: currentUser.id,
          agent: '',
          affiliateRef: affiliateAttribution?.refCode || '',
          status: 'Confirmed',
          production: '—',
          created: now,
          dueDate: '',
          deliveryMethod: delivery === 'pickup' ? 'Self-Pickup' : 'Delivery',
          deliveryAddress: deliveryAddr,
          notes: '',
          source: 'online-store',
          items: items.map((i) => ({
            id: i.id,
            name: i.name,
            sku: i.slug,
            qty: i.qty,
            unitPrice: i.unitPrice,
            total: i.total,
            optionSummary: i.optionSummary,
            artworkFileName: i.artworkFileName || undefined,
            artworkUrl: i.artworkUrl || undefined,
            selectedSpecs: i.selectedSpecs,
            productSlug: i.slug,
            bulkVariant: i.bulkVariant || undefined,
            variantRows: i.variantRows || undefined,
          })),
          payments: [
            { id: `pay_${Date.now()}`, date: now, method: 'Wallet', ref: orderId, amount: total, status: 'Paid' },
          ],
          timeline: [
            { id: `tl_${Date.now()}`, date: now, event: 'Order placed via storefront (Wallet payment)', by: 'System' },
            { id: `tl_${Date.now() + 1}`, date: now, event: 'Payment confirmed — wallet debited', by: 'System' },
          ],
          sstEnabled: TAX_CONFIG.sstEnabled,
          sstRate: tax.sstRate,
          sstAmount: tax.sstAmount,
          shippingCost: tax.shippingCost,
          subtotal: tax.subtotal,
          grandTotal: tax.grandTotal,
          currency: 'MYR',
        }
        addOrder(order)
        await writeToAdminOrders(order)
        await upsertOnlineCustomer(contact, total)
        if (appliedDiscount) updateDiscount(appliedDiscount.id, { usageCount: appliedDiscount.usageCount + 1 })

        // Debit wallet
        debitWallet({
          id: `we_${Date.now()}`,
          date: now,
          type: 'debit',
          category: 'order-debit',
          description: `Order ${orderId} — wallet payment`,
          amount: total,
          balance: 0,
          reference: orderId,
          status: 'completed',
        })
      }

      if (affiliateAttribution) {
        initFinanceData()
        const aff = getAffiliates().find(a => a.code === affiliateAttribution.refCode)
        if (aff) {
          const ao = createAffiliateOrder({ orderId, customerName: contact.name, affiliateCode: aff.code, affiliateName: aff.name, orderTotal: total, orderDate: new Date().toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }) })
          const commission = Math.round(total * (aff.commissionRate / 100) * 100) / 100
          createAffiliatePayout({ affiliateId: aff.id, affiliateName: aff.name, affiliateCode: aff.code, commissionRate: aff.commissionRate, orderIds: [ao.id], orderTotal: total, commissionAmount: commission, paidAt: new Date().toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }) })
          const affUser = getStoreUserByAffiliateCode(aff.code)
          if (affUser) creditStoreUserWallet(affUser.email, { id: `we_aff_${Date.now()}`, date: new Date().toISOString(), type: 'credit', category: 'commission', description: `Affiliate commission — Order ${orderId}`, amount: commission, status: 'completed' })
        }
        clearAttribution()
      }
      clearCart()
      removeCurrentSession()
      router.push(`/store/order-success?id=${orderId}&email=${encodeURIComponent(contact.email)}&total=${total.toFixed(2)}&method=wallet`)
    } else if (payment === 'online') {
      // ── Billplz Checkout flow ──────────────────────────────────
      try {
        const orderId = generateOrderId()
        const now = new Date().toISOString()
        const deliveryAddr = delivery !== 'pickup' ? `${address.line1}${address.line2 ? ', ' + address.line2 : ''}, ${address.postcode} ${address.city}, ${address.state}` : ''

        // Write pending order to Supabase BEFORE Billplz redirect
        // If customer abandons payment, this stays Pending → shows in Abandoned Carts
        const adminOrder = await createDbOrder(SHOP_ID, {
          customer_name: contact.name,
          customer_id: currentUser?.id || null,
          agent_name: '',
          status: 'Pending',
          production: '—',
          due_date: '',
          delivery_method: delivery === 'pickup' ? 'Self-Pickup' : 'Delivery',
          delivery_address: deliveryAddr,
          notes: '',
          source: 'online-store',
          items: items.map((i) => ({
            id: i.id,
            name: i.name,
            sku: i.slug,
            qty: i.qty,
            unitPrice: i.unitPrice,
            total: i.total,
            optionSummary: i.optionSummary,
            artworkFileName: i.artworkFileName || undefined,
            artworkUrl: i.artworkUrl || undefined,
            selectedSpecs: i.selectedSpecs,
            productSlug: i.slug,
            bulkVariant: i.bulkVariant || undefined,
            variantRows: i.variantRows || undefined,
          })),
          payments: [],
          timeline: [
            { id: `tl_${Date.now()}`, date: now, event: 'Checkout started (Online payment)', by: 'System' },
          ],
          discount: discountAmount,
          discount_type: appliedDiscount?.type === 'percentage' ? 'percent' : 'rm',
          sst_enabled: TAX_CONFIG.sstEnabled,
          sst_rate: tax.sstRate,
          sst_amount: tax.sstAmount,
          rounding: 0,
          shipping_cost: tax.shippingCost,
          subtotal: tax.subtotal,
          grand_total: tax.grandTotal,
          currency: 'MYR',
        })

        // Also upsert customer immediately
        await upsertOnlineCustomer(contact, total)

        // Save pending order to sessionStorage so we can update it after Billplz redirect
        const pendingOrder = {
          items: items.map((i) => ({ ...i })),
          subtotal: tax.subtotal,
          shippingCost: tax.shippingCost,
          total,
          sstEnabled: TAX_CONFIG.sstEnabled,
          sstRate: tax.sstRate,
          sstAmount: tax.sstAmount,
          grandTotal: tax.grandTotal,
          delivery,
          contact,
          address: delivery !== 'pickup' ? address : null,
          affiliateRef: affiliateAttribution?.refCode || null,
          discountAmount,
          discountType: appliedDiscount?.type === 'percentage' ? 'percent' : 'rm',
          discountId: appliedDiscount?.id || null,
          discountUsageCount: appliedDiscount?.usageCount ?? 0,
          adminOrderId: adminOrder.id,
        }
        sessionStorage.setItem('saasprint-pending-order', JSON.stringify(pendingOrder))

        const res = await fetch('/api/store/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: items.map((i) => ({
              name: i.name,
              optionSummary: i.optionSummary,
              unitPrice: i.unitPrice,
              qty: i.qty,
              total: i.total,
            })),
            contact,
            delivery,
            shippingCost: tax.shippingCost,
            subtotal: tax.subtotal,
            total,
            sstAmount: tax.sstAmount,
            sstRate: tax.sstRate,
            shippingAddress: delivery !== 'pickup' ? address : undefined,
            adminOrderId: adminOrder.id,
          }),
        })

        const data = await res.json()
        if (!res.ok || !data.url) {
          throw new Error(data.error || 'Failed to create checkout session')
        }

        // Redirect to Billplz payment page
        window.location.href = data.url
      } catch (err) {

        setPlacing(false)
        setErrors({ payment: err instanceof Error ? err.message : 'Payment failed. Please try again.' })
      }
    } else {
      // ── Bank Transfer flow ────────────────────────────────────
      try {
      const orderId = generateOrderId()
      const now = new Date().toISOString()
      const deliveryAddr = delivery !== 'pickup' ? `${address.line1}${address.line2 ? ', ' + address.line2 : ''}, ${address.postcode} ${address.city}, ${address.state}` : ''

      const order: Order = {
        id: orderId,
        customer: contact.name,
        customerRef: currentUser?.id || '',
        agent: '',
        affiliateRef: affiliateAttribution?.refCode || '',
        status: 'Pending',
        production: '—',
        created: now,
        dueDate: '',
        deliveryMethod: delivery === 'pickup' ? 'Self-Pickup' : 'Delivery',
        deliveryAddress: deliveryAddr,
        notes: '',
        source: 'online-store',
        items: items.map((i) => ({
          id: i.id,
          name: i.name,
          sku: i.slug,
          qty: i.qty,
          unitPrice: i.unitPrice,
          total: i.total,
          optionSummary: i.optionSummary,
          artworkFileName: i.artworkFileName || undefined,
          artworkUrl: i.artworkUrl || undefined,
          selectedSpecs: i.selectedSpecs,
          productSlug: i.slug,
        })),
        payments: [
          { id: `pay_${Date.now()}`, date: now, method: 'Bank Transfer', ref: '', amount: total, status: 'Pending' },
        ],
        timeline: [
          { id: `tl_${Date.now()}`, date: now, event: 'Order placed via storefront (Bank Transfer)', by: 'System' },
        ],
        sstEnabled: TAX_CONFIG.sstEnabled,
        sstRate: tax.sstRate,
        sstAmount: tax.sstAmount,
        shippingCost: tax.shippingCost,
        subtotal: tax.subtotal,
        grandTotal: tax.grandTotal,
        currency: 'MYR',
      }

      // Save to user's personal orders if logged in
      if (currentUser) addOrder(order)

      // Always write to admin stores
      const adminOrder = await writeToAdminOrders(order)
      await upsertOnlineCustomer(contact, total)
      if (appliedDiscount) updateDiscount(appliedDiscount.id, { usageCount: appliedDiscount.usageCount + 1 })

      // Record affiliate order, payout & wallet credit
      if (affiliateAttribution) {
        initFinanceData()
        const aff = getAffiliates().find(a => a.code === affiliateAttribution.refCode)
        if (aff) {
          const ao = createAffiliateOrder({ orderId, customerName: contact.name, affiliateCode: aff.code, affiliateName: aff.name, orderTotal: total, orderDate: new Date().toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }) })
          const commission = Math.round(total * (aff.commissionRate / 100) * 100) / 100
          createAffiliatePayout({ affiliateId: aff.id, affiliateName: aff.name, affiliateCode: aff.code, commissionRate: aff.commissionRate, orderIds: [ao.id], orderTotal: total, commissionAmount: commission, paidAt: new Date().toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }) })
          const affUser = getStoreUserByAffiliateCode(aff.code)
          if (affUser) creditStoreUserWallet(affUser.email, { id: `we_aff_${Date.now()}`, date: new Date().toISOString(), type: 'credit', category: 'commission', description: `Affiliate commission — Order ${orderId}`, amount: commission, status: 'completed' })
        }
        clearAttribution()
      }

      clearCart()
      removeCurrentSession()
      router.push(`/store/order-success?id=${orderId}&email=${encodeURIComponent(contact.email)}&total=${total.toFixed(2)}&method=transfer&adminId=${adminOrder.id}`)
      } catch (err) {

        setPlacing(false)
        setErrors({ payment: err instanceof Error ? err.message : 'Failed to place order. Please try again.' })
      }
    }
  }

  function setC(key: keyof ContactForm) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setContact((p) => ({ ...p, [key]: e.target.value }))
      if (errors[key]) setErrors((p) => { const n = { ...p }; delete n[key]; return n })
    }
  }

  function setA(key: keyof AddressForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setAddress((p) => ({ ...p, [key]: e.target.value }))
      if (errors[key]) setErrors((p) => { const n = { ...p }; delete n[key]; return n })
    }
  }

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="grid md:grid-cols-[1fr_360px] gap-8 items-start">
          {/* ── Left column ─────────────────────────────────── */}
          <div className="space-y-6">

            {/* Contact */}
            <section className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-accent text-white text-xs font-bold flex items-center justify-center">1</span>
                Contact Information
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Full Name" required>
                  <input value={contact.name} onChange={setC('name')} placeholder="Ahmad Zulkifli" className={inputErrCls(!!errors.name)} />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                </Field>
                <Field label="Company / Organisation">
                  <input value={contact.company} onChange={setC('company')} placeholder="Syarikat ABC Sdn Bhd" className={inputCls} />
                </Field>
                <Field label="Email Address" required>
                  <input type="email" value={contact.email} onChange={setC('email')} placeholder="ahmad@example.com" className={inputErrCls(!!errors.email)} />
                  {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                </Field>
                <Field label="Phone Number" required>
                  <input type="tel" value={contact.phone} onChange={setC('phone')} placeholder="01X-XXXXXXX" className={inputErrCls(!!errors.phone)} />
                  {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
                </Field>
              </div>
            </section>

            {/* Delivery */}
            <section className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-accent text-white text-xs font-bold flex items-center justify-center">2</span>
                Delivery Method
              </h2>
              <div className="space-y-3 mb-5">
                {DELIVERY_OPTIONS.map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      delivery === opt.id ? 'border-accent bg-accent/5' : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="delivery"
                      value={opt.id}
                      checked={delivery === opt.id}
                      onChange={() => setDelivery(opt.id)}
                      className="mt-0.5 accent-accent"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-gray-900">{opt.label}</span>
                        <span className={`text-sm font-bold ${opt.price === 0 ? 'text-green-600' : 'text-gray-700'}`}>
                          {opt.price === 0 ? 'FREE' : formatMYR(opt.price)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                      <p className="text-xs text-gray-400 mt-0.5 italic">{opt.eta}</p>
                    </div>
                  </label>
                ))}
              </div>

              {/* Pick-up address */}
              {delivery === 'pickup' && (
                <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 text-sm">
                  <p className="font-semibold text-gray-700 mb-1">Pick-up Location</p>
                  <p className="text-gray-600">{storeSettings.address}</p>
                  <p className="text-gray-500 text-xs mt-1">Mon – Fri: 9am – 6pm · Sat: 9am – 1pm</p>
                </div>
              )}

              {/* Delivery address */}
              {delivery !== 'pickup' && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                {/* Saved address picker */}
                {currentUser && currentUser.addresses.length > 0 && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Use saved address</label>
                    <div className="space-y-2">
                      {currentUser.addresses.map((addr) => (
                        <label
                          key={addr.id}
                          className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                            selectedAddressId === addr.id ? 'border-accent bg-accent/5' : 'border-gray-100 hover:border-gray-200'
                          }`}
                        >
                          <input
                            type="radio"
                            name="savedAddress"
                            checked={selectedAddressId === addr.id}
                            onChange={() => {
                              setSelectedAddressId(addr.id)
                              setAddress({
                                line1: addr.line1,
                                line2: addr.line2,
                                city: addr.city,
                                postcode: addr.postcode,
                                state: addr.state,
                              })
                            }}
                            className="mt-0.5 accent-accent"
                          />
                          <div className="text-sm">
                            <span className="font-medium text-gray-900">{addr.label}</span>
                            {addr.isDefault && <span className="ml-2 text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded-full font-semibold">Default</span>}
                            <p className="text-xs text-gray-500 mt-0.5">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}, {addr.city} {addr.postcode}, {addr.state}</p>
                          </div>
                        </label>
                      ))}
                      <label
                        className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                          selectedAddressId === null ? 'border-accent bg-accent/5' : 'border-gray-100 hover:border-gray-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name="savedAddress"
                          checked={selectedAddressId === null}
                          onChange={() => {
                            setSelectedAddressId(null)
                            setAddress({ line1: '', line2: '', city: '', postcode: '', state: 'Selangor' })
                          }}
                          className="mt-0.5 accent-accent"
                        />
                        <span className="text-sm font-medium text-gray-700">Enter new address</span>
                      </label>
                    </div>
                  </div>
                )}
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Address Line 1" required>
                    <input value={address.line1} onChange={setA('line1')} placeholder="No. 5, Jalan Bahagia" className={inputErrCls(!!errors.line1)} />
                    {errors.line1 && <p className="text-xs text-red-500 mt-1">{errors.line1}</p>}
                  </Field>
                  <Field label="Address Line 2">
                    <input value={address.line2} onChange={setA('line2')} placeholder="Taman Maju (optional)" className={inputCls} />
                  </Field>
                  <Field label="City" required>
                    <input value={address.city} onChange={setA('city')} placeholder="Petaling Jaya" className={inputErrCls(!!errors.city)} />
                    {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
                  </Field>
                  <Field label="Postcode" required>
                    <input value={address.postcode} onChange={setA('postcode')} placeholder="47810" maxLength={5} className={inputErrCls(!!errors.postcode)} />
                    {errors.postcode && <p className="text-xs text-red-500 mt-1">{errors.postcode}</p>}
                  </Field>
                  <Field label="State" required>
                    <select value={address.state} onChange={setA('state')} className={inputCls}>
                      {STATES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </Field>
                </div>
                </div>
              )}
            </section>

            {/* Payment */}
            <section className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-accent text-white text-xs font-bold flex items-center justify-center">3</span>
                Payment Method
              </h2>
              <div className="space-y-3">
                {PAYMENT_OPTIONS.map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      payment === opt.id ? 'border-accent bg-accent/5' : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={opt.id}
                      checked={payment === opt.id}
                      onChange={() => { setPayment(opt.id); if (errors.payment) setErrors((p) => { const n = { ...p }; delete n.payment; return n }) }}
                      className="mt-0.5 accent-accent"
                    />
                    <div className="flex-1">
                      <span className="font-semibold text-sm text-gray-900">{opt.label}</span>
                      <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                      {opt.badges && payment === opt.id && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {opt.badges.map((b) => (
                            <span key={b} className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{b}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </label>
                ))}
              </div>

              {errors.payment && (
                <div className="mt-3 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  {errors.payment}
                </div>
              )}

              {payment === 'transfer' && (
                <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm">
                  <p className="font-semibold text-amber-800 mb-1">Bank Transfer Details</p>
                  <div className="space-y-1 text-amber-700 text-xs">
                    <div className="flex gap-3"><span className="font-medium w-20">Bank</span><span>{storeSettings.bankName || '—'}</span></div>
                    <div className="flex gap-3"><span className="font-medium w-20">Account</span><span>{storeSettings.bankAccountNo || '—'}</span></div>
                    <div className="flex gap-3"><span className="font-medium w-20">Name</span><span>{storeSettings.bankAccountName || '—'}</span></div>
                  </div>
                  <p className="text-amber-600 text-xs mt-2 italic">Please transfer the exact amount and email us your transfer receipt to confirm payment.</p>
                </div>
              )}
            </section>
          </div>

          {/* ── Right column — Order summary ─────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 sticky top-24">
            <h2 className="font-bold text-gray-900 mb-4">Order Summary</h2>

            {/* Items */}
            <div className="space-y-3 mb-4">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3 items-start">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 text-gray-300">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect width="12" height="8" x="6" y="14" /></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                    <p className="text-xs text-gray-400 truncate">{item.optionSummary}</p>
                    <p className="text-xs text-gray-500 mt-0.5">×{item.qty.toLocaleString()}</p>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 shrink-0">{formatMYR(item.total)}</span>
                </div>
              ))}
            </div>

            {/* Discount code */}
            <div className="border-t border-gray-100 pt-4 mb-4">
              {appliedDiscount ? (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600 shrink-0"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                    <div>
                      <p className="text-xs font-semibold text-green-700">{appliedDiscount.code}</p>
                      <p className="text-[10px] text-green-600">
                        {appliedDiscount.type === 'percentage' ? `${appliedDiscount.value}% off` : `${formatMYR(appliedDiscount.value)} off`}
                        {' '}— saves {formatMYR(discountAmount)}
                      </p>
                    </div>
                  </div>
                  <button onClick={handleRemoveDiscount} className="text-xs text-red-500 hover:text-red-700 font-medium">Remove</button>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Discount Code</label>
                  <div className="flex gap-2">
                    <input
                      value={discountCode}
                      onChange={(e) => { setDiscountCode(e.target.value.toUpperCase()); if (discountError) setDiscountError('') }}
                      placeholder="e.g. WELCOME10"
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent transition placeholder:text-gray-300"
                    />
                    <button
                      onClick={handleApplyDiscount}
                      className="px-4 py-2 bg-accent text-white text-xs font-bold rounded-lg hover:opacity-90 transition"
                    >
                      Apply
                    </button>
                  </div>
                  {discountError && <p className="text-xs text-red-500 mt-1">{discountError}</p>}
                </div>
              )}
            </div>

            {/* Affiliate attribution */}
            {affiliateAttribution && (
              <div className="border-t border-gray-100 pt-4 mb-4">
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500 shrink-0"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  <p className="text-xs text-blue-700">Referred by <span className="font-semibold">{affiliateAttribution.affiliateName}</span></p>
                </div>
              </div>
            )}

            {/* Agent discount banner */}
            {currentUser?.role === 'agent' && currentUser.discountRate && (
              <div className="border-t border-gray-100 pt-4 mb-4">
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-3">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600 shrink-0"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                  <p className="text-xs text-green-700 font-semibold">Agent discount ({Math.round(currentUser.discountRate * 100)}%) applied</p>
                </div>
              </div>
            )}

            {/* Wallet balance banner */}
            {currentUser && (currentUser.walletBalance ?? 0) > 0 && (
              <div className="border-t border-gray-100 pt-4 mb-4">
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-3">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600 shrink-0"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 10h20"/></svg>
                  <p className="text-xs text-green-700 font-semibold">Wallet balance: {formatMYR(currentUser.walletBalance ?? 0)}</p>
                </div>
              </div>
            )}

            {/* Membership discount banner (non-agent members) */}
            {currentUser && currentUser.role !== 'agent' && currentUser.membership && (currentUser.membership.status ?? 'active') === 'active' && new Date(currentUser.membership.expiryDate) > new Date() && (
              <div className="border-t border-gray-100 pt-4 mb-4">
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 shrink-0"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                  <p className="text-xs text-blue-700 font-semibold">{currentUser.membership.tierName} member — {Math.round(currentUser.membership.discountRate * 100)}% discount applied</p>
                </div>
              </div>
            )}

            {/* Pricing breakdown */}
            <div className="border-t border-gray-100 pt-4 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatMYR(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount ({appliedDiscount?.code})</span>
                  <span>-{formatMYR(discountAmount)}</span>
                </div>
              )}
              {memberAgentDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>{memberAgentLabel}</span>
                  <span>-{formatMYR(memberAgentDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span className={shippingCost === 0 ? 'text-green-600 font-medium' : ''}>
                  {shippingCost === 0 ? 'FREE' : formatMYR(tax.shippingCost)}
                </span>
              </div>
              {tax.sstAmount > 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>{TAX_CONFIG.taxLabel} ({tax.sstRate}%)</span>
                  <span>{formatMYR(tax.sstAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-900 text-base border-t border-gray-100 pt-2 mt-2">
                <span>Total</span>
                <span className="text-accent">{formatMYR(tax.grandTotal)}</span>
              </div>
            </div>

            {/* Artwork status summary */}
            {items.some((i) => !i.artworkFileName) && (
              <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700">
                Some items are missing artwork. You can upload artwork after placing your order.
              </div>
            )}

            {/* CTA */}
            <button
              onClick={handlePlaceOrder}
              disabled={placing}
              className="mt-5 w-full bg-accent text-white font-bold py-3.5 rounded-xl hover:opacity-90 transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {placing ? (
                <>
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity=".3"/><path d="M12 2a10 10 0 0110 10" strokeLinecap="round"/></svg>
                  {payment === 'online' ? 'Redirecting to payment…' : 'Placing Order…'}
                </>
              ) : (
                payment === 'wallet'
                  ? `Pay ${formatMYR(total)} from Wallet`
                  : payment === 'online'
                    ? `Pay ${formatMYR(total)}`
                    : `Place Order · ${formatMYR(total)}`
              )}
            </button>
            <p className="text-center text-xs text-gray-400 mt-3">
              By placing your order you agree to our{' '}
              <Link href="/store/terms" className="underline hover:text-accent transition">Terms & Conditions</Link>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
