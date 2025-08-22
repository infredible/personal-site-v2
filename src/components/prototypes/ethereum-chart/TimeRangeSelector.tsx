'use client'

interface TimeRange {
  key: string;
  label: string;
  days: string;
}

interface TimeRangeSelectorProps {
  ranges: readonly TimeRange[];
  selectedRange: string;
  onRangeChange: (range: string) => void;
  disabled?: boolean;
}

export function TimeRangeSelector({ 
  ranges, 
  selectedRange, 
  onRangeChange, 
  disabled = false 
}: TimeRangeSelectorProps) {
  return (
    <div className="flex items-center gap-4 mt-6 mb-4">
      {ranges.map((range) => (
        <button
          key={range.key}
          onClick={() => onRangeChange(range.key)}
          disabled={disabled}
          className={`
            py-1.5 text-sm font-medium rounded-lg transition-all duration-120
            ${selectedRange === range.key
              ? 'text-foreground'
              : 'text-muted-foreground/60 hover:text-muted-foreground'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}
