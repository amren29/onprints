import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const shopId = req.nextUrl.searchParams.get('shopId')
    if (!shopId) {
      return NextResponse.json({ error: 'Missing shopId' }, { status: 400 })
    }

    const { data: shop, error } = await supabase
      .from('shops')
      .select('*')
      .eq('id', shopId)
      .single()

    if (error || !shop) {
      // Return default state instead of 404 so the UI still renders
      return NextResponse.json({
        bankConnected: false,
        bankName: null,
        bankAccountName: null,
        bankAccountNo: null,
        billplzEmail: null,
        paymentEnabled: false,
        plan: 'starter',
        platformFeeSen: 100,
      })
    }

    return NextResponse.json({
      bankConnected: !!shop.billplz_collection_id,
      bankName: shop.bank_name || null,
      bankAccountName: shop.bank_account_name || null,
      bankAccountNo: shop.bank_account_no || null,
      billplzEmail: shop.billplz_email || null,
      paymentEnabled: shop.payment_enabled || false,
      plan: shop.plan || 'starter',
      platformFeeSen: shop.platform_fee_sen || 100,
    })
  } catch (err) {
    console.error('Payment status error:', err)
    const message = err instanceof Error ? err.message : 'Failed to get payment status'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
