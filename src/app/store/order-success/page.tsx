'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/store/Navbar'
import Footer from '@/components/store/Footer'
import { useCartStore } from '@/lib/store/cart-store'
import { useAuthStore } from '@/lib/store/auth-store'
import { Order } from '@/types/store'
import { updateOrder as updateDbOrder, getOrderById as getDbOrderById } from '@/lib/db/orders'
// TODO [Batch G]: Replace discount-store with Supabase
import { updateDiscount, initDiscountData } from '@/lib/discount-store'
import { removeCurrentSession } from '@/lib/store/abandoned-cart-tracker'
// TODO [Batch G]: Replace notification-store with Supabase
import { addNotification } from '@/lib/notification-store'
import { fetchStoreSettings, type StoreSettings, DEFAULTS as SETTINGS_DEFAULTS } from '@/lib/store-settings-store'
import { useStore } from '@/providers/store-context'

const SHOP_ID = process.env.NEXT_PUBLIC_SHOP_ID!

const STATUS_STEPS = [
  { label: 'Order Received',   desc: 'We have received your order and payment.' },
  { label: 'In Production',    desc: 'Your items are being printed.' },
  { label: 'Quality Check',    desc: 'Inspecting print quality before dispatch.' },
  { label: 'Ready / Shipped',  desc: 'Your order is on its way or ready for pick-up.' },
]

const STATUS_STEPS_TRANSFER = [
  { label: 'Order Received',   desc: 'We have received your order. Awaiting payment.' },
  { label: 'Payment Verified', desc: 'Bank transfer confirmed by our team.' },
  { label: 'In Production',    desc: 'Your items are being printed.' },
  { label: 'Ready / Shipped',  desc: 'Your order is on its way or ready for pick-up.' },
]

function generateOrderId(): string {
  const num = Math.floor(10000 + Math.random() * 90000)
  return `ORD-${num}`
}

export default function OrderSuccessPage() {
  return (
    <Suspense>
      <OrderSuccessContent />
    </Suspense>
  )
}

