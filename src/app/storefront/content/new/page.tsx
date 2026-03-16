'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import MyStoreShell from '@/components/MyStoreShell'
import SavingOverlay from '@/components/SavingOverlay'
import CustomSelect from '@/components/CustomSelect'
import { createContentPage } from '@/lib/db/content'
import { useShop } from '@/providers/shop-provider'
import { useMutation, useQueryClient } from '@tanstack/react-query'

const BackIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>)

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

const STATUS_OPTS = ['Published', 'Draft']
const TYPE_OPTS = ['Page', 'Blog', 'Banner']

export default function NewContentPage() {
  const router = useRouter()
  const { shopId } = useShop()
  const qc = useQueryClient()
  const [tried, setTried] = useState(false)

  const [title, setTitle]   = useState('')
  const [type, setType]     = useState('Page')
  const [status, setStatus] = useState('Draft')
  const [slug, setSlug]     = useState('')
  const [body, setBody]     = useState('')

  const handleTitleChange = (val: string) => {
    setTitle(val)
    setSlug(slugify(val))
  }

  const createMut = useMutation({
    mutationFn: () => {
      const finalSlug = slug.trim() || slugify(title)
      return createContentPage(shopId, { title, slug: finalSlug, type, status, body })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['content-pages', shopId] })
      router.push('/storefront/content?created=1')
    },
  })

  const handleCreate = () => {
    setTried(true)
    if (!title.trim() || createMut.isPending) return
    createMut.mutate()
  }

  return (
    <MyStoreShell>
      {createMut.isPending && <SavingOverlay message="Creating content…" />}

      <div className="page-header">
        <Link href="/storefront/content" className="back-btn"><BackIcon /> Content</Link>
        <div className="page-actions">
          <Link href="/storefront/content" className="btn-secondary" style={{ textDecoration: 'none' }}>Cancel</Link>
          <button className="btn-primary" onClick={handleCreate} disabled={createMut.isPending} style={{ opacity: createMut.isPending ? 0.6 : 1 }}>Save</button>
        </div>
      </div>

      <div className="page-scroll">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Content Info</div>
            <div className="form-group"><label className="form-label">Title *</label><input className={`form-input${tried && !title.trim() ? ' error' : ''}`} value={title} onChange={e => handleTitleChange(e.target.value)} placeholder="Content title" /></div>
            <div className="form-group"><label className="form-label">Type</label><CustomSelect value={type} onChange={v => setType(v)} options={TYPE_OPTS} /></div>
            <div className="form-group"><label className="form-label">Status</label><CustomSelect value={status} onChange={v => setStatus(v)} options={STATUS_OPTS} /></div>
            <div className="form-group"><label className="form-label">Slug</label><input className="form-input" value={slug} onChange={e => setSlug(e.target.value)} placeholder="auto-generated from title" style={{ fontFamily: 'monospace' }} /></div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Body</div>
            <textarea className="form-input" rows={10} value={body} onChange={e => setBody(e.target.value)} placeholder="Content body / description…" style={{ resize: 'vertical' }} />
          </div>
        </div>
      </div>
    </MyStoreShell>
  )
}
