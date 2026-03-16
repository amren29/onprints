'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
// TODO [Batch G]: Replace auth-store with Supabase store-users
import { useAuthStore } from '@/lib/store/auth-store'
import { useCartStore } from '@/lib/store/cart-store'
import { formatMYR } from '@/lib/store/pricing-engine'
import OrderStatusBadge, { ProductionBadge } from '@/components/store/account/OrderStatusBadge'
import { ProductionStatus } from '@/types/store'
import { updateOrder as updateDbOrder, getOrderById as getDbOrderById } from '@/lib/db/orders'
// TODO [Batch G]: Replace notification-store with Supabase
import { addNotification } from '@/lib/notification-store'

const SHOP_ID = process.env.NEXT_PUBLIC_SHOP_ID!

const PROD_STEPS: ProductionStatus[] = ['Queued', 'In Progress', 'Quality Check', 'Completed', 'Shipped', 'Delivered']

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const user = useAuthStore((s) => s.currentUser)
  const updateOrderStatus = useAuthStore((s) => s.updateOrderStatus)
  const cartItems = useCartStore((s) => s.items)
  const [showCartConflict, setShowCartConflict] = useState(false)
  const [reorderNotice, setReorderNotice] = useState<string | null>(null)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)
  const [uploadingReceipt, setUploadingReceipt] = useState(false)
  const [receiptSubmitted, setReceiptSubmitted] = useState(false)

  if (!user) return null

  const order = user.orders.find((o) => o.id === id)

  if (!order) {
    return (
      <div className="space-y-4">
        <Link href="/store/account/orders" className="text-sm text-accent hover:underline">
          &larr; Back to Orders
        </Link>
        <div className="bg-white rounded-2xl border border-gray-100 px-6 py-16 text-center">
          <p className="text-sm text-gray-500">Order not found</p>
        </div>
      </div>
    )
  }

  const isCancelled = order.status === 'Cancelled'
  const currentProdIndex = PROD_STEPS.indexOf(order.production)
  const subtotal = (order.items ?? []).reduce((s, i) => s + i.total, 0)
  const totalPaid = (order.payments ?? []).filter((p) => p.status === 'Captured').reduce((s, p) => s + p.amount, 0)
  const canReorder = !isCancelled && (order.production === 'Completed' || order.production === 'Delivered')

  async function executeReorder(clearFirst: boolean) {
    if (clearFirst) {
      useCartStore.getState().clearCart()
    }
    const result = await useCartStore.getState().reorderItems(order!.items)
    setShowCartConflict(false)

    const messages: string[] = []
    if (result.added > 0) messages.push(`${result.added} item${result.added > 1 ? 's' : ''} added to cart`)
    if (result.skipped.length > 0) messages.push(`Skipped: ${result.skipped.join(', ')} (no longer available)`)
    if (result.priceChanged) messages.push('Some prices updated to current rates')

    if (result.added > 0) {
      setReorderNotice(messages.join('. '))
      setTimeout(() => router.push('/store/cart'), 1500)
    } else {
      setReorderNotice(messages.join('. ') || 'No items could be reordered')
    }
  }

  function handleReorder() {
    if (cartItems.length > 0) {
      setShowCartConflict(true)
    } else {
      executeReorder(false)
    }
  }

  // Bank transfer receipt helpers
  const bankTransferPayment = (order.payments ?? []).find((p) => p.method === 'Bank Transfer')
  const hasPendingTransfer = bankTransferPayment?.status === 'Pending'
  const hasReceipt = !!bankTransferPayment?.receiptData
  const transferVerified = bankTransferPayment?.status === 'Captured'

  function handleReceiptFileChange(e: React.ChangeEvent<HTMLInputElement>) {
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
    if (!receiptFile || !order) return
    setUploadingReceipt(true)
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      const fileName = receiptFile.name

      // Update customer-side order
      const updatedPayments = order.payments.map((p) =>
        p.method === 'Bank Transfer' && p.status === 'Pending'
          ? { ...p, receiptData: base64, receiptFileName: fileName }
          : p
      )
      updateOrderStatus(order.id, { payments: updatedPayments })

      // Find and update admin order in Supabase
      // The admin order ID is the same as the user-facing order ID for online-store orders
      ;(async () => {
        try {
          const adminOrder = await getDbOrderById(SHOP_ID, order.id)
          if (adminOrder) {
            const adminPayments = ((adminOrder.payments ?? []) as any[]).map((p: any) =>
              p.method === 'Bank Transfer' && p.status === 'Pending'
                ? { ...p, receiptData: base64, receiptFileName: fileName }
                : p
            )
            await updateDbOrder(SHOP_ID, order.id, { payments: adminPayments })
            addNotification({
              type: 'info',
              title: 'Receipt uploaded',
              message: `Transfer receipt uploaded for order ${order.id}`,
              link: `/orders/${order.id}`,
              source: 'payment',
            })
          }
        } catch { /* non-critical */ }
      })()

      setUploadingReceipt(false)
      setReceiptSubmitted(true)
    }
    reader.readAsDataURL(receiptFile)
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link href="/store/account/orders" className="hover:text-accent transition">Orders</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{order.id}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{order.id}</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Placed on{' '}
            {new Date(order.created).toLocaleDateString('en-MY', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <OrderStatusBadge status={order.status} />
          {order.production !== '—' && <ProductionBadge status={order.production} />}
          {canReorder && (
            <button
              onClick={handleReorder}
              className="flex items-center gap-1.5 px-4 py-2 bg-accent text-white text-sm font-semibold rounded-xl hover:opacity-90 transition"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
              Reorder
            </button>
          )}
        </div>
      </div>

      {/* Reorder notice */}
      {reorderNotice && (
        <div className="rounded-xl bg-green-50 border border-green-200 p-3 text-sm text-green-700 flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {reorderNotice}
        </div>
      )}

      {/* Cart conflict modal */}
      {showCartConflict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="font-bold text-gray-900 mb-2">Cart has items</h3>
            <p className="text-sm text-gray-500 mb-5">Your cart already has {cartItems.length} item{cartItems.length > 1 ? 's' : ''}. What would you like to do?</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => executeReorder(false)}
                className="w-full py-2.5 bg-accent text-white text-sm font-semibold rounded-xl hover:opacity-90 transition"
              >
                Add to existing cart
              </button>
              <button
                onClick={() => executeReorder(true)}
                className="w-full py-2.5 border-2 border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:border-gray-300 transition"
              >
                Replace cart
              </button>
              <button
                onClick={() => setShowCartConflict(false)}
                className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Production Timeline */}
      {!isCancelled && order.production !== '—' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Production Progress</h2>
          <div className="flex items-center justify-between">
            {PROD_STEPS.map((step, i) => {
              const isCompleted = i <= currentProdIndex
              const isCurrent = i === currentProdIndex
              return (
                <div key={step} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition ${
                        isCompleted
                          ? 'bg-accent text-white'
                          : 'bg-gray-100 text-gray-400'
                      } ${isCurrent ? 'ring-4 ring-accent/20' : ''}`}
                    >
                      {isCompleted && i < currentProdIndex ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        i + 1
                      )}
                    </div>
                    <span className={`text-[10px] mt-1.5 font-medium ${isCompleted ? 'text-accent' : 'text-gray-400'}`}>
                      {step}
                    </span>
                  </div>
                  {i < PROD_STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 mt-[-16px] ${i < currentProdIndex ? 'bg-accent' : 'bg-gray-100'}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {isCancelled && (
        <div className="bg-red-50 rounded-2xl border border-red-100 p-6 text-center">
          <p className="text-sm text-red-600 font-medium">This order has been cancelled</p>
        </div>
      )}

      {/* Order Items */}
      <div className="bg-white rounded-2xl border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">
            Items ({(order.items ?? []).length})
          </h2>
        </div>
        <div className="divide-y divide-gray-50">
          {(order.items ?? []).map((item) => (
            <div key={item.id} className="px-6 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                  {item.optionSummary && <p className="text-xs text-gray-400 mt-0.5">{item.optionSummary}</p>}
                  <p className="text-xs text-gray-500 mt-1">Qty: {item.qty.toLocaleString()}</p>
                  {item.artworkFileName && (
                    <p className="text-xs text-gray-400 mt-1">Artwork: {item.artworkFileName}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-gray-900">{formatMYR(item.total)}</p>
                  {!item.bulkVariant && <p className="text-xs text-gray-400">{formatMYR(item.unitPrice)}/unit</p>}
                </div>
              </div>
              {item.bulkVariant && item.variantRows && item.variantRows.length > 0 && (
                <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50 divide-y divide-gray-100">
                  {item.variantRows.map((vr) => (
                    <div key={vr.id} className="flex items-center justify-between px-3 py-2 text-xs">
                      <span className="text-gray-700">
                        <span className="font-semibold">{vr.qty}</span> × {vr.optionSummary}
                      </span>
                      <span className="text-gray-600 shrink-0 ml-2">
                        {formatMYR(vr.unitPrice)}/pc = <span className="font-semibold">{formatMYR(vr.rowTotal)}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Payment & Delivery */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Payment Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{formatMYR(order.subtotal ?? subtotal)}</span>
            </div>
            {(order.shippingCost ?? 0) > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span>{formatMYR(order.shippingCost!)}</span>
              </div>
            )}
            {(order.sstAmount ?? 0) > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>SST ({order.sstRate}%)</span>
                <span>{formatMYR(order.sstAmount!)}</span>
              </div>
            )}
            <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-gray-900">
              <span>Grand Total</span>
              <span>{formatMYR(order.grandTotal ?? totalPaid)}</span>
            </div>
            {totalPaid > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Total Paid</span>
                <span className="text-green-600">{formatMYR(totalPaid)}</span>
              </div>
            )}
          </div>
          {(order.payments ?? []).length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-100 space-y-2">
              {(order.payments ?? []).map((p) => (
                <div key={p.id} className="flex items-center justify-between text-xs">
                  <div>
                    <span className="text-gray-600">{p.method}</span>
                    {p.ref && <span className="text-gray-400 ml-1">({p.ref})</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-700">{formatMYR(p.amount)}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      p.status === 'Captured' ? 'bg-green-100 text-green-700' :
                      p.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-600'
                    }`}>{p.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Delivery Info</h2>
          <div className="text-sm text-gray-600 space-y-1.5">
            <p>
              <span className="text-gray-400">Method:</span>{' '}
              {order.deliveryMethod}
            </p>
            {order.deliveryAddress && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-400 mb-1">Ship to:</p>
                <p className="text-sm text-gray-600">{order.deliveryAddress}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bank Transfer Receipt Section */}
      {bankTransferPayment && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Transfer Receipt</h2>
          {transferVerified ? (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div>
                <p className="font-semibold text-green-800 text-sm">Payment Verified</p>
                <p className="text-xs text-green-600 mt-0.5">Bank transfer has been confirmed by our team.</p>
              </div>
            </div>
          ) : (hasReceipt || receiptSubmitted) ? (
            <div className="space-y-3">
              {bankTransferPayment.receiptData && bankTransferPayment.receiptData.startsWith('data:image') && (
                <img src={bankTransferPayment.receiptData} alt="Receipt" className="w-32 h-32 object-cover rounded-xl border border-gray-200" />
              )}
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                <div>
                  <p className="font-semibold text-amber-800 text-sm">Pending Verification</p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    Receipt ({bankTransferPayment.receiptFileName || receiptFile?.name || 'uploaded'}) is being reviewed.
                  </p>
                </div>
              </div>
            </div>
          ) : hasPendingTransfer ? (
            <div>
              <p className="text-xs text-gray-500 mb-4">Upload a screenshot or PDF of your bank transfer receipt to speed up verification.</p>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleReceiptFileChange}
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
          ) : null}
        </div>
      )}

      {/* Timeline */}
      {(order.timeline ?? []).length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Order Timeline</h2>
          <ol className="relative border-l-2 border-gray-100 ml-3 space-y-4">
            {(order.timeline ?? []).map((tl, i) => (
              <li key={tl.id} className="ml-5">
                <span className={`absolute -left-[7px] w-3 h-3 rounded-full border-2 ${
                  i === 0 ? 'bg-accent border-accent' : 'bg-white border-gray-200'
                }`} />
                <p className="text-sm text-gray-900">{tl.event}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(tl.date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  {tl.by && <> · {tl.by}</>}
                </p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
