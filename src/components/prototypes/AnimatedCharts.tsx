'use client'

import { useState } from 'react';

interface DataPoint {
  label: string;
  value: number;
  color: string;
}

export function AnimatedCharts() {
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');
  const [data] = useState<DataPoint[]>([
    { label: 'Design', value: 35, color: 'bg-blue-500' },
    { label: 'Engineering', value: 45, color: 'bg-green-500' },
    { label: 'Product', value: 20, color: 'bg-purple-500' },
  ]);

  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <div className="prototype-container flex flex-col items-center min-h-[500px] p-8">
      <h3 className="text-xl font-medium mb-8">Animated Chart Transitions</h3>
      
      {/* Chart type switcher */}
      <div className="flex gap-2 mb-8 p-1 bg-muted rounded-lg">
        <button
          onClick={() => setChartType('bar')}
          className={`px-4 py-2 rounded-md font-medium transition-all duration-200 ${
            chartType === 'bar' 
              ? 'bg-background shadow-sm' 
              : 'hover:bg-background/50'
          }`}
        >
          Bar Chart
        </button>
        <button
          onClick={() => setChartType('pie')}
          className={`px-4 py-2 rounded-md font-medium transition-all duration-200 ${
            chartType === 'pie' 
              ? 'bg-background shadow-sm' 
              : 'hover:bg-background/50'
          }`}
        >
          Pie Chart
        </button>
      </div>

      {/* Chart container */}
      <div className="w-full max-w-md h-80 flex items-end justify-center relative">
        {chartType === 'bar' ? (
          // Bar Chart
          <div className="flex items-end gap-4 h-full">
            {data.map((item, index) => (
              <div key={item.label} className="flex flex-col items-center gap-2">
                <div className="text-sm font-medium">{item.value}%</div>
                <div 
                  className={`w-16 ${item.color.replace('bg-', 'bg-')} rounded-t-md transition-all duration-700 ease-out`}
                  style={{
                    height: `${(item.value / maxValue) * 200}px`,
                    transitionDelay: `${index * 100}ms`
                  }}
                />
                <div className="text-sm text-muted-foreground">{item.label}</div>
              </div>
            ))}
          </div>
        ) : (
          // Pie Chart (simplified as segments)
          <div className="relative w-48 h-48">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              {data.map((item, index) => {
                const total = data.reduce((sum, d) => sum + d.value, 0);
                const percentage = item.value / total;
                const angle = percentage * 360;
                const startAngle = data.slice(0, index).reduce((sum, d) => sum + (d.value / total) * 360, 0);
                
                const radius = 35;
                const centerX = 50;
                const centerY = 50;
                
                const startAngleRad = (startAngle - 90) * (Math.PI / 180);
                const endAngleRad = (startAngle + angle - 90) * (Math.PI / 180);
                
                const x1 = centerX + radius * Math.cos(startAngleRad);
                const y1 = centerY + radius * Math.sin(startAngleRad);
                const x2 = centerX + radius * Math.cos(endAngleRad);
                const y2 = centerY + radius * Math.sin(endAngleRad);
                
                const largeArc = angle > 180 ? 1 : 0;
                
                const pathData = `
                  M ${centerX} ${centerY}
                  L ${x1} ${y1}
                  A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}
                  Z
                `;

                return (
                  <path
                    key={item.label}
                    d={pathData}
                    fill={item.color.replace('bg-', '').replace('blue', '#3b82f6').replace('green', '#10b981').replace('purple', '#8b5cf6')}
                    className="transition-all duration-700 ease-out"
                    style={{ transitionDelay: `${index * 150}ms` }}
                  />
                );
              })}
            </svg>
            
            {/* Legend */}
            <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 flex gap-4">
              {data.map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-sm">
                  <div className={`w-3 h-3 ${item.color} rounded`} />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <p className="text-sm text-muted-foreground max-w-md text-center mt-8">
        Smooth transitions between chart types with staggered animations for better visual hierarchy.
      </p>
    </div>
  );
}
