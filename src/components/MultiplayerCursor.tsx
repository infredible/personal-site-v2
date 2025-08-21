'use client'

import { useEffect, useState } from 'react'

interface CursorUser {
  id: string
  name: string
  color: string
  avatar: string
}

interface MultiplayerCursorProps {
  user: CursorUser
  x: number
  y: number
  isVisible: boolean
  isClicking?: boolean
}

export function MultiplayerCursor({ user, x, y, isVisible, isClicking }: MultiplayerCursorProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])



  if (!mounted) return null

  return (
    <div
      className="fixed pointer-events-none z-[9999]"
      style={{
        transform: `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`,
        opacity: isVisible ? 1 : 0,
        willChange: 'transform, opacity',
        transition: 'opacity 0.3s ease-out',
      }}
    >
      {/* Cursor pointer */}
      <div className="relative">
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          className={`transition-transform duration-150 ${isClicking ? 'scale-90' : 'scale-100'}`}
        >
          <path
            d="M4.5 2.5L16.5 8.5L10.5 10.5L8.5 16.5L4.5 2.5Z"
            fill={user.color}
            stroke="white"
            strokeWidth="1"
          />
        </svg>

        {/* User avatar circle */}
        <div
          className="absolute top-5 left-2 w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg"
          style={{ backgroundColor: user.color }}
        >
          {user.avatar}
        </div>

        {/* Click ripple effect */}
        {isClicking && (
          <div
            className="absolute top-2 left-2 w-4 h-4 rounded-full animate-ping"
            style={{ backgroundColor: user.color, opacity: 0.6 }}
          />
        )}
      </div>
    </div>
  )
}
