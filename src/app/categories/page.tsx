'use client'

import { useState, useMemo } from 'react'
import AppShell from '@/components/AppShell'
import ConfirmModal from '@/components/ConfirmModal'
import RowMenu from '@/components/RowMenu'
import {
  getProducts, getCategories as dbGetCategories,
  createCategory as dbCreateCategory, updateCategory as dbUpdateCategory, deleteCategory as dbDeleteCategory,
  type DbCategory, type DbProduct,
} from '@/lib/db/catalog'
import { useShop } from '@/providers/shop-provider'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

/* ── Icons ──────────────────────────────────────────── */
const ExportIcon = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>)
const PlusIcon   = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>)
const SearchIcon = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>)
const DotsIcon   = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>)
const TagIcon    = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>)
const GlobeIcon  = () => (<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>)

/* ── Constants ──────────────────────────────────────── */
const COLORS = ['#006AFF','var(--accent, #006AFF)','#7c3aed','#db2777','#d97706','#006AFF','#ef4444','#0891b2']
const STATUS_BADGE: Record<string, string> = { Active: 'badge badge-success', Paused: 'badge badge-pending' }
const TABS = ['All', 'Active', 'Paused']

type CatForm = { name: string; status: 'Active' | 'Paused'; visibility: 'published' | 'draft'; notes: string }
const BLANK: CatForm = { name: '', status: 'Active', visibility: 'published', notes: '' }

