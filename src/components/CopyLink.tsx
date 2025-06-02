'use client'

import { useState } from 'react'
import { Link, Check } from 'lucide-react'

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
      setTimeout(() => setIsCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy link:', error)
    }
  }

  return (
    <div className="copy-icon-container">
      <button 
        onClick={copyLink}
        disabled={isCopied}
        className={`copy-icon ${isCopied ? 'copied' : ''}`}
        aria-label={`Copy link to ${title}`}
      >
        {isCopied ? (
          <Check size={14} />
        ) : (
          <Link size={14} />
        )}
      </button>
      <div className="tooltip">
        {isCopied ? 'Copied!' : 'Copy link'}
      </div>
    </div>
  )
} 