'use client'

import { useState } from 'react'
import { BookCopy, Check } from 'lucide-react'

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
      setTimeout(() => setIsCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy markdown:', error)
    }
  }

  return (
    <div className="copy-icon-container">
      <button 
        onClick={copyMarkdown}
        disabled={isCopied}
        className={`copy-icon ${isCopied ? 'copied' : ''}`}
        aria-label={`Copy ${title} as markdown`}
      >
        {isCopied ? (
          <Check size={14} />
        ) : (
          <BookCopy size={14} />
        )}
      </button>
      <div className="tooltip">
        {isCopied ? 'Copied!' : 'Copy as Markdown'}
      </div>
    </div>
  )
} 