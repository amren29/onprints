'use client'

import { useState, useEffect, useCallback } from 'react'
import type { PageSection } from '@/lib/store-builder'
import type { SectionEditCtx } from './EditableText'

type BannerImage = { url: string; alt?: string }

export default function BannerSection({ section }: { section: PageSection } & SectionEditCtx) {
  const images: BannerImage[] = section.props.images || []
  const height: number = section.props.height || 400
  const interval: number = (section.props.interval || 5) * 1000
  const objectFit: string = section.props.objectFit || 'cover'
  const isSlider = section.variant === 'slider' && images.length > 1

  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)

  const next = useCallback(() => setCurrent(i => (i + 1) % images.length), [images.length])

  // Auto-advance
  useEffect(() => {
    if (!isSlider || paused) return
    const t = setInterval(next, interval)
    return () => clearInterval(t)
  }, [isSlider, paused, interval, next])

  if (images.length === 0) {
    return (
      <section style={{ height, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#9ca3af', fontSize: 14 }}>No banner image added</span>
      </section>
    )
  }

  // Single image
  if (!isSlider) {
    return (
      <section>
        <img
          src={images[0]?.url}
          alt={images[0]?.alt || ''}
          style={{ width: '100%', height, objectFit: objectFit as any, display: 'block' }}
        />
      </section>
    )
  }

  // Slider
  return (
    <section
      style={{ position: 'relative', overflow: 'hidden', height }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slides */}
      <div style={{
        display: 'flex', width: `${images.length * 100}%`, height: '100%',
        transition: 'transform 0.6s ease-in-out',
        transform: `translateX(-${current * (100 / images.length)}%)`,
      }}>
        {images.map((img, i) => (
          <img
            key={i}
            src={img.url}
            alt={img.alt || ''}
            style={{ width: `${100 / images.length}%`, height: '100%', objectFit: objectFit as any, flexShrink: 0 }}
          />
        ))}
      </div>

      {/* Arrows */}
      <button
        onClick={() => setCurrent(i => (i - 1 + images.length) % images.length)}
        style={{
          position: 'absolute', top: '50%', left: 12, transform: 'translateY(-50%)',
          width: 36, height: 36, borderRadius: '50%', border: 'none',
          background: 'rgba(0,0,0,0.35)', color: '#fff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, lineHeight: 1, backdropFilter: 'blur(4px)',
        }}
        aria-label="Previous"
      >
        ‹
      </button>
      <button
        onClick={() => next()}
        style={{
          position: 'absolute', top: '50%', right: 12, transform: 'translateY(-50%)',
          width: 36, height: 36, borderRadius: '50%', border: 'none',
          background: 'rgba(0,0,0,0.35)', color: '#fff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, lineHeight: 1, backdropFilter: 'blur(4px)',
        }}
        aria-label="Next"
      >
        ›
      </button>

      {/* Dots */}
      <div style={{
        position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 8,
      }}>
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            style={{
              width: i === current ? 20 : 8, height: 8, borderRadius: 4,
              border: 'none', cursor: 'pointer',
              background: i === current ? '#fff' : 'rgba(255,255,255,0.5)',
              transition: 'all 0.3s ease',
            }}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  )
}
