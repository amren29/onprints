'use client'

import { useState, useEffect } from 'react'
// TODO [Batch G]: Replace auth-store with Supabase store-users
import { useAuthStore } from '@/lib/store/auth-store'
import { formatMYR } from '@/lib/store/pricing-engine'
// TODO [Batch H]: Replace finance-store with db/ — customer-facing wallet page
import { initFinanceData, getWithdrawalRequests, createWithdrawalRequest } from '@/lib/finance-store'
import { fetchStoreSettings, type StoreSettings, DEFAULTS as SETTINGS_DEFAULTS } from '@/lib/store-settings-store'

type TopupMethod = 'online' | 'bank-transfer'

export default function WalletPage() {
  const user = useAuthStore((s) => s.currentUser)
  const creditWallet = useAuthStore((s) => s.creditWallet)

  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<TopupMethod>('online')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [receiptFile, setReceiptFile] = useState<{ data: string; name: string } | null>(null)
  const [payoutAmount, setPayoutAmount] = useState('')
  const [payoutError, setPayoutError] = useState('')
  const [showPayoutConfirm, setShowPayoutConfirm] = useState(false)
  const [payoutSuccess, setPayoutSuccess] = useState(false)

  const [storeSettings, setStoreSettings] = useState<StoreSettings>(SETTINGS_DEFAULTS)

  useEffect(() => {
    fetchStoreSettings().then(setStoreSettings).catch(() => {})
  }, [])

  if (!user) return null

  initFinanceData()

  const balance = user.walletBalance ?? 0
  const entries = user.walletEntries ?? []
  const pendingEntries = entries.filter((e) => e.status === 'pending')
  const QUICK_AMOUNTS = [100, 200, 500, 1000]

  // Commission balance = total commission credits - total payout debits - pending withdrawal amounts
  const commissionCredits = entries.filter(e => (e.category === 'commission' || (e.category === 'adjustment' && e.description?.includes('Affiliate commission'))) && e.status === 'completed').reduce((s, e) => s + e.amount, 0)
  const payoutDebits = entries.filter(e => e.category === 'payout-debit' && e.status === 'completed').reduce((s, e) => s + e.amount, 0)
  const myWithdrawals = getWithdrawalRequests().filter(r => r.userEmail === user.email)
  const pendingWithdrawals = myWithdrawals.filter(r => r.status === 'pending')
  const pendingWithdrawalTotal = pendingWithdrawals.reduce((s, r) => s + r.amount, 0)
  const availableCommission = Math.round((commissionCredits - payoutDebits - pendingWithdrawalTotal) * 100) / 100

  async function handleOnlineTopup() {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) {
      setError('Enter a valid amount')
      return
    }
    setLoading(true)
    setError('')

    try {
      sessionStorage.setItem('saasprint-pending-topup', JSON.stringify({ amount: amt }))

      const res = await fetch('/api/store/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt }),
      })

      const data = await res.json()
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed')
      setLoading(false)
    }
  }

  function handleReceiptUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setReceiptFile({ data: reader.result as string, name: file.name })
    reader.readAsDataURL(file)
  }

  function handleBankTransferSubmit() {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) {
      setError('Enter a valid amount')
      return
    }
    if (!receiptFile) {
      setError('Please upload a transfer receipt')
      return
    }
    setLoading(true)
    setError('')

    creditWallet({
      id: `we_${Date.now()}`,
      date: new Date().toISOString(),
      type: 'credit',
      category: 'topup-transfer',
      description: `Bank transfer top-up — ${formatMYR(amt)}`,
      amount: 0, // Pending — amount credited only after admin approval
      balance: balance,
      receiptData: receiptFile.data,
      receiptFileName: receiptFile.name,
      status: 'pending',
    })

    setLoading(false)
    setAmount('')
    setReceiptFile(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Wallet</h1>
        <p className="text-sm text-gray-500 mt-1">Top up your wallet to pay for orders instantly.</p>
      </div>

      {/* Balance card */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-200 p-6">
        <p className="text-xs font-medium text-green-700 uppercase tracking-wider">Available Balance</p>
        <p className="text-4xl font-bold text-gray-900 mt-1">{formatMYR(balance)}</p>
      </div>

      {/* Topup section */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-bold text-gray-900 mb-4">Top Up</h2>

        {/* Quick amounts */}
        <div className="flex flex-wrap gap-2 mb-4">
          {QUICK_AMOUNTS.map((a) => (
            <button
              key={a}
              onClick={() => { setAmount(String(a)); setError('') }}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition ${
                amount === String(a) ? 'border-accent bg-accent/5 text-accent' : 'border-gray-100 text-gray-600 hover:border-gray-200'
              }`}
            >
              RM {a}
            </button>
          ))}
        </div>

        {/* Custom amount */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Amount (RM)</label>
          <input
            type="number"
            min="1"
            step="0.01"
            value={amount}
            onChange={(e) => { setAmount(e.target.value); setError('') }}
            placeholder="Enter amount"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent transition placeholder:text-gray-300"
          />
        </div>

        {/* Method toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMethod('online')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition ${
              method === 'online' ? 'border-accent bg-accent/5 text-accent' : 'border-gray-100 text-gray-600'
            }`}
          >
            Pay Online
          </button>
          <button
            onClick={() => setMethod('bank-transfer')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition ${
              method === 'bank-transfer' ? 'border-accent bg-accent/5 text-accent' : 'border-gray-100 text-gray-600'
            }`}
          >
            Bank Transfer
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
        )}

        {method === 'online' && (
          <button
            onClick={handleOnlineTopup}
            disabled={loading || !amount}
            className="w-full py-3 rounded-xl font-bold text-sm bg-accent text-white hover:opacity-90 transition disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity=".3"/><path d="M12 2a10 10 0 0110 10" strokeLinecap="round"/></svg>
                Redirecting…
              </>
            ) : (
              `Top Up ${amount ? formatMYR(parseFloat(amount) || 0) : 'RM 0.00'}`
            )}
          </button>
        )}

        {method === 'bank-transfer' && (
          <div className="space-y-4">
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm">
              <p className="font-semibold text-amber-800 mb-1">Bank Transfer Details</p>
              <div className="space-y-1 text-amber-700 text-xs">
                <div className="flex gap-3"><span className="font-medium w-20">Bank</span><span>{storeSettings.bankName || '—'}</span></div>
                <div className="flex gap-3"><span className="font-medium w-20">Account</span><span>{storeSettings.bankAccountNo || '—'}</span></div>
                <div className="flex gap-3"><span className="font-medium w-20">Name</span><span>{storeSettings.bankAccountName || '—'}</span></div>
                {amount && <div className="flex gap-3"><span className="font-medium w-20">Amount</span><span className="font-bold">{formatMYR(parseFloat(amount) || 0)}</span></div>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Upload Transfer Receipt <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleReceiptUpload}
                className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-accent/10 file:text-accent hover:file:bg-accent/20 transition"
              />
              {receiptFile && <p className="text-xs text-green-600 mt-1">Uploaded: {receiptFile.name}</p>}
            </div>

            <button
              onClick={handleBankTransferSubmit}
              disabled={loading || !amount || !receiptFile}
              className="w-full py-3 rounded-xl font-bold text-sm bg-accent text-white hover:opacity-90 transition disabled:opacity-60"
            >
              {loading ? 'Submitting…' : 'Submit for Approval'}
            </button>
          </div>
        )}
      </div>

      {/* Request Payout (commission only) */}
      {commissionCredits > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-bold text-gray-900 mb-1">Request Payout</h2>
          <p className="text-xs text-gray-500 mb-4">Withdraw your affiliate commission earnings. Top-up balance cannot be withdrawn.</p>

          <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
            <div>
              <p className="text-xs font-medium text-green-700 uppercase tracking-wider">Available Commission</p>
              <p className="text-2xl font-bold text-green-700 mt-0.5">{formatMYR(Math.max(0, availableCommission))}</p>
            </div>
            {pendingWithdrawalTotal > 0 && (
              <div className="text-right">
                <p className="text-xs text-amber-600 font-medium">Pending Withdrawal</p>
                <p className="text-sm font-bold text-amber-600">{formatMYR(pendingWithdrawalTotal)}</p>
              </div>
            )}
          </div>

          {availableCommission > 0 ? (
            <>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Payout Amount (RM)</label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  max={availableCommission}
                  value={payoutAmount}
                  onChange={(e) => { setPayoutAmount(e.target.value); setPayoutError('') }}
                  placeholder={`Max ${formatMYR(availableCommission)}`}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent transition placeholder:text-gray-300"
                />
              </div>

              {payoutError && (
                <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">{payoutError}</div>
              )}

              {payoutSuccess && (
                <div className="mb-4 rounded-xl bg-green-50 border border-green-200 p-3 text-sm text-green-700">
                  Payout request submitted! Admin will review and transfer to your bank account.
                </div>
              )}

              <button
                onClick={() => {
                  const amt = parseFloat(payoutAmount)
                  if (!amt || amt <= 0) { setPayoutError('Enter a valid amount'); return }
                  if (amt > availableCommission) { setPayoutError(`Maximum available is ${formatMYR(availableCommission)}`); return }
                  setShowPayoutConfirm(true)
                }}
                disabled={!payoutAmount}
                className="w-full py-3 rounded-xl font-bold text-sm bg-accent text-white hover:opacity-90 transition disabled:opacity-60"
              >
                Request Payout {payoutAmount ? formatMYR(parseFloat(payoutAmount) || 0) : ''}
              </button>
            </>
          ) : (
            <p className="text-sm text-gray-400">No commission available for payout.</p>
          )}
        </div>
      )}

      {/* Payout confirm modal */}
      {showPayoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Confirm Payout Request</h3>
            <p className="text-sm text-gray-600 mb-4">
              Request withdrawal of <span className="font-bold text-gray-900">{formatMYR(parseFloat(payoutAmount))}</span> from your commission balance? Admin will transfer to your bank account after approval.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowPayoutConfirm(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 border-gray-200 text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const amt = parseFloat(payoutAmount)
                  createWithdrawalRequest({
                    userEmail: user.email,
                    userName: user.name,
                    amount: amt,
                    status: 'pending',
                    requestedAt: new Date().toISOString(),
                  })
                  setShowPayoutConfirm(false)
                  setPayoutAmount('')
                  setPayoutSuccess(true)
                  setTimeout(() => setPayoutSuccess(false), 4000)
                }}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-accent text-white hover:opacity-90 transition"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* My withdrawal requests */}
      {myWithdrawals.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-3">Payout Requests</h2>
          <div className="space-y-2">
            {[...myWithdrawals].reverse().map(req => (
              <div key={req.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl border border-gray-100">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{formatMYR(req.amount)}</p>
                  <p className="text-xs text-gray-400">{new Date(req.requestedAt).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  {req.adminNotes && <p className="text-xs text-gray-500 mt-0.5">{req.adminNotes}</p>}
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                  req.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                  req.status === 'approved' ? 'bg-green-100 text-green-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {req.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending transfers */}
      {pendingEntries.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <h2 className="text-sm font-bold text-amber-800 mb-2">Pending Transfers</h2>
          {pendingEntries.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between text-sm py-1.5">
              <div>
                <p className="font-semibold text-amber-900">{entry.description}</p>
                <p className="text-xs text-amber-700">{new Date(entry.date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
              <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">Pending</span>
            </div>
          ))}
        </div>
      )}

      {/* Transaction history */}
      <div className="bg-white rounded-2xl border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">Transaction History</h2>
        </div>

        {entries.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-gray-400">No transactions yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {[...entries].reverse().map((entry) => (
              <div key={entry.id} className="flex items-center justify-between px-6 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{entry.description}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(entry.date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className={`text-sm font-bold ${entry.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                    {entry.type === 'credit' ? '+' : '-'}{formatMYR(entry.amount)}
                  </p>
                  <p className="text-xs text-gray-400">Bal: {formatMYR(entry.balance)}</p>
                  {entry.status === 'pending' && (
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Pending</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
