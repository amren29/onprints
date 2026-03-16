'use client'

import { useState, FormEvent } from 'react'
// TODO [Batch G]: Replace auth-store with Supabase store-users
import { useAuthStore } from '@/lib/store/auth-store'
import { Address } from '@/types/store'
import Input from '@/components/store/ui/Input'
import Button from '@/components/store/ui/Button'

const STATES = [
  'Johor', 'Kedah', 'Kelantan', 'Kuala Lumpur', 'Labuan', 'Melaka',
  'Negeri Sembilan', 'Pahang', 'Penang', 'Perak', 'Perlis', 'Putrajaya',
  'Sabah', 'Sarawak', 'Selangor', 'Terengganu',
]

const emptyForm = { label: '', line1: '', line2: '', city: '', postcode: '', state: '' }

export default function AddressesPage() {
  const user = useAuthStore((s) => s.currentUser)
  const addAddress = useAuthStore((s) => s.addAddress)
  const updateAddress = useAuthStore((s) => s.updateAddress)
  const removeAddress = useAuthStore((s) => s.removeAddress)
  const setDefaultAddress = useAuthStore((s) => s.setDefaultAddress)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})

  if (!user) return null

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(false)
    setErrors({})
  }

  const startEdit = (addr: Address) => {
    setForm({
      label: addr.label,
      line1: addr.line1,
      line2: addr.line2,
      city: addr.city,
      postcode: addr.postcode,
      state: addr.state,
    })
    setEditingId(addr.id)
    setShowForm(true)
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.label.trim()) errs.label = 'Label is required'
    if (!form.line1.trim()) errs.line1 = 'Address line 1 is required'
    if (!form.city.trim()) errs.city = 'City is required'
    if (!form.postcode.trim()) errs.postcode = 'Postcode is required'
    if (!form.state) errs.state = 'State is required'
    return errs
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    if (editingId) {
      updateAddress(editingId, {
        label: form.label.trim(),
        line1: form.line1.trim(),
        line2: form.line2.trim(),
        city: form.city.trim(),
        postcode: form.postcode.trim(),
        state: form.state,
      })
    } else {
      addAddress({
        id: `addr_${Date.now()}`,
        label: form.label.trim(),
        line1: form.line1.trim(),
        line2: form.line2.trim(),
        city: form.city.trim(),
        postcode: form.postcode.trim(),
        state: form.state,
        isDefault: user.addresses.length === 0,
      })
    }

    resetForm()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-gray-900">Addresses</h1>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            Add Address
          </Button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4 max-w-lg">
          <h2 className="text-sm font-bold text-gray-900">
            {editingId ? 'Edit Address' : 'New Address'}
          </h2>

          <Input
            label="Label"
            placeholder="Home, Office, etc."
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            error={errors.label}
          />

          <Input
            label="Address Line 1"
            placeholder="Street address"
            value={form.line1}
            onChange={(e) => setForm({ ...form, line1: e.target.value })}
            error={errors.line1}
          />

          <Input
            label="Address Line 2"
            placeholder="Apartment, unit, floor (optional)"
            value={form.line2}
            onChange={(e) => setForm({ ...form, line2: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="City"
              placeholder="City"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              error={errors.city}
            />
            <Input
              label="Postcode"
              placeholder="12345"
              value={form.postcode}
              onChange={(e) => setForm({ ...form, postcode: e.target.value })}
              error={errors.postcode}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">State</label>
            <select
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              className={`border rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition ${
                errors.state ? 'border-red-400' : 'border-gray-200'
              }`}
            >
              <option value="">Select state</option>
              {STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {errors.state && <p className="text-xs text-red-500">{errors.state}</p>}
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" size="md">
              {editingId ? 'Update' : 'Add Address'}
            </Button>
            <Button type="button" variant="ghost" size="md" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Address List */}
      {user.addresses.length === 0 && !showForm ? (
        <div className="bg-white rounded-2xl border border-gray-100 px-6 py-16 text-center">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-gray-200 mb-4">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <p className="text-sm text-gray-500 mb-2">No saved addresses</p>
          <p className="text-xs text-gray-400">Add an address for faster checkout</p>
        </div>
      ) : (
        <div className="space-y-3">
          {user.addresses.map((addr) => (
            <div
              key={addr.id}
              className="bg-white rounded-2xl border border-gray-100 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-gray-900">{addr.label}</span>
                    {addr.isDefault && (
                      <span className="text-[10px] font-bold bg-accent/10 text-accent px-2 py-0.5 rounded-full">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{addr.line1}</p>
                  {addr.line2 && <p className="text-sm text-gray-600">{addr.line2}</p>}
                  <p className="text-sm text-gray-600">
                    {addr.postcode} {addr.city}, {addr.state}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {!addr.isDefault && (
                    <button
                      onClick={() => setDefaultAddress(addr.id)}
                      className="text-xs text-gray-400 hover:text-accent px-2 py-1 rounded transition"
                    >
                      Set Default
                    </button>
                  )}
                  <button
                    onClick={() => startEdit(addr)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 rounded transition"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => removeAddress(addr.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 rounded transition"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
