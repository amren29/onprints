'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

type Animation = 'fade-up' | 'fade-in' | 'scale-in' | 'slide-left' | 'slide-right'

interface Props {
  children: ReactNode
  animation?: Animation
  delay?: number
  className?: string
}

export default function AnimateIn({
  children,
  animation = 'fade-up',
  delay = 0,
  className = '',
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.unobserve(el)
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`${visible ? `animate-${animation}` : 'opacity-0'} ${className}`}
      style={visible && delay ? { animationDelay: `${delay}ms`, animationFillMode: 'forwards' } : undefined}
    >
      {children}
    </div>
  )
}
