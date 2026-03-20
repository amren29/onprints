import { NextRequest, NextResponse } from 'next/server'

async function verifySignature(
  data: Record<string, string>,
  xSignature: string
): Promise<boolean> {
  const signatureKey = process.env.BILLPLZ_SIGNATURE_KEY
  if (!signatureKey) return false

  // Filter out the signature itself and sort keys
  const filtered = Object.entries(data)
    .filter(([key]) => key !== 'billplz[x_signature]' && key !== 'x_signature')
    .sort(([a], [b]) => a.localeCompare(b))

  const source = filtered.map(([k, v]) => `${k}${v}`).join('|')

  // Use Web Crypto API (works on Cloudflare Workers)
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

function parseBillplzParams(searchParams: URLSearchParams): Record<string, string> {
  const data: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    if (key.startsWith('billplz[') || key === 'billplz[x_signature]') {
      data[key] = value
    }
  })
  return data
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const billplzData = parseBillplzParams(searchParams)

  const billId = searchParams.get('billplz[id]') || ''
  const paid = searchParams.get('billplz[paid]') || ''
  const xSignature = searchParams.get('billplz[x_signature]') || ''

  const storeUrl = process.env.STORE_URL || `${req.nextUrl.origin}/store`

  // Verify signature
  const valid = await verifySignature(billplzData, xSignature)
  if (!valid) {
    console.error('Billplz redirect: invalid signature', { billId, paid, keyPresent: !!process.env.BILLPLZ_SIGNATURE_KEY })
    return NextResponse.redirect(`${storeUrl}/order-success?billplz_id=${billId}&paid=${paid}&sig_error=1`)
  }

  if (paid === 'true') {
    return NextResponse.redirect(`${storeUrl}/order-success?billplz_id=${billId}&paid=true`)
  } else {
    return NextResponse.redirect(`${storeUrl}/order-success?billplz_id=${billId}&paid=false`)
  }
}
