'use client'

import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'

interface ProjectPreviewProps {
  imageUrl: string | null
  isVisible: boolean
  mouseX: number
  mouseY: number
}

export function ProjectPreview({ imageUrl, isVisible, mouseX, mouseY }: ProjectPreviewProps) {
  if (!imageUrl) {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed z-50 pointer-events-none hidden [@media(hover:hover)]:block"
          style={{
            left: mouseX + 20,
            top: Math.max(50, mouseY - 120),
            width: '320px',
          }}
          initial={{ opacity: 0.1, x: 0 }}
          animate={{ opacity: 1, x: 12 }}
          exit={{ opacity: 0, x: 12 }}
          transition={{ 
            duration: 0.2, 
            ease: [0.2, 0.0, 0.2, 1] 
          }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl overflow-hidden">
            <Image
              src={imageUrl}
              alt="Project preview"
              width={320}
              height={240}
              className="w-full h-auto object-cover"
              priority={true}
              sizes="320px"
              quality={85}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
