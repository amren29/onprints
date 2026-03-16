'use client'

import { useRef } from 'react'
import type { PageSection } from '@/lib/store-builder'

/* ── Shared styles ──────────────────────────────────── */
const S = {
  heading: { fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 } as React.CSSProperties,
  stack: { display: 'flex', flexDirection: 'column', gap: 12 } as React.CSSProperties,
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } as React.CSSProperties,
  item: {
    border: '1px solid var(--border)', borderRadius: 'var(--r-md)',
    padding: 10, display: 'flex', flexDirection: 'column', gap: 8, position: 'relative',
  } as React.CSSProperties,
  removeBtn: {
    position: 'absolute', top: 6, right: 6, background: 'none', border: 'none',
    color: 'var(--negative)', fontSize: 14, cursor: 'pointer', lineHeight: 1, padding: '0 2px',
  } as React.CSSProperties,
  addBtn: { fontSize: 11, padding: '4px 10px' },
  radioRow: { display: 'flex', gap: 6 } as React.CSSProperties,
  radioBtn: (active: boolean) => ({
    fontSize: 11, padding: '4px 12px', borderRadius: 'var(--r-md)', cursor: 'pointer',
    border: '1px solid var(--border)', fontWeight: active ? 600 : 400,
    background: active ? 'var(--accent)' : 'var(--bg-card)', color: active ? '#fff' : 'var(--text-secondary)',
  }) as React.CSSProperties,
}

/* ── Reusable image input (URL paste + file upload) ─── */
function ImageInput({ value, onChange, label }: { value: string; onChange: (url: string) => void; label?: string }) {
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { alert('Max 2 MB'); return }
    const reader = new FileReader()
    reader.onload = () => onChange(reader.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          className="form-input"
          value={value}
          placeholder="https://... or upload"
          onChange={e => onChange(e.target.value)}
          style={{ flex: 1 }}
        />
        <button
          className="btn-secondary"
          style={{ fontSize: 11, padding: '4px 10px', whiteSpace: 'nowrap' }}
          onClick={() => fileRef.current?.click()}
        >
          Upload
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
      </div>
      {value && value.length < 500 && (
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
      )}
    </div>
  )
}

/* ── Hero ────────────────────────────────────────────── */
function HeroEditor({ props, onChange }: { props: Record<string, any>; onChange: (p: Record<string, any>) => void }) {
  return (
    <div style={S.stack}>
      <p style={S.heading}>Hero Banner</p>
      <div className="form-group">
        <label className="form-label">Badge</label>
        <input className="form-input" value={props.badge || ''} onChange={e => onChange({ badge: e.target.value })} />
      </div>
      <div className="form-group">
        <label className="form-label">Headline</label>
        <input className="form-input" value={props.headline || ''} onChange={e => onChange({ headline: e.target.value })} />
      </div>
      <div className="form-group">
        <label className="form-label">Subtitle</label>
        <input className="form-input" value={props.subtitle || ''} onChange={e => onChange({ subtitle: e.target.value })} />
      </div>
      <div className="form-group">
        <label className="form-label">Primary CTA</label>
        <input className="form-input" value={props.ctaPrimary || ''} onChange={e => onChange({ ctaPrimary: e.target.value })} />
      </div>
      <div className="form-group">
        <label className="form-label">Secondary CTA</label>
        <input className="form-input" value={props.ctaSecondary || ''} onChange={e => onChange({ ctaSecondary: e.target.value })} />
      </div>
    </div>
  )
}

/* ── Products ────────────────────────────────────────── */
function ProductsEditor({ props, onChange }: { props: Record<string, any>; onChange: (p: Record<string, any>) => void }) {
  return (
    <div style={S.stack}>
      <p style={S.heading}>Product Grid</p>
      <div className="form-group">
        <label className="form-label">Title</label>
        <input className="form-input" value={props.title || ''} onChange={e => onChange({ title: e.target.value })} />
      </div>
      <div className="form-group">
        <label className="form-label">Max Items</label>
        <input className="form-input" type="number" min={1} max={12} value={props.maxItems ?? 6}
          onChange={e => onChange({ maxItems: Math.min(12, Math.max(1, Number(e.target.value))) })} />
      </div>
      <div className="form-group">
        <label className="form-label">Category Filter</label>
        <input className="form-input" placeholder="Leave empty for all" value={props.categoryFilter || ''}
          onChange={e => onChange({ categoryFilter: e.target.value })} />
      </div>
    </div>
  )
}