function OrderSuccessContent() {
  const { basePath } = useStore()
  const params = useSearchParams()
  const billplzId = params.get('billplz_id')
  const isTransfer = params.get('method') === 'transfer'
  const isWallet = params.get('method') === 'wallet'
  const billplzPaid = params.get('paid')

  // Bank transfer flow params
  const paramOrderId = params.get('id')
  const paramEmail = params.get('email')
  const paramTotal = params.get('total')
  const adminId = params.get('adminId')

  const { clearCart } = useCartStore()
  const currentUser = useAuthStore((s) => s.currentUser)
  const addOrder = useAuthStore((s) => s.addOrder)
  const updateOrderStatus = useAuthStore((s) => s.updateOrderStatus)
  const debitWallet = useAuthStore((s) => s.debitWallet)

  const [storeSettings, setStoreSettings] = useState<StoreSettings>(SETTINGS_DEFAULTS)

  // Load store settings from Supabase
  useEffect(() => {
    fetchStoreSettings().then(setStoreSettings).catch(() => {})
  }, [])

  const [verifying, setVerifying] = useState(!!billplzId)
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState('')
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)
  const [uploadingReceipt, setUploadingReceipt] = useState(false)
  const [receiptSubmitted, setReceiptSubmitted] = useState(false)
  const [orderData, setOrderData] = useState<{
    orderId: string
    email: string
    total: number
    amountPaid: number
    paymentMethod: string
  } | null>(null)

  // Billplz verification flow
  useEffect(() => {
    if (!billplzId) return

    let handled = false

    async function verifyPayment() {
      try {
        const res = await fetch(`/api/store/checkout/verify?billplz_id=${billplzId}`)
        const data = await res.json()

        if (!res.ok || !data.verified) {
          setError(data.error || 'Payment could not be verified')
          setVerifying(false)
          return
        }

        if (handled) return
        handled = true

        const orderId = generateOrderId()
        const email = data.contact?.email || 'your email'

        // Recover pending order from sessionStorage
        const pendingRaw = sessionStorage.getItem('saasprint-pending-order')
        if (pendingRaw) {
          try {
            const pending = JSON.parse(pendingRaw)
            const now = new Date().toISOString()
            const paymentMethodLabel = 'Online Payment'
            const deliveryAddr = pending.address ? `${pending.address.line1}${pending.address.line2 ? ', ' + pending.address.line2 : ''}, ${pending.address.postcode} ${pending.address.city}, ${pending.address.state}` : ''
            const order: Order = {
              id: orderId,
              customer: pending.contact?.name || currentUser?.name || 'Guest',
              customerRef: currentUser?.id || '',
              agent: '',
              status: 'Confirmed',
              production: '—',
              created: now,
              dueDate: '',
              deliveryMethod: pending.delivery === 'pickup' ? 'Self-Pickup' : 'Delivery',
              deliveryAddress: deliveryAddr,
              notes: '',
              source: 'online-store',
              items: pending.items.map((i: { id: string; name: string; slug: string; qty: number; unitPrice: number; total: number; optionSummary: string; artworkFileName?: string; artworkUrl?: string; selectedSpecs?: Record<string, string>; bulkVariant?: boolean; variantRows?: any[] }) => ({
                id: i.id,
                name: i.name,
                sku: i.slug || '',
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
                { id: `pay_${Date.now()}`, date: now, method: paymentMethodLabel, ref: billplzId || '', amount: data.amountTotal, status: 'Captured' as const },
              ],
              timeline: [
                { id: `tl_${Date.now()}`, date: now, event: `Order placed via storefront`, by: 'System' },
                { id: `tl_${Date.now() + 1}`, date: now, event: `Payment captured (${paymentMethodLabel})`, by: 'System' },
              ],
              sstEnabled: pending.sstEnabled ?? false,
              sstRate: pending.sstRate ?? 0,
              sstAmount: pending.sstAmount ?? 0,
              shippingCost: pending.shippingCost ?? 0,
              subtotal: pending.subtotal ?? 0,
              grandTotal: pending.grandTotal ?? data.amountTotal,
              currency: 'MYR',
            }

            // Save to user's personal orders if logged in
            if (currentUser) addOrder(order)

            // Update the existing admin order (created before Billplz redirect) to Confirmed
            if (pending.adminOrderId) {
              try {
                await updateDbOrder(SHOP_ID, pending.adminOrderId, {
                  status: 'Confirmed',
                  payments: [
                    { id: `pay_${Date.now()}`, date: now, method: paymentMethodLabel, ref: billplzId || '', amount: data.amountTotal, status: 'Captured' as const },
                  ],
                  timeline: [
                    { id: `tl_${Date.now()}`, date: now, event: 'Checkout started (Online payment)', by: 'System' },
                    { id: `tl_${Date.now() + 1}`, date: now, event: `Payment captured (${paymentMethodLabel})`, by: 'System' },
                  ],
                })
              } catch { /* non-critical */ }
            }

            // Increment discount usage if one was applied
            if (pending.discountId) {
              initDiscountData()
              updateDiscount(pending.discountId, { usageCount: (pending.discountUsageCount ?? 0) + 1 })
            }
          } catch {
            // Ignore parse errors
          }
        }

        // Clear cart and pending order
        clearCart()
        removeCurrentSession()
        sessionStorage.removeItem('saasprint-pending-order')

        setOrderData({
          orderId,
          email,
          total: data.total || data.amountTotal,
          amountPaid: data.amountTotal,
          paymentMethod: data.paymentMethod || 'billplz',
        })
        setVerified(true)
        setVerifying(false)
      } catch {
        setError('Failed to verify payment. Please contact support.')
        setVerifying(false)
      }
    }

    verifyPayment()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billplzId])

  function handleReceiptFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setReceiptFile(file)
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = () => setReceiptPreview(reader.result as string)
      reader.readAsDataURL(file)
    } else {
      setReceiptPreview(null)
    }
  }

  function handleSubmitReceipt() {
    if (!receiptFile) return
    setUploadingReceipt(true)
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      const fileName = receiptFile.name

      // Update admin order's pending Bank Transfer payment with receipt
      if (adminId) {
        (async () => {
          try {
            const adminOrder = await getDbOrderById(SHOP_ID, adminId)
            if (adminOrder) {
              const updatedPayments = ((adminOrder.payments ?? []) as any[]).map((p: any) =>
                p.method === 'Bank Transfer' && p.status === 'Pending'
                  ? { ...p, receiptData: base64, receiptFileName: fileName }
                  : p
              )
              await updateDbOrder(SHOP_ID, adminId, { payments: updatedPayments })
            }
          } catch { /* non-critical */ }
        })()
        addNotification({
          type: 'info',
          title: 'Receipt uploaded',
          message: `Transfer receipt uploaded for order ${adminId}`,
          link: `/orders/${adminId}`,
          source: 'payment',
        })
      }

      // Update customer-side order payment too
      if (currentUser && paramOrderId) {
        const userOrder = currentUser.orders.find((o) => o.id === paramOrderId)
        if (userOrder) {
          const updatedPayments = userOrder.payments.map((p) =>
            p.method === 'Bank Transfer' && p.status === 'Pending'
              ? { ...p, receiptData: base64, receiptFileName: fileName }
              : p
          )
          updateOrderStatus(paramOrderId, { payments: updatedPayments })
        }
      }

      setUploadingReceipt(false)
      setReceiptSubmitted(true)
    }
    reader.readAsDataURL(receiptFile)
  }

  // ── Loading state ────────────────────────────────────────────
  if (verifying) {
    return (
      <>
        <Navbar />
        <main className="max-w-lg mx-auto px-4 py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-5">
            <svg className="animate-spin text-accent" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" strokeOpacity=".3"/>
              <path d="M12 2a10 10 0 0110 10" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Verifying Payment…</h1>
          <p className="text-sm text-gray-500">Please wait while we confirm your payment.</p>
        </main>
        <Footer />
      </>
    )
  }

  // ── Error state ──────────────────────────────────────────────
  if (error) {
    return (
      <>
        <Navbar />
        <main className="max-w-lg mx-auto px-4 py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center mx-auto mb-5">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Issue</h1>
          <p className="text-gray-500 mb-6">{error}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href={`${basePath}/checkout`} className="border-2 border-accent text-accent font-bold px-6 py-3 rounded-xl hover:bg-accent/5 transition">
              Try Again
            </Link>
            <Link href={`${basePath}/products`} className="bg-accent text-white font-bold px-6 py-3 rounded-xl hover:opacity-90 transition">
              Continue Shopping
            </Link>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  // ── Determine display values ─────────────────────────────────
  const orderId = orderData?.orderId || paramOrderId
  const email = orderData?.email || paramEmail || 'your email'

  // No order data and not verifying — redirect to products
  if (!orderId && !verifying) {
    return (
      <>
        <Navbar />
        <main className="max-w-lg mx-auto px-4 py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-gray-50 border-2 border-gray-200 flex items-center justify-center mx-auto mb-5">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">No Order Found</h1>
          <p className="text-gray-500 mb-6">We couldn&apos;t find any order details. This may happen if you refreshed the page.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href={`${basePath}/track`} className="border-2 border-accent text-accent font-bold px-6 py-3 rounded-xl hover:bg-accent/5 transition">
              Track an Order
            </Link>
            <Link href={`${basePath}/products`} className="bg-accent text-white font-bold px-6 py-3 rounded-xl hover:opacity-90 transition">
              Continue Shopping
            </Link>
          </div>
        </main>
        <Footer />
      </>
    )
  }
  const totalDisplay = orderData
    ? `RM ${orderData.amountPaid.toFixed(2)}`
    : paramTotal
      ? `RM ${Number(paramTotal).toFixed(2)}`
      : null

  const steps = isTransfer ? STATUS_STEPS_TRANSFER : STATUS_STEPS
  const isPaid = isWallet || (verified && !isTransfer)

  return (
    <>
      <Navbar />
      <main className="max-w-lg mx-auto px-4 py-16">
        {/* Success icon */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center mx-auto mb-5">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isPaid ? 'Payment Confirmed!' : 'Order Placed!'}
          </h1>
          <p className="text-gray-500 leading-relaxed">
            {isPaid
              ? <>Your payment of <span className="font-semibold text-gray-700">{totalDisplay}</span> has been received. A confirmation has been sent to <span className="font-semibold text-gray-700">{email}</span>.</>
              : <>Thank you for your order. A confirmation has been sent to <span className="font-semibold text-gray-700">{email}</span>.</>
            }
          </p>
        </div>

        {/* Payment confirmed badge */}
        {isPaid && (
          <div className="rounded-2xl bg-green-50 border border-green-200 p-4 mb-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div>
              <p className="font-semibold text-green-800 text-sm">Payment Verified</p>
              <p className="text-xs text-green-600 mt-0.5">
                Paid {totalDisplay} via Online Payment
              </p>
            </div>
          </div>
        )}

        {/* Order card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Order Number</p>
              <p className="text-2xl font-bold text-accent mt-0.5">{orderId}</p>
            </div>
            {totalDisplay && (
              <div className="text-right">
                <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">
                  {isPaid ? 'Amount Paid' : 'Total Due'}
                </p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">{totalDisplay}</p>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500">Keep this order number — you can use it to track your order status.</p>
        </div>

        {/* Bank transfer reminder + receipt upload */}
        {isTransfer && (
          <div className="space-y-4 mb-6">
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5">
              <h2 className="font-bold text-amber-800 mb-2 text-sm">Bank Transfer Required</h2>
              <div className="space-y-1 text-xs text-amber-700">
                <div className="flex gap-3"><span className="font-medium w-20">Bank</span><span>{storeSettings.bankName || '—'}</span></div>
                <div className="flex gap-3"><span className="font-medium w-20">Account</span><span>{storeSettings.bankAccountNo || '—'}</span></div>
                <div className="flex gap-3"><span className="font-medium w-20">Name</span><span>{storeSettings.bankAccountName || '—'}</span></div>
                <div className="flex gap-3"><span className="font-medium w-20">Amount</span><span className="font-bold">{totalDisplay}</span></div>
              </div>
            </div>

            {receiptSubmitted ? (
              <div className="rounded-2xl bg-green-50 border border-green-200 p-5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-green-800 text-sm">Receipt Submitted</p>
                  <p className="text-xs text-green-600 mt-0.5">We&apos;ll verify and confirm your order shortly.</p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <h3 className="font-bold text-gray-900 text-sm mb-3">Upload Transfer Receipt</h3>
                <p className="text-xs text-gray-500 mb-4">Upload a screenshot or PDF of your bank transfer receipt to speed up verification.</p>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleReceiptFile}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-accent/10 file:text-accent hover:file:bg-accent/20 transition"
                />
                {receiptFile && (
                  <div className="mt-3 flex items-center gap-3">
                    {receiptPreview ? (
                      <img src={receiptPreview} alt="Receipt preview" className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
                    ) : (
                      <div className="w-16 h-16 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      </div>
                    )}
                    <span className="text-xs text-gray-600 truncate">{receiptFile.name}</span>
                  </div>
                )}
                <button
                  onClick={handleSubmitReceipt}
                  disabled={!receiptFile || uploadingReceipt}
                  className="mt-4 w-full bg-accent text-white font-bold py-2.5 rounded-xl hover:opacity-90 transition disabled:opacity-40 flex items-center justify-center gap-2 text-sm"
                >
                  {uploadingReceipt ? (
                    <>
                      <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity=".3"/><path d="M12 2a10 10 0 0110 10" strokeLinecap="round"/></svg>
                      Uploading…
                    </>
                  ) : 'Submit Receipt'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Status timeline */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 mb-6">
          <h2 className="font-bold text-gray-900 mb-4 text-sm">Order Status</h2>
          <ol className="relative border-l-2 border-gray-100 ml-3 space-y-5">
            {steps.map((step, i) => (
              <li key={step.label} className="ml-5">
                <span className={`absolute -left-[11px] flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                  i === 0
                    ? 'bg-accent border-accent'
                    : 'bg-white border-gray-200'
                }`}>
                  {i === 0 && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </span>
                <p className={`text-sm font-semibold ${i === 0 ? 'text-accent' : 'text-gray-400'}`}>{step.label}</p>
                <p className={`text-xs mt-0.5 ${i === 0 ? 'text-gray-600' : 'text-gray-400'}`}>{step.desc}</p>
              </li>
            ))}
          </ol>
        </div>

        {/* What's next */}
        <div className="rounded-2xl bg-blue-50 border border-blue-100 p-5 mb-8">
          <h2 className="font-bold text-blue-800 mb-2 text-sm">What happens next?</h2>
          <ul className="space-y-1.5 text-xs text-blue-700">
            <li>A confirmation email will be sent within a few minutes.</li>
            {isTransfer && <li>Your order will begin processing once payment is confirmed.</li>}
            <li>Production begins after artwork is verified (1 business day).</li>
            <li>You will receive a tracking number once your order ships.</li>
            <li>We will contact you if there are any artwork issues.</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href={`${basePath}/track?id=${orderId}`}
            className="flex-1 text-center border-2 border-accent text-accent font-bold px-6 py-3 rounded-xl hover:bg-accent/5 transition"
          >
            Track Order
          </Link>
          <Link
            href={`${basePath}/products`}
            className="flex-1 text-center bg-accent text-white font-bold px-6 py-3 rounded-xl hover:opacity-90 transition"
          >
            Continue Shopping
          </Link>
        </div>
      </main>
      <Footer />
    </>
  )
}
