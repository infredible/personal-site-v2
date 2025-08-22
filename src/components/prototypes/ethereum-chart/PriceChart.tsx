'use client'

import { useMemo, useState } from 'react';
import { AreaClosed, LinePath, Line, Bar } from '@visx/shape';
import { curveMonotoneX } from '@visx/curve';
import { scaleTime, scaleLinear } from '@visx/scale';
import { LinearGradient } from '@visx/gradient';
import { Group } from '@visx/group';
import { Text } from '@visx/text';
import { ParentSize } from '@visx/responsive';
import { localPoint } from '@visx/event';
import { extent, max, min, bisector } from 'd3-array';
import { format } from 'date-fns';
import { PricePoint } from '../EthereumChart';

interface InnerChartProps {
  data: PricePoint[];
  width: number;
  height: number;
  isPositiveChange: boolean;
  days: number;
}

interface PriceChartProps {
  data: PricePoint[];
  currentPrice: number | null;
  priceChange: number | null;
  days: number;
}

// Helper function to get the nearest data point
const bisectDate = bisector<PricePoint, Date>((d) => d.date).left;

// Accessors
const getDate = (d: PricePoint) => d.date;
const getPrice = (d: PricePoint) => d.price;

// The inner chart component that renders with specific dimensions
function InnerChart({ data, width, height, isPositiveChange, days }: InnerChartProps) {
  // State for tooltip - fixed position above chart
  const [tooltipData, setTooltipData] = useState<PricePoint | null>(null);
  const [tooltipLeft, setTooltipLeft] = useState<number | null>(null);
  const [tooltipTop, setTooltipTop] = useState<number | null>(null);
  
  // Update margins - remove left margin, keep right margin for labels
  const margin = { top: 10, right: 50, bottom: 20, left: 0 };

  // Chart dimensions
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Validate and transform data
  const validData = data
    .filter(d => 
      d && 
      typeof d.price === 'number' && 
      !isNaN(d.price) && 
      d.price > 0 &&
      d.timestamp &&
      typeof d.timestamp === 'number' &&
      d.timestamp > 0
    )
    .map(d => ({
      ...d,
      date: d.date instanceof Date ? d.date : new Date(d.timestamp)
    }))
    .filter(d => !isNaN(d.date.getTime()));

  // Don't render if we don't have enough valid data
  if (validData.length < 2 || innerWidth <= 0 || innerHeight <= 0) {
    return (
      <div className="w-full h-80 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <div className="text-sm">Loading chart data...</div>
          <div className="text-xs mt-1">{validData.length} data points available</div>
        </div>
      </div>
    );
  }

  // Create scales
  const dateScale = useMemo(
    () =>
      scaleTime({
        range: [0, innerWidth],
        domain: extent(validData, getDate) as [Date, Date],
      }),
    [validData, innerWidth]
  );

  const minPrice = min(validData, getPrice) || 0;
  const maxPrice = max(validData, getPrice) || 0;
  const pricePadding = (maxPrice - minPrice) * 0.1;

  const priceScale = useMemo(
    () =>
      scaleLinear({
        range: [innerHeight, 0],
        domain: [
          minPrice - pricePadding, // Add some padding
          maxPrice + pricePadding,
        ],
        nice: true,
      }),
    [validData, innerHeight, minPrice, maxPrice, pricePadding]
  );

  // Colors for SVG - need to use actual color values for SVG compatibility
  const positiveColor = '#10b981'; // Green for gains (chart-2 equivalent)
  const negativeColor = '#ef4444'; // Red for losses (chart-1 equivalent)
  
  const gradientColors = isPositiveChange 
    ? { from: positiveColor, to: positiveColor }
    : { from: negativeColor, to: negativeColor };
  
  const lineColor = isPositiveChange ? positiveColor : negativeColor;

  // Generate tick values for the y-axis
  const yTicks = priceScale.ticks(4);

  // Format price for y-axis labels (concise format)
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: price >= 1 && price < 10 ? 2 : 0,
      maximumFractionDigits: price < 1 ? 6 : price < 10 ? 2 : 0,
      notation: price > 1000 ? 'compact' : 'standard'
    }).format(price);
  };

  // More detailed price format for tooltip
  const formatTooltipPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2, // Always show at least 2 decimal places
      maximumFractionDigits: price < 1 ? 6 : 2, // Show up to 6 decimals for small values
    }).format(price);
  };

  // Helper function to format date based on timeframe
  const formatXAxisLabel = (timestamp: Date) => {
    if (days === 1) {
      // For 1 day chart, show hours
      return format(timestamp, 'HH:mm');
    } else if (days <= 7) {
      // For 7 day chart, show weekday
      return format(timestamp, 'EEE');
    } else if (days <= 30) {
      // For 30 day chart, show day of month
      return format(timestamp, 'dd MMM');
    } else {
      // For longer periods, show month
      return format(timestamp, 'MMM');
    }
  };

  // Full format for tooltip
  const formatTooltipDate = (timestamp: Date) => {
    if (days === 1) {
      return format(timestamp, 'MMM d, h:mm a');
    } else {
      return format(timestamp, 'MMM d, yyyy');
    }
  };

  // Calculate how many ticks to show based on chart width
  const getTickInterval = () => {
    const dataLength = validData.length;
    if (days === 1) return Math.ceil(dataLength / 6); // About 6 ticks for 24h
    if (days <= 7) return Math.ceil(dataLength / 7);  // About 7 ticks for week
    if (days <= 30) return Math.ceil(dataLength / 6); // About 6 ticks for month
    return Math.ceil(dataLength / 12); // About 12 ticks for year
  };

  // Generate x-axis ticks with proper edge handling
  const xTickInterval = getTickInterval();
  const rawXTicks = validData
    .filter((_: PricePoint, i: number) => i % xTickInterval === 0)
    .map((d: PricePoint) => d.date);
  
  // Filter out ticks that would be too close to the edges
  const xTicks = rawXTicks.filter((timestamp: Date, i: number) => {
    const xPos = dateScale(timestamp);
    // Skip ticks that are within 30px of the left edge
    if (xPos < 30) return false;
    // Skip ticks that are within 30px of the right edge
    if (xPos > innerWidth - 30) return false;
    return true;
  });

  // Handler for mouse move over the chart area
  const handleMouseMove = (event: React.TouchEvent<SVGRectElement> | React.MouseEvent<SVGRectElement>) => {
    // Get the mouse point relative to the SVG container
    const { x } = localPoint(event) || { x: 0 };
    
    // Adjust for the left margin to get the correct position within the chart area
    const xInChart = x - margin.left;
    
    // Convert the adjusted x position to a date
    const x0 = dateScale.invert(xInChart);
    
    const index = bisectDate(validData, x0, 1);
    if (index <= 0 || index >= validData.length) return; // Prevent out of bounds
    
    const d0 = validData[index - 1];
    const d1 = validData[index];
    const d = x0.valueOf() - d0.date.valueOf() > d1.date.valueOf() - x0.valueOf() ? d1 : d0;
    
    setTooltipData(d);
    setTooltipLeft(dateScale(d.date));
    setTooltipTop(priceScale(d.price));
  };

  // Handler for mouse leave
  const handleMouseLeave = () => {
    setTooltipData(null);
    setTooltipLeft(null);
    setTooltipTop(null);
  };

  return (
    <div className="relative">
      <svg width={width} height={height}>
        <Group left={margin.left} top={margin.top}>
          <LinearGradient
            id="area-gradient"
            from={gradientColors.from}
            to={gradientColors.to}
            fromOpacity={0.4}
            toOpacity={0.0}
          />
          
          {/* Y-axis tick marks and labels */}
          {yTicks.map((tick: number, i: number) => (
            <Group key={`y-tick-${i}`}>
              {/* Horizontal grid line */}
              <Line
                from={{ x: 0, y: priceScale(tick) }}
                to={{ x: innerWidth + margin.right - 8, y: priceScale(tick) }}
                stroke="hsl(var(--border))"
                strokeWidth={1}
                strokeDasharray="1,6"
                strokeOpacity={0.4}
              />
              
              {/* Tick label */}
              <Text
                x={innerWidth + margin.right - 12}
                y={priceScale(tick) - 6}
                textAnchor="end"
                verticalAnchor="middle"
                fontSize={10}
                fill="currentColor"
                className="text-zinc-500 dark:text-zinc-400"
              >
                {formatPrice(tick)}
              </Text>
            </Group>
          ))}
          
          {/* X-axis tick marks and labels */}
          {xTicks.map((tick: Date, i: number) => (
            <Group key={`x-tick-${i}`}>
              {/* Tick label */}
              <Text
                x={dateScale(tick)}
                y={innerHeight + 15}
                textAnchor="middle"
                verticalAnchor="start"
                fontSize={9}
                fill="currentColor"
                className="text-zinc-500 dark:text-zinc-400"
              >
                {formatXAxisLabel(tick)}
              </Text>
            </Group>
          ))}
          
          <AreaClosed<PricePoint>
            data={validData}
            x={(d) => dateScale(getDate(d)) ?? 0}
            y={(d) => priceScale(getPrice(d)) ?? 0}
            yScale={priceScale}
            strokeWidth={0}
            stroke={lineColor}
            fill="url(#area-gradient)"
            curve={curveMonotoneX}
          />
          <LinePath<PricePoint>
            data={validData}
            x={(d) => dateScale(getDate(d)) ?? 0}
            y={(d) => priceScale(getPrice(d)) ?? 0}
            stroke={lineColor}
            strokeWidth={1.5}
            curve={curveMonotoneX}
          />

          {/* Tooltip vertical line */}
          {tooltipData && (
            <Line
              from={{ x: tooltipLeft!, y: 0 }}
              to={{ x: tooltipLeft!, y: innerHeight }}
              stroke={lineColor}
              strokeWidth={1}
              strokeOpacity={0.5}
              pointerEvents="none"
              strokeDasharray="5,5"
            />
          )}
          
          {/* Tooltip dot */}
          {tooltipData && tooltipLeft !== null && tooltipTop !== null && (
            <circle
              cx={tooltipLeft}
              cy={tooltipTop}
              r={4}
              fill="white"
              stroke={lineColor}
              strokeWidth={2}
              pointerEvents="none"
            />
          )}
          
          {/* Transparent rectangle for mouse tracking */}
          <Bar
            x={0}
            y={0}
            width={innerWidth}
            height={innerHeight}
            fill="transparent"
            onTouchStart={handleMouseMove}
            onTouchMove={handleMouseMove}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ cursor: 'none' }}
          />
        </Group>
      </svg>
      
      {/* Tooltip with fixed y position */}
      {tooltipData && (
        <div
          className="absolute pointer-events-none bg-background border border-border p-2 rounded text-xs shadow-lg"
          style={{
            left: tooltipLeft! + margin.left,
            top: margin.top - 50,
            transform: 'translateX(-50%)',
            minWidth: '100px',
          }}
        >
          <div className="text-muted-foreground mb-1 whitespace-nowrap">
            {formatTooltipDate(tooltipData.date)}
          </div>
          <div className="font-medium whitespace-nowrap">
            {formatTooltipPrice(tooltipData.price)}
          </div>
        </div>
      )}
    </div>
  );
}

// The main component that handles responsive behavior
export function PriceChart({ data, currentPrice, priceChange, days }: PriceChartProps) {
  const isPositiveChange = (priceChange || 0) >= 0;
  
  return (
    <div className="w-full h-80">
      <ParentSize>
        {({ width }) => {
          const chartWidth = width || 800;
          const chartHeight = 320;
          
          if (!width || width === 0) {
            return (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <div className="text-sm">Loading chart...</div>
                </div>
              </div>
            );
          }
          
          return (
            <InnerChart
              data={data}
              width={chartWidth}
              height={chartHeight}
              isPositiveChange={isPositiveChange}
              days={days}
            />
          );
        }}
      </ParentSize>
    </div>
  );
}