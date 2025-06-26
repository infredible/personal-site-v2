'use client'

import { usePathname } from 'next/navigation'
import { ReactNode, Suspense, lazy } from 'react'

// Dynamically import AnimatePresence to reduce initial bundle size
const AnimatePresence = lazy(() => 
  import('framer-motion').then(mod => ({ 
    default: mod.AnimatePresence 
  }))
)

interface PageTransitionWrapperProps {
  children: ReactNode
}

export function PageTransitionWrapper({ children }: PageTransitionWrapperProps) {
  const pathname = usePathname()

  return (
    <Suspense fallback={<div key={pathname}>{children}</div>}>
      <AnimatePresence mode="wait" initial={false}>
        <div key={pathname}>
          {children}
        </div>
      </AnimatePresence>
    </Suspense>
  )
} 