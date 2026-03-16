// ── Print CSS ───────────────────────────────────────────────────────────────

const PRINT_CSS = `
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif;
    color: #111827; font-size: 13px; line-height: 1.5;
  }
  .doc { max-width: 780px; margin: 0 auto; padding: 40px 48px; }

  /* Header */
  .doc-header {
    display: flex; justify-content: space-between; align-items: flex-start;
    margin-bottom: 28px; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb;
  }
  .company-name { font-size: 17px; font-weight: 700; color: #006AFF; letter-spacing: -0.3px; }
  .company-sub  { font-size: 11px; color: #9ca3af; margin-top: 2px; }
  .doc-meta     { text-align: right; }
  .doc-type     { font-size: 22px; font-weight: 800; color: #111827; letter-spacing: -0.5px; }
  .doc-id       { font-size: 12px; color: #6b7280; margin-top: 3px; }
  .doc-badge    { display: inline-block; margin-top: 6px; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }

  /* Sections */
  .section       { margin-bottom: 22px; }
  .section-title {
    font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;
    color: #9ca3af; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #f3f4f6;
  }

  /* Field grids */
  .fields-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 32px; }
  .fields-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px 20px; }
  .field       { display: flex; flex-direction: column; gap: 1px; }
  .field-label { font-size: 10.5px; color: #9ca3af; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; }
  .field-value { font-size: 13px; color: #111827; font-weight: 500; }
  .field-value.accent { color: #006AFF; font-weight: 600; }

  /* Table */
  table { width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 12.5px; }
  thead th {
    text-align: left; padding: 7px 10px;
    font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
    color: #6b7280; background: #f9fafb; border-bottom: 2px solid #e5e7eb;
  }
  tbody td        { padding: 8px 10px; border-bottom: 1px solid #f3f4f6; color: #111827; }
  .text-right     { text-align: right; }
  .text-mono      { font-family: monospace; font-size: 11.5px; color: #6b7280; }
  .total-section td { padding: 6px 10px; border-bottom: none; }
  .total-row td   { border-top: 1px solid #e5e7eb; padding-top: 8px; }
  .grand-row td   { font-weight: 700; font-size: 14px; border-top: 2px solid #111827; color: #111827; padding-top: 10px; }
  .grand-row .accent { color: #006AFF; }

  /* Text blocks */
  .text-block {
    background: #f9fafb; border-left: 3px solid #e5e7eb;
    border-radius: 4px; padding: 12px 14px;
    font-size: 12.5px; color: #374151; line-height: 1.65;
  }

  /* Footer */
  .doc-footer {
    margin-top: 40px; padding-top: 12px; border-top: 1px solid #e5e7eb;
    display: flex; justify-content: space-between; font-size: 11px; color: #9ca3af;
  }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .doc { padding: 20px 24px; }
  }
`

// ── Core print function ──────────────────────────────────────────────────────

export function printDocument(title: string, body: string): void {
  const win = window.open('', '_blank', 'width=920,height=720')
  if (!win) { alert('Please allow pop-ups to use the print function.'); return }
  win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
  <style>${PRINT_CSS}</style>
</head>
<body><div class="doc">${body}</div></body>
</html>`)
  win.document.close()
  setTimeout(() => { win.print() }, 280)
}

// ── Shared helpers ───────────────────────────────────────────────────────────

export function docHeader(type: string, id: string, status: string, badgeBg: string, badgeColor: string): string {
  const date = new Date().toLocaleDateString('en-MY', { year: 'numeric', month: 'long', day: 'numeric' })
  return `
    <div class="doc-header">
      <div>
        <div class="company-name">SaasPrint</div>
        <div class="company-sub">saasprint.my</div>
      </div>
      <div class="doc-meta">
        <div class="doc-type">${type}</div>
        <div class="doc-id">${id}</div>
        <span class="doc-badge" style="background:${badgeBg};color:${badgeColor}">${status}</span>
      </div>
    </div>
    <div class="doc-footer" style="margin-top:0;padding-top:0;border-top:none;margin-bottom:28px">
      <span></span><span style="font-size:11px;color:#9ca3af">Printed on ${date}</span>
    </div>`
}

export function docFooter(): string {
  return `<div class="doc-footer">
    <span>SaasPrint Sdn. Bhd. · saasprint.my</span>
    <span>${new Date().toLocaleDateString('en-MY', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
  </div>`
}

export function fields2(items: { label: string; value: string; accent?: boolean }[]): string {
  return `<div class="fields-2">${items.map(f =>
    `<div class="field">
      <span class="field-label">${f.label}</span>
      <span class="field-value${f.accent ? ' accent' : ''}">${f.value}</span>
    </div>`
  ).join('')}</div>`
}

export function fields3(items: { label: string; value: string; accent?: boolean }[]): string {
  return `<div class="fields-3">${items.map(f =>
    `<div class="field">
      <span class="field-label">${f.label}</span>
      <span class="field-value${f.accent ? ' accent' : ''}">${f.value}</span>
    </div>`
  ).join('')}</div>`
}

export function section(title: string, content: string): string {
  return `<div class="section"><div class="section-title">${title}</div>${content}</div>`
}

export function textBlock(text: string): string {
  return `<div class="text-block">${text.replace(/\n/g, '<br>')}</div>`
}

// ── Badge helpers ────────────────────────────────────────────────────────────

const BADGE_MAP: Record<string, [string, string]> = {
  Draft:            ['#f1f5f9', '#64748b'],
  Sent:             ['#dbeafe', '#2563eb'],
  Paid:             ['#dbeafe', '#006AFF'],
  Overdue:          ['#fee2e2', '#dc2626'],
  'Partially Paid': ['#fef9c3', '#a16207'],
  Approved:         ['#dbeafe', '#006AFF'],
  Expired:          ['#fee2e2', '#dc2626'],
  Captured:         ['#dbeafe', '#006AFF'],
  Pending:          ['#fef9c3', '#a16207'],
  Failed:           ['#fee2e2', '#dc2626'],
  Active:           ['#dbeafe', '#006AFF'],
  Paused:           ['#fef9c3', '#a16207'],
  VIP:              ['#ede9fe', '#7c3aed'],
  'At Risk':        ['#fee2e2', '#dc2626'],
  Inactive:         ['#f1f5f9', '#64748b'],
  Healthy:          ['#dbeafe', '#006AFF'],
  Low:              ['#fef9c3', '#a16207'],
  Critical:         ['#fee2e2', '#dc2626'],
  credit:           ['#dbeafe', '#006AFF'],
  debit:            ['#fee2e2', '#dc2626'],
  Confirmed:        ['#dbeafe', '#2563eb'],
  Cancelled:        ['#f1f5f9', '#64748b'],
}

export function badgeColors(status: string): [string, string] {
  return BADGE_MAP[status] ?? ['#f1f5f9', '#64748b']
}
