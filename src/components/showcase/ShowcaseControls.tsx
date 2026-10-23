'use client'

import * as React from 'react'
import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group'
import { motion, useReducedMotion } from 'framer-motion'
import { ChevronDown, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/components/theme-provider'
import { cn } from '@/lib/utils'

/*
 * Site-styled controls for the showcase bar. These are site chrome: they use
 * the site's shadcn tokens (bg-input, text-muted-foreground, ...) and font,
 * never Uniswap tokens, and live outside any .uniswap scope. Visual idiom
 * follows the floating ThemeToggle / FloatingBackButton pills.
 */

const pillTransition = { type: 'spring', stiffness: 520, damping: 40, mass: 0.8 } as const

export interface SegmentOption<T extends string> {
  value: T
  label: string
  icon?: React.ReactNode
  /** Hide the text label (icon only); it stays as the accessible name. */
  iconOnly?: boolean
  /** Icon only below the `sm` breakpoint, to fit the mobile bar. */
  iconOnlyOnMobile?: boolean
}

interface SegmentedProps<T extends string> {
  options: SegmentOption<T>[]
  value: T
  onValueChange: (value: T) => void
  'aria-label': string
  className?: string
}

/** Single-select segmented control (Radix ToggleGroup: arrow keys move focus, Space/Enter select). */
export function Segmented<T extends string>({ options, value, onValueChange, className, ...props }: SegmentedProps<T>) {
  const pillId = React.useId()
  const reduceMotion = useReducedMotion()

  return (
    <ToggleGroupPrimitive.Root
      type="single"
      value={value}
      // Radix allows deselecting the active item; a segmented control always has a value
      onValueChange={(next) => next && onValueChange(next as T)}
      aria-label={props['aria-label']}
      className={cn('inline-flex shrink-0 items-center gap-0.5 rounded-full border border-input bg-input p-0.5', className)}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <ToggleGroupPrimitive.Item
            key={option.value}
            value={option.value}
            aria-label={option.iconOnly ? option.label : undefined}
            title={option.iconOnly ? option.label : undefined}
            className={cn(
              'relative flex h-7 cursor-pointer select-none items-center justify-center gap-1.5 rounded-full text-xs font-medium tracking-wide outline-none',
              'focus-visible:ring-2 focus-visible:ring-ring/60',
              option.iconOnly ? 'w-7' : 'px-3',
              option.iconOnlyOnMobile && 'max-sm:w-7 max-sm:px-0',
              active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            {active && (
              <motion.span
                layoutId={pillId}
                transition={reduceMotion ? { duration: 0 } : pillTransition}
                className="absolute inset-0 rounded-full bg-secondary shadow-sm"
                aria-hidden
              />
            )}
            <span className="relative flex items-center gap-1.5 [&_svg]:size-3.5 [&_svg]:shrink-0">
              {option.icon}
              {!option.iconOnly && (
                <span className={cn(option.iconOnlyOnMobile && 'max-sm:sr-only')}>{option.label}</span>
              )}
            </span>
          </ToggleGroupPrimitive.Item>
        )
      })}
    </ToggleGroupPrimitive.Root>
  )
}

/** Pill button in the same idiom (e.g. Reset). */
export function BarButton({ className, ...props }: React.ComponentProps<'button'>) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-[calc(2rem+2px)] shrink-0 cursor-pointer select-none items-center gap-1.5 rounded-full border border-input bg-input px-3 text-xs font-medium tracking-wide text-muted-foreground',
        'outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 active:scale-[0.97] [&_svg]:size-3.5 [&_svg]:shrink-0',
        className,
      )}
      style={{ WebkitTapHighlightColor: 'transparent' }}
      {...props}
    />
  )
}

interface BarSelectProps<T extends string> {
  label: string
  options: { id: T; label: string }[]
  value: T
  onValueChange: (value: T) => void
  className?: string
}

/** Native select styled as a bar pill: keyboard and mobile pickers for free. */
export function BarSelect<T extends string>({ label, options, value, onValueChange, className }: BarSelectProps<T>) {
  return (
    <label className={cn('relative inline-flex h-[calc(2rem+2px)] shrink-0 items-center', className)}>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onValueChange(e.target.value as T)}
        className={cn(
          'h-full w-full cursor-pointer appearance-none truncate sm:w-auto sm:max-w-[12rem] rounded-full border border-input bg-input pl-3 pr-8 text-xs font-medium tracking-wide text-foreground',
          'outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
        )}
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute right-2.5 size-3.5 text-muted-foreground" />
    </label>
  )
}

function ThemeSwitchInner() {
  const { theme, setTheme } = useTheme()
  return (
    <Segmented
      aria-label="Theme"
      value={theme}
      onValueChange={setTheme}
      options={[
        { value: 'light', label: 'Light mode', icon: <Sun />, iconOnly: true },
        { value: 'dark', label: 'Dark mode', icon: <Moon />, iconOnly: true },
      ]}
    />
  )
}

/**
 * Site light/dark switch. ThemeProvider only provides its context after mount
 * (useTheme throws before), so this renders a same-size placeholder until then.
 */
export function ThemeSwitch() {
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  if (!mounted) return <div aria-hidden className="h-[calc(2rem+2px)] w-[calc(3.875rem+2px)] shrink-0 rounded-full border border-input bg-input" />
  return <ThemeSwitchInner />
}
