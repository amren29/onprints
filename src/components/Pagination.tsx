'use client'
import { useState } from 'react'
import CustomSelect from '@/components/CustomSelect'

/* ── Hook ──────────────────────────────────────────── */
export function usePagination<T>(items: T[], defaultPerPage = 10) {
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(defaultPerPage)

  const totalPages = Math.max(1, Math.ceil(items.length / perPage))
  const safePage = Math.min(page, totalPages)
  if (safePage !== page) setPage(safePage)

  const paged = items.slice((safePage - 1) * perPage, safePage * perPage)

  return { page: safePage, perPage, totalPages, paged, setPage, setPerPage, total: items.length }
}

/* ── Icons ─────────────────────────────────────────── */
const ChevLeft = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
)
const ChevRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 6 15 12 9 18"/>
  </svg>
)

/* ── Component ─────────────────────────────────────── */
interface Props {
  page: number
  totalPages: number
  total: number
  perPage: number
  onPageChange: (p: number) => void
  onPerPageChange: (n: number) => void
}

export default function Pagination({ page, totalPages, total, perPage, onPageChange, onPerPageChange }: Props) {
  if (total === 0) return null

  const start = (page - 1) * perPage + 1
  const end = Math.min(page * perPage, total)

  // Build page numbers with ellipsis
  const pages: (number | '...')[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 3) pages.push('...')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
    if (page < totalPages - 2) pages.push('...')
    pages.push(totalPages)
  }

  const btn: React.CSSProperties = {
    width: 30, height: 30, borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--bg-card)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', fontSize: 12, fontWeight: 500, fontFamily: 'var(--font)',
    color: 'var(--text-secondary)', transition: 'all 0.12s ease',
  }

  const activeBtn: React.CSSProperties = {
    ...btn,
    background: 'var(--accent)', color: 'white', borderColor: 'var(--accent)',
  }

  const disabledBtn: React.CSSProperties = {
    ...btn,
    opacity: 0.4, cursor: 'default', pointerEvents: 'none',
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 0', marginTop: 4, fontSize: 12.5, color: 'var(--text-muted)',
      fontFamily: 'var(--font)',
    }}>
      {/* Left — showing count */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>Showing {start}–{end} of {total}</span>
        <CustomSelect
          value={String(perPage)}
          onChange={v => { onPerPageChange(Number(v)); onPageChange(1) }}
          options={[10, 25, 50, 100].map(n => ({ value: String(n), label: `${n} / page` }))}
          style={{ width: 100, fontSize: 12, padding: '4px 8px', minHeight: 0, height: 28 }}
        />
      </div>

      {/* Right — page buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          onClick={() => onPageChange(page - 1)}
          style={page <= 1 ? disabledBtn : btn}
          onMouseEnter={e => { if (page > 1) e.currentTarget.style.background = 'var(--bg)' }}
          onMouseLeave={e => { if (page > 1) e.currentTarget.style.background = 'var(--bg-card)' }}
        >
          <ChevLeft />
        </button>

        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} style={{ width: 30, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>...</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              style={p === page ? activeBtn : btn}
              onMouseEnter={e => { if (p !== page) e.currentTarget.style.background = 'var(--bg)' }}
              onMouseLeave={e => { if (p !== page) e.currentTarget.style.background = 'var(--bg-card)' }}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          style={page >= totalPages ? disabledBtn : btn}
          onMouseEnter={e => { if (page < totalPages) e.currentTarget.style.background = 'var(--bg)' }}
          onMouseLeave={e => { if (page < totalPages) e.currentTarget.style.background = 'var(--bg-card)' }}
        >
          <ChevRight />
        </button>
      </div>
    </div>
  )
}
