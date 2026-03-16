'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { PageSection } from '@/lib/store-builder'
import AnimateIn from '@/components/store/AnimateIn'
import EditableText, { type SectionEditCtx } from './EditableText'
import { useStoreGlobal } from '@/hooks/useStoreGlobal'

export default function ContactSection({ section, editMode, sectionId, onEdit }: { section: PageSection } & SectionEditCtx) {
  const { title, subtitle, showForm } = section.props
  const variant = section.variant
  const [submitted, setSubmitted] = useState(false)
  const ep = { editMode, sectionId, onEdit }
  const g = useStoreGlobal()

  const CONTACT_INFO = [
    { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>, title: 'Visit Us', lines: [g.shopName, g.contactAddress] },
    { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z"/></svg>, title: 'Call Us', lines: [g.contactPhone] },
    { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>, title: 'Email Us', lines: [g.contactEmail] },
    { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>, title: 'Business Hours', lines: ['Mon\u2013Fri: 9 AM \u2013 6 PM', 'Sat: 9 AM \u2013 1 PM'] },
  ]

  // Cards variant — info cards grid
  if (variant === 'cards') {
    return (
      <section className="max-w-screen-xl mx-auto px-8 -mt-6 mb-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {CONTACT_INFO.map((info, i) => (
            <AnimateIn key={info.title} delay={i * 80} animation="scale-in" className="h-full">
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm text-center h-full flex flex-col items-center justify-center">
                <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center mx-auto mb-3">
                  {info.icon}
                </div>
                <div className="font-semibold text-gray-900 text-sm mb-1">{info.title}</div>
                {info.lines.map((line) => (
                  <p key={line} className="text-xs text-gray-500">{line}</p>
                ))}
              </div>
            </AnimateIn>
          ))}
        </div>
      </section>
    )
  }

  // Form right variant — form + map + CTA
  return (
    <section className="max-w-screen-xl mx-auto px-8 pb-16">
      <div className="grid md:grid-cols-2 gap-10 max-w-4xl mx-auto">
        <AnimateIn animation="slide-left">
          <div>
            <EditableText value={title} propPath="title" tag="h2" className="text-xl font-bold text-gray-900 mb-1" {...ep} />
            {subtitle && <EditableText value={subtitle} propPath="subtitle" tag="p" className="text-sm text-gray-500 mb-6" {...ep} />}
            {showForm && (
              submitted ? (
                <div className="rounded-2xl bg-green-50 border border-green-200 p-8 text-center">
                  <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-7 h-7 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                  </div>
                  <div className="font-bold text-green-800 text-lg mb-1">Message Sent!</div>
                  <p className="text-sm text-green-600">Thank you for reaching out. We will get back to you within 1 working day.</p>
                </div>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true) }} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      <input type="text" required placeholder="Your name" className="w-full px-4 py-2.5 rounded-xl text-sm border border-gray-200 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input type="email" required placeholder="your@email.com" className="w-full px-4 py-2.5 rounded-xl text-sm border border-gray-200 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                    <select className="w-full px-4 py-2.5 rounded-xl text-sm border border-gray-200 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition bg-white text-gray-700 appearance-none cursor-pointer" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}>
                      <option>General Enquiry</option>
                      <option>Custom Quote</option>
                      <option>Order Issue</option>
                      <option>Artwork Help</option>
                      <option>Partnership</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                    <textarea required rows={5} placeholder="Tell us how we can help..." className="w-full px-4 py-2.5 rounded-xl text-sm border border-gray-200 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition resize-none" />
                  </div>
                  <button type="submit" className="w-full py-3 rounded-xl text-sm font-semibold bg-accent text-white hover:opacity-90 transition">
                    Send Message
                  </button>
                </form>
              )
            )}
          </div>
        </AnimateIn>
        <AnimateIn animation="slide-right">
          <div className="space-y-6">
            <div className="rounded-2xl bg-gray-100 border border-gray-200 aspect-[4/3] flex items-center justify-center">
              <div className="text-center text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                <p className="text-sm font-medium">Kuala Lumpur, Malaysia</p>
                <p className="text-xs mt-1">Map placeholder</p>
              </div>
            </div>
            <div className="rounded-2xl bg-accent/5 border border-accent/10 p-6">
              <div className="font-bold text-gray-900 mb-1">Need a custom quote?</div>
              <p className="text-sm text-gray-500 mb-4">For large or custom orders, our team can create a tailored pricing plan for your business.</p>
              <Link href="/store/membership" className="inline-block px-5 py-2 rounded-xl text-sm font-semibold bg-accent text-white hover:opacity-90 transition">
                View Membership Plans
              </Link>
            </div>
          </div>
        </AnimateIn>
      </div>
    </section>
  )
}
