import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/*
 * Uniswap's Button, ported from @universe/mycelium button-compat (compile.ts,
 * variantEmphasisHash.ts). Same API axes: variant × emphasis × size.
 *
 * Built on Radix Slot rather than components/ui/button: Uniswap's sizing,
 * colors, and press behavior replace every stock class, so wrapping would only
 * add overrides.
 */

type Variant = 'default' | 'branded' | 'critical' | 'warning'
type Emphasis = 'primary' | 'secondary' | 'tertiary' | 'text-only'

const COLORS: Record<Variant, Record<Emphasis, string>> = {
  default: {
    primary: 'bg-neutral1 hover:bg-neutral1Hovered text-surface1 focus-visible:outline-neutral3Hovered',
    secondary: 'bg-surface3 hover:bg-surface3Hovered text-neutral1 focus-visible:outline-neutral3Hovered',
    tertiary:
      'border-surface3 hover:border-surface3Hovered text-neutral1 hover:text-neutral1Hovered focus-visible:outline-neutral3Hovered',
    'text-only': 'text-neutral1 hover:text-neutral1Hovered focus-visible:outline-neutral3Hovered',
  },
  branded: {
    primary: 'bg-accent1 hover:bg-accent1Hovered text-white focus-visible:outline-accent1Hovered',
    secondary: 'bg-accent2 hover:bg-accent2Hovered text-accent1 hover:text-accent1Hovered focus-visible:outline-accent1Hovered',
    tertiary:
      'border-accent2 hover:border-accent2Hovered text-accent1 hover:text-accent1Hovered focus-visible:outline-accent1Hovered',
    'text-only': 'text-accent1 hover:text-accent1Hovered focus-visible:outline-accent1Hovered',
  },
  critical: {
    primary: 'bg-statusCritical hover:bg-statusCriticalHovered text-white focus-visible:outline-statusCriticalHovered',
    secondary:
      'bg-statusCritical2 hover:bg-statusCritical2Hovered text-statusCritical hover:text-statusCriticalHovered focus-visible:outline-statusCriticalHovered',
    tertiary:
      'border-statusCritical2 hover:border-statusCritical2Hovered text-statusCritical hover:text-statusCriticalHovered focus-visible:outline-statusCriticalHovered',
    'text-only': 'text-statusCritical hover:text-statusCriticalHovered focus-visible:outline-statusCriticalHovered',
  },
  warning: {
    primary: 'bg-statusWarning hover:bg-statusWarningHovered text-surface1 focus-visible:outline-statusWarningHovered',
    secondary:
      'bg-statusWarning2 hover:bg-statusWarning2Hovered text-statusWarning hover:text-statusWarningHovered focus-visible:outline-statusWarningHovered',
    tertiary:
      'border-statusWarning2 hover:border-statusWarning2Hovered text-statusWarning hover:text-statusWarningHovered focus-visible:outline-statusWarningHovered',
    'text-only': 'text-statusWarning hover:text-statusWarningHovered focus-visible:outline-statusWarningHovered',
  },
}

const uniButtonVariants = cva(
  [
    'relative inline-flex min-w-0 shrink-0 cursor-pointer items-center justify-center select-none',
    'border border-solid border-transparent bg-transparent',
    'whitespace-nowrap text-center [font-weight:535]',
    // Legacy 'fast' animation: 100ms, transform + color only; press scales to 0.98
    'transition-[transform,background-color,border-color,color] duration-100 ease-[cubic-bezier(0.17,0.67,0.45,1)]',
    'active:scale-[0.98]',
    'focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-solid',
    '[&_svg]:shrink-0',
    // Disabled replaces all variant styling, including tertiary's border
    'disabled:cursor-default disabled:pointer-events-none disabled:border-transparent disabled:bg-surface2 disabled:text-neutral2',
  ],
  {
    variants: {
      variant: { default: '', branded: '', critical: '', warning: '' },
      emphasis: { primary: '', secondary: '', tertiary: '', 'text-only': '' },
      // Frame padding/radius/gap and label type, as Uniswap web resolves them
      size: {
        xxsmall: 'gap-uni-4 rounded-uni-12 p-uni-6 text-[12px] leading-[13.8px] [&_svg]:size-[13.8px]',
        xsmall: 'gap-uni-4 rounded-uni-12 px-uni-12 py-uni-8 text-[12px] leading-[16.1px] [&_svg]:size-[16.1px]',
        small: 'gap-uni-8 rounded-uni-12 px-uni-12 py-uni-8 text-[14px] leading-[16.1px] [&_svg]:size-[16.1px]',
        medium: 'gap-uni-8 rounded-uni-16 px-uni-16 py-uni-12 text-[16px] leading-[20.7px] [&_svg]:size-[20.7px]',
        large: 'gap-uni-12 rounded-uni-20 px-uni-20 py-uni-16 text-[18px] leading-[20.7px] [&_svg]:size-[20.7px]',
      },
      fill: {
        true: 'w-full',
        false: '',
      },
    },
    compoundVariants: (Object.keys(COLORS) as Variant[]).flatMap((variant) =>
      (Object.keys(COLORS[variant]) as Emphasis[]).map((emphasis) => ({
        variant,
        emphasis,
        className: COLORS[variant][emphasis],
      })),
    ),
    defaultVariants: {
      variant: 'default',
      emphasis: 'primary',
      size: 'medium',
      fill: false,
    },
  },
)

/** Uniswap's SpinningLoader glyph: 10% track plus a quarter arc. */
function Spinner() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="animate-uni-spin">
      <path
        d="M12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3Z"
        stroke="currentColor"
        strokeOpacity="0.1"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M21 12C21 7.02944 16.9706 3 12 3" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

interface UniButtonProps extends React.ComponentProps<'button'>, VariantProps<typeof uniButtonVariants> {
  asChild?: boolean
  icon?: React.ReactNode
  iconPosition?: 'before' | 'after'
  /** Shows a spinner in place of the icon and puts the button in its disabled state. */
  loading?: boolean
}

function UniButton({
  className,
  variant,
  emphasis,
  size,
  fill,
  asChild = false,
  icon,
  iconPosition = 'before',
  loading = false,
  disabled,
  children,
  ...props
}: UniButtonProps) {
  const Comp = asChild ? Slot : 'button'
  const leading = loading ? <Spinner /> : icon

  return (
    <Comp
      data-slot="uni-button"
      className={cn(
        uniButtonVariants({ variant, emphasis, size, fill }),
        iconPosition === 'after' && 'flex-row-reverse',
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {leading}
          {children}
        </>
      )}
    </Comp>
  )
}

export { UniButton, uniButtonVariants }
export type { UniButtonProps }
