'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body style={{ background: '#111', color: '#fff', padding: 40, fontFamily: 'monospace' }}>
        <h2>Something went wrong!</h2>
        <pre style={{ color: '#f87171', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
          {error.message}
        </pre>
        {error.digest && <p>Digest: {error.digest}</p>}
        <button onClick={reset} style={{ marginTop: 20, padding: '8px 16px', cursor: 'pointer' }}>
          Try again
        </button>
      </body>
    </html>
  )
}
