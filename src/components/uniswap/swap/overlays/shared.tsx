import * as React from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import type { Token } from '../types'

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

export function InfoCircleFilled({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn('size-uni-16 shrink-0', className)}>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0-20Zm0 4.25a1.25 1.25 0 1 1 0 2.5a1.25 1.25 0 1 1 0-2.5ZM11 10.5h2V17h-2Z"
      />
    </svg>
  )
}

export function AlertTriangleFilled({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn('size-uni-16 shrink-0', className)}>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M10.27 3.5a2 2 0 0 1 3.46 0l8.05 13.95a2 2 0 0 1-1.73 3.05H3.95a2 2 0 0 1-1.73-3.05ZM11 8.75h2v5.5h-2Zm1 7a1.25 1.25 0 1 1 0 2.5a1.25 1.25 0 1 1 0-2.5Z"
      />
    </svg>
  )
}

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
