'use client'

import { useState } from 'react'
import { Link, Check } from 'lucide-react'
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
    
    try {
      const url = window.location.href
      await navigator.clipboard.writeText(url)
      
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 600)
    } catch (error) {
      console.error('Failed to copy link:', error)
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button 
          onClick={copyLink}
          disabled={isCopied}
          className={`text-muted-foreground bg-transparent border-0 p-1 rounded transition-all duration-200 ease-out cursor-pointer hover:text-foreground hover:bg-muted/30 active:scale-95 disabled:cursor-default ${
            isCopied ? 'text-green-600 dark:text-green-400' : ''
          }`}
          style={{
            userSelect: 'none',
            WebkitTapHighlightColor: 'rgba(0,0,0,0)'
          }}
          aria-label={`Copy link to ${title}`}
        >
          {isCopied ? <Check size={14} /> : <Link size={14} />}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{isCopied ? 'Copied' : 'Copy link'}</p>
      </TooltipContent>
    </Tooltip>
  )
} 