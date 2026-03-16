import { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/store/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export default function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center font-bold rounded-xl transition focus:outline-none disabled:opacity-60'

  const variants = {
    primary: 'bg-accent text-white hover:opacity-90 shadow-sm',
    secondary: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
    ghost: 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
  }

  const sizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-7 py-3 text-base',
  }

  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  )
}
