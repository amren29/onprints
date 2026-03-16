'use client'

import { useState } from 'react'
import MyStoreShell from '@/components/MyStoreShell'
import { getMessageTemplates, saveMessageTemplate, type DbMessageTemplate } from '@/lib/db/content'
import { useShop } from '@/providers/shop-provider'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

/* ── Icons ─────────────────────────────────────────── */
const SaveIcon    = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>)
const CheckIcon   = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>)

/* ── Template keys & labels ────────────────────────── */
const TEMPLATE_KEYS = [
  { key: 'order_confirmation', label: 'Order Confirmation', channel: 'WhatsApp' },
  { key: 'payment_received', label: 'Payment Received', channel: 'WhatsApp' },
  { key: 'order_shipped', label: 'Order Shipped', channel: 'WhatsApp' },
  { key: 'order_completed', label: 'Order Completed', channel: 'WhatsApp' },
  { key: 'order_cancelled', label: 'Order Cancelled', channel: 'WhatsApp' },
]

const TEMPLATE_VARIABLES = [
  { v: '{name}', desc: 'Customer name' },
  { v: '{orderId}', desc: 'Order ID' },
  { v: '{total}', desc: 'Order total' },
  { v: '{items}', desc: 'Item list' },
  { v: '{date}', desc: 'Current date' },
  { v: '{trackingNo}', desc: 'Tracking number' },
]

/* ── Sample data for preview ────────────────────────── */
const SAMPLE: Record<string, string> = {
  '{name}':       'Ahmad Rizwan',
  '{orderId}':    'ORD-007',
  '{total}':      'RM 185.00',
  '{items}':      'Business Cards ×500, A4 Flyers ×200',
  '{date}':       new Date().toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' }),
  '{trackingNo}': 'JT9876543210MY',
}

function applyVariables(body: string): string {
  return Object.entries(SAMPLE).reduce((s, [k, v]) => s.replaceAll(k, v), body)
}

/* ── WhatsApp bubble preview ────────────────────────── */
function WaBubble({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <div style={{ background: '#ECE5DD', borderRadius: 10, padding: 16, minHeight: 120 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ background: '#DCF8C6', borderRadius: '12px 12px 4px 12px', padding: '10px 14px', maxWidth: '85%', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
          {lines.map((line, i) => {
            const parts = line.split(/(\*[^*]+\*)/g).map((p, j) =>
              p.startsWith('*') && p.endsWith('*')
                ? <strong key={j}>{p.slice(1, -1)}</strong>
                : <span key={j}>{p}</span>
            )
            return <div key={i} style={{ fontSize: 13, lineHeight: 1.55, color: '#111' }}>{parts}</div>
          })}
          <div style={{ fontSize: 10, color: '#92A8B0', textAlign: 'right', marginTop: 4 }}>
            {new Date().toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════ */
export default function MessagesPage() {
  const { shopId } = useShop()
  const qc = useQueryClient()

  const { data: templates = [] } = useQuery({
    queryKey: ['message-templates', shopId],
    queryFn: () => getMessageTemplates(shopId),
    enabled: !!shopId,
  })

  const [activeKey, setActiveKey] = useState('order_confirmation')
  const [body, setBody] = useState('')
  const [saved, setSaved] = useState(false)
  const [preview, setPreview] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  // Hydrate body when templates load
  if (templates.length > 0 && !hydrated) {
    const first = templates.find(t => t.key === activeKey)
    if (first) setBody(first.body)
    setHydrated(true)
  }

  const saveMut = useMutation({
    mutationFn: () => saveMessageTemplate(shopId, { key: activeKey, body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['message-templates', shopId] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    },
  })

  // Build display list using TEMPLATE_KEYS as source, merge with DB data
  const displayTemplates = TEMPLATE_KEYS.map(tk => {
    const dbT = templates.find(t => t.key === tk.key)
    return { key: tk.key, label: tk.label, channel: dbT?.channel || tk.channel, body: dbT?.body || '' }
  })

  const active = displayTemplates.find(t => t.key === activeKey)

  const handleSelect = (key: string) => {
    setActiveKey(key)
    const t = displayTemplates.find(x => x.key === key)
    setBody(t?.body ?? '')
    setSaved(false)
  }

  const handleSave = () => {
    saveMut.mutate()
  }

  const insertVar = (v: string) => {
    setBody(p => p + v)
  }

  return (
    <MyStoreShell>
      <div className="page-header">
        <div>
          <div className="page-title">Message Templates</div>
          <div className="page-subtitle">Customise WhatsApp messages sent to customers at each order stage</div>
        </div>
        <div className="page-actions">
          <button className="btn-secondary" onClick={() => setPreview(p => !p)} style={{ gap: 6 }}>
            {preview ? 'Hide Preview' : 'Show Preview'}
          </button>
          <button className="btn-primary" onClick={handleSave} style={{ gap: 6 }}>
            {saved ? <><CheckIcon /> Saved</> : <><SaveIcon /> Save Template</>}
          </button>
        </div>
      </div>

      <div className="page-scroll">
        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 16, alignItems: 'start' }}>

          {/* Template list */}
          <div className="card" style={{ padding: 8 }}>
            {displayTemplates.map(t => (
              <button key={t.key} onClick={() => handleSelect(t.key)} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%',
                padding: '10px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font)',
                background: activeKey === t.key ? 'var(--accent)' : 'transparent',
                color: activeKey === t.key ? '#fff' : 'var(--text-primary)',
                marginBottom: 2,
              }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{t.label}</span>
                <span style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{t.channel}</span>
              </button>
            ))}
          </div>

          {/* Editor + preview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Variables reference */}
            <div className="card" style={{ padding: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Available Variables — click to insert</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {TEMPLATE_VARIABLES.map(({ v, desc }) => (
                  <button key={v} onClick={() => insertVar(v)} title={desc} style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontFamily: 'monospace', fontWeight: 600, cursor: 'pointer', border: '1.5px solid var(--accent)', background: 'var(--accent)10', color: 'var(--accent)' }}>
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: preview ? '1fr 1fr' : '1fr', gap: 16 }}>
              {/* Editor */}
              <div className="card" style={{ padding: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>
                  {active?.label ?? 'Template'} — {active?.channel ?? 'WhatsApp'}
                </div>
                <textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  rows={14}
                  className="form-input"
                  style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: 12.5, lineHeight: 1.6 }}
                  placeholder="Write your message here…"
                />
                <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--text-muted)' }}>
                  Tip: Use *bold* for WhatsApp formatting. Use {'{name}'}, {'{orderId}'} etc. for dynamic values.
                </div>
              </div>

              {/* Preview */}
              {preview && (
                <div>
                  <div className="card" style={{ padding: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>Preview (with sample data)</div>
                    <WaBubble text={applyVariables(body)} />
                    <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--bg)', borderRadius: 8, fontSize: 11.5, color: 'var(--text-muted)' }}>
                      <strong>Sample data used:</strong>
                      {Object.entries(SAMPLE).map(([k, v]) => (
                        <div key={k} style={{ marginTop: 4 }}>
                          <code style={{ color: 'var(--accent)', fontWeight: 600 }}>{k}</code> → {v}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MyStoreShell>
  )
}
