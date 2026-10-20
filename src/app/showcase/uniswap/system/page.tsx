import type { Metadata } from 'next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { UniswapScope, uniswapScopeClassName } from '@/components/uniswap'
import { cn } from '@/lib/utils'
import { ComponentGallery } from '../_components/ComponentGallery'
import { ColorSwatch, TypeSample } from '../_components/TokenReadouts'
import { colorGroups, radii, shadcnBridge, shadows, spacing, typeScale } from '../_lib/tokens'

export const metadata: Metadata = {
  title: 'Design system',
  description: 'Uniswap design tokens ported to Tailwind and shadcn.',
}

const sections = [
  { id: 'color', label: 'Color' },
  { id: 'type', label: 'Typography' },
  { id: 'radius', label: 'Radius' },
  { id: 'spacing', label: 'Spacing' },
  { id: 'shadow', label: 'Shadow' },
  { id: 'components', label: 'Components' },
  { id: 'shadcn', label: 'shadcn bridge' },
]

function Section({ id, title, description, children }: {
  id: string
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-uni-24 flex flex-col gap-uni-24">
      <div className="flex flex-col gap-uni-4">
        <h2 className="text-heading3 text-neutral1">{title}</h2>
        {description && <p className="text-body2 text-neutral2 max-w-[560px]">{description}</p>}
      </div>
      {children}
    </section>
  )
}

export default function DesignSystemPage() {
  return (
    <UniswapScope fullPage>
      <main className="mx-auto max-w-[1040px] px-uni-16 sm:px-uni-24 pt-uni-60 pb-uni-60 sm:pt-[96px] flex flex-col gap-uni-60">
        <header className="flex flex-col gap-uni-12">
          <span className="text-body3 text-accent1">Uniswap recreation</span>
          <h1 className="text-heading2 sm:text-heading1 text-neutral1">Design system</h1>
          <p className="text-body1 text-neutral2 max-w-[620px]">
            Tokens ported from Uniswap&rsquo;s open-source interface, exposed as Tailwind utilities and mapped
            onto shadcn&rsquo;s variables. Values on this page are read live from the CSS, and follow the
            site&rsquo;s light and dark theme.
          </p>
          <nav className="flex flex-wrap gap-uni-8 pt-uni-8">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="rounded-uni-full bg-surface2 hover:bg-surface2Hovered border border-surface3 px-uni-12 py-uni-6 text-buttonLabel4 text-neutral2 hover:text-neutral1 transition-colors"
              >
                {s.label}
              </a>
            ))}
          </nav>
        </header>

        <Section id="color" title="Color" description="Semantic tokens from Uniswap's Spore palette. Translucent tokens are shown over surface1.">
          <div className="flex flex-col gap-uni-40">
            {colorGroups.map((group) => (
              <div key={group.name} className="flex flex-col gap-uni-16">
                <div className="flex flex-col gap-uni-2">
                  <h3 className="text-subheading1 text-neutral1">{group.name}</h3>
                  <p className="text-body3 text-neutral2">{group.description}</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-uni-16">
                  {group.tokens.map((token) => (
                    <ColorSwatch key={token} name={token} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section
          id="type"
          title="Typography"
          description="Uniswap's web type scale, with book (485) and medium (535) weights. Set in Inter as a stand-in for Basel Grotesk."
        >
          <div className="rounded-uni-20 border border-surface3 px-uni-20">
            {typeScale.map((t) => (
              <TypeSample key={t.name} name={t.name} className={t.className} />
            ))}
          </div>
        </Section>

        <Section id="radius" title="Radius">
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-uni-16">
            {radii.map((r) => (
              <div key={r.name} className="flex flex-col gap-uni-8">
                <div className={cn('aspect-square bg-surface2 border border-surface3', r.className)} />
                <span className="text-body4 text-neutral2">{r.name}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section id="spacing" title="Spacing" description="Absolute px values, independent of the site's fluid root font size.">
          <div className="flex flex-col gap-uni-8">
            {spacing.map((s) => (
              <div key={s.name} className="grid grid-cols-[120px_40px_1fr] items-center gap-uni-12">
                <span className="text-body3 text-neutral1">{s.name}</span>
                <span className="text-body4 font-uni-mono text-neutral2">{s.px}</span>
                <div className={cn('h-uni-12 rounded-uni-4 bg-accent1', s.className)} />
              </div>
            ))}
          </div>
        </Section>

        <Section id="shadow" title="Shadow">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-uni-24 rounded-uni-24 bg-surface2 p-uni-24">
            {shadows.map((s) => (
              <div
                key={s.name}
                className={cn('flex h-[120px] items-end rounded-uni-20 bg-surface1 p-uni-16', s.className)}
              >
                <span className="text-body3 text-neutral2">{s.name}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section
          id="components"
          title="Components"
          description="Uniswap components in src/components/uniswap. Each one composes a shadcn primitive or the Radix primitive under it, and works inline in any page inside <UniswapScope>."
        >
          <ComponentGallery />
        </Section>

        <Section
          id="shadcn"
          title="shadcn bridge"
          description="Inside the .uniswap scope, shadcn's variables point at Uniswap tokens, so stock components from components/ui render in Uniswap's colors with no edits. Portal content (popovers, tooltips) takes uniswapScopeClassName, since it renders outside the scope wrapper."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-uni-24">
            <div className="rounded-uni-20 border border-surface3 overflow-hidden">
              {shadcnBridge.map((row) => (
                <div
                  key={row.shadcn}
                  className="flex items-center justify-between gap-uni-12 px-uni-16 py-uni-12 border-b border-surface3 last:border-b-0"
                >
                  <code className="text-body4 font-uni-mono text-neutral2">{row.shadcn}</code>
                  <span className="text-body3 text-neutral1">{row.uniswap}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-uni-16 rounded-uni-20 bg-surface2 p-uni-24">
              <span className="text-body3 text-neutral2">Stock shadcn components</span>
              <div className="flex flex-wrap gap-uni-12">
                <Button>Button</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="destructive">Destructive</Button>
              </div>
              <Input placeholder="Stock shadcn Input" />
              <div className="flex flex-wrap gap-uni-12">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline">Open popover</Button>
                  </PopoverTrigger>
                  <PopoverContent className={cn(uniswapScopeClassName, 'flex flex-col gap-uni-4')}>
                    <span className="text-subheading2 text-foreground">Popover</span>
                    <span className="text-body3 text-muted-foreground">
                      Unmodified components/ui/popover, themed by the scope.
                    </span>
                  </PopoverContent>
                </Popover>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost">Hover for tooltip</Button>
                  </TooltipTrigger>
                  <TooltipContent className={uniswapScopeClassName}>Unmodified components/ui/tooltip</TooltipContent>
                </Tooltip>
              </div>
              <div className="flex flex-wrap gap-uni-8 pt-uni-8">
                <span className="rounded-md bg-primary text-primary-foreground px-uni-12 py-uni-6 text-body4">bg-primary</span>
                <span className="rounded-md bg-secondary text-secondary-foreground px-uni-12 py-uni-6 text-body4">bg-secondary</span>
                <span className="rounded-md bg-muted text-muted-foreground border px-uni-12 py-uni-6 text-body4">bg-muted</span>
                <span className="rounded-md bg-destructive text-white px-uni-12 py-uni-6 text-body4">bg-destructive</span>
              </div>
            </div>
          </div>
        </Section>
      </main>
    </UniswapScope>
  )
}
