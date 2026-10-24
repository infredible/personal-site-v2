import { ETH_TO_USDC, PRICE_MOVE, USDC_TO_ETH, reviewScenario, type ReviewScenario } from '../review'
import { ISLAND_PRESENTATIONS, type IslandPresentation } from './useIslandPresentation'

// Named island states, shared by the showcase's preset menu and its canvas.

export interface IslandPreset extends ReviewScenario {
  id: string
  label: string
  description: string
  /** Where the island starts, when not the phase's resting presentation. */
  presentation?: IslandPresentation
}

const { EXPANDED, SIGNED, DECLINED } = ISLAND_PRESENTATIONS

export const ISLAND_PRESETS: IslandPreset[] = [
  {
    id: 'review',
    label: 'Review',
    description: 'The review sheet; the island is at rest.',
    ...reviewScenario(ETH_TO_USDC, 'review'),
  },
  {
    id: 'review-approval',
    label: 'Review (needs approval)',
    description: 'An ERC-20 input: the approval rides the same Face ID as the swap.',
    ...reviewScenario(USDC_TO_ETH, 'review'),
  },
  {
    id: 'face-id',
    label: 'Face ID',
    description: 'One scan signs the swap (and its approval, if it needs one).',
    ...reviewScenario(ETH_TO_USDC, 'sign'),
  },
  {
    id: 'signed',
    label: 'Signed',
    description: 'Face ID’s check; the sheet goes, the island takes the swap.',
    ...reviewScenario(ETH_TO_USDC, 'pending'),
    presentation: SIGNED,
  },
  {
    id: 'compact',
    label: 'Swapping · compact',
    description: 'The swap as a Live Activity: the pair and a ring, either side of the sensor.',
    ...reviewScenario(ETH_TO_USDC, 'pending'),
  },
  {
    id: 'expanded',
    label: 'Swapping · expanded',
    description: 'Tapped open: the step, the ETA, the conversion and the steps bar.',
    ...reviewScenario(ETH_TO_USDC, 'pending'),
    presentation: EXPANDED,
  },
  {
    id: 'success',
    label: 'Swap complete',
    description: 'The island opens on its own with the receipt, then folds away.',
    ...reviewScenario(ETH_TO_USDC, 'success'),
  },
  {
    id: 'rejected',
    label: 'Face ID cancelled',
    description: 'The island shakes; the sheet stays, with Try again. Nothing was sent.',
    ...reviewScenario(ETH_TO_USDC, 'rejected'),
    presentation: DECLINED,
  },
  {
    id: 'price-updated',
    label: 'Price updated',
    description: 'The quote moved while reviewing: the sheet asks first, the island waits.',
    ...reviewScenario(ETH_TO_USDC, 'review', { updatedOutput: ETH_TO_USDC.outputAmount * PRICE_MOVE }),
  },
]

export function getIslandPreset(id: string): IslandPreset | undefined {
  return ISLAND_PRESETS.find((p) => p.id === id)
}
