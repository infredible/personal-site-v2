import { NextRequest, NextResponse } from 'next/server';

interface CoinMarketCapQuote {
  data: {
    [key: string]: {
      id: number;
      name: string;
      symbol: string;
      quote: {
        USD: {
          price: number;
          percent_change_24h: number;
          market_cap: number;
          volume_24h: number;
          last_updated: string;
        };
      };
    };
  };
}

interface CoinMarketCapHistorical {
  data: {
    quotes: Array<{
      timestamp: string;
      quote: {
        USD: {
          price: number;
          market_cap: number;
          volume_24h: number;
        };
      };
    }>;
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = searchParams.get('days') || '7';
    
    // CoinMarketCap API key (using free tier for demo)
    const CMC_API_KEY = process.env.CMC_API_KEY || 'b54bcf4d-1bca-4e8e-9a24-22ff2c3d462c'; // Demo key
    
    const headers = {
      'Accept': 'application/json',
      'X-CMC_PRO_API_KEY': CMC_API_KEY,
    };

    // Fetch current Bitcoin price (Bitcoin ID = 1)
    const currentPriceResponse = await fetch(
      'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?id=1',
      { headers }
    );

    if (!currentPriceResponse.ok) {
      // Fallback to sandbox for development
      const sandboxResponse = await fetch(
        'https://sandbox-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?id=1',
        { headers }
      );
      
      if (!sandboxResponse.ok) {
        throw new Error(`CoinMarketCap API error: ${currentPriceResponse.status}`);
      }
    }

    const currentData: CoinMarketCapQuote = await (currentPriceResponse.ok ? currentPriceResponse : 
      await fetch('https://sandbox-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?id=1', { headers })
    ).json();

    const btcData = currentData.data['1'];
    const currentPrice = btcData?.quote.USD.price || null;
    const priceChangePercentage24h = btcData?.quote.USD.percent_change_24h || null;

    // Calculate absolute price change from percentage
    const priceChange24h = currentPrice && priceChangePercentage24h 
      ? (currentPrice * priceChangePercentage24h) / 100 
      : null;

    // Generate mock historical data based on current price and time range
    // In production, you'd use /v1/cryptocurrency/quotes/historical endpoint
    const generateHistoricalData = (currentPrice: number, days: string) => {
      const numDays = parseInt(days);
      const points = numDays === 1 ? 24 : Math.min(numDays, 30); // Hourly for 1 day, daily for others
      const history = [];
      
      for (let i = points - 1; i >= 0; i--) {
        const hoursAgo = numDays === 1 ? i : i * 24;
        const timestamp = Date.now() - (hoursAgo * 60 * 60 * 1000);
        // Simulate realistic price variation (±5% random walk)
        const variation = (Math.random() - 0.5) * 0.1 * currentPrice;
        const basePrice = currentPrice * (1 - (priceChangePercentage24h || 0) / 100);
        const price = basePrice + variation + (Math.random() - 0.5) * currentPrice * 0.02;
        
        history.push({
          timestamp,
          price: Math.max(price, currentPrice * 0.8), // Prevent unrealistic dips
          date: new Date(timestamp),
        });
      }
      
      // Ensure the last point matches current price
      if (history.length > 0) {
        history[history.length - 1].price = currentPrice;
      }
      
      return history;
    };

    const priceHistory = currentPrice ? generateHistoricalData(currentPrice, days) : [];

    return NextResponse.json({
      symbol: 'BTC',
      name: 'Bitcoin',
      currentPrice,
      priceChange24h,
      priceChangePercentage24h,
      priceHistory,
      lastUpdated: btcData?.quote.USD.last_updated || new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error fetching Bitcoin data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Bitcoin price data' },
      { status: 500 }
    );
  }
}
