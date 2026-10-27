/*
 * Number formatting for the Explore tables, ported from Uniswap's formatter
 * rules (packages/utilities/src/format/localeBasedFormats.ts). Each function is
 * one NumberType; rules apply in order, first match wins (upper bounds are
 * exclusive), en-US only.
 *
 *   FiatTokenPrice      Price column
 *   FiatTokenStats      FDV, Volume, TVL, 1D vol, 30D vol
 *   TokenQuantityStats  1D vol/TVL
 *   Percentage          1H, 1D, Pool APR (whole, or two decimals)
 *   fee tier            up to four decimals, trailing zeros trimmed
 */

const PLACEHOLDER = '-'

const usd = (options: Intl.NumberFormatOptions) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', ...options })

const NO_DECIMALS_USD = usd({ minimumFractionDigits: 0, maximumFractionDigits: 0 })
const TWO_DECIMALS_USD = usd({ minimumFractionDigits: 2, maximumFractionDigits: 2 })
const THREE_SIG_FIGS_USD = usd({ minimumSignificantDigits: 3, maximumSignificantDigits: 3 })
const SMALLEST_USD = usd({ maximumSignificantDigits: 1 })
const SHORTHAND_TWO_DECIMALS_USD = usd({ notation: 'compact', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const SHORTHAND_ONE_DECIMAL_USD = usd({ notation: 'compact', minimumFractionDigits: 1, maximumFractionDigits: 1 })
const SHORTHAND_NO_DECIMALS_USD = usd({ notation: 'compact', minimumFractionDigits: 0, maximumFractionDigits: 0 })

const TWO_DECIMALS = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const SHORTHAND_ONE_DECIMAL = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

const PERCENT_NO_DECIMALS = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 0 })
const PERCENT_TWO_DECIMALS = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const PERCENT_FOUR_DECIMALS_NO_TRAILING = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 0,
  maximumFractionDigits: 4,
})

const missing = (value: number | null | undefined): value is null | undefined =>
  value === null || value === undefined || !Number.isFinite(value)

/** Price: $0, <$0.00000001, $0.123 (3 sig figs under $1), $1,234.56, $1.23M, >$999T */
export function formatFiatTokenPrice(value: number | null | undefined): string {
  if (missing(value)) return PLACEHOLDER
  if (value === 0) return NO_DECIMALS_USD.format(0)
  if (value < 0.00000001) return `<${SMALLEST_USD.format(0.00000001)}`
  if (value < 1) return THREE_SIG_FIGS_USD.format(value)
  if (value < 1e6) return TWO_DECIMALS_USD.format(value)
  if (value < 1e15) return SHORTHAND_TWO_DECIMALS_USD.format(value)
  return '>$999T'
}

/** Stats: - for 0 (no data), <$0.01, $12.34 under $1K, then $12.3K / $4.5M / $1.2B; capped at >$999,999T */
export function formatFiatTokenStats(value: number | null | undefined): string {
  if (missing(value) || value === 0) return PLACEHOLDER
  if (value < 0.01) return `<${TWO_DECIMALS_USD.format(0.01)}`
  if (value < 1000) return TWO_DECIMALS_USD.format(value)
  if (value < 999_999.95e12) return SHORTHAND_ONE_DECIMAL_USD.format(value)
  return `>${SHORTHAND_NO_DECIMALS_USD.format(999_999e12)}`
}

/** Unitless stats (1D vol/TVL): - for 0, <0.01, 0.45 under 1K, then 12.3K */
export function formatTokenQuantityStats(value: number | null | undefined): string {
  if (missing(value) || value === 0) return PLACEHOLDER
  if (value < 0.01) return `<${TWO_DECIMALS.format(0.01)}`
  if (value < 1000) return TWO_DECIMALS.format(value)
  return SHORTHAND_ONE_DECIMAL.format(value)
}

/**
 * Uniswap's WholeOrTwoDecimalsPercentages: 5%, 1.23%, 0.40%. Takes a fraction
 * (0.0123 = 1.23%); - when missing.
 */
export function formatPercent(fraction: number | null | undefined): string {
  if (missing(fraction)) return PLACEHOLDER
  const parts = PERCENT_TWO_DECIMALS.formatToParts(fraction)
  const decimals = parts.find((part) => part.type === 'fraction')?.value
  const whole = decimals === undefined || /^0+$/.test(decimals)
  return whole ? PERCENT_NO_DECIMALS.format(fraction) : PERCENT_TWO_DECIMALS.format(fraction)
}

/** Fee tier, NoTrailingFourDecimalsPercentages: 0.0005 → 0.05%, 0.003 → 0.3%, 0.01 → 1% */
export function formatFeeTier(fee: number): string {
  return PERCENT_FOUR_DECIMALS_NO_TRAILING.format(fee)
}
