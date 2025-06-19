"use client";

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

interface FloatingBackButtonProps {
  href?: string;
  label?: string;
  ariaLabel?: string;
}

export function FloatingBackButton({ 
  href = "/", 
  label = "Return home",
  ariaLabel = "Go back to home"
}: FloatingBackButtonProps) {
  const router = useRouter()

  const handleClick = () => {
    router.push(href)
  }

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="inline-flex bg-input backdrop-blur-sm rounded-full p-1 border border-input transition-all duration-200 hover:scale-102 max-sm:shadow-lg active:scale-95">
        <button
          onClick={handleClick}
          className="flex items-center justify-center gap-2 px-4 py-2 sm:px-3 sm:py-1.5 rounded-full text-xs font-medium select-none tracking-wide cursor-pointer transition-[background-color,transform] duration-200 min-h-[32px] sm:min-h-0 text-foreground max-sm:bg-muted/10 active:bg-muted/30"
          aria-label={ariaLabel}
          style={{ WebkitTapHighlightColor: "rgba(0,0,0,0)" }}
        >
          <ArrowLeft size={16} />
          {label}
        </button>
      </div>
    </div>
  );
} 