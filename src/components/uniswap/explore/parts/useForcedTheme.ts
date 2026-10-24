import * as React from 'react'

/** Theme forced by the nearest <UniswapScope theme>, so portal content (a menu) can match it. Call `read` on open. */
export function useForcedTheme(ref: React.RefObject<HTMLElement | null>) {
  const [theme, setTheme] = React.useState<string | undefined>()
  const read = React.useCallback(() => {
    setTheme(ref.current?.closest('[data-theme]')?.getAttribute('data-theme') ?? undefined)
  }, [ref])
  return [theme, read] as const
}
