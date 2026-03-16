import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifySignature } from '@/lib/billplz'

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
    if (!verifySignature(data, xSignature)) {
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
        billplz_transaction_id: transactionId,
        billplz_transaction_status: transactionStatus,
        billplz_state: state,
        updated_at: new Date().toISOString(),
      })
      .eq('bill_id', billId)
      .select('order_id, type, shop_id, amount_sen, metadata')
      .single()

    if (txnError) {
      console.error('Billplz callback: Failed to update transaction', txnError)
    }

    // If payment is confirmed, update order status based on transaction type
    if (paid && txn) {
      if (txn.type === 'checkout') {
        await supabase
          .from('orders')
          .update({ status: 'Confirmed', payment_status: 'paid' })
          .eq('id', txn.order_id)
      } else if (txn.type === 'topup') {
        // Credit wallet
        const metadata = txn.metadata as Record<string, unknown>
        const amount = (metadata?.amount as number) || txn.amount_sen / 100
        await supabase.rpc('credit_wallet', {
          p_shop_id: txn.shop_id,
          p_amount: amount,
          p_reference: billId,
        })
      } else if (txn.type === 'membership') {
        const metadata = txn.metadata as Record<string, unknown>
        await supabase
          .from('memberships')
          .insert({
            shop_id: txn.shop_id,
            tier_id: metadata?.tierId,
            tier_name: metadata?.tierName,
            status: 'active',
            payment_ref: billId,
          })
      }
    }

    // Billplz expects 200 OK
    return NextResponse.json({ status: 'ok' })
  } catch (err) {
    console.error('Billplz callback error:', err)
    return NextResponse.json({ status: 'ok' }) // Always return 200 to Billplz
  }
}
