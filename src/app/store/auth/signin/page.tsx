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

export default function SignInPage() {
  const router = useRouter()
  const signIn = useAuthStore((s) => s.signIn)
  const currentUser = useAuthStore((s) => s.currentUser)
  const globalSettings = useStoreGlobal()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Redirect if already logged in
  useEffect(() => {
    if (currentUser) router.replace('/store/account')
  }, [currentUser, router])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }

    setLoading(true)
    // Simulate brief delay for realism
    setTimeout(() => {
      const result = signIn(email, password)
      if (result.success) {
        router.push('/store/account')
      } else {
        setError(result.error || 'Sign in failed')
      }
      setLoading(false)
    }, 300)
  }

  return (
    <>
      <Navbar />
      <main className="min-h-[80vh] flex items-center justify-center px-4 py-20">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h1>
            <p className="text-sm text-gray-500">Sign in to your {globalSettings.shopName} account</p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <Input
              label="Email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />

            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/store/auth/signup" className="text-accent font-semibold hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  )
}
