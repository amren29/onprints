import { NextRequest, NextResponse } from 'next/server'
import { verifySignature, parseBillplzParams } from '@/lib/billplz'

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const billplzData = parseBillplzParams(searchParams)

  // Extract values
  const billId = searchParams.get('billplz[id]') || ''
  const paid = searchParams.get('billplz[paid]') || ''
  const xSignature = searchParams.get('billplz[x_signature]') || ''

  // Verify signature
  if (!verifySignature(billplzData, xSignature)) {
    const storeUrl = process.env.STORE_URL || `${req.nextUrl.origin}/store`
    return NextResponse.redirect(`${storeUrl}/order-success?error=invalid_signature`)
  }

  // Determine redirect type from the bill's reference
  // We'll check the payment_transactions table type via the order-success page
  const storeUrl = process.env.STORE_URL || `${req.nextUrl.origin}/store`

  if (paid === 'true') {
    return NextResponse.redirect(`${storeUrl}/order-success?billplz_id=${billId}&paid=true`)
  } else {
    return NextResponse.redirect(`${storeUrl}/order-success?billplz_id=${billId}&paid=false`)
  }
}
