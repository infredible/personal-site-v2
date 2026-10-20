import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/** Small rounded label: fee tiers, protocol versions, price change, "Best price" tags. */
const pillVariants = cva(
  'inline-flex w-fit shrink-0 items-center gap-uni-4 whitespace-nowrap rounded-uni-full px-uni-8 py-uni-2 text-buttonLabel4 [&_svg]:size-uni-12 [&_svg]:shrink-0',
  {
    variants: {
      tone: {
        neutral: 'bg-surface3 text-neutral2',
        accent: 'bg-accent2 text-accent1',
        success: 'bg-statusSuccess2 text-statusSuccess',
        warning: 'bg-statusWarning2 text-statusWarning',
        critical: 'bg-statusCritical2 text-statusCritical',
      },
    },
    defaultVariants: {
      tone: 'neutral',
    },
  },
)

function Pill({ className, tone, ...props }: React.ComponentProps<'span'> & VariantProps<typeof pillVariants>) {
  return <span data-slot="uni-pill" className={cn(pillVariants({ tone }), className)} {...props} />
}

export { Pill, pillVariants }
