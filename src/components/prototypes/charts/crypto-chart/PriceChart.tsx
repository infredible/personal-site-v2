'use client'

import { useMemo, useCallback } from 'react';
import { AreaClosed, Line, Bar } from '@visx/shape';
import { curveMonotoneX } from '@visx/curve';
import { GridRows, GridColumns } from '@visx/grid';
import { scaleTime, scaleLinear } from '@visx/scale';
import { withTooltip, Tooltip, defaultStyles } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import { LinearGradient } from '@visx/gradient';
import { ParentSize } from '@visx/responsive';
import { extent, bisector } from 'd3-array';
import { timeFormat } from 'd3-time-format';
import { PricePoint } from '../EthereumChart';

interface PriceChartProps {
  data: PricePoint[];
  currentPrice: number | null;
  priceChange: number | null;
  width?: number;
  height?: number;
}

const formatPrice = (price: number) => 
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);

const formatDate = timeFormat('%b %d, %I:%M %p');
const formatAxisDate = timeFormat('%I:%M');

// Tooltip styles
const tooltipStyles = {
  ...defaultStyles,
  minWidth: 60,
  backgroundColor: 'hsl(var(--popover))',
  color: 'hsl(var(--popover-foreground))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  padding: '12px',
  fontSize: '14px',
  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
};

const bisectDate = bisector<PricePoint, Date>((d) => d.date).left;

// Accessors
const getDate = (d: PricePoint) => d.date;
const getPrice = (d: PricePoint) => d.price;

