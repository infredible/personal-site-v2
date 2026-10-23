import * as React from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import type { Token } from '../types'
import { AlertTriangleFilled, InfoCircleFilled } from '../../icons'

// Uniswap's real filled glyphs, re-exported for the overlay panels
export { AlertTriangleFilled, InfoCircleFilled }

/** Round token logo. Uniswap's TokenLogo defaults to 40px (icon40). */
export function TokenLogo({ token, size = 40, className }: { token: Token; size?: number; className?: string }) {
  return (
    <Image
      src={token.logo}
      alt=""
      width={size}
      height={size}
      unoptimized
      draggable={false}
      className={cn('shrink-0 rounded-uni-full select-none', className)}
      style={{ width: size, height: size }}
    />
  )
}

// Filled glyphs from Uniswap's icon set (InfoCircleFilled, AlertTriangleFilled); lucide only has outlines.



/** Uniswap's WarningMessage: triangle + body3 text in a status color. */
export function WarningMessage({
  tone,
  children,
  className,
}: {
  tone: 'warning' | 'critical'
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'flex items-center gap-uni-4 text-body3',
        tone === 'critical' ? 'text-statusCritical' : 'text-statusWarning',
        className,
      )}
    >
      <AlertTriangleFilled />
      {children}
    </span>
  )
}

/** 1px hairline in surface3, Uniswap's <Separator />. */
export function Separator({ className }: { className?: string }) {
  return <span aria-hidden className={cn('h-px min-w-0 flex-1 bg-surface3', className)} />
}
