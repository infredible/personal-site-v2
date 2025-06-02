'use client'

export function BackToTop() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="text-center mt-12 mb-8">
      <button 
        onClick={scrollToTop}
        className="text-sm text-primary hover:opacity-70 transition-colors cursor-pointer underline"
      >
        Back to top
      </button>
    </div>
  )
} 