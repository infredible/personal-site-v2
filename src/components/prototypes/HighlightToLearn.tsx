'use client'

import { HighlightableContent } from '@/components/HighlightableContent';

export function HighlightToLearn() {
  return (
    <div className="prototype-container flex flex-col items-center p-8">
      
      {/* Content Card */}
      <div className="w-full max-w-2xl p-12 pb-8 bg-background rounded-xl border border-border shadow-xs">
        <HighlightableContent>
          <div className="prose prose-sm max-w-none">
            {/* <h4 className="text-lg font-medium mb-4 text-foreground">Understanding Uniswap v4</h4> */}
            <div className="text-base leading-relaxed text-foreground space-y-4">
              <p>
                Uniswap v4 transforms the protocol into a developer platform with unlimited customizability. It does this through hooks – modular plugins that allow developers to build custom logic for pools, swaps, fees, and LP positions.
              </p>
              <p>
                Over 150 hooks have already been developed, introducing everything from dynamic fees to automated liquidity management. By allowing developers to build and experiment directly on top of the protocol, hooks enable faster development cycles and stickier integrations. More hooks drive deeper liquidity and more swapping, which strengthen the network effects around the Uniswap Protocol.
              </p>
              <p>
                The ability for anyone to create hooks has already unlocked tons of creativity – with new features and experiments happening on top of the AMM. We can't wait to see how hook developers continue pushing the edges of DeFi with v4 now live.
              </p>
            </div>
          </div>
        </HighlightableContent>
      </div>

      {/* Caption */}
      <p className="text-sm text-muted-foreground max-w-xl text-left mt-8 leading-relaxed">
        Select any text above to see the highlight-to-learn feature in action. The component uses AI to provide contextual explanations for highlighted content - a pattern to be used for educational content and technical documentation.
      </p>
    </div>
  );
}
