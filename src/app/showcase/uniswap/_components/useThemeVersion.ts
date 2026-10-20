'use client'

import { useEffect, useState } from 'react'

/** Increments whenever the site theme class on <html> changes, so computed token values can be re-read. */
export function useThemeVersion() {
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const observer = new MutationObserver(() => setVersion((v) => v + 1))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return version
}
