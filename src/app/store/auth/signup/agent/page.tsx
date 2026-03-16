'use client'

import { useState, FormEvent, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/store/Navbar'
import Footer from '@/components/store/Footer'
import Input from '@/components/store/ui/Input'
import Button from '@/components/store/ui/Button'
// TODO [Batch G]: Replace auth-store with Supabase store-users
import { useAuthStore } from '@/lib/store/auth-store'
import { useStoreGlobal } from '@/hooks/useStoreGlobal'
import { upsertOnlineCustomer } from '@/lib/store/customer-bridge'
import { createAgent as dbCreateAgent } from '@/lib/db/agents'
import { useStore } from '@/providers/store-context'

const BUSINESS_TYPES = [
  'Sole Proprietorship',
  'Partnership',
  'Sdn Bhd (Private Limited)',
  'Enterprise',
  'Freelancer / Individual',
  'Other',
]

const REGIONS = [
  'Kuala Lumpur',
  'Selangor',
  'Johor',
  'Penang',
  'Sabah',
  'Sarawak',
  'Perak',
  'Kedah',
  'Kelantan',
  'Terengganu',
  'Pahang',
  'Negeri Sembilan',
  'Melaka',
  'Perlis',
  'Putrajaya',
  'Labuan',
  'Other',
]

export default function AgentSignUpPage() {
  const router = useRouter()
  const signUp = useAuthStore((s) => s.signUp)
  const currentUser = useAuthStore((s) => s.currentUser)
  const globalSettings = useStoreGlobal()
  const { basePath } = useStore()

  // Personal
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Business
  const [companyName, setCompanyName] = useState('')
  const [businessType, setBusinessType] = useState('')
  const [ssmNo, setSsmNo] = useState('')
  const [region, setRegion] = useState('')
  const [address, setAddress] = useState('')

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [globalError, setGlobalError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (currentUser) router.replace(`${basePath}/account`)
  }, [currentUser, router])

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = 'Name is required'
    if (!email.trim()) errs.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Invalid email format'
    if (!phone.trim()) errs.phone = 'Phone is required'
    if (!companyName.trim()) errs.companyName = 'Company name is required'
    if (!businessType) errs.businessType = 'Business type is required'
    if (!region) errs.region = 'Region is required'
    if (!password) errs.password = 'Password is required'
    else if (password.length < 6) errs.password = 'Password must be at least 6 characters'
    if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match'
    return errs
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setGlobalError('')
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setLoading(true)
    setTimeout(() => {
      const result = signUp(name.trim(), email.trim(), password, 'agent')
      if (result.success) {
        // Sync to admin Customer DB
        upsertOnlineCustomer({ name: name.trim(), email: email.trim(), phone: phone.trim(), company: companyName.trim() }, 0)

        // Create admin Agent record in DB
        const shopId = process.env.NEXT_PUBLIC_SHOP_ID ?? ''
        const nowStr = new Date().toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
        if (shopId) {
          dbCreateAgent(shopId, {
            full_name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
            region: region,
            status: 'Active',
            discount_rate: 0,
            payment_method: '',
            bank_name: '',
            bank_account_name: '',
            bank_account_number: '',
            start_date: nowStr,
            notes: [
              'Registered via agent signup link',
              `Company: ${companyName.trim()}`,
              `Business Type: ${businessType}`,
              ssmNo.trim() ? `SSM No: ${ssmNo.trim()}` : '',
              address.trim() ? `Address: ${address.trim()}` : '',
            ].filter(Boolean).join('\n'),
          }).catch(() => {})
        }

        router.push(`${basePath}/account`)
      } else {
        setGlobalError(result.error || 'Sign up failed')
      }
      setLoading(false)
    }, 300)
  }

  const selectClass = (hasError: boolean) =>
    `w-full border rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition ${
      hasError ? 'border-red-400' : 'border-gray-200'
    }`

  return (
    <>
      <Navbar />
      <main className="min-h-[80vh] flex items-center justify-center px-4 py-20">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Agent Registration</h1>
            <p className="text-sm text-gray-500">Join {globalSettings.shopName} as an agent partner</p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
            {globalError && (
              <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">
                {globalError}
              </div>
            )}

            {/* Section: Personal Information */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Personal Information</h3>
              <div className="space-y-3">
                <Input
                  label="Full Name *"
                  type="text"
                  placeholder="Ahmad Zulkifli"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  error={errors.name}
                  autoComplete="name"
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Email *"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={errors.email}
                    autoComplete="email"
                  />
                  <Input
                    label="Phone *"
                    type="tel"
                    placeholder="012-345 6789"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    error={errors.phone}
                    autoComplete="tel"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100" />

            {/* Section: Business Information */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Business Information</h3>
              <div className="space-y-3">
                <Input
                  label="Company / Business Name *"
                  type="text"
                  placeholder="Syarikat ABC Sdn Bhd"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  error={errors.companyName}
                  autoComplete="organization"
                />
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">Business Type *</label>
                    <select
                      value={businessType}
                      onChange={(e) => setBusinessType(e.target.value)}
                      className={selectClass(!!errors.businessType)}
                    >
                      <option value="">Select type</option>
                      {BUSINESS_TYPES.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    {errors.businessType && <p className="text-xs text-red-500">{errors.businessType}</p>}
                  </div>
                  <Input
                    label="SSM / Registration No."
                    type="text"
                    placeholder="e.g. 202301012345"
                    value={ssmNo}
                    onChange={(e) => setSsmNo(e.target.value)}
                    autoComplete="off"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">Region *</label>
                    <select
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      className={selectClass(!!errors.region)}
                    >
                      <option value="">Select region</option>
                      {REGIONS.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    {errors.region && <p className="text-xs text-red-500">{errors.region}</p>}
                  </div>
                  <Input
                    label="Business Address"
                    type="text"
                    placeholder="Office / business address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    autoComplete="street-address"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100" />

            {/* Section: Account Security */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Account Security</h3>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Password *"
                  type="password"
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={errors.password}
                  autoComplete="new-password"
                />
                <Input
                  label="Confirm Password *"
                  type="password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  error={errors.confirmPassword}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Register as Agent'}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link href={`${basePath}/auth/signin`} className="text-accent font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  )
}
