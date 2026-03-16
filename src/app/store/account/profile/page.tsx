'use client'

import { useState, FormEvent } from 'react'
// TODO [Batch G]: Replace auth-store with Supabase store-users
import { useAuthStore } from '@/lib/store/auth-store'
import Input from '@/components/store/ui/Input'
import Button from '@/components/store/ui/Button'

export default function ProfilePage() {
  const user = useAuthStore((s) => s.currentUser)
  const updateProfile = useAuthStore((s) => s.updateProfile)

  const [name, setName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [company, setCompany] = useState(user?.company ?? '')
  const [saved, setSaved] = useState(false)

  if (!user) return null

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    updateProfile({ name: name.trim(), phone: phone.trim(), company: company.trim() })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Profile Settings</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5 max-w-lg">
        {/* Role badge */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-accent text-white text-lg font-bold flex items-center justify-center">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{user.name}</p>
            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${
              user.role === 'agent'
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-500'
            }`}>
              {user.role === 'agent' ? 'Agent' : 'Customer'}
            </span>
          </div>
        </div>

        <div className="border-t border-gray-100" />

        <Input
          label="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <Input
          label="Email"
          value={user.email}
          disabled
          className="opacity-60 cursor-not-allowed"
        />

        <Input
          label="Phone"
          type="tel"
          placeholder="012-3456789"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <Input
          label="Company"
          placeholder="Your company name (optional)"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />

        <div className="flex items-center gap-3">
          <Button type="submit" size="md">
            Save Changes
          </Button>
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-sm text-green-600 font-medium bg-green-50 px-3 py-1.5 rounded-lg">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
              Changes saved
            </span>
          )}
        </div>
      </form>

      <div className="text-xs text-gray-400">
        Account created{' '}
        {new Date(user.createdAt).toLocaleDateString('en-MY', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
      </div>
    </div>
  )
}
