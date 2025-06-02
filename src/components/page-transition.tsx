'use client'

import { motion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'

interface PageTransitionProps {
  children: ReactNode
  className?: string
}

export function PageTransition({ children, className = '' }: PageTransitionProps) {
  const pathname = usePathname()
  const isHomepage = pathname === '/'
  
  return (
    <motion.div
      initial={{ opacity: 0, y: isHomepage ? -8 : 2, scale: isHomepage ? 1 : 0.99 }}
      animate={{ opacity: 1, y: 0, scale: isHomepage ? 0.99 : 1 }}
      exit={{ opacity: 0, y: -2, scale: isHomepage ? 1 : 0.99 }}
      transition={{
        duration: 0.3,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
} 