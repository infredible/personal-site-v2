import { splitMatch } from '../filters'

/**
 * Text with the search match in accent1 (production doesn't highlight). The
 * mark keeps the surrounding type; only the color changes.
 */
export function HighlightedText({ text, query }: { text: string; query?: string }) {
  const parts = query ? splitMatch(text, query) : null
  if (!parts) return <>{text}</>
  return (
    <>
      {parts.before}
      <mark className="bg-transparent text-accent1">{parts.match}</mark>
      {parts.after}
    </>
  )
}
