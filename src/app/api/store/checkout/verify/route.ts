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
      paymentStatus: 'paid',
      amountTotal: bill.paid_amount / 100, // Convert from sen to RM
      currency: 'myr',
      paymentMethod: 'billplz',
      billplzId: bill.id,
      reference: bill.reference_1,
      description: bill.description,
    })
  } catch (err) {
    console.error('Billplz verify error:', err)
    const message = err instanceof Error ? err.message : 'Failed to verify payment'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
