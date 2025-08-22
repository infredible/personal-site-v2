'use client'

import { ETHData } from '../EthereumChart';
import { Heart, Ellipsis, Maximize2 } from 'lucide-react';
import Image from 'next/image';

interface ChartHeaderProps {
  data: ETHData | null;
  isLoading: boolean;
  selectedRange: string;
  isTransitioning: boolean;
}

export function ChartHeader({ data, isLoading, selectedRange, isTransitioning }: ChartHeaderProps) {
  const formatPrice = (price: number | null) => {
    if (price === null) return '$--,---';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const formatChange = (change: number | null, percentage: number | null) => {
    if (change === null || percentage === null) return null;
    
    const formattedChange = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(change));

    const formattedPercentage = Math.abs(percentage).toFixed(2);
    const isPositive = change >= 0;

    return {
      text: `${isPositive ? '+' : '-'}${formattedChange} (${formattedPercentage}%)`,
      isPositive,
    };
  };

  const formatLastUpdated = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short',
    });
  };

  const getTimePeriodText = (range: string) => {
    const rangeMappings: Record<string, string> = {
      '1': 'today',
      '7': 'past week',
      '30': 'past month',
      '90': 'past 3 months',
      '365': 'past year',
    };
    
    return rangeMappings[range] || 'this period';
  };

  // Calculate change based on selected time period
  const calculatePeriodChange = (data: ETHData | null, selectedRange: string) => {
    if (!data || !data.priceHistory || data.priceHistory.length < 2) {
      return { change: null, percentage: null };
    }

    const priceHistory = data.priceHistory;
    const currentPrice = priceHistory[priceHistory.length - 1]?.price;
    const startPrice = priceHistory[0]?.price;
    
    if (!currentPrice || !startPrice) {
      return { change: null, percentage: null };
    }

    const change = currentPrice - startPrice;
    const percentage = ((currentPrice - startPrice) / startPrice) * 100;

    return { change, percentage };
  };

  const periodChange = calculatePeriodChange(data, selectedRange);
  const changeInfo = formatChange(periodChange.change, periodChange.percentage);

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-5.5 h-5.5 flex items-center justify-center">
            <Image 
              src="/icons/eth.png" 
              alt="Ethereum" 
              width={24} 
              height={24} 
              className="w-5.5 h-5.5 rounded-full"
            />
          </div>
          <div>
            <div className="text-md font-medium">ETH <span className="text-muted-foreground">: USD</span></div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {data?.lastUpdated && (
            <span>Updated {formatLastUpdated(data.lastUpdated)}</span>
          )}
        </div>
      </div>

      {/* Price and Change Row */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="text-3xl font-medium">
            {isLoading ? (
              <div className="h-9 w-48 bg-muted animate-pulse rounded" />
            ) : (
              formatPrice(data?.currentPrice || null)
            )}
          </div>
          
          <div className="flex items-center gap-1.5">
            {isLoading ? (
              <div className="h-5 w-32 bg-muted animate-pulse rounded" />
            ) : changeInfo ? (
              <>
                <span
                  className={`text-sm font-medium ${
                    changeInfo.isPositive ? 'text-chart-2' : 'text-chart-1'
                  }`}
                >
                  {changeInfo.text}
                </span>
                <span className="text-sm text-muted-foreground">
                  {getTimePeriodText(selectedRange)}
                </span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">--</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-1">
          <button 
            className="p-2 rounded-md hover:bg-muted transition-colors"
            aria-label="Expand chart"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button 
            className="p-2 rounded-md hover:bg-muted transition-colors"
            aria-label="Add to favorites"
          >
            <Heart className="w-4 h-4" />
          </button>
          <button 
            className="p-2 rounded-md hover:bg-muted transition-colors"
            aria-label="More options"
          >
            <Ellipsis className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
