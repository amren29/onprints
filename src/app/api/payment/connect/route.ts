import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const PLAN_FEES: Record<string, number> = {
  starter: 100,
  growth: 60,
  pro: 20,
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { shopId, bankName, bankAccountNo, bankAccountName } = body

    if (!shopId || !bankName || !bankAccountNo || !bankAccountName) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    // Read env vars at request time (Cloudflare Workers)
    const apiKey = process.env.BILLPLZ_API_KEY || ''
    const isSandbox = process.env.BILLPLZ_SANDBOX === 'true'
    const baseUrl = isSandbox
      ? 'https://www.billplz-sandbox.com/api/v3'
      : 'https://www.billplz.com/api/v3'
    const authHeader = `Basic ${btoa(`${apiKey}:`)}`
    const platformEmail = process.env.ONPRINTS_BILLPLZ_EMAIL || 'platform@onprints.my'

    // Get shop's current plan to determine fixed_cut
    let plan = 'starter'
    const { data: shop } = await supabase
      .from('shops')
      .select('id, plan')
      .eq('id', shopId)
      .single()

    if (!shop) {
      return NextResponse.json({ error: 'Shop not found.' }, { status: 404 })
    }

    plan = shop.plan || 'starter'
    const fixedCut = PLAN_FEES[plan] ?? PLAN_FEES.starter

    // Create Billplz collection (inline, no import)
    const title = `${bankAccountName} - ${shopId}`.slice(0, 50)
    const collectionRes = await fetch(`${baseUrl}/collections`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title }),
    })

    const collectionText = await collectionRes.text()

    if (!collectionRes.ok) {
      console.error('Billplz collection failed:', collectionRes.status, collectionText.slice(0, 300))
      return NextResponse.json({
        error: 'Failed to create payment collection. Please try again.',
      }, { status: 500 })
    }

    let collection: { id: string }
    try {
      collection = JSON.parse(collectionText)
    } catch {
      console.error('Billplz returned non-JSON:', collectionText.slice(0, 300))
      return NextResponse.json({
        error: 'Unexpected response from payment provider. Please try again.',
      }, { status: 500 })
    }

    // Set up split payment
    const splitRes = await fetch(`${baseUrl}/collections/${collection.id}/split_payments`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: platformEmail,
        fixed_cut: fixedCut,
        variable_cut: 0,
        split_header: true,
      }),
    })

    if (!splitRes.ok) {
      const splitText = await splitRes.text()
      console.error('Split payment failed:', splitText)
      // Continue anyway - collection is created, split payment can be set up later
    }

    // Save bank info and collection ID to Supabase
    const { error: updateError } = await supabase
      .from('shops')
      .update({
        bank_name: bankName,
        bank_account_no: bankAccountNo,
        bank_account_name: bankAccountName,
        billplz_email: platformEmail,
        billplz_collection_id: collection.id,
        payment_enabled: true,
        bank_verified: true,
        platform_fee_sen: fixedCut,
      })
      .eq('id', shopId)

    if (updateError) {
      throw new Error(`Failed to save bank info: ${updateError.message}`)
    }

    return NextResponse.json({
      success: true,
      collectionId: collection.id,
      plan,
      platformFeeSen: fixedCut,
    })
  } catch (err) {
    console.error('Payment connect error:', err)
    const message = err instanceof Error ? err.message : 'Failed to connect bank account'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
