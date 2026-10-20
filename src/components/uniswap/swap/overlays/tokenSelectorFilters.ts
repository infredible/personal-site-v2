import { TOKEN_CATEGORIES } from '../tokens'
import type { Chain, ChainId, Token, TokenCategory } from '../types'

/*
 * Token selector filtering and search ranking, kept apart from the view so
 * the palette, its empty state and the footer all agree on one result set.
 */

/** "all" and "yours" (balance > 0) plus the token categories, in chip order. */
export type TokenSelectorCategory = 'all' | 'yours' | Exclude<TokenCategory, 'native'>

/** A chain id, or every network. */
export type TokenSelectorChain = ChainId | 'all'

export const CATEGORY_FILTERS: { id: TokenSelectorCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'yours', label: 'Your tokens' },
  ...TOKEN_CATEGORIES.filter((c): c is { id: Exclude<TokenCategory, 'native'>; label: string } => c.id !== 'native'),
]

/** Plural noun for empty-state copy: "No stablecoins on Polygon". */
const CATEGORY_NOUNS: Record<TokenSelectorCategory, string> = {
  all: 'tokens',
  yours: 'tokens in your wallet',
  stablecoin: 'stablecoins',
  defi: 'DeFi tokens',
  layer2: 'Layer 2 tokens',
  wrapped: 'wrapped tokens',
  meme: 'memecoins',
}

export type Section = { id: 'results' | 'yours' | 'tokens'; title: string; tokens: Token[] }

/**
 * Lower is better; -1 is no match. Exact symbol first, then prefixes, then
 * word starts in the name ("name" → Ethereum Name Service), then substrings.
 */
export function matchRank(token: Token, q: string): number {
  const symbol = token.symbol.toLowerCase()
  const name = token.name.toLowerCase()
  if (symbol === q) return 0
  if (name === q) return 1
  if (symbol.startsWith(q)) return 2
  if (name.startsWith(q)) return 3
  if (name.split(/\s+/).some((word) => word.startsWith(q))) return 4
  if (symbol.includes(q)) return 5
  if (name.includes(q)) return 6
  return -1
}

export function usdValue(token: Token, balances: Record<string, number>): number {
  return (balances[token.symbol] ?? 0) * token.priceUsd
}

export function isOwned(token: Token, balances: Record<string, number>): boolean {
  return (balances[token.symbol] ?? 0) > 0
}

function inCategory(token: Token, category: TokenSelectorCategory, balances: Record<string, number>) {
  if (category === 'all') return true
  if (category === 'yours') return isOwned(token, balances)
  return token.category === category
}

function onChain(token: Token, chain: TokenSelectorChain) {
  // Tokens without chain data are treated as listed everywhere
  return chain === 'all' || !token.chains || token.chains.includes(chain)
}

export function filterTokens(
  tokens: Token[],
  { category, chain, balances }: { category: TokenSelectorCategory; chain: TokenSelectorChain; balances: Record<string, number> },
) {
  return tokens.filter((t) => inCategory(t, category, balances) && onChain(t, chain))
}

/** Ranked search over `tokens`; empty query returns them unchanged. */
export function searchTokens(tokens: Token[], q: string, balances: Record<string, number>): Token[] {
  if (!q) return tokens
  return tokens
    .map((token, index) => ({ token, index, rank: matchRank(token, q) }))
    .filter((r) => r.rank >= 0)
    .sort(
      (a, b) =>
        a.rank - b.rank || usdValue(b.token, balances) - usdValue(a.token, balances) || a.index - b.index,
    )
    .map((r) => r.token)
}

/**
 * With a query: one ranked "Results" section. Without: "Your tokens" (by
 * value) then the rest of the list in its own (popularity) order, each token
 * listed once.
 */
export function buildSections(
  tokens: Token[],
  q: string,
  category: TokenSelectorCategory,
  balances: Record<string, number>,
): Section[] {
  if (q) {
    const results = searchTokens(tokens, q, balances)
    return results.length ? [{ id: 'results', title: 'Results', tokens: results }] : []
  }
  const owned = tokens.filter((t) => isOwned(t, balances)).sort((a, b) => usdValue(b, balances) - usdValue(a, balances))
  const rest = category === 'yours' ? [] : tokens.filter((t) => !isOwned(t, balances))
  return [
    ...(owned.length ? [{ id: 'yours' as const, title: 'Your tokens', tokens: owned }] : []),
    ...(rest.length ? [{ id: 'tokens' as const, title: 'Tokens', tokens: rest }] : []),
  ]
}

/** "No stablecoins on Polygon match “xyz”" and friends. */
export function emptyStateTitle({
  category,
  chain,
  query,
}: {
  category: TokenSelectorCategory
  chain?: Chain
  query: string
}): string {
  const where = chain ? ` on ${chain.name}` : ''
  if (query) return `No ${CATEGORY_NOUNS[category]}${where} match “${query}”`
  if (category === 'yours') return `You don’t hold any tokens${where}`
  return `No ${CATEGORY_NOUNS[category]}${where}`
}
