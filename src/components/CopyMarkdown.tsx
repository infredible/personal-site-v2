'use client'

import { useState, useEffect } from 'react'
import { BookCopy, Check } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface CopyMarkdownProps {
  slug: string
  type: 'post' | 'project'
  title: string
}

export function CopyMarkdown({ slug, type, title }: CopyMarkdownProps) {
  const [isCopied, setIsCopied] = useState(false)
  const [isMobileSafari, setIsMobileSafari] = useState(false)

  useEffect(() => {
    // Detect mobile Safari
    const userAgent = navigator.userAgent
    const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent)
    const isMobile = /iPhone|iPad|iPod/.test(userAgent)
    setIsMobileSafari(isSafari && isMobile)
  }, [])

  const copyMarkdown = async () => {
    if (isCopied) return
    
    try {
      const response = await fetch(`/api/markdown?slug=${slug}&type=${type}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch markdown content')
      }
      
      const { content } = await response.json()
      
      // Try modern Clipboard API first, with fallback if it fails
      let copySuccessful = false
      
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(content)
          copySuccessful = true
        } catch (clipboardError) {
          console.log('Clipboard API failed, trying fallback:', clipboardError)
          copySuccessful = false
        }
      }
      
      // Fallback for Safari mobile and older browsers
      if (!copySuccessful) {
        const textArea = document.createElement('textarea')
        textArea.value = content
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        
        const successful = document.execCommand('copy')
        document.body.removeChild(textArea)
        
        if (!successful) {
          throw new Error('Both clipboard methods failed')
        }
      }
      
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 600)
    } catch (error) {
      console.error('Failed to copy markdown:', error)
      // Could show a toast notification here if needed
    }
  }

  // Hide on mobile Safari where clipboard API is unreliable
  if (isMobileSafari) {
    return null
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button 
          onClick={copyMarkdown}
          disabled={isCopied}
          className={`text-muted-foreground bg-transparent border-0 p-2 sm:p-1 rounded transition-all duration-200 ease-out cursor-pointer active:scale-95 disabled:cursor-default min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center ${
            isCopied ? 'text-green-600 dark:text-green-400' : ''
          }`}
          style={{
            userSelect: 'none',
            WebkitTapHighlightColor: 'rgba(0,0,0,0)'
          }}
          aria-label={`Copy ${title} as markdown`}
        >
          {isCopied ? <Check className="w-4 h-4 sm:w-3.5 sm:h-3.5" /> : <BookCopy className="w-4 h-4 sm:w-3.5 sm:h-3.5" />}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{isCopied ? 'Copied' : 'Copy as Markdown'}</p>
      </TooltipContent>
    </Tooltip>
  )
} 