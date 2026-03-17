import { NextRequest, NextResponse } from 'next/server'
import { createDesign, mmToPx } from '@/lib/store/canva-api'

/**
 * POST /api/canva/designs/create
 * Header: Authorization: Bearer <access_token>
 * Body: { title, widthMm, heightMm, bleedMm, slug }
 *
 * Creates a new Canva design with the correct print dimensions (mm → px at 300 DPI).
 */
export async function POST(req: NextRequest) {
  const accessToken = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!accessToken) {
    return NextResponse.json({ error: 'Missing access token' }, { status: 401 })
  }

  try {
    const { title, widthMm, heightMm, bleedMm = 0, slug } = await req.json()
    if (!widthMm || !heightMm) {
      return NextResponse.json({ error: 'Missing dimensions' }, { status: 400 })
    }

    // Total dimensions including bleed
    const totalWMm = widthMm + bleedMm * 2
    const totalHMm = heightMm + bleedMm * 2

    const data = await createDesign(accessToken, {
      title: title || 'OnPrints Design',
      widthPx: mmToPx(totalWMm),
      heightPx: mmToPx(totalHMm),
      correlationState: slug,
      returnUrl: process.env.CANVA_RETURN_URL,
    })

    return NextResponse.json(data)
  } catch (err) {
    console.error('Canva create design error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create design' },
      { status: 500 }
    )
  }
}
