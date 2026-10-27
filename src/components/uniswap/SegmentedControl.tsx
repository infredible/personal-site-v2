'use client'

import * as React from 'react'
import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group'
import { cva } from 'class-variance-authority'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

/*
 * Uniswap's SegmentedControl (@universe/mycelium segmented-control-compat),
 * e.g. the chart time-period selector. Radix ToggleGroup supplies keyboard
 * and ARIA behavior; the active pill slides between options.
 */

type Size = 'small' | 'default' | 'large'

const container = cva('inline-flex items-center overflow-hidden p-uni-4 border', {
  variants: {
    size: {
      small: 'min-h-[30px] gap-uni-6 rounded-uni-16',
      default: 'min-h-[34px] gap-uni-8 rounded-uni-20',
      large: 'min-h-[44px] gap-uni-12 rounded-uni-24',
    },
    outlined: {
      true: 'border-surface3',
      false: 'border-transparent',
    },
    fullWidth: {
      true: 'flex w-full',
      false: 'w-fit',
    },
  },
})

const option = cva(
  [
    'group/option relative flex items-center justify-center rounded-uni-full cursor-pointer select-none',
    '[font-weight:535] text-neutral2 hover:text-neutral1 data-[state=on]:text-neutral1',
    'transition-colors duration-100 outline-none focus-visible:ring-1 focus-visible:ring-neutral3',
    'disabled:cursor-default disabled:text-neutral3 data-[state=on]:disabled:text-neutral2',
  ],
  {
    variants: {
      size: {
        small: 'min-h-[20px] px-uni-6 py-uni-2 text-[12px] leading-[13.8px]',
        default: 'min-h-[24px] px-uni-8 py-uni-2 text-[12px] leading-[13.8px]',
        large: 'min-h-[36px] px-uni-12 py-uni-8 text-[14px] leading-[16.1px]',
      },
      fullWidth: {
        true: 'flex-1',
        false: '',
      },
    },
  },
)

interface SegmentedControlOption<T extends string> {
  value: T
  label: React.ReactNode
  disabled?: boolean
  /** Restyles the sliding pill while this option is selected (e.g. a tinted Live option) */
  indicatorClassName?: string
}

interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedControlOption<T>[]
  value: T
  onValueChange: (value: T) => void
  size?: Size
  outlined?: boolean
  fullWidth?: boolean
  className?: string
  'aria-label'?: string
}

function SegmentedControl<T extends string>({
  options,
  value,
  onValueChange,
  size = 'default',
  outlined = true,
  fullWidth = false,
  className,
  ...props
}: SegmentedControlProps<T>) {
  // Unique per instance so multiple controls on a page animate independently
  const indicatorId = React.useId()
  const reduceMotion = useReducedMotion()

  return (
    <ToggleGroupPrimitive.Root
      type="single"
      value={value}
      // Radix emits '' when the active item is pressed again; keep one option selected
      onValueChange={(next) => next && onValueChange(next as T)}
      className={cn(container({ size, outlined, fullWidth }), className)}
      {...props}
    >
      {options.map((opt) => (
        <ToggleGroupPrimitive.Item
          key={opt.value}
          value={opt.value}
          disabled={opt.disabled}
          className={option({ size, fullWidth })}
        >
          {opt.value === value && (
            <motion.span
              layoutId={indicatorId}
              className={cn(
                'absolute inset-0 rounded-uni-full bg-surface3 group-hover/option:bg-surface3Hovered',
                opt.indicatorClassName,
              )}
              transition={reduceMotion ? { duration: 0 } : { type: 'spring', bounce: 0.15, duration: 0.3 }}
            />
          )}
          <span className="relative">{opt.label}</span>
        </ToggleGroupPrimitive.Item>
      ))}
    </ToggleGroupPrimitive.Root>
  )
}

export { SegmentedControl }
export type { SegmentedControlOption, SegmentedControlProps }
