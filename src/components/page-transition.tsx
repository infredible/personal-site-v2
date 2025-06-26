'use client'

import { usePathname } from 'next/navigation'
import { ReactNode, Suspense, lazy } from 'react'

// Dynamically import Framer Motion to reduce initial bundle size
const MotionDiv = lazy(() => 
  import('framer-motion').then(mod => ({ 
    default: mod.motion.div 
  }))
)

interface PageTransitionProps {
  children: ReactNode
  className?: string
}

export function PageTransition({ children, className = '' }: PageTransitionProps) {
  const pathname = usePathname()
  const isHomepage = pathname === '/'
  
  return (
    <Suspense fallback={<div className={className}>{children}</div>}>
      <MotionDiv
        initial={{ opacity: 0, y: isHomepage ? -8 : 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -2 }}
        transition={{
          duration: 0.3,
          ease: [0.25, 0.46, 0.45, 0.94]
        }}
        className={className}
      >
        {children}
      </MotionDiv>
    </Suspense>
  )
} 