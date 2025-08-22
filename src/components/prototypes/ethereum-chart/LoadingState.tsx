'use client'

export function LoadingState() {
  return (
    <div className="w-full h-60 relative">
      {/* Chart skeleton */}
      <div className="absolute inset-0 bg-muted/20 rounded animate-pulse">
        {/* Y-axis labels - positioned like real chart */}
        <div className="absolute right-3 top-3 bottom-8 flex flex-col justify-between">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-2.5 w-10 bg-muted rounded" />
          ))}
        </div>
        
        {/* Grid lines skeleton */}
        <div className="absolute top-3 left-0 right-12 bottom-8 flex flex-col justify-between">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-px bg-muted/40 rounded" />
          ))}
        </div>
        
        {/* X-axis labels - positioned like real chart */}
        <div className="absolute bottom-1 left-8 right-16 flex justify-between">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-2.5 w-6 bg-muted rounded" />
          ))}
        </div>
        
        {/* Chart area simulation with proper margins */}
        <div className="absolute top-3 left-0 right-12 bottom-8">
          <svg className="w-full h-full opacity-30">
            <defs>
              <linearGradient id="skeleton-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity="0.3" />
                <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Skeleton chart area */}
            <path
              d="M 0 80 Q 60 40 120 50 T 240 30 T 360 60 T 480 35"
              stroke="none"
              fill="url(#skeleton-gradient)"
              className="animate-pulse"
            />
            {/* Skeleton chart line */}
            <path
              d="M 0 80 Q 60 40 120 50 T 240 30 T 360 60 T 480 35"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth="1.5"
              fill="none"
              className="animate-pulse"
            />
          </svg>
        </div>
        
        {/* Drag hint skeleton - positioned like real hint */}
        <div className="absolute bottom-8 left-2">
          <div className="h-2 w-20 bg-muted/60 rounded" />
        </div>
      </div>
      
      {/* Loading indicator */}
      <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="w-4 h-4 border-2 border-current border-r-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading chart data...</span>
        </div>
      </div>
    </div>
  );
}
