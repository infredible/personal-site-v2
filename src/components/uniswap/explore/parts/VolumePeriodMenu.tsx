'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Check, ChevronDown } from '../../icons'
import { UniMenu, UniMenuContent, UniMenuItem, UniMenuTrigger } from '../../UniMenu'
import type { ExploreTimePeriod } from '../types'
import { useForcedTheme } from './useForcedTheme'

/*
 * The Volume column's time period (production: VolumeTimeFrameSelector, a
 * filter-bar dropdown). Here it sits in the Volume header, after the sort
 * label, since it changes that column alone: a small "1D ⌄" trigger opening
 * "1H volume" … "1Y volume" with an accent1 check on the selected one.
 * Production also offers "All time" (the mock data has no all-time volume).
 * The narrow layout's sort menu carries the same choice inline (Table.tsx).
 */

export const EXPLORE_TIME_PERIODS: ExploreTimePeriod[] = ['1H', '1D', '1W', '1M', '1Y']

export function VolumePeriodMenu({
  value,
  onValueChange,
  className,
}: {
  value: ExploreTimePeriod
  onValueChange: (period: ExploreTimePeriod) => void
  className?: string
}) {
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const [theme, readTheme] = useForcedTheme(triggerRef)
  return (
    <UniMenu modal={false} onOpenChange={(open) => open && readTheme()}>
      <UniMenuTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          aria-label={`Volume period, ${value}`}
          className={cn(
            // Negative margins: a 26px hit area without growing the 42px header row
            '-my-uni-4 -mr-uni-4 inline-flex h-[26px] shrink-0 cursor-pointer items-center gap-uni-2 rounded-uni-8 pr-uni-2 pl-uni-6',
            'text-body3 whitespace-nowrap text-neutral2 outline-none select-none',
            'transition-colors duration-100 ease-in-out hover:bg-surface3 hover:text-neutral1 data-[state=open]:bg-surface3 data-[state=open]:text-neutral1',
            'focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent1',
            className,
          )}
        >
          {value}
          <ChevronDown aria-hidden className="size-uni-16" />
        </button>
      </UniMenuTrigger>
      <UniMenuContent data-theme={theme} align="end" aria-label="Volume period" className="min-w-[160px]">
        {EXPLORE_TIME_PERIODS.map((period) => (
          <UniMenuItem
            key={period}
            role="menuitemradio"
            aria-checked={period === value}
            onSelect={() => onValueChange(period)}
          >
            <span className="flex-1">{period} volume</span>
            {period === value && <Check className="size-uni-16 text-accent1" />}
          </UniMenuItem>
        ))}
      </UniMenuContent>
    </UniMenu>
  )
}
