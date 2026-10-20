// Amount-input helpers shared by the swap parts (and usable by SwapBox).

/**
 * Normalizes typed text into a decimal string, the way Uniswap's AmountInput
 * does: commas become the decimal point, anything else non-numeric is dropped,
 * only the first dot is kept, a leading dot gets a 0, leading zeros collapse,
 * and decimals are capped at the token's precision.
 */
export function sanitizeAmountInput(raw: string, maxDecimals = 18): string {
  let value = raw.replace(/,/g, '.').replace(/[^0-9.]/g, '')

  const firstDot = value.indexOf('.')
  if (firstDot !== -1) {
    const whole = value.slice(0, firstDot)
    const fraction = value.slice(firstDot + 1).replace(/\./g, '').slice(0, Math.max(0, maxDecimals))
    value = maxDecimals > 0 ? `${whole}.${fraction}` : whole
  }

  if (value.startsWith('.')) value = `0${value}`
  // "007" -> "7", "00.5" -> "0.5", but keep a lone "0"
  value = value.replace(/^0+(?=\d)/, '')

  return value
}

/**
 * Formats a number as an editable amount string (no grouping separators),
 * trimmed to the token's precision. Use for Max / presets / derived values.
 */
export function toAmountString(value: number, maxDecimals = 18): string {
  if (!Number.isFinite(value) || value <= 0) return ''
  const digits = Math.min(maxDecimals, value >= 1 ? 6 : 8)
  return value.toFixed(digits).replace(/\.?0+$/, '')
}

/**
 * A quoted (derived) amount for display in the other field: plain digits, no
 * grouping, precision by magnitude (2 decimals over 1,000, 4 over 1, else 6 significant).
 */
export function formatDerivedAmount(value: number, maxDecimals = 18): string {
  if (!Number.isFinite(value) || value <= 0) return ''
  const decimals = value >= 1000 ? 2 : value >= 1 ? 4 : Math.min(18, 5 - Math.floor(Math.log10(value)))
  return value.toFixed(Math.min(decimals, maxDecimals)).replace(/\.?0+$/, '')
}

// Uniswap's useCurrencyInputFontSize: 36px max, 24px min, ~23px per glyph at 36px.
export const MAX_INPUT_FONT_SIZE = 36
export const MIN_INPUT_FONT_SIZE = 24
const MAX_CHAR_PIXEL_WIDTH = 23

/** Font size that fits `text` in `availableWidth`, shrinking from 36px down to 24px. */
export function fitInputFontSize(text: string, availableWidth: number): number {
  if (!text || availableWidth <= 0) return MAX_INPUT_FONT_SIZE
  const widthAtMax = text.length * MAX_CHAR_PIXEL_WIDTH
  if (widthAtMax <= availableWidth) return MAX_INPUT_FONT_SIZE
  const scaled = Math.floor((availableWidth / widthAtMax) * MAX_INPUT_FONT_SIZE)
  return Math.max(MIN_INPUT_FONT_SIZE, scaled)
}
