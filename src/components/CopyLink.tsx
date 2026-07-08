'use client'

import { useState } from 'react'
import { UilLink, UilCheck } from '@iconscout/react-unicons'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface CopyLinkProps {
  title: string
}

export function CopyLink({ title }: CopyLinkProps) {
  const [isCopied, setIsCopied] = useState(false)

  const copyLink = async () => {
    if (isCopied) return
    
    const url = window.location.href
    
    try {
      // Try modern Clipboard API first, with fallback if it fails
      let copySuccessful = false
      
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(url)
          copySuccessful = true
        } catch (clipboardError) {
          console.log('Clipboard API failed, trying fallback:', clipboardError)
          copySuccessful = false
        }
      }
      
      // Fallback for Safari mobile and older browsers
      if (!copySuccessful) {
        const textArea = document.createElement('textarea')
        textArea.value = url
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
      console.error('Failed to copy link:', error)
      // Could show a toast notification here if needed
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button 
          onClick={copyLink}
          disabled={isCopied}
          className={`text-muted-foreground bg-transparent border-0 p-2 sm:p-1 rounded transition-all duration-200 ease-out cursor-pointer active:scale-95 disabled:cursor-default min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center ${
            isCopied ? 'text-green-600 dark:text-green-400' : ''
          }`}
          style={{
            userSelect: 'none',
            WebkitTapHighlightColor: 'rgba(0,0,0,0)'
          }}
          aria-label={`Copy link to ${title}`}
        >
          {isCopied ? <UilCheck className="w-4 h-4 sm:w-3.5 sm:h-3.5" /> : <UilLink className="w-4 h-4 sm:w-3.5 sm:h-3.5" />}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{isCopied ? 'Copied' : 'Copy link'}</p>
      </TooltipContent>
    </Tooltip>
  )
} 