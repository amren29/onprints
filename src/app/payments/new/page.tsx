'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import SavingOverlay from '@/components/SavingOverlay'
import { createPayment } from '@/lib/db/payments'
import { getCustomers, type DbCustomer } from '@/lib/db/customers'
import CustomSelect from '@/components/CustomSelect'
import { useShop } from '@/providers/shop-provider'
import { useQuery, useMutation } from '@tanstack/react-query'

const BackIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>)
const PaperclipIcon = () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>)

type PaymentStatus = 'Captured' | 'Pending' | 'Failed'
const STATUSES: PaymentStatus[] = ['Captured', 'Pending', 'Failed']
const METHODS = ['Credit Card', 'Bank Transfer', 'Cash', 'Cheque', 'Online']

export default function NewPaymentPage() {
  const router = useRouter()
  const { shopId } = useShop()

  const { data: customers = [] } = useQuery({
    queryKey: ['customers', shopId],
    queryFn: () => getCustomers(shopId),
    enabled: !!shopId,
  })

  const createMut = useMutation({
    mutationFn: (data: Parameters<typeof createPayment>[1]) => createPayment(shopId, data),
    onSuccess: () => router.push('/payments?created=1'),
  })

  const [saving, setSaving] = useState(false)
  const [tried, setTried] = useState(false)
  const [client, setClient] = useState('')
  const [invoiceId, setInvoiceId] = useState('')
  const [method, setMethod] = useState('Credit Card')
  const [amountDue, setAmountDue] = useState(0)
  const [amountPaid, setAmountPaid] = useState(0)
  const [status, setStatus] = useState<PaymentStatus>('Pending')
  const [date, setDate] = useState('—')
  const [ref, setRef] = useState('')
  const [notes, setNotes] = useState('')
  const [attachment, setAttachment] = useState('')
  const [attachmentData, setAttachmentData] = useState('')

  const handleCreate = () => {
    setTried(true)
    if (!client.trim() || saving) return
    setSaving(true)
    setTimeout(() => {
      createMut.mutate({
        client,
        invoice_id: invoiceId,
        method,
        amount_due: amountDue,
        amount_paid: amountPaid,
        status,
        date,
        ref,
        notes,
        attachment,
        attachment_url: attachmentData || undefined,
      })
    }, 1500)
  }

  return (
    <AppShell>
      {saving && <SavingOverlay message="Recording payment…" />}

      <div className="page-header">
        <Link href="/payments" className="back-btn"><BackIcon /> Payments</Link>
        <div className="page-actions">
          <Link href="/payments" className="btn-secondary" style={{ textDecoration: 'none' }}>Cancel</Link>
          <button className="btn-primary" onClick={handleCreate} disabled={saving} style={{ opacity: saving ? 0.6 : 1 }}>Save</button>
        </div>
      </div>

      <div className="page-scroll">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Payment Info</div>
            <div className="form-group">
              <label className="form-label">Client *</label>
              <CustomSelect value="" onChange={v => { const c = customers.find(x => x.id === v); if (c) setClient(c.name) }} options={[{value:'', label:'— Manual entry —'}, ...customers.map(c => ({value:c.id, label:c.name+(c.company ? ` · ${c.company}` : '')}))]} />
              <div style={{ overflow: 'hidden', maxHeight: '42px', opacity: 1, marginTop: '6px', transition: 'max-height 0.22s cubic-bezier(0.4,0,0.2,1), opacity 0.18s ease, margin-top 0.2s ease' }}>
                <input className={`form-input${tried && !client.trim() ? ' error' : ''}`} value={client} onChange={e => setClient(e.target.value)} placeholder="Enter client name" />
              </div>
            </div>
            <div className="form-group"><label className="form-label">Invoice ID</label><input className="form-input" value={invoiceId} onChange={e => setInvoiceId(e.target.value)} placeholder="e.g. INV-0091" /></div>
            <div className="form-group"><label className="form-label">Reference</label><input className="form-input" value={ref} onChange={e => setRef(e.target.value)} placeholder="e.g. CC-4421" /></div>
            <div className="form-group"><label className="form-label">Date</label><input className="form-input" value={date} onChange={e => setDate(e.target.value)} placeholder="e.g. Mar 1, 2026" /></div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Amounts & Status</div>
            <div className="form-group"><label className="form-label">Method</label><CustomSelect value={method} onChange={setMethod} options={METHODS} /></div>
            <div className="form-group"><label className="form-label">Amount Due (RM)</label><input className="form-input" type="number" min={0} step={0.01} value={amountDue} onChange={e => setAmountDue(Number(e.target.value))} /></div>
            <div className="form-group"><label className="form-label">Amount Paid (RM)</label><input className="form-input" type="number" min={0} step={0.01} value={amountPaid} onChange={e => setAmountPaid(Number(e.target.value))} /></div>
            <div className="form-group"><label className="form-label">Status</label><CustomSelect value={status} onChange={v => setStatus(v as PaymentStatus)} options={STATUSES} /></div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>Attachment</div>
            <div className="form-group">
              <label className="form-label">Payment Slip / Receipt</label>
              {attachment ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg)', borderRadius: 8, padding: '10px 14px' }}>
                  <PaperclipIcon />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{attachment}</div>
                    {attachmentData && (
                      <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2 }}>File ready to upload</div>
                    )}
                  </div>
                  <button onClick={() => { setAttachment(''); setAttachmentData('') }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16, padding: '2px 4px' }}>&times;</button>
                </div>
              ) : (
                <div style={{ border: '1.5px dashed var(--border)', borderRadius: 10, padding: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>Upload payment slip, receipt, or proof of transfer</div>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
                    <PaperclipIcon /> Choose File
                    <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      setAttachment(file.name)
                      const reader = new FileReader()
                      reader.onload = () => setAttachmentData(reader.result as string)
                      reader.readAsDataURL(file)
                      e.target.value = ''
                    }} />
                  </label>
                </div>
              )}
            </div>
          </div>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>Notes</div>
            <textarea className="form-input" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add payment notes…" style={{ resize: 'vertical' }} />
          </div>
        </div>

      </div>
    </AppShell>
  )
}
