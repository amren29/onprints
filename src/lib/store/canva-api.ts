/**
 * Server-side Canva Connect API helpers.
 * All functions call `https://api.canva.com/rest/v1/` with the user's access token.
 */

const CANVA_API = 'https://api.canva.com/rest/v1'

// ── Token Exchange / Refresh ─────────────────────────────────────────────────

export async function exchangeCodeForTokens(code: string, codeVerifier: string) {
  const res = await fetch('https://api.canva.com/rest/v1/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      code_verifier: codeVerifier,
      client_id: process.env.CANVA_CLIENT_ID!,
      client_secret: process.env.CANVA_CLIENT_SECRET!,
      redirect_uri: process.env.CANVA_REDIRECT_URI!,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Token exchange failed: ${res.status} ${text}`)
  }
  const data = await res.json()
  return {
    accessToken: data.access_token as string,
    refreshToken: data.refresh_token as string,
    expiresIn: data.expires_in as number,
  }
}

export async function refreshAccessToken(refreshToken: string) {
  const res = await fetch('https://api.canva.com/rest/v1/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: process.env.CANVA_CLIENT_ID!,
      client_secret: process.env.CANVA_CLIENT_SECRET!,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Token refresh failed: ${res.status} ${text}`)
  }
  const data = await res.json()
  return {
    accessToken: data.access_token as string,
    refreshToken: data.refresh_token as string,
    expiresIn: data.expires_in as number,
  }
}

// ── Designs ──────────────────────────────────────────────────────────────────

export async function listDesigns(
  accessToken: string,
  query?: string,
  continuation?: string
) {
  const params = new URLSearchParams()
  if (query) params.set('query', query)
  if (continuation) params.set('continuation', continuation)

  const res = await fetch(`${CANVA_API}/designs?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`List designs failed: ${res.status} ${text}`)
  }
  return res.json()
}

/** Convert mm to pixels at 300 DPI */
export function mmToPx(mm: number): number {
  return Math.round((mm / 25.4) * 300)
}

export async function createDesign(
  accessToken: string,
  opts: {
    title: string
    widthPx: number
    heightPx: number
    correlationState?: string
    returnUrl?: string
  }
) {
  const body: Record<string, unknown> = {
    design_type: {
      type: 'custom',
      width: opts.widthPx,
      height: opts.heightPx,
    },
    title: opts.title,
  }

  const res = await fetch(`${CANVA_API}/designs`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Create design failed: ${res.status} ${text}`)
  }
  return res.json()
}

// ── Exports ──────────────────────────────────────────────────────────────────

export async function startExport(
  accessToken: string,
  designId: string,
  format: 'png' | 'pdf' = 'png'
) {
  const body: Record<string, unknown> = {
    design_id: designId,
    format: {
      type: format === 'pdf' ? 'pdf' : 'png',
    },
  }

  const res = await fetch(`${CANVA_API}/exports`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Start export failed: ${res.status} ${text}`)
  }
  return res.json()
}

export async function getExportStatus(accessToken: string, exportId: string) {
  const res = await fetch(`${CANVA_API}/exports/${exportId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Get export status failed: ${res.status} ${text}`)
  }
  return res.json()
}