function PriceChartInner({
  data,
  currentPrice,
  priceChange,
  width = 800,
  height = 320,
  showTooltip,
  hideTooltip,
  tooltipData,
  tooltipTop = 0,
  tooltipLeft = 0,
}: PriceChartProps & ReturnType<typeof withTooltip<PricePoint>>) {
  const margin = { top: 20, right: 60, bottom: 40, left: 20 };
  const innerWidth = Math.max(0, width - margin.left - margin.right);
  const innerHeight = Math.max(0, height - margin.top - margin.bottom);

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
      <div className="w-full h-80 flex items-center justify-center text-muted-foreground border-2 border-dashed border-muted-foreground/30 rounded-lg">
        <div className="text-center">
          <div className="text-sm">Insufficient data to render chart</div>
          <div className="text-xs mt-1">{validData.length} valid data points</div>
          <div className="text-xs mt-1">Width: {innerWidth}, Height: {innerHeight}</div>
          <div className="text-xs mt-1">Original data: {data.length} points</div>
        </div>
      </div>
    );
  }

  // Determine if price is trending up or down
  const isPositiveTrend = (priceChange || 0) >= 0;
  const chartColor = isPositiveTrend ? '#10b981' : '#ef4444'; // green-500 : red-500

  // Scales
  const dateScale = useMemo(
    () => {
      const dateExtent = extent(validData, getDate) as [Date, Date];
      return scaleTime<number>({
        range: [0, innerWidth],
        domain: dateExtent,
      });
    },
    [innerWidth, validData],
  );

  const priceScale = useMemo(() => {
    const priceExtent = extent(validData, getPrice) as [number, number];
    const padding = Math.max((priceExtent[1] - priceExtent[0]) * 0.1, priceExtent[1] * 0.01);
    
    return scaleLinear<number>({
      range: [innerHeight, 0],
      domain: [
        Math.max(0, priceExtent[0] - padding), 
        priceExtent[1] + padding
      ],
      nice: true,
    });
  }, [innerHeight, validData]);

  // Tooltip handler
  const handleTooltip = useCallback(
    (event: React.TouchEvent<SVGRectElement> | React.MouseEvent<SVGRectElement>) => {
      const { x } = localPoint(event) || { x: 0 };
      const x0 = dateScale.invert(x - margin.left);
      const index = bisectDate(validData, x0, 1);
      const d0 = validData[index - 1];
      const d1 = validData[index];
      let d = d0;

      if (d1 && getDate(d1)) {
        d = x0.valueOf() - getDate(d0).valueOf() > getDate(d1).valueOf() - x0.valueOf() ? d1 : d0;
      }

      if (d) {
        showTooltip({
          tooltipData: d,
          tooltipLeft: dateScale(getDate(d)),
          tooltipTop: priceScale(getPrice(d)),
        });
      }
    },
    [showTooltip, priceScale, dateScale, validData, margin.left],
  );

  // Y-axis labels
  const yAxisValues = priceScale.ticks(6);
  
  // X-axis labels  
  const xAxisValues = dateScale.ticks(5);

  return (
    <div className="relative">
      <svg width={width} height={height}>
        <defs>
          <LinearGradient
            id="area-gradient"
            from={chartColor}
            to={chartColor}
            fromOpacity={0.3}
            toOpacity={0}
          />
        </defs>

        <g transform={`translate(${margin.left}, ${margin.top})`}>
          {/* Grid */}
          <GridRows
            scale={priceScale}
            width={innerWidth}
            stroke="hsl(var(--border))"
            strokeOpacity={0.3}
            pointerEvents="none"
          />
          <GridColumns
            scale={dateScale}
            height={innerHeight}
            stroke="hsl(var(--border))"
            strokeOpacity={0.3}
            pointerEvents="none"
          />

          {/* Area chart */}
          <AreaClosed<PricePoint>
            data={validData}
            x={(d) => dateScale(getDate(d))}
            y={(d) => priceScale(getPrice(d))}
            yScale={priceScale}
            strokeWidth={2}
            stroke={chartColor}
            fill="url(#area-gradient)"
            curve={curveMonotoneX}
          />

          {/* Price line */}
          <Line
            from={{ x: 0, y: 0 }}
            to={{ x: innerWidth, y: 0 }}
            stroke="transparent"
          />

          {/* Y-axis labels */}
          {yAxisValues.map((value, i) => (
            <g key={i}>
              <text
                x={innerWidth + 8}
                y={priceScale(value)}
                dy="0.33em"
                fontSize={12}
                fill="hsl(var(--muted-foreground))"
                textAnchor="start"
              >
                ${value.toLocaleString(undefined, { 
                  minimumFractionDigits: 0, 
                  maximumFractionDigits: 0 
                })}
              </text>
            </g>
          ))}

          {/* X-axis labels */}
          {xAxisValues.map((value, i) => (
            <g key={i}>
              <text
                x={dateScale(value)}
                y={innerHeight + 20}
                fontSize={12}
                fill="hsl(var(--muted-foreground))"
                textAnchor="middle"
              >
                {formatAxisDate(value)}
              </text>
            </g>
          ))}

          {/* Tooltip crosshair */}
          {tooltipData && (
            <g>
              <Line
                from={{ x: tooltipLeft, y: 0 }}
                to={{ x: tooltipLeft, y: innerHeight }}
                stroke={chartColor}
                strokeWidth={1}
                pointerEvents="none"
                strokeDasharray="3,3"
                opacity={0.7}
              />
              <circle
                cx={tooltipLeft}
                cy={tooltipTop}
                r={4}
                fill={chartColor}
                stroke="white"
                strokeWidth={2}
                pointerEvents="none"
              />
            </g>
          )}

          {/* Tooltip overlay */}
          <Bar
            x={0}
            y={0}
            width={innerWidth}
            height={innerHeight}
            fill="transparent"
            onTouchStart={handleTooltip}
            onTouchMove={handleTooltip}
            onMouseMove={handleTooltip}
            onMouseLeave={() => hideTooltip()}
          />
        </g>
      </svg>

      {/* Tooltip */}
      {tooltipData && (
        <Tooltip
          top={tooltipTop + margin.top - 10}
          left={tooltipLeft + margin.left + 10}
          style={tooltipStyles}
        >
          <div>
            <div className="font-medium">
              {formatPrice(getPrice(tooltipData))}
            </div>
            <div className="text-xs opacity-75 mt-1">
              {formatDate(getDate(tooltipData))}
            </div>
          </div>
        </Tooltip>
      )}
    </div>
  );
}

// Create the responsive wrapper component
const PriceChartWithTooltip = withTooltip(PriceChartInner);

export function PriceChart(props: Omit<PriceChartProps, 'width' | 'height'>) {
  return (
    <div className="w-full h-80">
      <ParentSize>
        {({ width, height }) => {
          const chartWidth = width || 800;
          const chartHeight = height || 320;
          
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
            <PriceChartWithTooltip
              {...props}
              width={chartWidth}
              height={chartHeight}
            />
          );
        }}
      </ParentSize>
    </div>
  );
}
