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
    
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    
    // Add API key if available for pro tier features
    if (COINGECKO_API_KEY) {
      headers['x-cg-pro-api-key'] = COINGECKO_API_KEY;
    }

    // Fetch historical price data for Ethereum
    const marketChartResponse = await fetch(
      `https://api.coingecko.com/api/v3/coins/ethereum/market_chart?vs_currency=usd&days=${days}&interval=${days === '1' ? 'hourly' : 'daily'}`,
      { headers }
    );

    if (!marketChartResponse.ok) {
      throw new Error(`CoinGecko API error: ${marketChartResponse.status}`);
    }

    const marketData: CoinGeckoMarketChart = await marketChartResponse.json();

    // Fetch current coin info for additional details
    const coinResponse = await fetch(
      'https://api.coingecko.com/api/v3/coins/ethereum?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false',
      { headers }
    );

    let currentPrice = null;
    let priceChange24h = null;
    let priceChangePercentage24h = null;

    if (coinResponse.ok) {
      const coinData: CoinGeckoCoin = await coinResponse.json();
      currentPrice = coinData.market_data.current_price.usd;
      priceChange24h = coinData.market_data.price_change_24h;
      priceChangePercentage24h = coinData.market_data.price_change_percentage_24h;
    }

    // Transform historical data for easier consumption
    const priceHistory = marketData.prices.map(([timestamp, price]) => ({
      timestamp,
      price: Math.round(price * 100) / 100, // Round to 2 decimal places
      date: new Date(timestamp),
    }));

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
