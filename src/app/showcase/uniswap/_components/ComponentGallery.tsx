'use client'

import { useState } from 'react'
import { ArrowDown, ChevronDown, InfoCircle } from '@/components/uniswap/icons'
import {
  Pill,
  SearchInput,
  Shimmer,
  TextSkeleton,
  TokenListSkeleton,
  SegmentedControl,
  UniButton,
  UniModal,
  UniModalContent,
  UniModalTrigger,
  UniTooltip,
} from '@/components/uniswap'
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command'
import { Command as CommandPrimitive } from 'cmdk'

const variants = ['default', 'branded', 'critical', 'warning'] as const
const emphases = ['primary', 'secondary', 'tertiary', 'text-only'] as const
const sizes = ['xxsmall', 'xsmall', 'small', 'medium', 'large'] as const

const periods = [
  { value: 'LIVE', label: 'Live' },
  { value: '1D', label: '1D' },
  { value: '1W', label: '1W' },
  { value: '1M', label: '1M' },
  { value: '1Y', label: '1Y' },
] as const

const swapModes = [
  { value: 'swap', label: 'Swap' },
  { value: 'limit', label: 'Limit' },
  { value: 'buy', label: 'Buy' },
  { value: 'sell', label: 'Sell' },
] as const

const tokens = [
  { symbol: 'ETH', name: 'Ethereum', color: '#627EEA' },
  { symbol: 'USDC', name: 'USD Coin', color: '#2775CA' },
  { symbol: 'UNI', name: 'Uniswap', color: '#FF37C7' },
  { symbol: 'WBTC', name: 'Wrapped Bitcoin', color: '#F09242' },
  { symbol: 'DAI', name: 'Dai Stablecoin', color: '#F5AC37' },
]

function Demo({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-uni-16 rounded-uni-20 border border-surface3 p-uni-20">
      <div className="flex flex-col gap-uni-2">
        <h3 className="text-subheading1 text-neutral1">{title}</h3>
        {description && <p className="text-body3 text-neutral2">{description}</p>}
      </div>
      {children}
    </div>
  )
}

