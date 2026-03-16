import { NextRequest, NextResponse } from 'next/server'
import { getBill } from '@/lib/billplz'

export async function GET(req: NextRequest) {
  try {
    const billplzId = req.nextUrl.searchParams.get('billplz_id')
    if (!billplzId) {
      return NextResponse.json({ error: 'Missing billplz_id' }, { status: 400 })
    }

    const bill = await getBill(billplzId)

    if (!bill.paid) {
      return NextResponse.json({ error: 'Payment not completed', status: bill.state }, { status: 400 })
    }

    return NextResponse.json({
      verified: true,
      amount: bill.paid_amount / 100,
      amountTotal: bill.paid_amount / 100,
      paymentMethod: 'billplz',
    })
  } catch (err) {
    console.error('Topup verify error:', err)
    const message = err instanceof Error ? err.message : 'Failed to verify payment'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
