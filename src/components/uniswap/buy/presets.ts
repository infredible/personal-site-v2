import { TOKENS } from '../swap/tokens'
import { BALANCES, NETWORK_COST_USD, PROVIDER } from './data'
import type { BuyFormState, BuySheetState } from './types'

/** A named starting point: the form, and the sheet if it starts open */
export interface BuyPreset {
  id: string
  label: string
  state: BuyFormState
  sheet?: BuySheetState
}

const base: BuyFormState = {
  amount: '0',
  denomination: 'usd',
  pay: { kind: 'token', token: TOKENS.USDC },
  receive: TOKENS.UNI,
  flipped: false,
  networkCost: { status: 'idle' },
  balances: BALANCES,
}

const ready = { status: 'ready', usd: NETWORK_COST_USD } as const

const applePay = { kind: 'fiat', method: 'apple-pay', provider: PROVIDER['coinbase-pay'] } as const

const closedSheet: BuySheetState = { open: false, side: 'pay', method: 'tokens', query: '' }

export const BUY_PRESETS: BuyPreset[] = [
  { id: 'empty', label: 'Empty', state: base },
  { id: 'amount', label: 'Amount entered', state: { ...base, amount: '125', networkCost: ready } },
  { id: 'in-token', label: 'In UNI', state: { ...base, amount: '12.5', denomination: 'token', networkCost: ready } },
  { id: 'apple-pay', label: 'Apple Pay', state: { ...base, pay: applePay, amount: '250', networkCost: ready } },
  { id: 'not-enough', label: 'Not enough USDC', state: { ...base, amount: '5000', networkCost: ready } },
  {
    id: 'over-limit',
    label: 'Over provider limit',
    state: { ...base, pay: { kind: 'fiat', method: 'venmo', provider: PROVIDER.topper }, amount: '6000', networkCost: ready },
  },
  { id: 'sheet-tokens', label: 'Sheet · Tokens', state: base, sheet: { ...closedSheet, open: true } },
  {
    id: 'sheet-providers',
    label: 'Sheet · Apple Pay',
    state: { ...base, amount: '125', networkCost: ready },
    sheet: { ...closedSheet, open: true, method: 'apple-pay' },
  },
  { id: 'sheet-receive', label: 'Sheet · Receive', state: base, sheet: { ...closedSheet, open: true, side: 'receive' } },
]

export const getBuyPreset = (id: string | undefined) => BUY_PRESETS.find((p) => p.id === id) ?? BUY_PRESETS[0]

export const CLOSED_SHEET = closedSheet
