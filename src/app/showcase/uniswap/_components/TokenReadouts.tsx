'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { useThemeVersion } from './useThemeVersion'

/**
 * Swatch for a color token. The value shown is read from the live CSS
 * variable, so theme.css stays the single source of truth.
 */
export function ColorSwatch({ name }: { name: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [value, setValue] = useState('')
  const themeVersion = useThemeVersion()

  useLayoutEffect(() => {
    if (!ref.current) return
    setValue(getComputedStyle(ref.current).getPropertyValue(`--uni-${name}`).trim())
  }, [name, themeVersion])

  return (
    <div ref={ref} className="flex flex-col gap-uni-8">
      <div
        className="h-uni-60 rounded-uni-12 border border-surface3"
        style={{ background: `var(--uni-${name})` }}
      />
      <div className="flex flex-col gap-uni-2">
        <span className="text-body3 text-neutral1">{name}</span>
        <span className={cn('text-body4 font-uni-mono', value ? 'text-neutral2' : 'text-statusCritical')}>
          {value || 'missing'}
        </span>
      </div>
    </div>
  )
}

/** Renders a type sample and reads back its computed size, line height, and weight. */
export function TypeSample({ name, className }: { name: string; className: string }) {
  const ref = useRef<HTMLParagraphElement>(null)
  const [spec, setSpec] = useState('')
  const themeVersion = useThemeVersion()

  useLayoutEffect(() => {
    if (!ref.current) return
    const style = getComputedStyle(ref.current)
    setSpec(`${parseFloat(style.fontSize)} / ${parseFloat(style.lineHeight)} · ${style.fontWeight}`)
  }, [className, themeVersion])

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] items-baseline gap-uni-4 sm:gap-uni-24 py-uni-16 border-b border-surface3 last:border-b-0">
      <div className="flex flex-col gap-uni-2">
        <span className="text-body3 text-neutral1">{name}</span>
        <span className="text-body4 font-uni-mono text-neutral2">{spec}</span>
      </div>
      <p ref={ref} className={cn(className, 'text-neutral1 whitespace-nowrap overflow-x-clip')}>
        Swap anytime, anywhere.
      </p>
    </div>
  )
}
