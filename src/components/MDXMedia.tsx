'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'

interface MDXImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
}

interface MDXVideoProps {
  src: string
  width?: number
  height?: number
  className?: string
  autoPlay?: boolean
  loop?: boolean
  muted?: boolean
  playsInline?: boolean
  controls?: boolean
}

// Hook for intersection observer
function useIntersectionObserver(threshold = 0.1) {
  const [isVisible, setIsVisible] = useState(false)
  const [hasBeenVisible, setHasBeenVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          if (!hasBeenVisible) {
            setHasBeenVisible(true)
          }
        } else {
          setIsVisible(false)
        }
      },
      { threshold }
    )

    const currentRef = ref.current
    if (currentRef) {
      observer.observe(currentRef)
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef)
      }
    }
  }, [threshold, hasBeenVisible])

  return { ref, isVisible, hasBeenVisible }
}

// Get aspect ratio from dimensions or estimate from src
function getAspectRatio(width?: number, height?: number, src?: string): string {
  if (width && height) {
    return `${width} / ${height}`
  }
  
  // Common aspect ratios based on filename patterns
  if (src?.includes('hero')) return '16 / 9'
  if (src?.includes('mobile')) return '9 / 16'
  if (src?.includes('square')) return '1 / 1'
  
  // Default to 16:9 for unknown images
  return '16 / 9'
}

export function MDXImage({ src, alt, width, height, className = '' }: MDXImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const { ref, hasBeenVisible } = useIntersectionObserver(0.1)
  
  const aspectRatio = getAspectRatio(width, height, src)
  
  return (
    <div 
      ref={ref}
      className={`relative overflow-hidden rounded-lg my-8 bg-muted/30 ${className}`}
      style={{ 
        aspectRatio,
        contentVisibility: 'auto',
        containIntrinsicSize: '800px 450px' // fallback size
      }}
    >
      {/* Loading skeleton */}
      <div 
        className={`absolute inset-0 bg-muted/50 animate-pulse transition-opacity duration-200 ${
          isLoaded ? 'opacity-0' : 'opacity-100'
        }`}
        aria-hidden="true"
      />
      
      {/* Actual image */}
      {hasBeenVisible && (
        <Image
          src={src}
          alt={alt}
          fill
          className={`object-cover transition-opacity duration-200 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 800px, 800px"
          priority={src.includes('hero')} // Prioritize hero images
        />
      )}
      
      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
          Failed to load image
        </div>
      )}
    </div>
  )
}

export function MDXVideo({ 
  src, 
  width, 
  height, 
  className = '', 
  autoPlay = true,
  loop = true,
  muted = true,
  playsInline = true,
  controls = false
}: MDXVideoProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const { ref, hasBeenVisible, isVisible } = useIntersectionObserver(0.1)
  const videoRef = useRef<HTMLVideoElement>(null)
  
  const aspectRatio = getAspectRatio(width, height, src)
  
  // Handle auto-play when visible (following iOS guidelines)
  useEffect(() => {
    if (!videoRef.current || !hasBeenVisible) return
    
    if (isVisible && autoPlay) {
      videoRef.current.play().catch(() => {
        // Ignore play errors (common on mobile)
      })
    } else if (!isVisible && autoPlay) {
      videoRef.current.pause()
    }
  }, [isVisible, hasBeenVisible, autoPlay])
  
  return (
    <div 
      ref={ref}
      className={`relative overflow-hidden rounded-lg my-8 bg-muted/30 ${className}`}
      style={{ 
        aspectRatio,
        contentVisibility: 'auto',
        containIntrinsicSize: '800px 450px' // fallback size
      }}
    >
      {/* Loading skeleton */}
      <div 
        className={`absolute inset-0 bg-muted/50 animate-pulse transition-opacity duration-200 ${
          isLoaded ? 'opacity-0' : 'opacity-100'
        }`}
        aria-hidden="true"
      />
      
      {/* Actual video */}
      {hasBeenVisible && (
        <video
          ref={videoRef}
          src={src}
          className={`w-full h-full object-cover transition-opacity duration-200 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          autoPlay={autoPlay}
          loop={loop}
          muted={muted}
          playsInline={playsInline}
          controls={controls}
          onLoadedData={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
        />
      )}
      
      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
          Failed to load video
        </div>
      )}
    </div>
  )
} 