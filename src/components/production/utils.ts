import type { Jobsheet } from './types'
import type { Order } from '@/lib/order-store'

export const teamOptions = ["You", "Olive Kenji", "Robin Cooper", "Alex Hill", "Maya Hart", "Marcus Levin"]

export const priorityOptions = [
  { value: "low",    label: "Low",    color: "#64748b" },
  { value: "medium", label: "Medium", color: "#f59e0b" },
  { value: "high",   label: "High",   color: "#ef4444" },
]

export function getTagStyle(tag: string): { background: string; color: string } {
  const map: Record<string, { background: string; color: string }> = {
    design:    { background: '#eff6ff', color: '#1d4ed8' },
    print:     { background: '#eff6ff', color: '#1d4ed8' },
    urgent:    { background: '#fef2f2', color: '#dc2626' },
    review:    { background: '#fefce8', color: '#a16207' },
    client:    { background: '#fdf4ff', color: '#7e22ce' },
    marketing: { background: '#fff7ed', color: '#c2410c' },
  }
  return map[tag.toLowerCase()] ?? { background: '#f1f5f9', color: '#475569' }
}

export function formatDisplayDate(iso: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export function formatAnyDate(raw: string): string {
  if (!raw) return ''
  // handle dd/mm/yy
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(raw)) {
    const [d, m, y] = raw.split('/')
    const year = y.length === 2 ? `20${y}` : y
    return new Date(`${year}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }
  return formatDisplayDate(raw)
}

export function toIsoDate(display: string): string {
  // "25 Sep" → "2025-09-25"
  const months: Record<string, string> = { Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12' }
  const parts = display.trim().split(' ')
  if (parts.length >= 2) {
    const day  = parts[0].padStart(2, '0')
    const mon  = months[parts[1]] ?? '01'
    const year = parts[2] ?? new Date().getFullYear().toString()
    return `${year}-${mon}-${day}`
  }
  return display
}

export function getCalendarCells(year: number, month: number): (number | null)[] {
  const first  = new Date(year, month, 1)
  const last   = new Date(year, month + 1, 0)
  const offset = (first.getDay() + 6) % 7  // Mon-first
  const cells: (number | null)[] = []
  for (let i = 0; i < offset; i++) cells.push(null)
  for (let d = 1; d <= last.getDate(); d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export const WEEKDAYS = ['M','T','W','T','F','S','S']

export function statusToneForColumn(tone?: string): string {
  const map: Record<string, string> = {
    neutral: '#e2e8f0',
    info:    '#3b82f6',
    warning: '#f59e0b',
    success: '#006AFF',
  }
  return map[tone ?? 'neutral'] ?? '#e2e8f0'
}

export function isUrgent(due: string): boolean {
  if (!due) return false
  return (new Date(due).getTime() - Date.now()) / 86400000 <= 2
}

/* ── New utilities ────────────────────────────────── */

export const PROOF_STATUS_BADGE: Record<string, { bg: string; color: string; border: string; label: string }> = {
  GENERATED:        { bg: '#f3e8ff', color: '#7e22ce', border: '#e9d5ff', label: 'Proof Generated' },
  SENT:             { bg: '#dbeafe', color: '#1e40af', border: '#bfdbfe', label: 'Sent' },
  AMEND_REQUESTED:  { bg: '#ffedd5', color: '#9a3412', border: '#fed7aa', label: 'Amend Requested' },
  AMEND_DONE:       { bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0', label: 'Amend Done' },
  APPROVED:         { bg: '#dbeafe', color: '#1e3a8a', border: '#bfdbfe', label: 'Approved' },
}

export const TONE_COLOR: Record<string, string> = {
  info:    '#3b82f6',
  success: '#006AFF',
  warning: '#f59e0b',
  neutral: '#cbd5e1',
}

export function formatTime(iso: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

export type JobsheetOpts = { priority?: 'low' | 'medium' | 'high'; dueDate?: string; customerPhone?: string; customerEmail?: string }

export function generateJobsheetTxt(js: Jobsheet, order?: Order, opts?: JobsheetOpts): string {
  const sep = '═══════════════════════════════════════════════'
  const rush = opts?.priority === 'high'
  const lines = [
    sep,
    '          PRODUCTION JOBSHEET',
    sep,
    '',
    `Jobsheet ID:     ${js.id}`,
    `Order ID:        ${js.orderId}`,
  ]
  if (rush) lines.push('', '*** RUSH ORDER — HIGH PRIORITY ***')

  if (order) {
    const cust = { phone: opts?.customerPhone ?? '', email: opts?.customerEmail ?? '' }
    lines.push(
      '',
      '─── Customer ───────────────────────',
      `Name:            ${order.customer}`,
    )
    if (cust?.phone) lines.push(`Phone:           ${cust.phone}`)
    if (cust?.email) lines.push(`Email:           ${cust.email}`)

    lines.push(
      '',
      '─── Job Details ────────────────────',
      `Order Date:      ${new Date(order.created).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`,
      `Due Date:        ${order.dueDate || '—'}`,
      `Priority:        ${(opts?.priority ?? 'medium').toUpperCase()}`,
      `Delivery:        ${order.deliveryMethod}`,
    )
    if (order.deliveryMethod === 'Delivery' && order.deliveryAddress) {
      lines.push(`Address:         ${order.deliveryAddress}`)
    }

    lines.push('', '─── Production Items ───────────────')
    let idx = 1
    for (const item of order.items) {
      lines.push(`  ${idx}. ${item.name}`)
      if (item.optionSummary) lines.push(`     Specs: ${item.optionSummary}`)
      lines.push(`     Qty: ${item.qty.toLocaleString()}`)
      idx++
    }
    if (order.notes) lines.push('', `Notes:           ${order.notes}`)
  }

  lines.push(
    '',
    '─── Artwork Approval ───────────────',
    `Approved At:     ${new Date(js.approvedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
    `Approved By:     ${js.approvedByName} (${js.approvedByEmail})`,
    `Signature Hash:  ${js.signatureHash}`,
    js.signatureImage ? `Signature:       [image attached]` : '',
    '',
    'Approved Files:',
    ...js.files.map((f, i) => `  ${i + 1}. ${f.name}`),
    '',
    sep,
  )
  return lines.filter(l => l !== undefined).join('\n')
}

export function generateJobsheetHtml(js: Jobsheet, order?: Order, opts?: JobsheetOpts): string {
  const cust = order ? { phone: opts?.customerPhone ?? '', email: opts?.customerEmail ?? '' } : null
  const rush = opts?.priority === 'high'
  const priorityLabel = opts?.priority ?? 'medium'
  const priorityColor = priorityLabel === 'high' ? '#dc2626' : priorityLabel === 'medium' ? '#f59e0b' : '#64748b'

  // Build artwork preview — compact images to fit A4
  const filesHtml = js.files.map(f => {
    const hasUrl = !!f.url && f.url.length > 10
    const isImg = hasUrl && (/\.(jpe?g|png|gif|webp|svg|bmp)$/i.test(f.name) || f.url!.startsWith('data:image/'))
    if (isImg) {
      return `<div class="artwork-card">
        <img src="${f.url}" alt="${f.name}" />
        <div class="artwork-name">${f.name}</div>
      </div>`
    }
    const nameIsImg = /\.(jpe?g|png|gif|webp|svg|bmp)$/i.test(f.name)
    return `<div class="artwork-card file-card">
      <div style="font-size:11px;color:#94a3b8;padding:12px;text-align:center">${nameIsImg ? 'Image preview not available' : 'File attachment'}</div>
      <div class="artwork-name">${f.name}</div>
    </div>`
  }).join('')

  let orderHtml = ''
  if (order) {
    const itemRows = order.items.map((i, idx) =>
      `<tr>
        <td style="color:#94a3b8;font-weight:600">${idx + 1}</td>
        <td><strong>${i.name}</strong></td>
        <td style="font-size:11px;color:#64748b">${i.optionSummary || '—'}</td>
        <td style="text-align:center;font-weight:700">${i.qty.toLocaleString()}</td>
      </tr>`
    ).join('')

    orderHtml = `
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px">
      <div style="flex:1;min-width:180px" class="info-box">
        <div class="info-label">Customer</div>
        <div class="info-value">${order.customer}</div>
        ${cust?.phone ? `<div class="info-sub">${cust.phone}</div>` : ''}
        ${cust?.email ? `<div class="info-sub">${cust.email}</div>` : ''}
      </div>
      <div style="flex:1;min-width:180px" class="info-box">
        <div class="info-label">Job Info</div>
        <div class="info-row"><span>Order:</span> ${order.id}</div>
        <div class="info-row"><span>Date:</span> ${new Date(order.created).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
        <div class="info-row"><span>Due:</span> <strong${rush ? ' style="color:#dc2626"' : ''}>${order.dueDate || '—'}</strong></div>
        <div class="info-row"><span>Delivery:</span> ${order.deliveryMethod}</div>
        ${order.deliveryMethod === 'Delivery' && order.deliveryAddress ? `<div class="info-row"><span>Address:</span> ${order.deliveryAddress}</div>` : ''}
      </div>
      <div style="flex:0 0 auto;min-width:100px" class="info-box" style="text-align:center">
        <div class="info-label">Priority</div>
        <div style="display:inline-block;padding:3px 12px;border-radius:20px;font-size:11px;font-weight:700;background:${priorityColor}18;color:${priorityColor};border:1.5px solid ${priorityColor}40;text-transform:uppercase;letter-spacing:0.05em">${priorityLabel}</div>
      </div>
    </div>

    ${order.notes ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:6px 10px;margin-bottom:12px;font-size:11px;color:#92400e"><strong>Notes:</strong> ${order.notes}</div>` : ''}

    <div class="section-header">Production Items</div>
    <table>
      <thead>
        <tr><th style="width:24px">#</th><th>Item</th><th>Specs / Options</th><th style="text-align:center">Qty</th></tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>`
  }

  const signatureHtml = js.signatureImage
    ? `<div style="margin-top:8px">
        <div class="info-label">Customer Signature</div>
        <img src="${js.signatureImage}" style="max-width:200px;max-height:70px;border:1px solid #e2e8f0;border-radius:4px;background:#f8fafc;padding:4px;margin-top:2px;"/>
       </div>`
    : ''

  return `<!DOCTYPE html>
<html>
<head>
  <title>Jobsheet ${js.id}</title>
  <style>
    @page { size: A4; margin: 12mm 14mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 100%; margin: 0 auto; padding: 0; color: #1e293b; font-size: 11px; line-height: 1.4; }

    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #1e293b; padding-bottom: 8px; margin-bottom: 10px; }
    .header h1 { font-size: 16px; font-weight: 800; letter-spacing: -0.02em; }
    .header .ids { text-align: right; font-size: 10px; color: #64748b; line-height: 1.5; }
    .header .ids strong { color: #1e293b; }
    .rush-banner { background: #fef2f2; border: 1.5px solid #fca5a5; border-radius: 6px; padding: 6px 12px; margin-bottom: 10px; text-align: center; font-size: 12px; font-weight: 800; color: #dc2626; text-transform: uppercase; letter-spacing: 0.08em; }

    .section-header { font-size: 10px; font-weight: 700; color: #1e293b; text-transform: uppercase; letter-spacing: 0.06em; margin: 14px 0 6px; padding-bottom: 4px; border-bottom: 1px solid #e2e8f0; }

    .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 10px; }
    .info-label { font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 3px; }
    .info-value { font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 2px; }
    .info-sub { font-size: 11px; color: #64748b; line-height: 1.4; }
    .info-row { font-size: 11px; color: #334155; line-height: 1.6; }
    .info-row span { font-weight: 600; display: inline-block; min-width: 60px; color: #64748b; }

    table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
    th { padding: 4px 6px; font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 1.5px solid #e2e8f0; text-align: left; }
    td { padding: 5px 6px; font-size: 11px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }

    .approval-grid { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 6px; }
    .approval-item .label { font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 2px; }
    .approval-item .val { font-size: 11px; color: #1e293b; font-weight: 500; }

    .artwork-grid { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 6px; }
    .artwork-card { border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; max-width: 240px; flex: 1; min-width: 160px; }
    .artwork-card img { width: 100%; max-height: 200px; object-fit: contain; display: block; background: #f8fafc; }
    .artwork-name { padding: 4px 8px; font-size: 9px; font-weight: 600; color: #64748b; background: #f8fafc; border-top: 1px solid #e2e8f0; }
    .file-card { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 16px; background: #f8fafc; }

    @media print {
      .no-print { display: none; }
      body { padding: 0; }
      .artwork-card img { max-height: 200px; object-fit: contain; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Production Jobsheet</h1>
    <div class="ids">
      <div><strong>${js.id}</strong></div>
      <div>Order: ${js.orderId}</div>
    </div>
  </div>

  ${rush ? '<div class="rush-banner">RUSH ORDER &mdash; PRIORITY PRODUCTION</div>' : ''}

  ${orderHtml}

  <div class="section-header">Approved Artwork Preview</div>
  <div class="artwork-grid">${filesHtml}</div>

  <div class="section-header">Artwork Approval Details</div>
  <div class="approval-grid">
    <div class="approval-item">
      <div class="label">Approved At</div>
      <div class="val">${new Date(js.approvedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
    </div>
    <div class="approval-item">
      <div class="label">Approved By</div>
      <div class="val">${js.approvedByName}</div>
    </div>
    <div class="approval-item">
      <div class="label">Email</div>
      <div class="val">${js.approvedByEmail}</div>
    </div>
  </div>
  ${signatureHtml}

  <script>window.print()</script>
</body>
</html>`
}
