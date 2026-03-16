'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import MyStoreShell from '@/components/MyStoreShell'
import CreateToast from '@/components/CreateToast'
import ConfirmModal from '@/components/ConfirmModal'
import RowMenu from '@/components/RowMenu'
import { getContentPages, deleteContentPage, type DbContentPage } from '@/lib/db/content'
import { useShop } from '@/providers/shop-provider'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

/* ── Icons ─────────────────────────────────────────── */
const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)
const SearchIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
)

/* ── Helpers ───────────────────────────────────────── */
const TABS = ['All', 'Page', 'Blog', 'Banner']

function statusBadge(s: string) {
  return s === 'Published' ? 'badge badge-success' : 'badge badge-pending'
}
function typeBadge(t: string) {
  if (t === 'Page')   return 'badge badge-info'
  if (t === 'Blog')   return 'badge badge-neutral'
  return 'badge badge-warning'
}

/* ════════════════════════════════════════════════════ */
export default function ContentPage() {
  const router = useRouter()
  const { shopId } = useShop()
  const qc = useQueryClient()

  const { data: rows = [] } = useQuery({
    queryKey: ['content-pages', shopId],
    queryFn: () => getContentPages(shopId),
    enabled: !!shopId,
  })

  const [search, setSearch]     = useState('')
  const [tab, setTab]           = useState('All')
  const [delId, setDelId]       = useState<string | null>(null)

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteContentPage(shopId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['content-pages', shopId] }),
  })

  /* ── Filtering ── */
  const visible = rows.filter(c => {
    if (tab !== 'All' && c.type !== tab) return false
    if (search && !c.title.toLowerCase().includes(search.toLowerCase()) && !c.slug.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const handleDelete = () => {
    if (delId) { deleteMut.mutate(delId); setDelId(null) }
  }

  return (
    <MyStoreShell>
      <CreateToast param="created" title="Content created successfully" subtitle="The new content has been added" basePath="/storefront/content" />
      <CreateToast param="saved" title="Content updated successfully" subtitle="Changes have been saved" basePath="/storefront/content" />

      <div className="page-header">
        <div>
          <div className="page-title">Content</div>
          <div className="page-subtitle">Manage pages, blogs, and banners for the online store</div>
        </div>
        <div className="page-actions">
          <Link href="/storefront/content/new" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
            <PlusIcon /> New Content
          </Link>
        </div>
      </div>

      <div className="page-scroll">
        <div className="finance-stats">
          <div className="stat-card">
            <div className="stat-card-header"><div className="stat-card-label">Total Items</div></div>
            <div className="stat-value">{rows.length}</div>
            <div className="stat-vs">{rows.filter(c => c.status === 'Published').length} published</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-header"><div className="stat-card-label">Published</div></div>
            <div className="stat-value" style={{ color: '#16a34a' }}>{rows.filter(c => c.status === 'Published').length}</div>
            <div className="stat-vs">Live on store</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-header"><div className="stat-card-label">Drafts</div></div>
            <div className="stat-value" style={{ color: '#d97706' }}>{rows.filter(c => c.status === 'Draft').length}</div>
            <div className="stat-vs">In progress</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-header"><div className="stat-card-label">Blog Posts</div></div>
            <div className="stat-value" style={{ color: 'var(--purple-text)' }}>{rows.filter(c => c.type === 'Blog').length}</div>
            <div className="stat-vs">Blog articles</div>
          </div>
        </div>

        <div className="filter-row">
          <div className="filter-bar">
            {TABS.map(t => (
              <button key={t} className={`filter-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{t}</button>
            ))}
          </div>
          <div className="filter-right">
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '6px 12px' }}>
              <SearchIcon />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search content…"
                style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12.5, color: 'var(--text-primary)', width: 180 }} />
            </div>
          </div>
        </div>

        <div className="card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Slug</th>
                <th>Status</th>
                <th>Last Updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr><td colSpan={6}><div className="empty-state">No content found</div></td></tr>
              )}
              {visible.map(c => (
                <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/storefront/content/${c.id}`)}>
                  <td>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{c.title}</span>
                  </td>
                  <td><span className={typeBadge(c.type)}>{c.type}</span></td>
                  <td><code style={{ fontSize: 11.5, color: 'var(--text-secondary)', background: 'var(--bg)', padding: '2px 6px', borderRadius: 4 }}>/{c.slug}</code></td>
                  <td><span className={statusBadge(c.status)}>{c.status}</span></td>
                  <td style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{c.updated}</td>
                  <td onClick={e => e.stopPropagation()}>
                    <RowMenu items={[
                      { label: 'Edit',   action: () => router.push(`/storefront/content/${c.id}`) },
                      { label: 'Delete', action: () => setDelId(c.id), danger: true },
                    ]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {delId && (
        <ConfirmModal
          title="Delete Content"
          message={`Permanently delete "${rows.find(c => c.id === delId)?.title ?? 'this item'}"? This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDelId(null)}
        />
      )}
    </MyStoreShell>
  )
}
