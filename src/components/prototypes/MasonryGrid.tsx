'use client'

import { useState, useRef, useEffect } from 'react';

interface GridItem {
  id: string;
  text: string;
  height: number;
  color: string;
}

export function MasonryGrid() {
  const [items, setItems] = useState<GridItem[]>([
    { id: '1', text: 'Short item', height: 100, color: 'bg-blue-500' },
    { id: '2', text: 'Medium height item with more content', height: 150, color: 'bg-green-500' },
    { id: '3', text: 'Tall item with lots of content that spans multiple lines to demonstrate the masonry layout behavior', height: 200, color: 'bg-purple-500' },
    { id: '4', text: 'Another short one', height: 80, color: 'bg-yellow-500' },
    { id: '5', text: 'Medium item', height: 120, color: 'bg-red-500' },
    { id: '6', text: 'Extra tall item with even more content to show how the grid adapts to different content lengths and maintains proper spacing', height: 250, color: 'bg-indigo-500' },
    { id: '7', text: 'Small', height: 90, color: 'bg-pink-500' },
    { id: '8', text: 'Regular height item', height: 140, color: 'bg-teal-500' },
  ]);

  const [columns, setColumns] = useState(3);
  const containerRef = useRef<HTMLDivElement>(null);

  // Responsive columns based on container width
  useEffect(() => {
    const updateColumns = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.offsetWidth;
      if (width < 480) {
        setColumns(1);
      } else if (width < 768) {
        setColumns(2);
      } else if (width < 1024) {
        setColumns(3);
      } else {
        setColumns(4);
      }
    };

    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, []);

  const shuffleItems = () => {
    setItems(current => [...current].sort(() => Math.random() - 0.5));
  };

  const addItem = () => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-red-500', 'bg-indigo-500'];
    const newItem: GridItem = {
      id: Date.now().toString(),
      text: `New item ${items.length + 1}`,
      height: Math.floor(Math.random() * 150) + 80,
      color: colors[Math.floor(Math.random() * colors.length)],
    };
    setItems(current => [...current, newItem]);
  };

  const removeItem = (id: string) => {
    setItems(current => current.filter(item => item.id !== id));
  };

  // Calculate positions for masonry layout
  const getItemPositions = () => {
    const columnHeights = new Array(columns).fill(0);
    const positions: { [key: string]: { left: number; top: number } } = {};

    items.forEach((item) => {
      const shortestColumn = columnHeights.indexOf(Math.min(...columnHeights));
      const left = (shortestColumn * 100) / columns;
      const top = columnHeights[shortestColumn];

      positions[item.id] = { left, top };
      columnHeights[shortestColumn] += item.height + 16; // 16px gap
    });

    return {
      positions,
      totalHeight: Math.max(...columnHeights),
    };
  };

  const { positions, totalHeight } = getItemPositions();

  return (
    <div className="prototype-container flex flex-col items-center min-h-[600px] p-8">
      <h3 className="text-xl font-medium mb-8">Dynamic Masonry Grid Layout</h3>
      
      {/* Controls */}
      <div className="flex gap-4 mb-8">
        <button
          onClick={shuffleItems}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
        >
          Shuffle Items
        </button>
        <button
          onClick={addItem}
          className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
        >
          Add Item
        </button>
      </div>

      {/* Masonry Grid */}
      <div 
        ref={containerRef}
        className="relative w-full max-w-4xl"
        style={{ height: `${totalHeight}px` }}
      >
        {items.map((item) => (
          <div
            key={item.id}
            className={`
              absolute ${item.color} text-white rounded-lg p-4 font-medium cursor-pointer
              transition-all duration-500 ease-out hover:scale-105 hover:shadow-lg
              flex items-center justify-center text-center
            `}
            style={{
              left: `${positions[item.id]?.left}%`,
              top: `${positions[item.id]?.top}px`,
              width: `calc(${100 / columns}% - 12px)`,
              height: `${item.height}px`,
            }}
            onClick={() => removeItem(item.id)}
          >
            <div>
              <div className="text-sm mb-2">{item.text}</div>
              <div className="text-xs opacity-75">Click to remove</div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-sm text-muted-foreground max-w-md text-center mt-8">
        Responsive masonry layout that adapts to container width and content height. Items animate smoothly when reordered.
      </p>
    </div>
  );
}
