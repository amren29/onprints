/**
 * Lightweight global toast — injects into DOM directly.
 * No React context needed; works from any utility file.
 */
let timer: ReturnType<typeof setTimeout> | null = null

export function showToast(message: string, duration = 2500) {
  if (typeof window === 'undefined') return

  let container = document.getElementById('__global-toast')
  if (!container) {
    container = document.createElement('div')
    container.id = '__global-toast'
    document.body.appendChild(container)
  }

  // Inject keyframes once
  if (!document.getElementById('__toast-style')) {
    const style = document.createElement('style')
    style.id = '__toast-style'
    style.textContent = `
      @keyframes __toast-in  { from { opacity:0; transform:translateY(12px) scale(0.96) } to { opacity:1; transform:translateY(0) scale(1) } }
      @keyframes __toast-out { from { opacity:1; transform:translateY(0) scale(1) } to { opacity:0; transform:translateY(-8px) scale(0.96) } }
    `
    document.head.appendChild(style)
  }

  // Reset if already showing
  if (timer) clearTimeout(timer)

  container.style.cssText = `
    position:fixed; bottom:28px; left:50%; transform:translateX(-50%); z-index:9999;
    pointer-events:none; display:flex; justify-content:center;
  `

  container.innerHTML = `
    <div style="
      display:inline-flex; align-items:center; gap:8px;
      padding:10px 20px; border-radius:10px;
      background:var(--bg-card, #fff); color:var(--text-primary, #0a0a0a);
      border:1px solid var(--border, #f0f0f2);
      box-shadow:0 8px 30px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.04);
      font-size:13px; font-weight:600; font-family:var(--font, Inter, sans-serif);
      animation:__toast-in 0.22s ease forwards;
    ">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#006AFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      ${message}
    </div>
  `

  timer = setTimeout(() => {
    const inner = container?.firstElementChild as HTMLElement | null
    if (inner) {
      inner.style.animation = '__toast-out 0.18s ease forwards'
      setTimeout(() => { if (container) container.innerHTML = '' }, 200)
    }
    timer = null
  }, duration)
}
