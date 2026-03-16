'use client'

import { useRef, useEffect } from 'react'

export type SectionEditCtx = {
  editMode?: boolean
  sectionId?: string
  onEdit?: (sectionId: string, propPath: string, value: string) => void
}

type Props = {
  value: string
  propPath: string
  tag?: 'h1' | 'h2' | 'h3' | 'p' | 'div' | 'span'
  className?: string
  multiline?: boolean
} & SectionEditCtx

export default function EditableText({
  value, propPath, tag = 'span', className, multiline,
  editMode, sectionId, onEdit,
}: Props) {
  const ref = useRef<HTMLElement>(null)
  const focused = useRef(false)

  useEffect(() => {
    if (ref.current && !focused.current && ref.current.innerText !== value) {
      ref.current.innerText = value
    }
  }, [value])

  if (!editMode || !sectionId || !onEdit) {
    const Tag = tag as any
    return <Tag className={className}>{value}</Tag>
  }

  const Tag = tag as any

  return (
    <Tag
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      className={className}
      style={{ outline: 'none', cursor: 'text' }}
      onFocus={(e: React.FocusEvent<HTMLElement>) => {
        focused.current = true
        e.currentTarget.style.outline = '2px solid rgba(0,106,255,0.5)'
        e.currentTarget.style.outlineOffset = '2px'
        e.currentTarget.style.borderRadius = '4px'
      }}
      onBlur={(e: React.FocusEvent<HTMLElement>) => {
        focused.current = false
        e.currentTarget.style.outline = 'none'
        e.currentTarget.style.outlineOffset = '0'
        e.currentTarget.style.borderRadius = ''
        const txt = e.currentTarget.innerText
        if (txt !== value) onEdit(sectionId, propPath, txt)
      }}
      onMouseEnter={(e: React.MouseEvent<HTMLElement>) => {
        if (!focused.current) {
          e.currentTarget.style.outline = '1px dashed rgba(0,106,255,0.3)'
          e.currentTarget.style.outlineOffset = '2px'
          e.currentTarget.style.borderRadius = '4px'
        }
      }}
      onMouseLeave={(e: React.MouseEvent<HTMLElement>) => {
        if (!focused.current) {
          e.currentTarget.style.outline = 'none'
          e.currentTarget.style.outlineOffset = '0'
          e.currentTarget.style.borderRadius = ''
        }
      }}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !multiline) {
          e.preventDefault()
          ;(e.target as HTMLElement).blur()
        }
        if (e.key === 'Escape') (e.target as HTMLElement).blur()
      }}
      onPaste={(e: React.ClipboardEvent) => {
        e.preventDefault()
        document.execCommand('insertText', false, e.clipboardData.getData('text/plain'))
      }}
      onClick={(e: React.MouseEvent) => e.stopPropagation()}
    >
      {value}
    </Tag>
  )
}
