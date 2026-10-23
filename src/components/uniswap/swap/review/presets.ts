import { parseAmount } from '../format'
import { mockQuote } from '../presets'
import { DEFAULT_SLIPPAGE, TOKENS } from '../tokens'
import type { Token } from '../types'
import type { ReviewFlowState, ReviewPhase, ReviewTrade } from './useReviewFlow'

// Named review states, shared by the showcase's preset menu and its canvas.

export interface ReviewScenario {
  trade: ReviewTrade
  state: ReviewFlowState
}

function trade(input: Token, output: Token, amount: number) {
  const { quote, outputAmount } = mockQuote(input, output, amount)
  return {
    trade: { input: { token: input, amount }, output: { token: output }, quote, slippage: DEFAULT_SLIPPAGE },
    outputAmount: parseAmount(outputAmount),
  }
}

/** 1 ETH → USDC: no approval needed (native ETH). */
export const ETH_TO_USDC = trade(TOKENS.ETH, TOKENS.USDC, 1)
/** 2,500 USDC → ETH: an ERC-20 input, so it needs an approval first. */
export const USDC_TO_ETH = trade(TOKENS.USDC, TOKENS.ETH, 2500)

/** The re-quote the "Price updated" state shows: 0.42% less out. */
export const PRICE_MOVE = 1 - 0.0042

export function reviewScenario(
  base: typeof ETH_TO_USDC,
  phase: ReviewPhase,
  overrides: Partial<ReviewFlowState> = {},
): ReviewScenario {
  const needsApproval = base.trade.input.token.symbol !== 'ETH'
  const pastApproval = phase === 'sign' || phase === 'pending' || phase === 'success'
  return {
    trade: base.trade,
    state: {
      phase,
      needsApproval,
      approved: needsApproval && pastApproval,
      failedStep: phase === 'rejected' ? 'sign' : null,
      acceptedOutput: base.outputAmount,
      updatedOutput: null,
      ...overrides,
    },
  }
}

/** A scenario reset to its review state: what Replay and Done return to. */
export function atReview({ trade, state }: ReviewScenario): ReviewScenario {
  return {
    trade,
    state: {
      ...state,
      phase: 'review',
      approved: false,
      failedStep: null,
      updatedOutput: null,
      acceptedOutput: state.updatedOutput ?? state.acceptedOutput,
    },
  }
}

export interface ReviewPreset extends ReviewScenario {
  id: string
  label: string
  description: string
}

export const REVIEW_PRESETS: ReviewPreset[] = [
  {
    id: 'review',
    label: 'Review',
    description: 'The trade, its details, and one button.',
    ...reviewScenario(ETH_TO_USDC, 'review'),
  },
  {
    id: 'review-approval',
    label: 'Review (needs approval)',
    description: 'An ERC-20 input: a one-time approval runs before the swap.',
    ...reviewScenario(USDC_TO_ETH, 'review'),
  },
  {
    id: 'approve',
    label: 'Approve in wallet',
    description: 'Waiting on the approval signature.',
    ...reviewScenario(USDC_TO_ETH, 'approve'),
  },
  {
    id: 'wallet',
    label: 'Confirm in wallet',
    description: 'Waiting on the swap signature.',
    ...reviewScenario(ETH_TO_USDC, 'sign'),
  },
  {
    id: 'pending',
    label: 'Pending',
    description: 'Signed and submitted; waiting on the chain.',
    ...reviewScenario(ETH_TO_USDC, 'pending'),
  },
  {
    id: 'success',
    label: 'Success',
    description: 'Confirmed onchain.',
    ...reviewScenario(ETH_TO_USDC, 'success'),
  },
  {
    id: 'rejected',
    label: 'Rejected',
    description: 'The signature was declined in the wallet. Nothing was sent.',
    ...reviewScenario(ETH_TO_USDC, 'rejected'),
  },
  {
    id: 'price-updated',
    label: 'Price updated',
    description: 'The quote moved while reviewing; the new price needs accepting.',
    ...reviewScenario(ETH_TO_USDC, 'review', { updatedOutput: ETH_TO_USDC.outputAmount * PRICE_MOVE }),
  },
]

export function getReviewPreset(id: string): ReviewPreset | undefined {
  return REVIEW_PRESETS.find((p) => p.id === id)
}
