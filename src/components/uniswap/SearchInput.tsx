import * as React from 'react'
import { Search } from './icons'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/** Uniswap's search field (token selector, explore). Stock shadcn Input, restyled. */
function SearchInput({ className, ...props }: React.ComponentProps<typeof Input>) {
  return (
    <div className="relative w-full">
      <Search
        aria-hidden
        className="pointer-events-none absolute left-uni-12 top-1/2 size-uni-20 -translate-y-1/2 text-neutral2"
      />
      <Input
        type="search"
        className={cn(
          'h-uni-40 rounded-uni-full border-surface3 bg-surface2 dark:bg-surface2 pl-uni-40 pr-uni-16 shadow-none',
          'text-body2 md:text-body2 text-neutral1 placeholder:text-neutral3',
          'focus-visible:ring-0 focus-visible:border-surface3Hovered hover:border-surface3Hovered',
          '[&::-webkit-search-cancel-button]:appearance-none',
          className,
        )}
        {...props}
      />
    </div>
  )
}

export { SearchInput }