/* ── Modal ──────────────────────────────────────────── */
function CategoryModal({
  title, form, setForm, onSave, onClose, nameError,
}: {
  title: string
  form: CatForm
  setForm: (f: CatForm) => void
  onSave: () => void
  onClose: () => void
  nameError: boolean
}) {
  const f = (k: keyof CatForm, v: string) => setForm({ ...form, [k]: v })
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Name */}
          <div className="form-group">
            <label className="form-label">Category Name *</label>
            <input
              className={`form-input${nameError ? ' input-error' : ''}`}
              value={form.name}
              onChange={e => f('name', e.target.value)}
              placeholder="e.g. Business Cards"
              autoFocus
            />
            {nameError && <div style={{ fontSize: 11.5, color: 'var(--negative)', marginTop: 3 }}>Name is required</div>}
          </div>

          {/* Status + Visibility */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Status</label>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                {(['Active', 'Paused'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => f('status', s)}
                    style={{
                      flex: 1, padding: '6px 0', borderRadius: 8, fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
                      border: form.status === s ? '2px solid var(--accent)' : '1.5px solid var(--border)',
                      background: form.status === s ? 'var(--accent-subtle)' : 'var(--bg)',
                      color: form.status === s ? 'var(--accent)' : 'var(--text-secondary)',
                    }}
                  >{s}</button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Visibility</label>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                {([['published','Published'],['draft','Draft']] as [string,string][]).map(([v, l]) => (
                  <button
                    key={v}
                    onClick={() => f('visibility', v)}
                    style={{
                      flex: 1, padding: '6px 0', borderRadius: 8, fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
                      border: form.visibility === v ? '2px solid var(--accent)' : '1.5px solid var(--border)',
                      background: form.visibility === v ? 'var(--accent-subtle)' : 'var(--bg)',
                      color: form.visibility === v ? 'var(--accent)' : 'var(--text-secondary)',
                    }}
                  >{l}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea
              className="form-input"
              rows={2}
              value={form.notes}
              onChange={e => f('notes', e.target.value)}
              placeholder="Short description or internal notes…"
              style={{ resize: 'vertical' }}
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={onSave}>Save Category</button>
        </div>
      </div>
    </div>
  )
}

/* ── Page ───────────────────────────────────────────── */
export default function CategoriesPage() {
  const { shopId } = useShop()
  const qc = useQueryClient()

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', shopId],
    queryFn: () => dbGetCategories(shopId),
    enabled: !!shopId,
  })
  const { data: products = [] } = useQuery({
    queryKey: ['products', shopId],
    queryFn: () => getProducts(shopId),
    enabled: !!shopId,
  })

  const [tab, setTab]                 = useState('All')
  const [search, setSearch]           = useState('')
  const [showModal, setShowModal]     = useState(false)
  const [editTarget, setEditTarget]   = useState<DbCategory | null>(null)
  const [form, setForm]               = useState<CatForm>(BLANK)
  const [nameError, setNameError]     = useState(false)
  const [delId, setDelId]             = useState<string | null>(null)

  const createMut = useMutation({
    mutationFn: (data: { name: string; status: string; visibility: string; notes: string }) =>
      dbCreateCategory(shopId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories', shopId] }),
    onError: (err: any) => {
      console.error('[createCategory]', err)
      alert('Failed to create: ' + (err?.message || 'Unknown error'))
    },
  })
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<{ name: string; status: string; visibility: string; notes: string }> }) =>
      dbUpdateCategory(shopId, id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories', shopId] }),
    onError: (err: any) => {
      console.error('[updateCategory]', err)
      alert('Failed to update: ' + (err?.message || 'Unknown error'))
    },
  })
  const deleteMut = useMutation({
    mutationFn: (id: string) => dbDeleteCategory(shopId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories', shopId] }),
    onError: (err: any) => {
      console.error('[deleteCategory]', err)
      alert('Failed to delete: ' + (err?.message || 'Unknown error'))
    },
  })

  const itemCount = (catId: string) => products.filter(p => p.category_id === catId).length

  const filtered = useMemo(() => categories.filter(c => {
    if (tab !== 'All' && c.status !== tab) return false
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }), [categories, tab, search])

  const totalItems = products.length
  const active     = categories.filter(c => c.status === 'Active').length
  const published  = categories.filter(c => c.visibility === 'published').length

  function openCreate() {
    setEditTarget(null)
    setForm(BLANK)
    setNameError(false)
    setShowModal(true)
  }

  function openEdit(c: DbCategory) {
    setEditTarget(c)
    setForm({ name: c.name, status: c.status as 'Active' | 'Paused', visibility: c.visibility as 'published' | 'draft', notes: c.notes })
    setNameError(false)
    setShowModal(true)
  }

  function handleSave() {
    if (!form.name.trim()) { setNameError(true); return }
    if (editTarget) updateMut.mutate({ id: editTarget.id, data: form })
    else            createMut.mutate(form)
    setShowModal(false)
  }

  function handleDelete() {
    if (!delId) return
    deleteMut.mutate(delId)
    setDelId(null)
  }

  const colorFor = (idx: number) => COLORS[idx % COLORS.length]

  return (
    <AppShell>
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">Categories</div>
          <div className="page-subtitle">{categories.length} categories · {totalItems} products total</div>
        </div>
        <div className="page-actions">
          <button className="topbar-btn"><ExportIcon /><span>Export</span></button>
          <button className="btn-primary" onClick={openCreate}><PlusIcon /> New Category</button>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-label"><TagIcon /> Total</div></div>
          <div className="stat-value">{categories.length}</div>
          <div className="stat-vs">{totalItems} products across all</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-label"><TagIcon /> Active</div></div>
          <div className="stat-value">{active}</div>
          <div className="stat-vs">Accepting orders</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><div className="stat-card-label"><GlobeIcon /> Published</div></div>
          <div className="stat-value">{published}</div>
          <div className="stat-vs">Visible on storefront</div>
        </div>
      </div>

      <div className="page-scroll">
        {/* Category cards grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {categories.map((c, i) => {
            const count = itemCount(c.id)
            const col   = colorFor(i)
            return (
              <div key={c.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ height: 4, background: col }} />
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: `${col}18`, color: col, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <TagIcon />
                    </div>
                    <RowMenu
                      items={[
                        { label: 'Edit', action: () => openEdit(c) },
                        { label: 'Delete', action: () => setDelId(c.id), danger: true },
                      ]}
                    />
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)', marginBottom: 2 }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>{c.notes || '—'}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{count} product{count !== 1 ? 's' : ''}</span>
                    <span className={STATUS_BADGE[c.status]}>{c.status}</span>
                  </div>
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {c.visibility === 'published'
                      ? <span style={{ fontSize: 11, color: 'var(--positive)', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}><GlobeIcon /> Published</span>
                      : <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Draft</span>
                    }
                    <button className="btn-ghost" style={{ padding: '2px 6px', fontSize: 11 }} onClick={() => openEdit(c)}>Edit</button>
                  </div>
                </div>
              </div>
            )
          })}

          {categories.length === 0 && (
            <div style={{ gridColumn: '1 / -1' }}>
              <div className="empty-state">No categories yet — click New Category to add one</div>
            </div>
          )}
        </div>

        {/* Filter + table */}
        <div className="filter-row" style={{ marginTop: 4 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>All Categories</div>
          <div className="filter-right">
            <div className="filter-bar">
              {TABS.map(t => (
                <button key={t} className={`filter-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{t}</button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '6px 12px' }}>
              <SearchIcon />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
                style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12.5, color: 'var(--text-primary)', width: 140 }} />
            </div>
          </div>
        </div>

        <div className="card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>ID</th>
                <th>Products</th>
                <th>Status</th>
                <th>Visibility</th>
                <th>Notes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7}><div className="empty-state">No categories found</div></td></tr>
              )}
              {filtered.map((c, i) => {
                const col   = colorFor(i)
                const count = itemCount(c.id)
                return (
                  <tr key={c.id}>
                    <td>
                      <div className="td-with-icon">
                        <div style={{ width: 26, height: 26, borderRadius: 6, background: `${col}18`, color: col, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <TagIcon />
                        </div>
                        <span className="cell-name">{c.name}</span>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>{c.seq_id}</td>
                    <td style={{ fontWeight: 600, fontSize: 13 }}>{count}</td>
                    <td><span className={STATUS_BADGE[c.status]}>{c.status}</span></td>
                    <td>
                      {c.visibility === 'published'
                        ? <span style={{ fontSize: 12, color: 'var(--positive)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}><GlobeIcon /> Published</span>
                        : <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Draft</span>
                      }
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 200 }}>{c.notes || '—'}</td>
                    <td>
                      <RowMenu
                        items={[
                          { label: 'Edit', action: () => openEdit(c) },
                          { label: 'Delete', action: () => setDelId(c.id), danger: true },
                        ]}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit modal */}
      {showModal && (
        <CategoryModal
          title={editTarget ? 'Edit Category' : 'New Category'}
          form={form}
          setForm={setForm}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
          nameError={nameError}
        />
      )}

      {/* Delete confirm */}
      {delId && (
        <ConfirmModal
          title="Delete Category?"
          message={`Delete "${categories.find(c => c.id === delId)?.name}"? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setDelId(null)}
        />
      )}
    </AppShell>
  )
}
