import { NextRequest, NextResponse } from 'next/server';

interface CoinGeckoMarketChart {
  prices: [number, number][];
  market_caps: [number, number][];
  total_volumes: [number, number][];
}

interface CoinGeckoCoin {
  id: string;
  name: string;
  symbol: string;
  market_data: {
    current_price: {
      usd: number;
    };
    price_change_percentage_24h: number;
    price_change_24h: number;
    market_cap: {
      usd: number;
    };
    total_volume: {
      usd: number;
    };
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = searchParams.get('days') || '7';
    
    // CoinGecko API key (optional but recommended for higher rate limits)
    const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY;
    
    // CoinGecko API endpoints:
    // - Demo/Free API keys: use api.coingecko.com with x-cg-demo-api-key header
    // - Pro API keys: use pro-api.coingecko.com with x-cg-pro-api-key header  
    // - No API key: use api.coingecko.com without header
    const baseUrl = 'https://api.coingecko.com/api/v3';
    
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    
    // Add API key if available - using demo API key header for public endpoint
    if (COINGECKO_API_KEY) {
      headers['x-cg-demo-api-key'] = COINGECKO_API_KEY;
    }

    // Fetch historical price data for Ethereum
    // Per CoinGecko docs: leave interval empty for automatic granularity
    // 1 day = 5-minutely, 2-90 days = hourly, >90 days = daily
    const marketChartUrl = `${baseUrl}/coins/ethereum/market_chart?vs_currency=usd&days=${days}`;
    const marketChartResponse = await fetch(marketChartUrl, { headers });

    if (!marketChartResponse.ok) {
      const errorText = await marketChartResponse.text();
      throw new Error(`CoinGecko market chart API error: ${marketChartResponse.status} - ${errorText}`);
    }

    const marketData: CoinGeckoMarketChart = await marketChartResponse.json();

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));

    // Fetch current coin info for additional details
    const coinUrl = `${baseUrl}/coins/ethereum?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`;
    const coinResponse = await fetch(coinUrl, { headers });

    let currentPrice = null;
    let priceChange24h = null;
    let priceChangePercentage24h = null;

    if (coinResponse.ok) {
      const coinData: CoinGeckoCoin = await coinResponse.json();
      currentPrice = coinData.market_data?.current_price?.usd || null;
      priceChange24h = coinData.market_data?.price_change_24h || null;
      priceChangePercentage24h = coinData.market_data?.price_change_percentage_24h || null;
    } else {
      // Fallback: use the last price from market chart data
      if (marketData.prices && marketData.prices.length > 0) {
        const lastPrice = marketData.prices[marketData.prices.length - 1];
        currentPrice = lastPrice[1];
      }
    }

    // Transform historical data for easier consumption
    const priceHistory = marketData.prices?.map(([timestamp, price]) => ({
      timestamp,
      price: Math.round(price * 100) / 100, // Round to 2 decimal places
      date: new Date(timestamp),
    })) || [];

    return NextResponse.json({
      symbol: 'ETH',
      name: 'Ethereum',
      currentPrice,
      priceChange24h,
      priceChangePercentage24h,
      priceHistory,
      lastUpdated: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error fetching Ethereum data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Ethereum price data' },
      { status: 500 }
    );
  }
}
