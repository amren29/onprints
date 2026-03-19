function getBase() {
  return process.env.BILLPLZ_SANDBOX === 'true'
    ? 'https://www.billplz-sandbox.com/api/v3'
    : 'https://www.billplz.com/api/v3'
}

function headers() {
  const key = process.env.BILLPLZ_API_KEY || ''
  const auth = btoa(`${key}:`)
  return {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/json',
  }
}

// ── Collections ────────────────────────────────────────────────────────────

export async function createCollection(title: string, splitPayment?: {
  email: string
  fixed_cut: number // in sen
  variable_cut?: number
  split_header: boolean
}) {
  const body: Record<string, unknown> = { title }

  const res = await fetch(`${getBase()}/collections`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Billplz createCollection failed (${res.status}): ${err.slice(0, 300)}`)
  }

  const collection = await res.json()

  // If split payment is needed, activate it via the split_payments endpoint
  if (splitPayment) {
    const splitRes = await fetch(`${getBase()}/collections/${collection.id}/split_payments`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        email: splitPayment.email,
        fixed_cut: splitPayment.fixed_cut,
        variable_cut: splitPayment.variable_cut ?? 0,
        split_header: splitPayment.split_header,
      }),
    })

    if (!splitRes.ok) {
      const splitErr = await splitRes.json()
      throw new Error(`Billplz split payment setup failed: ${JSON.stringify(splitErr)}`)
    }
  }

  return collection
}

export async function getCollection(collectionId: string) {
  const res = await fetch(`${getBase()}/collections/${collectionId}`, {
    method: 'GET',
    headers: headers(),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Billplz getCollection failed: ${JSON.stringify(err)}`)
  }

  return res.json()
}

// ── Bills ──────────────────────────────────────────────────────────────────

interface CreateBillParams {
  collection_id: string
  email: string
  name: string
  amount: number // in sen
  callback_url: string
  redirect_url: string
  description: string
  reference_1?: string
  reference_1_label?: string
  reference_2?: string
  reference_2_label?: string
}

export async function createBill(params: CreateBillParams) {
  const res = await fetch(`${getBase()}/bills`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      collection_id: params.collection_id,
      email: params.email,
      name: params.name,
      amount: params.amount,
      callback_url: params.callback_url,
      redirect_url: params.redirect_url,
      description: params.description,
      reference_1: params.reference_1,
      reference_1_label: params.reference_1_label || 'Order ID',
      reference_2: params.reference_2,
      reference_2_label: params.reference_2_label,
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Billplz createBill failed: ${JSON.stringify(err)}`)
  }

  return res.json()
}

export async function getBill(billId: string) {
  const res = await fetch(`${getBase()}/bills/${billId}`, {
    method: 'GET',
    headers: headers(),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Billplz getBill failed: ${JSON.stringify(err)}`)
  }

  return res.json()
}

// ── Signature Verification ─────────────────────────────────────────────────

import { createHmac } from 'crypto'

/**
 * Verify Billplz X-Signature (callback) or query string signature (redirect).
 * Billplz signs over sorted key-value pairs joined with '|'.
 */
export function verifySignature(
  data: Record<string, string>,
  xSignature: string
): boolean {
  const signatureKey = process.env.BILLPLZ_SIGNATURE_KEY
  if (!signatureKey) return false

  // Filter out the signature itself and sort keys
  const filtered = Object.entries(data)
    .filter(([key]) => key !== 'billplz[x_signature]' && key !== 'x_signature')
    .sort(([a], [b]) => a.localeCompare(b))

  const source = filtered.map(([k, v]) => `${k}${v}`).join('|')

  const computed = createHmac('sha256', signatureKey)
    .update(source)
    .digest('hex')

  return computed === xSignature
}

/**
 * Parse Billplz redirect query params (keys like billplz[id], billplz[paid])
 */
export function parseBillplzParams(searchParams: URLSearchParams): Record<string, string> {
  const data: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    if (key.startsWith('billplz[') || key === 'billplz[x_signature]') {
      data[key] = value
    }
  })
  return data
}
