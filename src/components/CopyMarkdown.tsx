'use client'

import { useState } from 'react'
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

  const copyMarkdown = async () => {
    if (isCopied) return
    
    try {
      const response = await fetch(`/api/markdown?slug=${slug}&type=${type}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch markdown content')
      }
      
      const { content } = await response.json()
      
      await navigator.clipboard.writeText(content)
      
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 600)
    } catch (error) {
      console.error('Failed to copy markdown:', error)
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button 
          onClick={copyMarkdown}
          disabled={isCopied}
          className={`text-muted-foreground bg-transparent border-0 p-1 rounded transition-all duration-200 ease-out cursor-pointer hover:text-foreground hover:bg-muted/30 active:scale-95 disabled:cursor-default ${
            isCopied ? 'text-green-600 dark:text-green-400' : ''
          }`}
          style={{
            userSelect: 'none',
            WebkitTapHighlightColor: 'rgba(0,0,0,0)'
          }}
          aria-label={`Copy ${title} as markdown`}
        >
          {isCopied ? <Check size={14} /> : <BookCopy size={14} />}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{isCopied ? 'Copied' : 'Copy as Markdown'}</p>
      </TooltipContent>
    </Tooltip>
  )
} 