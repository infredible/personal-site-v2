'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MultiplayerCursor } from './MultiplayerCursor'
import { CursorUser, getRandomUser } from './cursor-profiles'
import { CursorMovement, Position } from './cursor-movement'

interface CursorInstance {
  id: string
  user: CursorUser
  movement: CursorMovement
  position: Position
  isVisible: boolean
  isClicking: boolean
  spawnTime: number
  lifetime: number
}

interface MultiplayerCursorsProps {
  maxCursors?: number
  spawnInterval?: number
  lifetimeRange?: [number, number]
  disabled?: boolean
}

export function MultiplayerCursors({ 
  maxCursors = 3,
  spawnInterval = 15000,
  lifetimeRange = [30000, 120000],
  disabled = false
}: MultiplayerCursorsProps) {
  const [cursors, setCursors] = useState<CursorInstance[]>([])
  const [isMobile, setIsMobile] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const animationFrameRef = useRef<number>()
  const lastUpdateRef = useRef<number>(0)
  const spawnTimerRef = useRef<NodeJS.Timeout>()
  const usedUserIds = useRef<Set<string>>(new Set())

  // Check for mobile and motion preferences
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
    }
    
    const checkMotionPreference = () => {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      setPrefersReducedMotion(reducedMotion)
    }
    
    checkMobile()
    checkMotionPreference()
    
    window.addEventListener('resize', checkMobile)
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    motionQuery.addEventListener('change', checkMotionPreference)
    
    return () => {
      window.removeEventListener('resize', checkMobile)
      motionQuery.removeEventListener('change', checkMotionPreference)
    }
  }, [])

  // Get unique user that hasn't been used recently
  const getUniqueUser = useCallback((): CursorUser => {
    let attempts = 0
    let user: CursorUser
    
    do {
      user = getRandomUser()
      attempts++
    } while (usedUserIds.current.has(user.id) && attempts < 10)
    
    usedUserIds.current.add(user.id)
    
    // Clean up old user IDs if set gets too large
    if (usedUserIds.current.size > 6) {
      const idsArray = Array.from(usedUserIds.current)
      usedUserIds.current = new Set(idsArray.slice(-3))
    }
    
    return user
  }, [])

  // Spawn new cursor
  const spawnCursor = useCallback(() => {
    if (cursors.length >= maxCursors || isMobile || disabled || prefersReducedMotion) {
      return
    }

    const user = getUniqueUser()
    const lifetime = lifetimeRange[0] + Math.random() * (lifetimeRange[1] - lifetimeRange[0])
    const movement = new CursorMovement(user)
    const initialPosition = movement.getCurrentPosition()
    
    const newCursor: CursorInstance = {
      id: `${user.id}-${Date.now()}`,
      user,
      movement,
      position: initialPosition,
      isVisible: true,
      isClicking: false,
      spawnTime: performance.now(),
      lifetime
    }

    setCursors(prev => [...prev, newCursor])
  }, [cursors.length, maxCursors, isMobile, disabled, prefersReducedMotion, lifetimeRange, getUniqueUser])

  // Remove cursor
  const removeCursor = useCallback((cursorId: string) => {
    setCursors(prev => prev.filter(cursor => cursor.id !== cursorId))
    
    // Remove user ID from used set after a delay
    setTimeout(() => {
      const cursor = cursors.find(c => c.id === cursorId)
      if (cursor) {
        usedUserIds.current.delete(cursor.user.id)
      }
    }, 5000)
  }, [cursors])

  // Animation loop
  useEffect(() => {
    if (isMobile || disabled || prefersReducedMotion || cursors.length === 0) {
      return
    }

    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastUpdateRef.current
      lastUpdateRef.current = currentTime

      setCursors(prev => {
        return prev.map(cursor => {
          const age = currentTime - cursor.spawnTime
          
          // Handle fade in/out
          let isVisible = cursor.isVisible
          if (age < 500) {
            isVisible = true // Fade in period
          } else if (age > cursor.lifetime - 1000) {
            isVisible = false // Fade out period
          } else {
            isVisible = true
          }

          // Update position - always update for smooth motion
          const newPosition = cursor.movement.update(deltaTime)
          
          // Simulate clicking occasionally
          const isClicking = Math.random() < 0.0005 && cursor.isVisible // 0.05% chance per frame
          
          return {
            ...cursor,
            position: newPosition,
            isVisible,
            isClicking: isClicking && !cursor.isClicking ? true : false // Only trigger once
          }
        }).filter(cursor => {
          // Remove cursors that have exceeded their lifetime
          const age = currentTime - cursor.spawnTime
          if (age > cursor.lifetime) {
            // Clean up user ID
            setTimeout(() => usedUserIds.current.delete(cursor.user.id), 1000)
            return false
          }
          return true
        })
      })

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    lastUpdateRef.current = performance.now()
    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [cursors.length, isMobile, disabled, prefersReducedMotion])

  // Spawn timer
  useEffect(() => {
    if (isMobile || disabled || prefersReducedMotion) {
      return
    }

    const startSpawning = () => {
      // Initial spawn after a short delay
      const initialDelay = 2000 + Math.random() * 3000 // 2-5 seconds
      
      setTimeout(() => {
        spawnCursor()
        
        // Set up regular spawning
        spawnTimerRef.current = setInterval(() => {
          if (cursors.length < maxCursors) {
            spawnCursor()
          }
        }, spawnInterval + Math.random() * spawnInterval * 0.5) // Add some randomness
      }, initialDelay)
    }

    startSpawning()

    return () => {
      if (spawnTimerRef.current) {
        clearInterval(spawnTimerRef.current)
      }
    }
  }, [isMobile, disabled, prefersReducedMotion, spawnCursor, cursors.length, maxCursors, spawnInterval])

  // Don't render on mobile or if motion is reduced
  if (isMobile || disabled || prefersReducedMotion) {
    return null
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-[9998]">
      {cursors.map(cursor => (
        <MultiplayerCursor
          key={cursor.id}
          user={cursor.user}
          x={cursor.position.x}
          y={cursor.position.y}
          isVisible={cursor.isVisible}
          isClicking={cursor.isClicking}
        />
      ))}
    </div>
  )
}
