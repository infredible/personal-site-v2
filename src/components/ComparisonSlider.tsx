'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface ComparisonSliderProps {
  beforeImage: string;
  afterImage: string;
  beforeAlt?: string;
  afterAlt?: string;
  className?: string;
}

export function ComparisonSlider({
  beforeImage,
  afterImage,
  beforeAlt = "Before",
  afterAlt = "After",
  className = ""
}: ComparisonSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [containerHeight, setContainerHeight] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const beforeImgRef = useRef<HTMLImageElement>(null);
  const afterImgRef = useRef<HTMLImageElement>(null);

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    updatePosition(e.clientX);
  }, [updatePosition]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    updatePosition(e.clientX);
  }, [isDragging, updatePosition]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsDragging(true);
    updatePosition(e.touches[0].clientX);
  }, [updatePosition]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    updatePosition(e.touches[0].clientX);
  }, [isDragging, updatePosition]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!isDragging) {
      updatePosition(e.clientX);
    }
  }, [isDragging, updatePosition]);

  const jumpToBefore = useCallback(() => {
    setSliderPosition(0);
  }, []);

  const jumpToAfter = useCallback(() => {
    setSliderPosition(100);
  }, []);

  // Calculate container height based on the taller image
  const handleImageLoad = useCallback(() => {
    if (beforeImgRef.current && afterImgRef.current && containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      
      // Calculate aspect ratios and heights when scaled to container width
      const beforeAspectRatio = beforeImgRef.current.naturalHeight / beforeImgRef.current.naturalWidth;
      const afterAspectRatio = afterImgRef.current.naturalHeight / afterImgRef.current.naturalWidth;
      
      const beforeHeight = containerWidth * beforeAspectRatio;
      const afterHeight = containerWidth * afterAspectRatio;
      
      // Use the height of the taller image
      const maxHeight = Math.max(beforeHeight, afterHeight);
      setContainerHeight(maxHeight);
    }
  }, []);

  // Attach document-level event listeners during drag
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  return (
    <div className={`comparison-slider ${isDragging ? 'dragging' : ''} ${className}`}>
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-lg cursor-col-resize select-none bg-black"
        onMouseDown={handleMouseDown}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        style={{ 
          touchAction: 'none',
          height: containerHeight ? `${containerHeight}px` : 'auto'
        }}
      >
        {/* After Image (base layer - left side) */}
        <img
          ref={afterImgRef}
          src={afterImage}
          alt={afterAlt}
          className="w-full h-full object-contain object-top mt-0"
          style={{
            display: containerHeight ? 'block' : 'none'
          }}
          onLoad={handleImageLoad}
          draggable={false}
        />
        
        {/* Before Image (clipped layer - reveals from right) */}
        <img
          ref={beforeImgRef}
          src={beforeImage}
          alt={beforeAlt}
          className="absolute top-0 left-0 w-full h-full object-contain object-top mt-0"
          style={{
            clipPath: `inset(0px ${100 - sliderPosition}% 0px 0px)`,
            display: containerHeight ? 'block' : 'none'
          }}
          onLoad={handleImageLoad}
          draggable={false}
        />
        
        {/* Loading state - show images normally until we calculate height */}
        {!containerHeight && (
          <>
            <img
              src={afterImage}
              alt={afterAlt}
              className="w-full h-auto block opacity-0"
              draggable={false}
            />
            <img
              src={beforeImage}
              alt={beforeAlt}
              className="w-full h-auto block opacity-0"
              draggable={false}
            />
          </>
        )}
        
        {/* Slider Handle */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-col-resize z-10 transform -translate-x-0.5 pointer-events-none"
          style={{ left: `${sliderPosition}%` }}
        >
          {/* Handle Circle */}
          <div className="slider-handle absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg border-2 border-gray-200 flex items-center justify-center pointer-events-none">
            <div className="w-1 h-4 bg-gray-400 rounded-full"></div>
            <div className="w-1 h-4 bg-gray-400 rounded-full ml-0.5"></div>
          </div>
        </div>
        
        {/* Interactive Label Buttons */}
        <div className="slider-labels">
          <button
            onClick={(e) => {
              e.stopPropagation();
              jumpToBefore();
            }}
            className="absolute bottom-4 left-4 bg-black/70 hover:bg-black/90 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 border border-white/20 hover:border-white/40"
          >
            Before
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              jumpToAfter();
            }}
            className="absolute bottom-4 right-4 bg-black/70 hover:bg-black/90 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 border border-white/20 hover:border-white/40"
          >
            After
          </button>
        </div>
      </div>
    </div>
  );
} 