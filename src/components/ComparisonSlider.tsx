'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface ComparisonSliderProps {
  beforeImage: string;
  afterImage: string;
  beforeAlt?: string;
  afterAlt?: string;
  className?: string;
}

type ToggleState = 'none' | 'before' | 'after';

export function ComparisonSlider({
  beforeImage,
  afterImage,
  beforeAlt = "Before",
  afterAlt = "After",
  className = ""
}: ComparisonSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isHovering, setIsHovering] = useState(false);
  const [isTouching, setIsTouching] = useState(false);
  const [activeToggle, setActiveToggle] = useState<ToggleState>('none');
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

  const handleMouseEnter = useCallback(() => {
    if (activeToggle === 'none') {
      setIsHovering(true);
    }
  }, [activeToggle]);

  const handleMouseLeave = useCallback(() => {
    if (activeToggle === 'none') {
      setIsHovering(false);
      setSliderPosition(50); // Reset to center when mouse leaves
    }
  }, [activeToggle]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isHovering && !isTouching && activeToggle === 'none') {
      updatePosition(e.clientX);
    }
  }, [isHovering, isTouching, activeToggle, updatePosition]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (activeToggle === 'none') {
      setIsTouching(true);
      updatePosition(e.touches[0].clientX);
    }
  }, [activeToggle, updatePosition]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isTouching || activeToggle !== 'none') return;
    e.preventDefault();
    updatePosition(e.touches[0].clientX);
  }, [isTouching, activeToggle, updatePosition]);

  const handleTouchEnd = useCallback(() => {
    if (activeToggle === 'none') {
      setIsTouching(false);
      setSliderPosition(50); // Reset to center when touch ends
    }
  }, [activeToggle]);

  const handleBeforeToggle = useCallback(() => {
    if (activeToggle === 'before') {
      // Clicking "Before" when it's active - deactivate and reset
      setActiveToggle('none');
      setSliderPosition(50);
    } else {
      // Clicking "Before" when it's inactive or "After" is active
      setActiveToggle('before');
      setSliderPosition(100); // Show full Before image
    }
  }, [activeToggle]);

  const handleAfterToggle = useCallback(() => {
    if (activeToggle === 'after') {
      // Clicking "After" when it's active - deactivate and reset
      setActiveToggle('none');
      setSliderPosition(50);
    } else {
      // Clicking "After" when it's inactive or "Before" is active
      setActiveToggle('after');
      setSliderPosition(0); // Show full After image
    }
  }, [activeToggle]);

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

  return (
    <div className={`comparison-slider ${className}`}>
      <div
        ref={containerRef}
        className={`relative w-full overflow-hidden rounded-lg select-none bg-black ${
          activeToggle === 'none' ? 'cursor-none' : 'cursor-auto'
        }`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
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
        
        {/* Slider Handle - always visible */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-white/20 z-10 transform -translate-x-0.5 pointer-events-none"
          style={{ left: `${sliderPosition}%` }}
        >
          {/* Handle Circle */}
          {/* <div className="slider-handle absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg border-2 border-gray-200 flex items-center justify-center pointer-events-none">
            <div className="w-1 h-4 bg-gray-400 rounded-full"></div>
            <div className="w-1 h-4 bg-gray-400 rounded-full ml-0.5"></div>
          </div> */}
        </div>
        
        {/* Interactive Toggle Buttons */}
        <div className="slider-labels">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleBeforeToggle();
            }}
            className={`absolute bottom-4 left-4 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 border cursor-pointer ${
              activeToggle === 'before'
                ? 'bg-white text-black border-white shadow-lg'
                : 'bg-black/70 hover:bg-black/90 text-white border-white/20 hover:border-white/40'
            }`}
          >
            Before
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleAfterToggle();
            }}
            className={`absolute bottom-4 right-4 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 border cursor-pointer ${
              activeToggle === 'after'
                ? 'bg-white text-black border-white shadow-lg'
                : 'bg-black/70 hover:bg-black/90 text-white border-white/20 hover:border-white/40'
            }`}
          >
            After
          </button>
        </div>
      </div>
    </div>
  );
} 