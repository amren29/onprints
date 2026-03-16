'use client'

import Link from 'next/link'
import type { PageSection } from '@/lib/store-builder'
import AnimateIn from '@/components/store/AnimateIn'
import { useMembershipStore } from '@/lib/store/membership-store'
import { useAuthStore } from '@/lib/store/auth-store'
import { useStore } from '@/providers/store-context'
import { formatMYR } from '@/lib/store/pricing-engine'
import EditableText, { type SectionEditCtx } from './EditableText'

const TIER_COLORS: Record<string, { card: string; badge: string }> = {
  Essential: { card: 'bg-gray-100 text-gray-700', badge: 'bg-gray-200 text-gray-600' },
  Bronze: { card: 'bg-amber-50 text-amber-800', badge: 'bg-amber-100 text-amber-700' },
  Silver: { card: 'bg-slate-50 text-slate-700', badge: 'bg-slate-200 text-slate-600' },
  Gold: { card: 'bg-yellow-50 text-yellow-800', badge: 'bg-yellow-100 text-yellow-700' },
  Platinum: { card: 'bg-accent/5 text-accent', badge: 'bg-accent/10 text-accent' },
}

const DEFAULT_COLOR = { card: 'bg-gray-100 text-gray-700', badge: 'bg-gray-200 text-gray-600' }

export default function PricingTiersSection({ section, editMode, sectionId, onEdit }: { section: PageSection } & SectionEditCtx) {
  const { title, subtitle } = section.props
  const tiers = useMembershipStore((s) => s.tiers)
  const user = useAuthStore((s) => s.currentUser)
  const { basePath } = useStore()
  const activeMembership = user?.membership && (user.membership.status ?? 'active') === 'active' && new Date(user.membership.expiryDate) > new Date() ? user.membership : null
  const ep = { editMode, sectionId, onEdit }

  return (
    <section className="max-w-screen-xl mx-auto px-8 py-16">
      <AnimateIn>
        <EditableText value={title} propPath="title" tag="h2" className="text-2xl font-bold text-gray-900 text-center mb-2" {...ep} />
        {subtitle && <EditableText value={subtitle} propPath="subtitle" tag="p" className="text-sm text-gray-500 text-center mb-10 max-w-lg mx-auto" {...ep} />}
      </AnimateIn>

      {/* Active membership banner */}
      {activeMembership && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex items-center justify-between mb-8 max-w-5xl mx-auto">
          <div>
            <p className="text-sm font-bold text-green-800">You&apos;re a {activeMembership.tierName} member</p>
            <p className="text-xs text-green-600 mt-0.5">
              {Math.round(activeMembership.discountRate * 100)}% discount active until{' '}
              {new Date(activeMembership.expiryDate).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <Link href={`${basePath}/products`} className="px-4 py-2 bg-green-700 text-white text-sm font-semibold rounded-xl hover:bg-green-800 transition">
            Start Shopping
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 max-w-5xl mx-auto">
        {tiers.map((tier, i) => {
          const colors = TIER_COLORS[tier.name] || DEFAULT_COLOR
          const isActive = activeMembership?.tierId === tier.id
          return (
            <AnimateIn key={tier.id} delay={i * 80} animation="fade-up">
              <div className={`rounded-2xl p-5 text-center ${colors.card} border ${isActive ? 'border-green-400 ring-2 ring-green-200' : 'border-gray-100'} relative`}>
                {tier.name === 'Platinum' && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-accent text-white text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">Best Value</div>
                )}
                {isActive && (
                  <div className="absolute -top-2.5 right-3 bg-green-600 text-white text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">Current</div>
                )}
                <div className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full mb-3 ${colors.badge}`}>
                  {tier.name}
                </div>
                <div className="text-3xl font-bold mb-1">{Math.round(tier.discountRate * 100)}%</div>
                <div className="text-xs opacity-70 mb-3">discount on all orders</div>
                <div className="border-t border-current/10 pt-3">
                  <div className="text-xs opacity-60 mb-0.5">Yearly fee</div>
                  <div className="text-sm font-bold">{formatMYR(tier.price)}/year</div>
                </div>
                {!isActive && (
                  <Link
                    href={user ? `${basePath}/account/membership` : `${basePath}/auth/signin?returnTo=${basePath}/account/membership`}
                    className="block mt-3 py-1.5 rounded-lg text-[11px] font-bold bg-current/10 hover:bg-current/20 transition text-center"
                  >
                    Subscribe
                  </Link>
                )}
              </div>
            </AnimateIn>
          )
        })}
      </div>
    </section>
  )
}
