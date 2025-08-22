'use client'

export function LoadingState() {
  return (
    <div className="w-full h-80 relative">
      {/* Chart skeleton */}
      <div className="absolute inset-0 bg-muted/20 rounded animate-pulse">
        {/* Y-axis labels */}
        <div className="absolute right-4 top-4 space-y-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-3 w-12 bg-muted rounded" />
          ))}
        </div>
        
        {/* X-axis labels */}
        <div className="absolute bottom-4 left-8 right-16 flex justify-between">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-3 w-8 bg-muted rounded" />
          ))}
        </div>
        
        {/* Chart area simulation */}
        <div className="absolute inset-8 flex items-end">
          <svg className="w-full h-full opacity-30">
            <path
              d="M 0 60 Q 50 40 100 50 T 200 30 T 300 60 T 400 40 T 500 50"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth="2"
              fill="none"
              className="animate-pulse"
            />
          </svg>
        </div>
      </div>
      
      {/* Loading indicator */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="w-4 h-4 border-2 border-current border-r-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading chart data...</span>
        </div>
      </div>
    </div>
  );
}
