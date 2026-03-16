import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { exchangeCodeForTokens } from '@/lib/store/canva-api'

/**
 * GET /api/canva/callback?code=...
 *
 * Canva redirects here after user grants consent.
 * Exchanges the auth code for tokens, stores them in a cookie,
 * then redirects the user back to their original page.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  if (!code) {
    return NextResponse.json({ error: 'Missing authorization code' }, { status: 400 })
  }

  const cookieStore = await cookies()
  const codeVerifier = cookieStore.get('canva_code_verifier')?.value
  const returnTo = cookieStore.get('canva_return_to')?.value || '/'

  if (!codeVerifier) {
    return NextResponse.json({ error: 'Missing PKCE verifier — session expired' }, { status: 400 })
  }

  try {
    const tokens = await exchangeCodeForTokens(code, codeVerifier)

    // We pass the tokens via a short-lived cookie that the client reads
    // and stores in the Zustand auth store.
    const tokenPayload = JSON.stringify({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: Date.now() + tokens.expiresIn * 1000,
    })

    const res = NextResponse.redirect(new URL(returnTo, req.url))

    // Token cookie — client will read and clear
    res.cookies.set('canva_tokens', tokenPayload, {
      httpOnly: false, // client needs to read it
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60,
      sameSite: 'lax',
      path: '/',
    })

    // Clean up PKCE cookies
    res.cookies.delete('canva_code_verifier')
    res.cookies.delete('canva_return_to')

    return res
  } catch (err) {
    console.error('Canva callback error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Token exchange failed' },
      { status: 500 }
    )
  }
}
