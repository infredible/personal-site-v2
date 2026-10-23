// Number formatting for the swap UI, approximating Uniswap's formatter rules.

/** Token amounts: up to 6 significant decimals for small values, fewer for large ones. */
export function formatTokenAmount(value: number): string {
  if (!Number.isFinite(value) || value === 0) return '0'
  const abs = Math.abs(value)
  if (abs < 0.00001) return '<0.00001'
  const maximumFractionDigits = abs >= 1000 ? 2 : abs >= 1 ? 4 : 6
  return value.toLocaleString('en-US', { maximumFractionDigits })
}

/** Fiat values: $1,234.56, with <$0.01 for dust. */
export function formatUsd(value: number): string {
  if (!Number.isFinite(value) || value === 0) return '$0.00'
  if (Math.abs(value) < 0.01) return '<$0.01'
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Fractions as percentages: 0.0012 -> "0.12%". */
export function formatPercent(fraction: number, maximumFractionDigits = 2): string {
  if (!Number.isFinite(fraction)) return '-'
  if (fraction > 0 && fraction < 0.0001) return '<0.01%'
  return `${(fraction * 100).toLocaleString('en-US', { maximumFractionDigits })}%`
}

/** 0x7a3F...2f19 */
export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
}

/** Parses a user-typed amount ("1,234.5", "." , "") to a number; NaN when empty or invalid. */
export function parseAmount(raw: string): number {
  const cleaned = raw.replace(/,/g, '')
  if (cleaned === '' || cleaned === '.') return NaN
  return Number(cleaned)
}
