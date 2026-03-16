import { NextRequest, NextResponse } from 'next/server'
import { generateCodeVerifier, generateCodeChallenge } from '@/lib/store/canva-pkce'
import { cookies } from 'next/headers'

/**
 * GET /api/canva/authorize?returnTo=/products/business-cards-standard
 *
 * Generates PKCE challenge, stores verifier + returnTo in cookies,
 * then redirects the user to Canva's OAuth consent screen.
 */
export async function GET(req: NextRequest) {
  const clientId = process.env.CANVA_CLIENT_ID
  const redirectUri = process.env.CANVA_REDIRECT_URI
  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: 'Canva not configured' }, { status: 500 })
  }

  const returnTo = req.nextUrl.searchParams.get('returnTo') || '/'
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = generateCodeChallenge(codeVerifier)

  // Store PKCE verifier + returnTo in httpOnly cookies (5 min TTL)
  const cookieStore = await cookies()
  cookieStore.set('canva_code_verifier', codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 300,
    sameSite: 'lax',
    path: '/',
  })
  cookieStore.set('canva_return_to', returnTo, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 300,
    sameSite: 'lax',
    path: '/',
  })

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    scope: 'design:content:read design:content:write design:meta:read export:read export:write',
  })

  const canvaAuthUrl = `https://www.canva.com/api/oauth/authorize?${params}`
  return NextResponse.redirect(canvaAuthUrl)
}
