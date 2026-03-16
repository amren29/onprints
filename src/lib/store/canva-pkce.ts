/**
 * PKCE (Proof Key for Code Exchange) helpers for Canva OAuth 2.0.
 * Used server-side during the authorization flow.
 */
import { randomBytes, createHash } from 'crypto'

export function generateCodeVerifier(): string {
  return randomBytes(32).toString('base64url')
}

export function generateCodeChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url')
}
