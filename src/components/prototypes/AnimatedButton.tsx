'use client'

import { useState } from 'react';

export function AnimatedButton() {
  const [isClicked, setIsClicked] = useState(false);

  const handleClick = () => {
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 300);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] gap-8 p-8">
      <h3 className="text-xl font-medium">Interactive Button States</h3>
      
      <div className="flex flex-wrap gap-4 justify-center">
        {/* Scale on hover */}
        <button className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium transition-transform duration-150 hover:scale-[0.96] active:scale-[0.92]">
          Scale Animation
        </button>

        {/* Shimmer effect */}
        <button className="relative px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium overflow-hidden group">
          <span className="relative z-10">Shimmer Effect</span>
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:translate-x-full transition-transform duration-700" />
        </button>

        {/* Ripple effect */}
        <button 
          onClick={handleClick}
          className="relative px-6 py-3 bg-green-500 text-white rounded-lg font-medium overflow-hidden"
        >
          <span className="relative z-10">Ripple Effect</span>
          {isClicked && (
            <div className="absolute inset-0 bg-white/20 rounded-full animate-ping" />
          )}
        </button>

        {/* Morphing border */}
        <button className="px-6 py-3 bg-transparent text-foreground border-2 border-muted-foreground rounded-lg font-medium relative overflow-hidden group transition-colors duration-300 hover:text-white">
          <span className="relative z-10">Morphing Fill</span>
          <div className="absolute inset-0 bg-foreground scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
        </button>
      </div>

      <p className="text-sm text-muted-foreground max-w-md text-center">
        Following interface guidelines: animations under 200ms, proportional scaling (~0.96, not 0.8), and smooth state transitions.
      </p>
    </div>
  );
}
