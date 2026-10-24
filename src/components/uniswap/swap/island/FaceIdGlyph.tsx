'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

export type FaceIdStatus = 'idle' | 'scanning' | 'success' | 'failed'

/**
 * The Face ID glyph: four corners and a face, in currentColor. While scanning
 * the corners breathe; on success the face gives way to a check drawn inside
 * the corners. A failure keeps the face (the island shakes around it).
 */
export function FaceIdGlyph({ status = 'idle', className }: { status?: FaceIdStatus; className?: string }) {
  const reduce = useReducedMotion() ?? false
  const scanning = status === 'scanning' && !reduce
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden className={cn('size-uni-20', className)}>
      <motion.g
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        initial={false}
        animate={{ scale: scanning ? [1, 0.9, 1] : 1 }}
        transition={scanning ? { duration: 1.2, ease: 'easeInOut', repeat: Infinity } : { duration: 0.2 }}
      >
        <path d="M4 14v-4a6 6 0 0 1 6-6h4" />
        <path d="M34 4h4a6 6 0 0 1 6 6v4" />
        <path d="M44 34v4a6 6 0 0 1-6 6h-4" />
        <path d="M14 44h-4a6 6 0 0 1-6-6v-4" />
      </motion.g>
      <AnimatePresence initial={false}>
        {status === 'success' ? (
          <motion.path
            key="check"
            d="M15 24.5l6 6L33 18"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: reduce ? 1 : 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.32, delay: 0.08, ease: [0.65, 0, 0.35, 1] }}
          />
        ) : (
          <motion.g
            key="face"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={false}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.8, transition: { duration: 0.12 } }}
          >
            <path d="M16 17v4" />
            <path d="M32 17v4" />
            <path d="M24 17v9h-2" />
            <path d="M17 32c4 3.5 10 3.5 14 0" />
          </motion.g>
        )}
      </AnimatePresence>
    </svg>
  )
}
