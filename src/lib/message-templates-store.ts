export type TemplateKey =
  | 'order_confirmation'
  | 'quote_received'
  | 'order_shipped'
  | 'order_ready_pickup'
  | 'payment_received'

export interface MessageTemplate {
  key:     TemplateKey
  label:   string
  channel: 'WhatsApp' | 'Email'
  subject: string   // for email; ignored for WhatsApp
  body:    string   // supports {name}, {orderId}, {total}, {items}, {date}, {trackingNo}
}

const KEY = 'sp_msg_templates'

const DEFAULTS: MessageTemplate[] = [
  {
    key: 'order_confirmation', label: 'Order Confirmation', channel: 'WhatsApp', subject: '',
    body: `Hi {name} 👋\n\nThank you for your order!\n\n*Order ID:* {orderId}\n*Items:* {items}\n*Total:* {total}\n\nWe'll start processing it right away. You'll hear from us once your order is ready. 🙏\n\n— Kinabalu Print Shop`,
  },
  {
    key: 'quote_received', label: 'Quote Request Received', channel: 'WhatsApp', subject: '',
    body: `Hi {name} 👋\n\nWe've received your quote request (Ref: {orderId}).\n\nOur team will review and send you a detailed quotation within 1 business day.\n\nFeel free to reply here if you have any questions!\n\n— Kinabalu Print Shop`,
  },
  {
    key: 'order_shipped', label: 'Order Shipped', channel: 'WhatsApp', subject: '',
    body: `Hi {name} 👋\n\nYour order *{orderId}* has been dispatched! 🚚\n\n*Tracking No:* {trackingNo}\n\nEstimated arrival: 2-5 business days.\n\nTrack your parcel at: https://www.tracking.my\n\n— Kinabalu Print Shop`,
  },
  {
    key: 'order_ready_pickup', label: 'Ready for Self-Pickup', channel: 'WhatsApp', subject: '',
    body: `Hi {name} 👋\n\nGreat news! Your order *{orderId}* is ready for collection. 🎉\n\n📍 *Pickup Address:*\nNo. 12, Jalan Tuaran, Kota Kinabalu, Sabah 88000\n\n⏰ *Hours:* Mon–Sat, 9am–6pm\n\nPlease bring this message when you collect. See you soon!\n\n— Kinabalu Print Shop`,
  },
  {
    key: 'payment_received', label: 'Payment Received', channel: 'WhatsApp', subject: '',
    body: `Hi {name} 👋\n\nWe've received your payment of *{total}* for order *{orderId}*. ✅\n\nThank you! Your order is now confirmed and will be processed shortly.\n\n— Kinabalu Print Shop`,
  },
]

export function getTemplates(): MessageTemplate[] {
  if (typeof window === 'undefined') return DEFAULTS
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return [...DEFAULTS]
    const saved: Record<string, string> = JSON.parse(raw)
    return DEFAULTS.map(t => ({ ...t, body: saved[t.key] ?? t.body }))
  } catch { return [...DEFAULTS] }
}

export function saveTemplate(key: TemplateKey, body: string): void {
  if (typeof window === 'undefined') return
  const raw = localStorage.getItem(KEY)
  const saved = raw ? JSON.parse(raw) : {}
  saved[key] = body
  localStorage.setItem(KEY, JSON.stringify(saved))
}

export function resetTemplate(key: TemplateKey): void {
  if (typeof window === 'undefined') return
  const raw = localStorage.getItem(KEY)
  if (!raw) return
  const saved = JSON.parse(raw)
  delete saved[key]
  localStorage.setItem(KEY, JSON.stringify(saved))
}

export const TEMPLATE_VARIABLES = [
  { v: '{name}',       desc: 'Customer name' },
  { v: '{orderId}',    desc: 'Order / quote ID' },
  { v: '{total}',      desc: 'Order total (e.g. RM 120.00)' },
  { v: '{items}',      desc: 'Short list of items' },
  { v: '{date}',       desc: 'Today\'s date' },
  { v: '{trackingNo}', desc: 'Courier tracking number' },
]
