import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

async function verifySignature(
  data: Record<string, string>,
  xSignature: string
): Promise<boolean> {
  const signatureKey = process.env.BILLPLZ_SIGNATURE_KEY
  if (!signatureKey) return false

  const filtered = Object.entries(data)
    .filter(([key]) => key !== 'billplz[x_signature]' && key !== 'x_signature')
    .sort(([a], [b]) => a.localeCompare(b))

  const source = filtered.map(([k, v]) => `${k}${v}`).join('|')

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(signatureKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(source))
  const computed = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  return computed === xSignature
}

export async function POST(req: NextRequest) {
  try {
    // Billplz sends callback as application/x-www-form-urlencoded
    const formData = await req.text()
    const params = new URLSearchParams(formData)
    const data: Record<string, string> = {}
    params.forEach((value, key) => {
      data[key] = value
    })

    // Verify X-Signature
    const xSignature = req.headers.get('x-signature') || data['x_signature'] || ''
    const valid = await verifySignature(data, xSignature)
    if (!valid) {
      console.error('Billplz callback: Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const billId = data['id']
    const paid = data['paid'] === 'true'
    const paidAt = data['paid_at'] || null
    const state = data['state'] // paid, due
    const transactionId = data['transaction_id'] || null
    const transactionStatus = data['transaction_status'] || null

    if (!billId) {
      return NextResponse.json({ error: 'Missing bill ID' }, { status: 400 })
    }

    // Update payment transaction in Supabase
    const newStatus = paid ? 'paid' : state === 'due' ? 'pending' : 'failed'

    const { data: txn, error: txnError } = await supabase
      .from('payment_transactions')
      .update({
        status: newStatus,
        paid_at: paidAt,
        updated_at: new Date().toISOString(),
      })
      .eq('bill_id', billId)
      .select('order_id, type, shop_id, amount_sen, metadata')
      .single()

    if (txnError) {
      console.error('Billplz callback: Failed to update transaction', txnError)
    }

    // If payment is confirmed, update order status
    if (paid && txn) {
      if (txn.type === 'checkout') {
        await supabase
          .from('orders')
          .update({ status: 'Confirmed' })
          .eq('id', txn.order_id)
      }
    }

    // Billplz expects 200 OK
    return NextResponse.json({ status: 'ok' })
  } catch (err) {
    console.error('Billplz callback error:', err)
    return NextResponse.json({ status: 'ok' }) // Always return 200 to Billplz
  }
}
