import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createBill } from '@/lib/billplz'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { amount, shopId, email, name } = body

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    // Get shop's Billplz collection ID
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('billplz_collection_id, payment_enabled')
      .eq('id', shopId)
      .single()

    if (shopError || !shop || !shop.billplz_collection_id) {
      return NextResponse.json({ error: 'Payment not configured for this shop' }, { status: 400 })
    }

    const baseUrl = process.env.BASE_URL || req.nextUrl.origin
    const amountSen = Math.round(amount * 100)

    const bill = await createBill({
      collection_id: shop.billplz_collection_id,
      email: email || 'customer@example.com',
      name: name || 'Customer',
      amount: amountSen,
      callback_url: `${baseUrl}/api/billplz/callback`,
      redirect_url: `${baseUrl}/api/billplz/redirect`,
      description: `Wallet Top-Up RM${amount.toFixed(2)}`,
      reference_1: `topup-${Date.now()}`,
      reference_1_label: 'Topup Ref',
      reference_2: shopId,
      reference_2_label: 'Shop ID',
    })

    // Save payment transaction
    await supabase.from('payment_transactions').insert({
      bill_id: bill.id,
      shop_id: shopId,
      order_id: `topup-${Date.now()}`,
      type: 'topup',
      amount_sen: amountSen,
      status: 'pending',
      customer_email: email,
      customer_name: name,
      metadata: { amount, type: 'wallet-topup' },
    })

    return NextResponse.json({ url: bill.url })
  } catch (err) {
    console.error('Topup checkout error:', err)
    const message = err instanceof Error ? err.message : 'Failed to create checkout session'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
