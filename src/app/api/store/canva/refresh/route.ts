import { NextRequest, NextResponse } from 'next/server'
import { refreshAccessToken } from '@/lib/store/canva-api'

/**
 * POST /api/canva/refresh
 * Body: { refreshToken: string }
 *
 * Refreshes an expired Canva access token.
 */
export async function POST(req: NextRequest) {
  try {
    const { refreshToken } = await req.json()
    if (!refreshToken) {
      return NextResponse.json({ error: 'Missing refreshToken' }, { status: 400 })
    }

    const tokens = await refreshAccessToken(refreshToken)

    return NextResponse.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: Date.now() + tokens.expiresIn * 1000,
    })
  } catch (err) {
    console.error('Canva refresh error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Token refresh failed' },
      { status: 500 }
    )
  }
}