export function ComponentGallery() {
  const [period, setPeriod] = useState<(typeof periods)[number]['value']>('1D')
  const [mode, setMode] = useState<(typeof swapModes)[number]['value']>('swap')
  const [loading, setLoading] = useState(false)

  return (
    <div className="flex flex-col gap-uni-24">
      <Demo title="UniButton" description="variant × emphasis, ported from Uniswap's button tables.">
        <div className="overflow-x-auto">
          <div className="grid min-w-[560px] grid-cols-[88px_repeat(4,1fr)] items-center gap-uni-12">
            <span />
            {emphases.map((e) => (
              <span key={e} className="text-body4 text-neutral2">
                {e}
              </span>
            ))}
            {variants.map((v) => (
              <div key={v} className="contents">
                <span className="text-body4 text-neutral2">{v}</span>
                {emphases.map((e) => (
                  <UniButton key={e} variant={v} emphasis={e} size="small">
                    Swap
                  </UniButton>
                ))}
              </div>
            ))}
          </div>
        </div>
      </Demo>

      <Demo title="Sizes and states">
        <div className="flex flex-wrap items-center gap-uni-12">
          {sizes.map((s) => (
            <UniButton key={s} size={s} variant="branded">
              {s}
            </UniButton>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-uni-12">
          <UniButton icon={<ArrowDown />} emphasis="secondary">
            With icon
          </UniButton>
          <UniButton icon={<ChevronDown />} iconPosition="after" emphasis="tertiary">
            Icon after
          </UniButton>
          <UniButton disabled>Disabled</UniButton>
          <UniButton variant="branded" loading={loading} onClick={() => setLoading(true)} onBlur={() => setLoading(false)}>
            {loading ? 'Confirming' : 'Click to load'}
          </UniButton>
        </div>
        <div className="max-w-[420px]">
          <UniButton variant="branded" size="large" fill>
            Review
          </UniButton>
        </div>
      </Demo>

      <Demo title="SegmentedControl" description="Radix ToggleGroup with a sliding indicator. Arrow keys move between options.">
        <div className="flex flex-col items-start gap-uni-16">
          <SegmentedControl aria-label="Chart period" options={periods} value={period} onValueChange={setPeriod} />
          <SegmentedControl
            aria-label="Swap mode"
            size="large"
            outlined={false}
            options={swapModes}
            value={mode}
            onValueChange={setMode}
          />
        </div>
      </Demo>

      <div className="grid grid-cols-1 gap-uni-24 md:grid-cols-2">
        <Demo title="Pill">
          <div className="flex flex-wrap gap-uni-8">
            <Pill>0.30%</Pill>
            <Pill>v3</Pill>
            <Pill tone="accent">Best price</Pill>
            <Pill tone="success">▲ 2.41%</Pill>
            <Pill tone="critical">▼ 1.07%</Pill>
            <Pill tone="warning">Low liquidity</Pill>
          </div>
        </Demo>

        <Demo title="UniTooltip">
          <div className="flex items-center gap-uni-8 text-body3 text-neutral2">
            Price impact
            <UniTooltip content="The impact your trade has on the market price of this pool.">
              <button type="button" className="text-neutral3 hover:text-neutral2 cursor-pointer" aria-label="About price impact">
                <InfoCircle className="size-uni-16" />
              </button>
            </UniTooltip>
          </div>
        </Demo>
      </div>

      <div className="grid grid-cols-1 gap-uni-24 md:grid-cols-2">
        <Demo title="UniModal + Command" description="Preview of the token selector: shadcn dialog parts and cmdk.">
          <UniModal>
            <UniModalTrigger asChild>
              <UniButton emphasis="secondary" icon={<ChevronDown />} iconPosition="after" className="self-start">
                Select token
              </UniButton>
            </UniModalTrigger>
            <UniModalContent title="Select a token">
              <Command className="bg-transparent gap-uni-12" loop>
                <CommandPrimitive.Input asChild>
                  <SearchInput placeholder="Search tokens" autoFocus />
                </CommandPrimitive.Input>
                <CommandList className="max-h-[320px]">
                  <CommandEmpty className="py-uni-24 text-center text-body3 text-neutral2">No tokens found</CommandEmpty>
                  <CommandGroup
                    heading="Tokens"
                    className="p-0 [&_[cmdk-group-heading]]:px-uni-8 [&_[cmdk-group-heading]]:pb-uni-8 [&_[cmdk-group-heading]]:text-body3 [&_[cmdk-group-heading]]:text-neutral2"
                  >
                    {tokens.map((t) => (
                      <CommandItem
                        key={t.symbol}
                        value={`${t.symbol} ${t.name}`}
                        className="gap-uni-12 rounded-uni-12 px-uni-8 py-uni-8 data-[selected=true]:bg-surface2"
                      >
                        <span className="size-uni-36 shrink-0 rounded-uni-full" style={{ background: t.color }} />
                        <span className="flex flex-col">
                          <span className="text-body2 text-neutral1">{t.name}</span>
                          <span className="text-body3 text-neutral2">{t.symbol}</span>
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </UniModalContent>
          </UniModal>
        </Demo>

        <Demo
          title="Skeleton"
          description="Uniswap's loaders: TextSkeleton takes the size of the text it replaces; Shimmer sweeps a gradient mask over its children."
        >
          <div className="flex flex-col gap-uni-12">
            <Shimmer className="flex flex-col items-start gap-uni-4">
              <TextSkeleton placeholder="1,699.24" className="text-heading2" />
              <TextSkeleton placeholder="$1,699.24" className="text-body3" />
            </Shimmer>
            <TokenListSkeleton rows={3} withValue className="-mx-uni-8" />
          </div>
        </Demo>
      </div>
    </div>
  )
}
