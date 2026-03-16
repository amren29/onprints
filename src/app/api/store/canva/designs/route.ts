import { NextRequest, NextResponse } from 'next/server'
import { listDesigns } from '@/lib/store/canva-api'

/**
 * GET /api/canva/designs?query=...&continuation=...
 * Header: Authorization: Bearer <access_token>
 *
 * Lists the user's Canva designs (proxied to avoid CORS).
 */
export async function GET(req: NextRequest) {
  const accessToken = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!accessToken) {
    return NextResponse.json({ error: 'Missing access token' }, { status: 401 })
  }

  const query = req.nextUrl.searchParams.get('query') || undefined
  const continuation = req.nextUrl.searchParams.get('continuation') || undefined

  try {
    const data = await listDesigns(accessToken, query, continuation)
    return NextResponse.json(data)
  } catch (err) {
    console.error('Canva list designs error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to list designs' },
      { status: 500 }
    )
  }
}
