'use client'

import { useState, useEffect } from 'react';
import { ChartHeader } from './ethereum-chart/ChartHeader';
import { TimeRangeSelector } from './ethereum-chart/TimeRangeSelector';
import { PriceChart } from './ethereum-chart/PriceChart';
import { LoadingState } from './ethereum-chart/LoadingState';

export interface PricePoint {
  timestamp: number;
  price: number;
  date: Date;
}

export interface ETHData {
  symbol: string;
  name: string;
  currentPrice: number | null;
  priceChange24h: number | null;
  priceChangePercentage24h: number | null;
  priceHistory: PricePoint[];
  lastUpdated: string;
}

const TIME_RANGES = [
  { key: '1', label: '1D', days: '1' },
  { key: '7', label: '1W', days: '7' },
  { key: '30', label: '1M', days: '30' },
  { key: '90', label: '3M', days: '90' },
  { key: '365', label: '1Y', days: '365' },
] as const;

export function EthereumChart() {
  const [data, setData] = useState<ETHData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState('7');
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (days: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/eth?days=${days}`);
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      
      const ethData: ETHData = await response.json();
      setData(ethData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching Ethereum data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchData(selectedRange);
  }, []);

  const handleRangeChange = (range: string) => {
    if (range !== selectedRange) {
      setSelectedRange(range);
      fetchData(range);
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[500px] p-8">
        <div className="text-center max-w-md">
          <h3 className="text-lg font-medium mb-2">Unable to load chart</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button 
            onClick={() => fetchData(selectedRange)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="prototype-container w-full max-w-xl mx-auto p-4 bg-background rounded-xl border border-border bg-muted/20">
      <ChartHeader 
        data={data}
        isLoading={isLoading}
        selectedRange={selectedRange}
      />
      
      <TimeRangeSelector
        ranges={TIME_RANGES}
        selectedRange={selectedRange}
        onRangeChange={handleRangeChange}
        disabled={isLoading}
      />

      <div className="mt-2">
        {isLoading ? (
          <LoadingState />
        ) : data ? (
          <>

            <PriceChart 
              data={data.priceHistory || []}
              currentPrice={data.currentPrice}
              priceChange={data.priceChangePercentage24h}
              days={parseInt(selectedRange)}
              selectedRange={selectedRange}
            />
          </>
        ) : (
          <div className="text-center text-muted-foreground p-8">
            No data available
          </div>
        )}
      </div>

    </div>
  );
}
