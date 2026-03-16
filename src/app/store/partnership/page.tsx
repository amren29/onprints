import type { Metadata } from 'next'
import Link from 'next/link'
import Navbar from '@/components/store/Navbar'
import Footer from '@/components/store/Footer'
import NewsletterCTA from '@/components/store/NewsletterCTA'
import AnimateIn from '@/components/store/AnimateIn'

export const metadata: Metadata = { title: 'Agent Partnership — SaasPrint Store' }

const BENEFITS = [
  {
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
    title: 'Agent Discount',
    desc: 'Buy at discounted agent prices and sell at full retail price. Keep the margin as your profit on every order.',
  },
  {
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: 'Dedicated Support',
    desc: 'Get priority support from our team. Your dedicated account manager ensures smooth order fulfilment every time.',
  },
  {
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
    title: 'Agent Dashboard',
    desc: 'Manage all your orders, track production status, and view earnings from a dedicated agent dashboard.',
  },
  {
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
    title: 'Fast Turnaround',
    desc: 'Agent orders get priority production. Most orders are completed within 3–5 working days with express options available.',
  },
]

const HOW_IT_WORKS = [
  { step: '01', title: 'Apply to become an agent', desc: 'Fill out the partnership form below. We review applications within 1–2 working days.' },
  { step: '02', title: 'Get approved & set up', desc: 'Once approved, you receive your agent account with a personalised discount rate and dashboard access.' },
  { step: '03', title: 'Take orders from your clients', desc: 'Accept print orders from your clients at retail price. Place orders on our platform at your agent price.' },
  { step: '04', title: 'We print, you earn', desc: 'We handle production and delivery. You keep the difference between retail and agent pricing as profit.' },
]

export default function PartnershipPage() {
  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className="bg-gradient-to-br from-accent/5 via-white to-blue-50 border-b border-gray-100">
        <div className="max-w-screen-xl mx-auto px-8 py-20 md:py-28 text-center">
          <AnimateIn animation="fade-up">
            <div className="inline-block bg-accent/10 text-accent text-xs font-semibold px-3 py-1 rounded-full mb-4">Agent Partnership</div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-4">
              Become a SaasPrint<br />reseller agent
            </h1>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">
              Partner with us and earn by reselling professional print products to your clients. Buy at agent prices, sell at retail, and keep the margin.
            </p>
          </AnimateIn>
        </div>
      </section>

      {/* Benefits */}
      <section className="max-w-screen-xl mx-auto px-8 py-16 md:py-20">
        <AnimateIn>
          <div className="text-center mb-12">
            <div className="text-xs font-semibold text-accent uppercase tracking-widest mb-3">Why Partner With Us</div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Built for resellers who mean business</h2>
          </div>
        </AnimateIn>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {BENEFITS.map((item, i) => (
            <AnimateIn key={item.title} delay={i * 100} animation="scale-in">
              <div className="bg-white rounded-2xl p-6 border border-gray-100 h-full">
                <div className="w-12 h-12 rounded-xl bg-accent/10 text-accent flex items-center justify-center mb-4">
                  {item.icon}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            </AnimateIn>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-screen-xl mx-auto px-8 py-16 md:py-20">
          <AnimateIn>
            <div className="text-center mb-12">
              <div className="text-xs font-semibold text-accent uppercase tracking-widest mb-3">How It Works</div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Start earning in 4 steps</h2>
            </div>
          </AnimateIn>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map((item, i) => (
              <AnimateIn key={item.step} delay={i * 100} animation="fade-up">
                <div className="relative bg-white rounded-2xl p-6 border border-gray-100 h-full">
                  <div className="text-5xl font-black text-gray-100 absolute top-4 right-5 select-none">{item.step}</div>
                  <h3 className="font-semibold text-gray-900 mb-2 pr-10">{item.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* Agent Tiers */}
      <section className="max-w-screen-xl mx-auto px-8 py-16 md:py-20">
        <AnimateIn>
          <div className="text-center mb-12">
            <div className="text-xs font-semibold text-accent uppercase tracking-widest mb-3">Agent Tiers</div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Discount grows with your volume</h2>
            <p className="text-sm text-gray-500 mt-3 max-w-lg mx-auto">
              Your agent discount rate is set based on your monthly order volume. The more you sell, the higher your margin.
            </p>
          </div>
        </AnimateIn>
        <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
          {[
            { tier: 'Starter', discount: '10%', volume: 'Up to RM 5,000/mo', color: 'bg-gray-50 border-gray-200' },
            { tier: 'Growth', discount: '15%', volume: 'RM 5,000 – RM 20,000/mo', color: 'bg-accent/5 border-accent/20' },
            { tier: 'Premium', discount: '20%', volume: 'Above RM 20,000/mo', color: 'bg-accent/5 border-accent/20' },
          ].map((t, i) => (
            <AnimateIn key={t.tier} delay={i * 100} animation="scale-in">
              <div className={`rounded-2xl p-6 border text-center h-full ${t.color}`}>
                <div className="text-xs font-bold text-accent uppercase tracking-widest mb-2">{t.tier}</div>
                <div className="text-4xl font-black text-gray-900 mb-1">{t.discount}</div>
                <div className="text-sm text-gray-500 mb-3">off retail price</div>
                <div className="text-xs text-gray-400">{t.volume}</div>
              </div>
            </AnimateIn>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-screen-xl mx-auto px-8 py-16 md:py-20">
        <AnimateIn animation="scale-in">
          <div className="rounded-2xl bg-accent/5 border border-accent/10 p-10 text-center">
            <h3 className="font-bold text-gray-900 text-xl mb-2">Ready to partner with us?</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
              Get in touch with our partnerships team. We will review your application and get back to you within 1–2 working days.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/store/contact" className="inline-block px-6 py-2.5 rounded-xl text-sm font-semibold bg-accent text-white hover:opacity-90 transition">
                Apply Now
              </Link>
              <Link href="/store/faq" className="inline-block px-6 py-2.5 rounded-xl text-sm font-semibold bg-white text-gray-700 border border-gray-200 hover:border-gray-300 transition">
                Read FAQ
              </Link>
            </div>
          </div>
        </AnimateIn>
      </section>

      <NewsletterCTA />
      <Footer />
    </>
  )
}
