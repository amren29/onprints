'use client'

import { useRef } from 'react'
import type { ProductImage } from '@/lib/catalog-store' // type-only import — keep

const UploadIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
)
const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
  </svg>
)
const PlusIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)

function readFile(file: File): Promise<string> {
  return new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target?.result as string)
    reader.readAsDataURL(file)
  })
}

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

/* ── Main Image ─────────────────────────────────────── */
interface MainImageUploadProps {
  image: ProductImage | null
  onChange: (img: ProductImage | null) => void
}

export function MainImageUpload({ image, onChange }: MainImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await readFile(file)
    onChange({ id: uid(), url, name: image?.name || file.name.replace(/\.[^.]+$/, '') })
    e.target.value = ''
  }

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Main Image</div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* Preview / upload zone */}
        <div
          onClick={() => !image && inputRef.current?.click()}
          style={{
            width: 120, height: 120, borderRadius: 10, flexShrink: 0,
            border: `2px dashed ${image ? 'transparent' : 'var(--border)'}`,
            background: image ? 'transparent' : 'var(--bg)',
            overflow: 'hidden', cursor: image ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
          }}
        >
          {image
            ? <img src={image.url} alt={image.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
            : <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: 'var(--text-muted)' }}>
                <UploadIcon />
                <span style={{ fontSize: 11, textAlign: 'center', lineHeight: 1.4 }}>Click to upload</span>
              </div>
          }
        </div>

        {/* Name + actions */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Image Name</label>
            <input
              className="form-input"
              value={image?.name || ''}
              onChange={e => image && onChange({ ...image, name: e.target.value })}
              placeholder="e.g. Front view"
              disabled={!image}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn-secondary" onClick={() => inputRef.current?.click()} style={{ fontSize: 12, padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 5 }}>
              <UploadIcon /> {image ? 'Change' : 'Upload'}
            </button>
            {image && (
              <button type="button" onClick={() => onChange(null)} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                <TrashIcon /> Remove
              </button>
            )}
          </div>
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
    </div>
  )
}

/* ── Variant Images ─────────────────────────────────── */
interface VariantImagesUploadProps {
  images: ProductImage[]
  onChange: (imgs: ProductImage[]) => void
}

export function VariantImagesUpload({ images, onChange }: VariantImagesUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await readFile(file)
    onChange([...images, { id: uid(), url, name: file.name.replace(/\.[^.]+$/, '') }])
    e.target.value = ''
  }

  const updateName = (id: string, name: string) => {
    onChange(images.map(img => img.id === id ? { ...img, name } : img))
  }

  const remove = (id: string) => {
    onChange(images.filter(img => img.id !== id))
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Variant Images</div>
        <button type="button" className="btn-secondary" onClick={() => inputRef.current?.click()} style={{ fontSize: 12, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
          <PlusIcon /> Add
        </button>
      </div>

      {images.length === 0 && (
        <div
          onClick={() => inputRef.current?.click()}
          style={{ border: '2px dashed var(--border)', borderRadius: 10, padding: '20px', textAlign: 'center', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12.5 }}
        >
          No variants yet — click Add or here to upload
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {images.map((img, idx) => (
          <div key={img.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 12px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
            {/* Thumbnail */}
            <div style={{ width: 52, height: 52, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: 'var(--border)' }}>
              <img src={img.url} alt={img.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>

            {/* Index + name */}
            <div style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 20 }}>#{idx + 1}</div>
            <input
              className="form-input"
              value={img.name}
              onChange={e => updateName(img.id, e.target.value)}
              placeholder="Variant name…"
              style={{ flex: 1 }}
            />

            {/* Remove */}
            <button type="button" onClick={() => remove(img.id)} style={{ padding: '5px 8px', borderRadius: 6, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
              <TrashIcon />
            </button>
          </div>
        ))}
      </div>

      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
    </div>
  )
}
