'use client'

import { useRef, useEffect, type CSSProperties } from 'react'

type Props = {
  value: string
  editable: boolean
  onCommit: (v: string) => void
  multiline?: boolean
  tag?: 'span' | 'div' | 'p' | 'h1' | 'h2'
  style?: CSSProperties
  className?: string
}

export default function EditableText({
  value, editable, onCommit, multiline, tag = 'span', style, className,
}: Props) {
  const ref = useRef<HTMLElement>(null)
  const focused = useRef(false)

  /* Set initial text + sync when value changes externally (but not while typing) */
  useEffect(() => {
    if (ref.current && !focused.current && ref.current.innerText !== value) {
      ref.current.innerText = value
    }
  }, [value])

  /* Seed initial content on mount */
  useEffect(() => {
    if (ref.current && editable) {
      ref.current.innerText = value
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!editable) {
    const Tag = tag as any
    return <Tag style={style} className={className}>{value}</Tag>
  }

  const Tag = tag as any

  const handleBlur = () => {
    focused.current = false
    const el = ref.current
    if (!el) return
    const txt = el.innerText
    if (txt !== value) onCommit(txt)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault()
      ;(e.target as HTMLElement).blur()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, text)
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
  }

  return (
    <Tag
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      className={className}
      style={{
        ...style,
        outline: 'none',
        cursor: 'text',
      }}
      onFocus={(e: React.FocusEvent<HTMLElement>) => {
        focused.current = true
        e.currentTarget.style.outline = '2px solid rgba(59,130,246,0.5)'
        e.currentTarget.style.outlineOffset = '1px'
        e.currentTarget.style.boxShadow = 'inset 0 0 0 200px rgba(59,130,246,0.05)'
      }}
      onBlur={(e: React.FocusEvent<HTMLElement>) => {
        e.currentTarget.style.outline = 'none'
        e.currentTarget.style.outlineOffset = '0px'
        e.currentTarget.style.boxShadow = 'none'
        handleBlur()
      }}
      onMouseEnter={(e: React.MouseEvent<HTMLElement>) => {
        if (!focused.current) {
          e.currentTarget.style.outline = '1px dashed rgba(59,130,246,0.35)'
          e.currentTarget.style.outlineOffset = '1px'
          e.currentTarget.style.boxShadow = 'inset 0 0 0 200px rgba(59,130,246,0.03)'
        }
      }}
      onMouseLeave={(e: React.MouseEvent<HTMLElement>) => {
        if (!focused.current) {
          e.currentTarget.style.outline = 'none'
          e.currentTarget.style.outlineOffset = '0px'
          e.currentTarget.style.boxShadow = 'none'
        }
      }}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      onClick={handleClick}
    />
  )
}
