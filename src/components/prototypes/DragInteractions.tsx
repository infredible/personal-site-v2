'use client'

import { useState, useRef } from 'react';

interface DragItem {
  id: string;
  text: string;
  color: string;
}

export function DragInteractions() {
  const [items] = useState<DragItem[]>([
    { id: '1', text: 'Drag me around', color: 'bg-blue-500' },
    { id: '2', text: 'I can be dragged too', color: 'bg-green-500' },
    { id: '3', text: 'Try dragging this', color: 'bg-purple-500' },
  ]);
  
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent, itemId: string) => {
    e.preventDefault();
    setDraggedItem(itemId);
    
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggedItem || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - containerRect.left - dragOffset.x;
    const y = e.clientY - containerRect.top - dragOffset.y;

    const draggedElement = document.getElementById(`drag-item-${draggedItem}`);
    if (draggedElement) {
      draggedElement.style.transform = `translate(${x}px, ${y}px)`;
    }
  };

  const handleMouseUp = () => {
    setDraggedItem(null);
  };

  return (
    <div className="prototype-container flex flex-col items-center min-h-[400px] p-8">
      <h3 className="text-xl font-medium mb-8">Drag & Drop Interface</h3>
      
      <div 
        ref={containerRef}
        className="relative w-full max-w-2xl h-80 border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div className="absolute inset-4 text-muted-foreground text-sm text-center">
          Drag the items around within this container
        </div>
        
        {items.map((item, index) => (
          <div
            key={item.id}
            id={`drag-item-${item.id}`}
            className={`
              absolute px-4 py-2 ${item.color} text-white rounded-lg font-medium cursor-grab active:cursor-grabbing
              transition-shadow duration-200 select-none
              ${draggedItem === item.id ? 'shadow-xl scale-105 z-10' : 'shadow-md hover:shadow-lg'}
            `}
            style={{
              left: `${20 + index * 120}px`,
              top: `${100 + index * 40}px`,
            }}
            onMouseDown={(e) => handleMouseDown(e, item.id)}
          >
            {item.text}
          </div>
        ))}
      </div>

      <p className="text-sm text-muted-foreground max-w-md text-center mt-8">
        Custom drag implementation with visual feedback, proper cursor states, and smooth transitions.
      </p>
    </div>
  );
}
