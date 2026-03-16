import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createBill } from '@/lib/billplz'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { items, contact, delivery, shippingCost, subtotal, total, sstAmount, sstRate, shippingAddress, shopId } = body

    if (!items || !items.length) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
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

    if (!shop.payment_enabled) {
      return NextResponse.json({ error: 'Online payment is not enabled' }, { status: 400 })
    }

    const baseUrl = process.env.BASE_URL || req.nextUrl.origin
    const storeUrl = process.env.STORE_URL || `${req.nextUrl.origin}/store`

    // Build description from items
    const itemSummaries = items.map(
      (item: { name: string; qty: number; total: number }) =>
        `${item.name} x${item.qty} = RM${item.total.toFixed(2)}`
    )
    const description = itemSummaries.join(', ').slice(0, 200)

    // Amount in sen (Billplz uses sen)
    const amountSen = Math.round(total * 100)

    // Generate a reference for the order
    const orderId = body.adminOrderId || `ORD-${Math.floor(10000 + Math.random() * 90000)}`

    // Create Billplz bill
    const bill = await createBill({
      collection_id: shop.billplz_collection_id,
      email: contact.email,
      name: contact.name,
      amount: amountSen,
      callback_url: `${baseUrl}/api/billplz/callback`,
      redirect_url: `${baseUrl}/api/billplz/redirect`,
      description,
      reference_1: orderId,
      reference_1_label: 'Order ID',
      reference_2: shopId,
      reference_2_label: 'Shop ID',
    })

    // Save payment transaction to Supabase
    await supabase.from('payment_transactions').insert({
      bill_id: bill.id,
      shop_id: shopId,
      order_id: orderId,
      type: 'checkout',
      amount_sen: amountSen,
      status: 'pending',
      customer_email: contact.email,
      customer_name: contact.name,
      metadata: {
        items: itemSummaries,
        contact,
        delivery,
        shippingCost,
        subtotal,
        total,
        sstAmount,
        sstRate,
        shippingAddress,
      },
    })

    return NextResponse.json({ url: bill.url })
  } catch (err) {
    console.error('Billplz checkout error:', err)
    const message = err instanceof Error ? err.message : 'Failed to create checkout session'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
