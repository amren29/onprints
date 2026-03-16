'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import type { Banner } from '@/config/store/banners'
import { useStore } from '@/providers/store-context'

interface Slide {
  id: string
  badge?: string
  heading: string
  subheading: string
  cta: { label: string; href: string }
  secondaryCta?: { label: string; href: string }
  bgGradient: string
  bgImage?: string
}

function getSlides(basePath: string): Slide[] {
  return [
    {
      id: 'hero',
      badge: 'Professional Printing',
      heading: 'Print smarter.\nGrow faster.',
      subheading: 'Business cards, banners, flyers and more — with instant pricing, online artwork proofing, and fast delivery across Malaysia.',
      cta: { label: 'Browse Products', href: `${basePath}/products` },
      secondaryCta: { label: 'Join Membership', href: `${basePath}/membership` },
      bgGradient: 'linear-gradient(135deg, #0a0f1e 0%, #1a1f3a 40%, #0d2847 70%, #0a0f1e 100%)',
    },
    {
      id: 'how-to-order',
      badge: 'How to Order',
      heading: 'From screen to print\nin 4 simple steps',
      subheading: 'Choose your product, upload artwork, pay securely, and we print & deliver — with real-time proofing so you know exactly what you\'ll get.',
      cta: { label: 'Learn More', href: `${basePath}/how-to-order` },
      secondaryCta: { label: 'Start Ordering', href: `${basePath}/products` },
      bgGradient: 'linear-gradient(135deg, #001233 0%, #001845 40%, #023e7d 70%, #001233 100%)',
    },
    {
      id: 'membership',
      badge: 'Save More',
      heading: 'Join our\nmembership program',
      subheading: 'Get up to 15% off every order with a yearly membership. Five tiers to suit every business — from startups to enterprises.',
      cta: { label: 'View Plans', href: `${basePath}/membership` },
      bgGradient: 'linear-gradient(135deg, #0a0f1e 0%, #1b2838 40%, #0f2027 70%, #0a0f1e 100%)',
    },
  ]
}

const INTERVAL = 6000

interface HeroBannerProps {
  banner: Banner
}

export default function HeroBanner({ banner }: HeroBannerProps) {
  const { basePath } = useStore()
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)

  // Override first slide bg with active banner config
  const SLIDES = getSlides(basePath)
  const slides = SLIDES.map((s, i) =>
    i === 0 ? { ...s, bgGradient: banner.bgGradient, bgImage: banner.bgImage } : s
  )

  const goTo = useCallback((idx: number) => setCurrent(idx), [])
  const next = useCallback(() => setCurrent((c) => (c + 1) % slides.length), [slides.length])

  useEffect(() => {
    if (paused) return
    const timer = setInterval(next, INTERVAL)
    return () => clearInterval(timer)
  }, [paused, next])

  return (
    <section
      className="relative w-full overflow-hidden min-h-[60vh] md:min-h-[70vh] lg:min-h-[75vh]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slides */}
      {slides.map((slide, i) => {
        const isActive = i === current
        return (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${isActive ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
          >
            {/* Background */}
            <div className="absolute inset-0" style={{ background: slide.bgGradient }} />
            {slide.bgImage && (
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${slide.bgImage})` }}
              />
            )}

            {/* Decorative shapes */}
            {!slide.bgImage && (
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[6%] left-[3%] w-44 h-28 rounded-2xl bg-white/[0.04] rotate-[-8deg] border border-white/[0.06]" />
                <div className="absolute top-[12%] left-[22%] w-36 h-36 rounded-2xl bg-white/[0.03] rotate-[5deg] border border-white/[0.05]" />
                <div className="absolute bottom-[12%] left-[5%] w-40 h-52 rounded-2xl bg-white/[0.04] rotate-[12deg] border border-white/[0.06]" />
                <div className="absolute top-[5%] right-[4%] w-52 h-36 rounded-2xl bg-white/[0.04] rotate-[6deg] border border-white/[0.06]" />
                <div className="absolute top-[35%] right-[2%] w-36 h-48 rounded-2xl bg-white/[0.03] rotate-[-10deg] border border-white/[0.05]" />
                <div className="absolute bottom-[8%] right-[12%] w-44 h-28 rounded-2xl bg-white/[0.04] rotate-[8deg] border border-white/[0.06]" />
                <div className="absolute bottom-[5%] left-[28%] w-32 h-32 rounded-2xl bg-white/[0.03] rotate-[-5deg] border border-white/[0.05]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] rounded-full bg-accent/[0.08] blur-[150px]" />
              </div>
            )}

            {/* Content */}
            <div className="relative z-10 h-full flex items-center">
              <div className="max-w-screen-xl mx-auto px-8 w-full">
                <div className="max-w-2xl">
                  {slide.badge && (
                    <div
                      className={`inline-block bg-white/10 backdrop-blur-sm text-white/90 text-xs font-semibold px-3 py-1 rounded-full mb-5 border border-white/10 transition-all duration-700 ${
                        isActive ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                      }`}
                    >
                      {slide.badge}
                    </div>
                  )}
                  <h1
                    className={`text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-5 whitespace-pre-line transition-all duration-700 delay-100 ${
                      isActive ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                    }`}
                  >
                    {slide.heading}
                  </h1>
                  <p
                    className={`text-base md:text-lg text-white/60 leading-relaxed mb-8 max-w-lg transition-all duration-700 delay-200 ${
                      isActive ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                    }`}
                  >
                    {slide.subheading}
                  </p>
                  <div
                    className={`flex flex-wrap gap-3 transition-all duration-700 delay-300 ${
                      isActive ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                    }`}
                  >
                    <Link
                      href={slide.cta.href}
                      className="inline-flex items-center gap-2 bg-accent text-white font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition text-sm"
                    >
                      {slide.cta.label}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                    </Link>
                    {slide.secondaryCta && (
                      <Link
                        href={slide.secondaryCta.href}
                        className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white font-semibold px-6 py-3 rounded-xl hover:bg-white/20 transition text-sm border border-white/10"
                      >
                        {slide.secondaryCta.label}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })}

      {/* Dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {slides.map((slide, i) => (
          <button
            key={slide.id}
            onClick={() => goTo(i)}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === current ? 'w-8 bg-white' : 'w-2 bg-white/30 hover:bg-white/50'
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  )
}