/* ── Categories ──────────────────────────────────────── */
function CategoriesEditor({ props, onChange }: { props: Record<string, any>; onChange: (p: Record<string, any>) => void }) {
  return (
    <div style={S.stack}>
      <p style={S.heading}>Category Chips</p>
      <div className="form-group">
        <label className="form-label">Title</label>
        <input className="form-input" value={props.title || ''} onChange={e => onChange({ title: e.target.value })} />
      </div>
      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Categories are auto-derived from your catalog data.</p>
    </div>
  )
}

/* ── Features ────────────────────────────────────────── */
function FeaturesEditor({ props, onChange }: { props: Record<string, any>; onChange: (p: Record<string, any>) => void }) {
  const items = (props.items || []) as { icon: string; title: string; desc: string }[]
  const updateItems = (next: typeof items) => onChange({ items: next })
  const addItem = () => updateItems([...items, { icon: '✨', title: '', desc: '' }])
  const removeItem = (i: number) => updateItems(items.filter((_, idx) => idx !== i))
  const updateItem = (i: number, field: string, value: string) => {
    const next = [...items]; next[i] = { ...next[i], [field]: value }; updateItems(next)
  }

  return (
    <div style={S.stack}>
      <p style={S.heading}>Features</p>
      <div className="form-group">
        <label className="form-label">Title</label>
        <input className="form-input" value={props.title || ''} onChange={e => onChange({ title: e.target.value })} />
      </div>
      <div className="form-group">
        <label className="form-label">Subtitle</label>
        <input className="form-input" value={props.subtitle || ''} onChange={e => onChange({ subtitle: e.target.value })} />
      </div>
      {items.map((item, i) => (
        <div key={i} style={S.item}>
          <button style={S.removeBtn} onClick={() => removeItem(i)}>&times;</button>
          <div style={S.row}>
            <div className="form-group">
              <label className="form-label">Icon</label>
              <input className="form-input" value={item.icon} onChange={e => updateItem(i, 'icon', e.target.value)}
                style={{ width: 60 }} />
            </div>
            <div className="form-group">
              <label className="form-label">Title</label>
              <input className="form-input" value={item.title} onChange={e => updateItem(i, 'title', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-input" rows={2} value={item.desc}
              onChange={e => updateItem(i, 'desc', e.target.value)} />
          </div>
        </div>
      ))}
      <button className="btn-secondary" style={S.addBtn} onClick={addItem}>+ Add Feature</button>
    </div>
  )
}

/* ── Testimonials ────────────────────────────────────── */
function TestimonialsEditor({ props, onChange }: { props: Record<string, any>; onChange: (p: Record<string, any>) => void }) {
  const items = (props.items || []) as { name: string; text: string; company: string }[]
  const updateItems = (next: typeof items) => onChange({ items: next })
  const addItem = () => updateItems([...items, { name: '', text: '', company: '' }])
  const removeItem = (i: number) => updateItems(items.filter((_, idx) => idx !== i))
  const updateItem = (i: number, field: string, value: string) => {
    const next = [...items]; next[i] = { ...next[i], [field]: value }; updateItems(next)
  }

  return (
    <div style={S.stack}>
      <p style={S.heading}>Testimonials</p>
      <div className="form-group">
        <label className="form-label">Title</label>
        <input className="form-input" value={props.title || ''} onChange={e => onChange({ title: e.target.value })} />
      </div>
      {items.map((item, i) => (
        <div key={i} style={S.item}>
          <button style={S.removeBtn} onClick={() => removeItem(i)}>&times;</button>
          <div style={S.row}>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-input" value={item.name} onChange={e => updateItem(i, 'name', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Company</label>
              <input className="form-input" value={item.company} onChange={e => updateItem(i, 'company', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Quote</label>
            <textarea className="form-input" rows={2} value={item.text}
              onChange={e => updateItem(i, 'text', e.target.value)} />
          </div>
        </div>
      ))}
      <button className="btn-secondary" style={S.addBtn} onClick={addItem}>+ Add Testimonial</button>
    </div>
  )
}

/* ── CTA ─────────────────────────────────────────────── */
function CtaEditor({ props, onChange }: { props: Record<string, any>; onChange: (p: Record<string, any>) => void }) {
  const bgStyle = props.bgStyle || 'accent'
  return (
    <div style={S.stack}>
      <p style={S.heading}>Call to Action</p>
      <div className="form-group">
        <label className="form-label">Headline</label>
        <input className="form-input" value={props.headline || ''} onChange={e => onChange({ headline: e.target.value })} />
      </div>
      <div className="form-group">
        <label className="form-label">Subtitle</label>
        <input className="form-input" value={props.subtitle || ''} onChange={e => onChange({ subtitle: e.target.value })} />
      </div>
      <div className="form-group">
        <label className="form-label">Button Text</label>
        <input className="form-input" value={props.buttonText || ''} onChange={e => onChange({ buttonText: e.target.value })} />
      </div>
      <div className="form-group">
        <label className="form-label">Background Style</label>
        <div style={S.radioRow}>
          {(['accent', 'dark', 'light'] as const).map(v => (
            <button key={v} style={S.radioBtn(bgStyle === v)} onClick={() => onChange({ bgStyle: v })}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Stats ───────────────────────────────────────────── */
function StatsEditor({ props, onChange }: { props: Record<string, any>; onChange: (p: Record<string, any>) => void }) {
  const items = (props.items || []) as { value: string; label: string }[]
  const updateItems = (next: typeof items) => onChange({ items: next })
  const addItem = () => updateItems([...items, { value: '0', label: '' }])
  const removeItem = (i: number) => updateItems(items.filter((_, idx) => idx !== i))
  const updateItem = (i: number, field: string, value: string) => {
    const next = [...items]; next[i] = { ...next[i], [field]: value }; updateItems(next)
  }

  return (
    <div style={S.stack}>
      <p style={S.heading}>Statistics</p>
      {items.map((item, i) => (
        <div key={i} style={S.item}>
          <button style={S.removeBtn} onClick={() => removeItem(i)}>&times;</button>
          <div style={S.row}>
            <div className="form-group">
              <label className="form-label">Value</label>
              <input className="form-input" value={item.value} placeholder="e.g. 8+"
                onChange={e => updateItem(i, 'value', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Label</label>
              <input className="form-input" value={item.label} placeholder="e.g. Years"
                onChange={e => updateItem(i, 'label', e.target.value)} />
            </div>
          </div>
        </div>
      ))}
      <button className="btn-secondary" style={S.addBtn} onClick={addItem}>+ Add Stat</button>
    </div>
  )
}

/* ── FAQ ─────────────────────────────────────────────── */
function FaqEditor({ props, onChange }: { props: Record<string, any>; onChange: (p: Record<string, any>) => void }) {
  const items = (props.items || []) as { question: string; answer: string }[]
  const updateItems = (next: typeof items) => onChange({ items: next })
  const addItem = () => updateItems([...items, { question: '', answer: '' }])
  const removeItem = (i: number) => updateItems(items.filter((_, idx) => idx !== i))
  const updateItem = (i: number, field: string, value: string) => {
    const next = [...items]; next[i] = { ...next[i], [field]: value }; updateItems(next)
  }

  return (
    <div style={S.stack}>
      <p style={S.heading}>FAQ</p>
      <div className="form-group">
        <label className="form-label">Title</label>
        <input className="form-input" value={props.title || ''} onChange={e => onChange({ title: e.target.value })} />
      </div>
      {items.map((item, i) => (
        <div key={i} style={S.item}>
          <button style={S.removeBtn} onClick={() => removeItem(i)}>&times;</button>
          <div className="form-group">
            <label className="form-label">Question</label>
            <input className="form-input" value={item.question} onChange={e => updateItem(i, 'question', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Answer</label>
            <textarea className="form-input" rows={2} value={item.answer}
              onChange={e => updateItem(i, 'answer', e.target.value)} />
          </div>
        </div>
      ))}
      <button className="btn-secondary" style={S.addBtn} onClick={addItem}>+ Add Question</button>
    </div>
  )
}

/* ── Gallery ─────────────────────────────────────────── */
function GalleryEditor({ props, onChange }: { props: Record<string, any>; onChange: (p: Record<string, any>) => void }) {
  const images = (props.images || []) as { url: string; caption: string }[]
  const updateImages = (next: typeof images) => onChange({ images: next })
  const addImage = () => updateImages([...images, { url: '', caption: '' }])
  const removeImage = (i: number) => updateImages(images.filter((_, idx) => idx !== i))
  const updateImage = (i: number, field: string, value: string) => {
    const next = [...images]; next[i] = { ...next[i], [field]: value }; updateImages(next)
  }

  return (
    <div style={S.stack}>
      <p style={S.heading}>Image Gallery</p>
      <div className="form-group">
        <label className="form-label">Title</label>
        <input className="form-input" value={props.title || ''} onChange={e => onChange({ title: e.target.value })} />
      </div>
      <div className="form-group">
        <label className="form-label">Columns</label>
        <input className="form-input" type="number" min={2} max={4} value={props.columns ?? 3}
          onChange={e => onChange({ columns: Math.min(4, Math.max(2, Number(e.target.value))) })} />
      </div>
      {images.map((img, i) => (
        <div key={i} style={S.item}>
          <button style={S.removeBtn} onClick={() => removeImage(i)}>&times;</button>
          <ImageInput label="Image" value={img.url} onChange={v => updateImage(i, 'url', v)} />
          <div className="form-group">
            <label className="form-label">Caption</label>
            <input className="form-input" value={img.caption} onChange={e => updateImage(i, 'caption', e.target.value)} />
          </div>
        </div>
      ))}
      <button className="btn-secondary" style={S.addBtn} onClick={addImage}>+ Add Image</button>
    </div>
  )
}

/* ── Text Block ──────────────────────────────────────── */
function TextBlockEditor({ props, onChange }: { props: Record<string, any>; onChange: (p: Record<string, any>) => void }) {
  const alignment = props.alignment || 'left'
  return (
    <div style={S.stack}>
      <p style={S.heading}>Text Block</p>
      <div className="form-group">
        <label className="form-label">Heading</label>
        <input className="form-input" value={props.heading || ''} onChange={e => onChange({ heading: e.target.value })} />
      </div>
      <div className="form-group">
        <label className="form-label">Body</label>
        <textarea className="form-input" rows={4} value={props.body || ''}
          onChange={e => onChange({ body: e.target.value })} />
      </div>
      <div className="form-group">
        <label className="form-label">Alignment</label>
        <div style={S.radioRow}>
          {(['left', 'center'] as const).map(v => (
            <button key={v} style={S.radioBtn(alignment === v)} onClick={() => onChange({ alignment: v })}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Trust Strip ─────────────────────────────────────── */
function TrustStripEditor({ props, onChange }: { props: Record<string, any>; onChange: (p: Record<string, any>) => void }) {
  const items = (props.items || []) as { label: string }[]
  const updateItems = (next: typeof items) => onChange({ items: next })
  const addItem = () => updateItems([...items, { label: '' }])
  const removeItem = (i: number) => updateItems(items.filter((_, idx) => idx !== i))
  const updateItem = (i: number, value: string) => {
    const next = [...items]; next[i] = { label: value }; updateItems(next)
  }

  return (
    <div style={S.stack}>
      <p style={S.heading}>Trust Strip</p>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input className="form-input" value={item.label} placeholder="Badge label"
            onChange={e => updateItem(i, e.target.value)} style={{ flex: 1 }} />
          <button className="btn-ghost" style={{ color: 'var(--negative)', fontSize: 14, padding: '4px 6px' }}
            onClick={() => removeItem(i)}>&times;</button>
        </div>
      ))}
      <button className="btn-secondary" style={S.addBtn} onClick={addItem}>+ Add Badge</button>
    </div>
  )
}

/* ── Contact ─────────────────────────────────────────── */
function ContactEditor({ props, onChange }: { props: Record<string, any>; onChange: (p: Record<string, any>) => void }) {
  return (
    <div style={S.stack}>
      <p style={S.heading}>Contact Section</p>
      <div className="form-group">
        <label className="form-label">Title</label>
        <input className="form-input" value={props.title || ''} onChange={e => onChange({ title: e.target.value })} />
      </div>
      <div className="form-group">
        <label className="form-label">Subtitle</label>
        <input className="form-input" value={props.subtitle || ''} onChange={e => onChange({ subtitle: e.target.value })} />
      </div>
      <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <input type="checkbox" checked={!!props.showForm}
          onChange={e => onChange({ showForm: e.target.checked })}
          style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer' }} />
        <label className="form-label" style={{ cursor: 'pointer' }}
          onClick={() => onChange({ showForm: !props.showForm })}>Show Contact Form</label>
      </div>
    </div>
  )
}

/* ── Newsletter ──────────────────────────────────────── */
function NewsletterEditor({ props, onChange }: { props: Record<string, any>; onChange: (p: Record<string, any>) => void }) {
  return (
    <div style={S.stack}>
      <p style={S.heading}>Newsletter CTA</p>
      <div className="form-group">
        <label className="form-label">Title</label>
        <input className="form-input" value={props.title || ''} onChange={e => onChange({ title: e.target.value })} />
      </div>
      <div className="form-group">
        <label className="form-label">Subtitle</label>
        <input className="form-input" value={props.subtitle || ''} onChange={e => onChange({ subtitle: e.target.value })} />
      </div>
      <div className="form-group">
        <label className="form-label">Button Text</label>
        <input className="form-input" value={props.buttonText || ''} onChange={e => onChange({ buttonText: e.target.value })} />
      </div>
      <div className="form-group">
        <label className="form-label">Disclaimer</label>
        <input className="form-input" value={props.disclaimer || ''} onChange={e => onChange({ disclaimer: e.target.value })} />
      </div>
    </div>
  )
}

/* ── Story Timeline ─────────────────────────────────── */
function StoryTimelineEditor({ props, onChange }: { props: Record<string, any>; onChange: (p: Record<string, any>) => void }) {
  const paragraphs = (props.paragraphs || []) as string[]
  const timeline = (props.timeline || []) as { year: string; event: string }[]

  return (
    <div style={S.stack}>
      <p style={S.heading}>Story + Timeline</p>
      <div className="form-group">
        <label className="form-label">Badge</label>
        <input className="form-input" value={props.badge || ''} onChange={e => onChange({ badge: e.target.value })} />
      </div>
      <div className="form-group">
        <label className="form-label">Title</label>
        <input className="form-input" value={props.title || ''} onChange={e => onChange({ title: e.target.value })} />
      </div>
      <div className="form-group">
        <label className="form-label">Story Text (one paragraph per line)</label>
        <textarea className="form-input" rows={4} value={paragraphs.join('\n')}
          onChange={e => onChange({ paragraphs: e.target.value.split('\n') })} />
      </div>
      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 8 }}>Timeline Events</p>
      {timeline.map((item, i) => (
        <div key={i} style={S.item}>
          <button style={S.removeBtn} onClick={() => onChange({ timeline: timeline.filter((_, idx) => idx !== i) })}>&times;</button>
          <div style={S.row}>
            <div className="form-group">
              <label className="form-label">Year</label>
              <input className="form-input" value={item.year} onChange={e => {
                const next = [...timeline]; next[i] = { ...next[i], year: e.target.value }; onChange({ timeline: next })
              }} />
            </div>
            <div className="form-group">
              <label className="form-label">Event</label>
              <input className="form-input" value={item.event} onChange={e => {
                const next = [...timeline]; next[i] = { ...next[i], event: e.target.value }; onChange({ timeline: next })
              }} />
            </div>
          </div>
        </div>
      ))}
      <button className="btn-secondary" style={S.addBtn} onClick={() => onChange({ timeline: [...timeline, { year: '', event: '' }] })}>+ Add Event</button>
    </div>
  )
}

/* ── Location ───────────────────────────────────────── */
function LocationEditor({ props, onChange }: { props: Record<string, any>; onChange: (p: Record<string, any>) => void }) {
  const hours = (props.hours || []) as { label: string; time: string }[]

  return (
    <div style={S.stack}>
      <p style={S.heading}>Location</p>
      <div className="form-group">
        <label className="form-label">Badge</label>
        <input className="form-input" value={props.badge || ''} onChange={e => onChange({ badge: e.target.value })} />
      </div>
      <div className="form-group">
        <label className="form-label">Title</label>
        <input className="form-input" value={props.title || ''} onChange={e => onChange({ title: e.target.value })} />
      </div>
      <div className="form-group">
        <label className="form-label">Description</label>
        <textarea className="form-input" rows={3} value={props.description || ''} onChange={e => onChange({ description: e.target.value })} />
      </div>
      <div className="form-group">
        <label className="form-label">Email</label>
        <input className="form-input" value={props.email || ''} onChange={e => onChange({ email: e.target.value })} />
      </div>
      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 8 }}>Business Hours</p>
      {hours.map((h, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input className="form-input" value={h.label} placeholder="Day" style={{ width: 80 }}
            onChange={e => { const next = [...hours]; next[i] = { ...next[i], label: e.target.value }; onChange({ hours: next }) }} />
          <input className="form-input" value={h.time} placeholder="Time" style={{ flex: 1 }}
            onChange={e => { const next = [...hours]; next[i] = { ...next[i], time: e.target.value }; onChange({ hours: next }) }} />
          <button className="btn-ghost" style={{ color: 'var(--negative)', fontSize: 14, padding: '4px 6px' }}
            onClick={() => onChange({ hours: hours.filter((_, idx) => idx !== i) })}>&times;</button>
        </div>
      ))}
      <button className="btn-secondary" style={S.addBtn} onClick={() => onChange({ hours: [...hours, { label: '', time: '' }] })}>+ Add Hours</button>
    </div>
  )
}

/* ── Process Steps ──────────────────────────────────── */
function ProcessStepsEditor({ props, onChange }: { props: Record<string, any>; onChange: (p: Record<string, any>) => void }) {
  const items = (props.items || []) as { number: string; icon: string; title: string; desc: string }[]
  const updateItems = (next: typeof items) => onChange({ items: next })

  return (
    <div style={S.stack}>
      <p style={S.heading}>Process Steps</p>
      <div className="form-group">
        <label className="form-label">Badge</label>
        <input className="form-input" value={props.badge || ''} onChange={e => onChange({ badge: e.target.value })} />
      </div>
      <div className="form-group">
        <label className="form-label">Title</label>
        <input className="form-input" value={props.title || ''} onChange={e => onChange({ title: e.target.value })} />
      </div>
      {items.map((item, i) => (
        <div key={i} style={S.item}>
          <button style={S.removeBtn} onClick={() => updateItems(items.filter((_, idx) => idx !== i))}>&times;</button>
          <div style={S.row}>
            <div className="form-group">
              <label className="form-label">Number</label>
              <input className="form-input" value={item.number} style={{ width: 50 }}
                onChange={e => { const next = [...items]; next[i] = { ...next[i], number: e.target.value }; updateItems(next) }} />
            </div>
            <div className="form-group">
              <label className="form-label">Icon</label>
              <input className="form-input" value={item.icon} style={{ width: 50 }}
                onChange={e => { const next = [...items]; next[i] = { ...next[i], icon: e.target.value }; updateItems(next) }} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Title</label>
            <input className="form-input" value={item.title}
              onChange={e => { const next = [...items]; next[i] = { ...next[i], title: e.target.value }; updateItems(next) }} />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-input" rows={2} value={item.desc}
              onChange={e => { const next = [...items]; next[i] = { ...next[i], desc: e.target.value }; updateItems(next) }} />
          </div>
        </div>
      ))}
      <button className="btn-secondary" style={S.addBtn} onClick={() => updateItems([...items, { number: String(items.length + 1).padStart(2, '0'), icon: '', title: '', desc: '' }])}>+ Add Step</button>
    </div>
  )
}

/* ── Pricing Tiers ──────────────────────────────────── */
function PricingTiersEditor({ props, onChange }: { props: Record<string, any>; onChange: (p: Record<string, any>) => void }) {
  return (
    <div style={S.stack}>
      <p style={S.heading}>Pricing Tiers</p>
      <div className="form-group">
        <label className="form-label">Title</label>
        <input className="form-input" value={props.title || ''} onChange={e => onChange({ title: e.target.value })} />
      </div>
      <div className="form-group">
        <label className="form-label">Subtitle</label>
        <input className="form-input" value={props.subtitle || ''} onChange={e => onChange({ subtitle: e.target.value })} />
      </div>
      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tier data is read live from the Membership store. Edit tiers via the Storefront &gt; Membership admin page.</p>
    </div>
  )
}

/* ── Banner ──────────────────────────────────────────── */
function BannerEditor({ props, onChange }: { props: Record<string, any>; onChange: (p: Record<string, any>) => void }) {
  const images = (props.images || []) as { url: string; alt?: string }[]
  const updateImages = (next: typeof images) => onChange({ images: next })
  const addImage = () => updateImages([...images, { url: '', alt: '' }])
  const removeImage = (i: number) => updateImages(images.filter((_, idx) => idx !== i))
  const updateImage = (i: number, field: string, value: string) => {
    const next = [...images]; next[i] = { ...next[i], [field]: value }; updateImages(next)
  }

  return (
    <div style={S.stack}>
      <p style={S.heading}>Banner Images</p>
      <div style={S.row}>
        <div className="form-group">
          <label className="form-label">Height (px)</label>
          <input className="form-input" type="number" min={100} max={800} value={props.height ?? 400}
            onChange={e => onChange({ height: Math.min(800, Math.max(100, Number(e.target.value))) })} />
        </div>
        <div className="form-group">
          <label className="form-label">Auto-slide (sec)</label>
          <input className="form-input" type="number" min={2} max={15} value={props.interval ?? 5}
            onChange={e => onChange({ interval: Math.min(15, Math.max(2, Number(e.target.value))) })} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Fit</label>
        <div style={S.radioRow}>
          {['cover', 'contain'].map(v => (
            <button key={v} style={S.radioBtn((props.objectFit || 'cover') === v)} onClick={() => onChange({ objectFit: v })}>
              {v === 'cover' ? 'Fill' : 'Fit'}
            </button>
          ))}
        </div>
      </div>
      {images.map((img, i) => (
        <div key={i} style={S.item}>
          <button style={S.removeBtn} onClick={() => removeImage(i)}>&times;</button>
          <ImageInput label="Image" value={img.url} onChange={v => updateImage(i, 'url', v)} />
          <div className="form-group">
            <label className="form-label">Alt text</label>
            <input className="form-input" value={img.alt || ''} placeholder="Describe the image"
              onChange={e => updateImage(i, 'alt', e.target.value)} />
          </div>
          {img.url && (
            <div style={{ borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
              <img src={img.url} alt={img.alt || ''} style={{ width: '100%', height: 80, objectFit: 'cover', display: 'block' }} />
            </div>
          )}
        </div>
      ))}
      <button className="btn-secondary" style={S.addBtn} onClick={addImage}>+ Add Image</button>
    </div>
  )
}

/* ── Main switch component ───────────────────────────── */
export default function SectionEditorForm({
  section,
  onChange,
}: {
  section: PageSection
  onChange: (props: Record<string, any>) => void
}) {
  const p = section.props

  switch (section.type) {
    case 'hero':           return <HeroEditor props={p} onChange={onChange} />
    case 'products':       return <ProductsEditor props={p} onChange={onChange} />
    case 'categories':     return <CategoriesEditor props={p} onChange={onChange} />
    case 'features':       return <FeaturesEditor props={p} onChange={onChange} />
    case 'testimonials':   return <TestimonialsEditor props={p} onChange={onChange} />
    case 'cta':            return <CtaEditor props={p} onChange={onChange} />
    case 'stats':          return <StatsEditor props={p} onChange={onChange} />
    case 'faq':            return <FaqEditor props={p} onChange={onChange} />
    case 'gallery':        return <GalleryEditor props={p} onChange={onChange} />
    case 'text-block':     return <TextBlockEditor props={p} onChange={onChange} />
    case 'trust-strip':    return <TrustStripEditor props={p} onChange={onChange} />
    case 'contact':        return <ContactEditor props={p} onChange={onChange} />
    case 'newsletter':     return <NewsletterEditor props={p} onChange={onChange} />
    case 'story-timeline': return <StoryTimelineEditor props={p} onChange={onChange} />
    case 'location':       return <LocationEditor props={p} onChange={onChange} />
    case 'process-steps':  return <ProcessStepsEditor props={p} onChange={onChange} />
    case 'pricing-tiers':  return <PricingTiersEditor props={p} onChange={onChange} />
    case 'banner':         return <BannerEditor props={p} onChange={onChange} />
    default:
      return <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No editor available for this section type.</p>
  }
}
