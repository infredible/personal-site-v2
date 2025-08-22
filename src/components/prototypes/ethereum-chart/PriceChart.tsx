'use client'

import { useMemo, useState, useEffect } from 'react';
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
  isFirstLoad: boolean;
}

interface PriceChartProps {
  data: PricePoint[];
  currentPrice: number | null;
  priceChange: number | null;
  days: number;
  selectedRange: string;
  isFirstLoad: boolean;
}

// Helper function to get the nearest data point
const bisectDate = bisector<PricePoint, Date>((d) => d.date).left;

// Accessors
const getDate = (d: PricePoint) => d.date;
const getPrice = (d: PricePoint) => d.price;

// The inner chart component that renders with specific dimensions
function InnerChart({ data, width, height, isPositiveChange, days, isFirstLoad }: InnerChartProps) {
  // State for tooltip - fixed position above chart
  const [tooltipData, setTooltipData] = useState<PricePoint | null>(null);
  const [tooltipLeft, setTooltipLeft] = useState<number | null>(null);
  const [tooltipTop, setTooltipTop] = useState<number | null>(null);
  const [hasAnimated, setHasAnimated] = useState(false);
  
  // State for drag selection
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);
  const [hasDragged, setHasDragged] = useState(false);
  const [isChartHovered, setIsChartHovered] = useState(false);
  const [selectionData, setSelectionData] = useState<{
    startPoint: PricePoint;
    endPoint: PricePoint;
    change: number;
    changePercentage: number;
  } | null>(null);
  
  // Only animate on the very first load
  useEffect(() => {
    if (isFirstLoad && data.length > 0 && !hasAnimated) {
      setHasAnimated(true);
    }
  }, [isFirstLoad, data.length, hasAnimated]);

  // Global mouse up handler for drag selection and prevent text selection
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isSelecting) {
        setIsSelecting(false);
      }
    };

    if (isSelecting) {
      // Prevent text selection during drag
      document.body.style.userSelect = 'none';
      document.body.style.webkitUserSelect = 'none';
      document.addEventListener('mouseup', handleGlobalMouseUp);
      
      return () => {
        // Restore text selection
        document.body.style.userSelect = '';
        document.body.style.webkitUserSelect = '';
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isSelecting]);
  
  // Update margins - remove left margin, increase top margin for Y-axis labels
  const margin = { top: 12, right: 50, bottom: 30, left: 0 };

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
  const positiveColor = '#21C95E'; // Green for gains (chart-2 equivalent)
  const negativeColor = '#FF5F52'; // Red for losses (chart-1 equivalent)
  
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

  // Helper function to find nearest data point
  const findNearestDataPoint = (xPosition: number): PricePoint | null => {
    const xInChart = xPosition - margin.left;
    const x0 = dateScale.invert(xInChart);
    
    const index = bisectDate(validData, x0, 1);
    if (index <= 0 || index >= validData.length) return null;
    
    const d0 = validData[index - 1];
    const d1 = validData[index];
    return x0.valueOf() - d0.date.valueOf() > d1.date.valueOf() - x0.valueOf() ? d1 : d0;
  };

  // Calculate selection data
  const calculateSelectionData = (startX: number, endX: number) => {
    const startPoint = findNearestDataPoint(startX);
    const endPoint = findNearestDataPoint(endX);
    
    if (!startPoint || !endPoint) return null;
    
    // Ensure proper order (start should be earlier than end)
    const [earlierPoint, laterPoint] = startPoint.timestamp <= endPoint.timestamp 
      ? [startPoint, endPoint] 
      : [endPoint, startPoint];
    
    const change = laterPoint.price - earlierPoint.price;
    const changePercentage = (change / earlierPoint.price) * 100;
    
    return {
      startPoint: earlierPoint,
      endPoint: laterPoint,
      change,
      changePercentage,
    };
  };

  // Handler for mouse down (start selection)
  const handleMouseDown = (event: React.MouseEvent<SVGRectElement>) => {
    // If we have an active selection, check if clicking inside or outside
    if (selectionStart !== null && selectionEnd !== null && hasDragged) {
      const { x } = localPoint(event) || { x: 0 };
      const clickX = x - margin.left;
      const minSelection = Math.min(selectionStart - margin.left, selectionEnd - margin.left);
      const maxSelection = Math.max(selectionStart - margin.left, selectionEnd - margin.left);
      
      // Clear selection if clicking outside the selected area
      if (clickX < minSelection || clickX > maxSelection) {
        clearSelection();
        return; // Don't start a new selection
      }
    }

    const { x } = localPoint(event) || { x: 0 };
    setIsSelecting(true);
    setHasDragged(false);
    setSelectionStart(x);
    setSelectionEnd(x);
    // Clear tooltip during selection
    setTooltipData(null);
    setTooltipLeft(null);
    setTooltipTop(null);
  };

  // Handler for mouse move over the chart area
  const handleMouseMove = (event: React.TouchEvent<SVGRectElement> | React.MouseEvent<SVGRectElement>) => {
    const { x } = localPoint(event) || { x: 0 };
    
    if (isSelecting && selectionStart !== null) {
      // Check if we've moved enough to consider this a drag (minimum 5px)
      const dragDistance = Math.abs(x - selectionStart);
      if (dragDistance > 5 && !hasDragged) {
        setHasDragged(true);
      }
      
      // Update selection
      setSelectionEnd(x);
      
      // Only calculate selection data if we've actually dragged
      if (hasDragged || dragDistance > 5) {
        const data = calculateSelectionData(selectionStart, x);
        setSelectionData(data);
      }
    } else if (!isSelecting) {
      // Show tooltip only when not selecting and no active selection
      if (!selectionData) {
        const dataPoint = findNearestDataPoint(x);
        if (dataPoint) {
          setTooltipData(dataPoint);
          setTooltipLeft(dateScale(dataPoint.date));
          setTooltipTop(priceScale(dataPoint.price));
        }
      }
    }
  };

  // Handler for mouse up (end selection)
  const handleMouseUp = () => {
    if (isSelecting && selectionStart !== null && selectionEnd !== null && hasDragged) {
      const data = calculateSelectionData(selectionStart, selectionEnd);
      setSelectionData(data);
    } else if (isSelecting && !hasDragged) {
      // If we didn't drag, clear the selection completely
      clearSelection();
    }
    setIsSelecting(false);
  };

  // Handler for mouse leave
  const handleMouseLeave = () => {
    if (!isSelecting) {
      setTooltipData(null);
      setTooltipLeft(null);
      setTooltipTop(null);
    }
    setIsChartHovered(false);
  };

  // Handler for mouse enter
  const handleMouseEnter = () => {
    setIsChartHovered(true);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectionStart(null);
    setSelectionEnd(null);
    setSelectionData(null);
    setHasDragged(false);
  };

  return (
    <div className="relative" style={{ userSelect: isSelecting ? 'none' : 'auto' }}>
      <svg width={width} height={height}>
        <defs>
          <LinearGradient
            id="area-gradient"
            from={gradientColors.from}
            to={gradientColors.to}
            fromOpacity={0.3}
            toOpacity={0.0}
          />
          <LinearGradient
            id="positive-gradient"
            from={positiveColor}
            to={positiveColor}
            fromOpacity={0.3}
            toOpacity={0.0}
          />
          <LinearGradient
            id="negative-gradient"
            from={negativeColor}
            to={negativeColor}
            fromOpacity={0.3}
            toOpacity={0.0}
          />
          {/* Clip path definition for selection */}
          {(selectionStart !== null && selectionEnd !== null && hasDragged) && (
            <clipPath id="selection-clip">
              <rect
                x={Math.min(selectionStart - margin.left, selectionEnd - margin.left)}
                y={0}
                width={Math.abs(selectionEnd - selectionStart)}
                height={innerHeight}
              />
            </clipPath>
          )}
        </defs>
        <Group left={margin.left} top={margin.top}>
          {/* Y-axis tick marks and labels */}
          {yTicks.map((tick: number, i: number) => (
            <Group key={`y-tick-${i}`}>
              {/* Horizontal grid line */}
              <Line
                from={{ x: 0, y: priceScale(tick) }}
                to={{ x: innerWidth + margin.right - 8, y: priceScale(tick) }}
                stroke="rgb(100, 100, 100)"
                strokeWidth={1}
                strokeDasharray="1,8"
                strokeOpacity={0.6}
              />
              
              {/* Tick label */}
              <Text
                x={innerWidth + margin.right - 12}
                y={priceScale(tick) - 8}
                textAnchor="end"
                verticalAnchor="middle"
                fontSize={10}
                fill="currentColor"
                className="text-muted-foreground"
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
                y={innerHeight + 12}
                textAnchor="middle"
                verticalAnchor="start"
                fontSize={10}
                fill="currentColor"
                className="text-muted-foreground"
              >
                {formatXAxisLabel(tick)}
              </Text>
            </Group>
          ))}
          
          {/* Background chart (dimmed when selection is active) */}
          <g className={hasAnimated ? "chart-wipe-animation" : ""} opacity={selectionStart !== null && selectionEnd !== null && hasDragged ? 0.25 : 1}>
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
          </g>

          {/* Highlighted selection (full opacity) */}
          {(selectionStart !== null && selectionEnd !== null && hasDragged) && (
            <g
              clipPath="url(#selection-clip)"
              className={hasAnimated ? "chart-wipe-animation" : ""}
            >
              <AreaClosed<PricePoint>
                data={validData}
                x={(d) => dateScale(getDate(d)) ?? 0}
                y={(d) => priceScale(getPrice(d)) ?? 0}
                yScale={priceScale}
                strokeWidth={0}
                stroke={selectionData?.change !== undefined ? (selectionData.change >= 0 ? positiveColor : negativeColor) : lineColor}
                fill={`url(#${selectionData?.change !== undefined ? (selectionData.change >= 0 ? 'positive-gradient' : 'negative-gradient') : 'area-gradient'})`}
                curve={curveMonotoneX}
              />
              <LinePath<PricePoint>
                data={validData}
                x={(d) => dateScale(getDate(d)) ?? 0}
                y={(d) => priceScale(getPrice(d)) ?? 0}
                stroke={selectionData?.change !== undefined ? (selectionData.change >= 0 ? positiveColor : negativeColor) : lineColor}
                strokeWidth={1.5}
                curve={curveMonotoneX}
              />
            </g>
          )}

          {/* Selection boundary lines */}
          {(selectionStart !== null && selectionEnd !== null && hasDragged && selectionData) && (
            <>
              <Line
                from={{ x: Math.min(selectionStart - margin.left, selectionEnd - margin.left), y: 0 }}
                to={{ x: Math.min(selectionStart - margin.left, selectionEnd - margin.left), y: innerHeight }}
                stroke={selectionData.change >= 0 ? positiveColor : negativeColor}
                strokeWidth={1.5}
                strokeOpacity={0.6}
                pointerEvents="none"
              />
              <Line
                from={{ x: Math.max(selectionStart - margin.left, selectionEnd - margin.left), y: 0 }}
                to={{ x: Math.max(selectionStart - margin.left, selectionEnd - margin.left), y: innerHeight }}
                stroke={selectionData.change >= 0 ? positiveColor : negativeColor}
                strokeWidth={1.5}
                strokeOpacity={0.6}
                pointerEvents="none"
              />
            </>
          )}

          {/* Tooltip vertical line */}
          {tooltipData && !isSelecting && (
            <Line
              from={{ x: tooltipLeft!, y: 0 }}
              to={{ x: tooltipLeft!, y: innerHeight }}
              stroke={lineColor}
              strokeWidth={1}
              strokeOpacity={0.5}
              pointerEvents="none"
            />
          )}
          
          {/* Tooltip dot */}
          {tooltipData && tooltipLeft !== null && tooltipTop !== null && !isSelecting && (
            <circle
              cx={tooltipLeft}
              cy={tooltipTop}
              r={4}
              fill={lineColor}
              stroke="white"
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
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleMouseMove}
            onTouchMove={handleMouseMove}
            style={{ cursor: isSelecting ? 'col-resize' : (selectionStart !== null && selectionEnd !== null && hasDragged) ? 'pointer' : 'none' }}
          />
        </Group>
      </svg>
      
      {/* Regular tooltip with fixed y position */}
      {tooltipData && !isSelecting && !selectionData && (
        <div
          className="absolute pointer-events-none bg-background border border-border p-2 rounded-md text-xs shadow-lg z-30 select-none"
          style={{
            left: tooltipLeft! + margin.left,
            top: margin.top - 24,
            transform: 'translateX(-50%)',
            minWidth: '100px',
            userSelect: 'none',
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

      {/* Selection tooltip */}
      {selectionData && selectionStart !== null && selectionEnd !== null && hasDragged && (
        <div
          className="absolute bg-background border border-border p-3 rounded-lg text-xs shadow-lg z-30 select-none"
          style={{
            left: Math.min(selectionStart, selectionEnd) + Math.abs(selectionEnd - selectionStart) / 2,
            top: margin.top - 80,
            transform: 'translateX(-50%)',
            minWidth: '200px',
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        >
          <div className="text-muted-foreground mb-1 text-left">
            {formatTooltipDate(selectionData.startPoint.date)} - {formatTooltipDate(selectionData.endPoint.date)}
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Change:</span>
              <span className={`font-medium ${selectionData.change >= 0 ? 'text-chart-2' : 'text-chart-1'}`}>
                {selectionData.change >= 0 ? '+' : '-'}{formatTooltipPrice(Math.abs(selectionData.change))} ({Math.abs(selectionData.changePercentage).toFixed(2)}%)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">From:</span>
              <span className="font-medium">{formatTooltipPrice(selectionData.startPoint.price)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">To:</span>
              <span className="font-medium">{formatTooltipPrice(selectionData.endPoint.price)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Drag selection hint */}
      {isChartHovered && !isSelecting && !selectionData && (
        <div
          className="absolute text-xs text-muted-foreground/60 pointer-events-none z-20 select-none transition-opacity duration-200"
          style={{
            left: margin.left + 8,
            bottom: 32,
          }}
        >
          Drag to select range
        </div>
      )}
      
      {/* Left gradient fade overlay */}
      <div 
        className="absolute top-0 left-0 bottom-0 w-32 pointer-events-none z-10 bg-gradient-to-r from-background via-background/40 to-transparent"
      />
    </div>
  );
}

// The main component that handles responsive behavior
export function PriceChart({ data, currentPrice, priceChange, days, selectedRange, isFirstLoad }: PriceChartProps) {
  // Calculate change based on selected time period for color determination
  const calculatePeriodChange = (data: PricePoint[]) => {
    if (!data || data.length < 2) return 0;
    
    const currentPrice = data[data.length - 1]?.price;
    const startPrice = data[0]?.price;
    
    if (!currentPrice || !startPrice) return 0;
    
    return ((currentPrice - startPrice) / startPrice) * 100;
  };

  const periodChangePercentage = calculatePeriodChange(data);
  const isPositiveChange = periodChangePercentage >= 0;
  
  return (
    <div className="w-full h-60">
      <ParentSize>
        {({ width }) => {
          const chartWidth = width || 800;
          const chartHeight = 240;
          
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
              isFirstLoad={isFirstLoad}
            />
          );
        }}
      </ParentSize>
    </div>
  );
}