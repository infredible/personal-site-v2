import { COMMON_TOKENS, MOCK_WALLET, TOKENS } from '../swap/tokens'
import type { Token } from '../swap/types'
import type { FiatMethodId, PaymentMethod, PaymentMethodId, Provider } from './types'

// Mock data for the buy flow. Tokens, prices and balances are the swap's
// (swap/tokens.ts), so both recreations quote the same market.

export const PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'tokens', label: 'Tokens' },
  { id: 'apple-pay', label: 'Apple Pay' },
  { id: 'card', label: 'Credit Card' },
  { id: 'venmo', label: 'Venmo', image: '/showcase/buy/venmo.png' },
  { id: 'paypal', label: 'PayPal', image: '/showcase/buy/paypal.png' },
  { id: 'revolut', label: 'Revolut', image: '/showcase/buy/revolut.png' },
  { id: 'ach', label: 'ACH' },
  { id: 'swift', label: 'Swift' },
]

export const paymentMethod = (id: PaymentMethodId) => PAYMENT_METHODS.find((m) => m.id === id)!

/** The prototype's monogram colors: a stable hash of the name into ten hues */
const MONOGRAM_COLORS = ['#7950F2', '#4263EB', '#1C7ED6', '#1098AD', '#0CA678', '#37B24D', '#F59F00', '#F76707', '#E03131', '#AE3EC9']

function monogramColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0
  return MONOGRAM_COLORS[Math.abs(hash) % MONOGRAM_COLORS.length]
}

const provider = (name: string, limitUsd: number, markup: number, logo?: string): Provider => ({
  id: name.toLowerCase().replace(/\s+/g, '-'),
  name,
  logo,
  color: monogramColor(name),
  limitUsd,
  markup,
})

/** Every onramp, in the order the prototype lists them */
export const PROVIDERS: Provider[] = [
  provider('Coinbase Pay', 25_000, 0, '/showcase/buy/coinbase.svg'),
  provider('Topper', 5_000, 0.012),
  provider('Stripe', 10_000, 0.015, '/showcase/buy/stripe.svg'),
  provider('Transak', 12_000, 0.014),
  provider('Meso', 3_000, 0.015),
  provider('Unlimit', 15_000, 0.024),
  provider('MoonPay', 7_500, 0.026, '/showcase/buy/moonpay.png'),
  provider('Banxa', 8_500, 0.028),
  provider('Paybis', 4_000, 0.026),
  provider('Shift4', 2_000, 0.036),
]

export const PROVIDER = Object.fromEntries(PROVIDERS.map((p) => [p.id, p])) as Record<string, Provider>

/** Which onramps take each method (the prototype's subsets), cheapest first */
const METHOD_PROVIDERS: Record<FiatMethodId, Provider[]> = {
  'apple-pay': PROVIDERS,
  card: PROVIDERS,
  venmo: PROVIDERS.slice(0, 5),
  paypal: PROVIDERS.slice(2, 7),
  revolut: PROVIDERS.slice(1, 6),
  ach: PROVIDERS.slice(3, 8),
  swift: PROVIDERS.slice(4, 9),
}

export const providersFor = (method: FiatMethodId) =>
  [...METHOD_PROVIDERS[method]].sort((a, b) => a.markup - b.markup)

export const BALANCES = MOCK_WALLET.balances

/** Held tokens by value, most first */
export const YOUR_TOKENS: Token[] = Object.values(TOKENS)
  .filter((t) => (BALANCES[t.symbol] ?? 0) > 0)
  .sort((a, b) => (BALANCES[b.symbol] ?? 0) * b.priceUsd - (BALANCES[a.symbol] ?? 0) * a.priceUsd)

export const RECENT_TOKENS: Token[] = [TOKENS.UNI, TOKENS.LINK]

export const POPULAR_TOKENS: Token[] = [TOKENS.ETH, TOKENS.WBTC, TOKENS.USDC]

/** Tiles at the top of the receive sheet */
export const SUGGESTED_TOKENS: Token[] = COMMON_TOKENS

/** The prototype quotes a flat network cost once there's an amount */
export const NETWORK_COST_USD = 0.73

/** Mock latency of the network cost fetch after each edit */
export const NETWORK_COST_LATENCY_MS = 600

export const QUICK_AMOUNTS_USD = [100, 500] as const
