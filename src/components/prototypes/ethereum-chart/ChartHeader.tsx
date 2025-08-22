'use client'

import { ETHData } from '../EthereumChart';
import { Heart, MoreVertical, Expand } from 'lucide-react';

interface ChartHeaderProps {
  data: ETHData | null;
  isLoading: boolean;
  selectedRange: string;
}

export function ChartHeader({ data, isLoading, selectedRange }: ChartHeaderProps) {
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
      text: `${isPositive ? '+' : '-'}${formattedChange} (${isPositive ? '+' : '-'}${formattedPercentage}%)`,
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
    <div className="space-y-4">
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center">
            <span className="text-white text-sm font-bold">⧫</span>
          </div>
          <div>
            <h1 className="text-lg font-medium">ETH : USD</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {data?.lastUpdated && (
            <span>Updated {formatLastUpdated(data.lastUpdated)}</span>
          )}
        </div>
      </div>

      {/* Price and Change Row */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="text-3xl font-bold">
            {isLoading ? (
              <div className="h-9 w-48 bg-muted animate-pulse rounded" />
            ) : (
              formatPrice(data?.currentPrice || null)
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {isLoading ? (
              <div className="h-5 w-32 bg-muted animate-pulse rounded" />
            ) : changeInfo ? (
              <span
                className={`text-sm font-medium ${
                  changeInfo.isPositive ? 'text-green-500' : 'text-red-500'
                }`}
              >
                {changeInfo.text}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">--</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            className="p-2 rounded-md hover:bg-muted transition-colors"
            aria-label="Expand chart"
          >
            <Expand className="w-4 h-4" />
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
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
