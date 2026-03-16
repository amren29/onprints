import { NextRequest, NextResponse } from 'next/server'
import { startExport, getExportStatus } from '@/lib/store/canva-api'

/**
 * POST /api/canva/export
 * Header: Authorization: Bearer <access_token>
 * Body: { designId, format? }
 *
 * Starts an async export job for a Canva design.
 */
export async function POST(req: NextRequest) {
  const accessToken = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!accessToken) {
    return NextResponse.json({ error: 'Missing access token' }, { status: 401 })
  }

  try {
    const { designId, format = 'png' } = await req.json()
    if (!designId) {
      return NextResponse.json({ error: 'Missing designId' }, { status: 400 })
    }

    const data = await startExport(accessToken, designId, format)
    return NextResponse.json(data)
  } catch (err) {
    console.error('Canva start export error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to start export' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/canva/export?id=<exportId>
 * Header: Authorization: Bearer <access_token>
 *
 * Polls export job status. Returns { status, urls? }.
 */
export async function GET(req: NextRequest) {
  const accessToken = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!accessToken) {
    return NextResponse.json({ error: 'Missing access token' }, { status: 401 })
  }

  const exportId = req.nextUrl.searchParams.get('id')
  if (!exportId) {
    return NextResponse.json({ error: 'Missing export id' }, { status: 400 })
  }

  try {
    const data = await getExportStatus(accessToken, exportId)
    return NextResponse.json(data)
  } catch (err) {
    console.error('Canva export status error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to get export status' },
      { status: 500 }
    )
  }
}
