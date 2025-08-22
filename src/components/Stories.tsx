"use client";

import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Story {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  objectFit: 'cover' | 'contain';
  padding?: string;
}

interface StoriesProps {
  stories: Story[];
}

export function Stories({ stories }: StoriesProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [supportsHover, setSupportsHover] = useState(false);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection observer for lazy loading
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          // Disconnect observer after first intersection for performance
          observer.disconnect();
        }
      },
      {
        root: null,
        rootMargin: '50px', // Start loading 50px before visible
        threshold: 0.1
      }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Detect if device supports hover
  useEffect(() => {
    const checkHover = () => {
      setSupportsHover(window.matchMedia('(hover: hover)').matches);
    };
    
    checkHover();
    const mediaQuery = window.matchMedia('(hover: hover)');
    mediaQuery.addEventListener('change', checkHover);
    
    return () => mediaQuery.removeEventListener('change', checkHover);
  }, []);

  // Safe play function that handles DOM removal
  const safePlay = async (video: HTMLVideoElement) => {
    try {
      // Check if video is still connected to DOM
      if (!video.isConnected) return;
      
      // Wait for any pending play promise to resolve
      if (playPromiseRef.current) {
        try {
          await playPromiseRef.current;
        } catch {
          // Ignore errors from previous play attempts
        }
      }
      
      // Start new play promise
      playPromiseRef.current = video.play();
      await playPromiseRef.current;
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      // Only log non-abort errors
      if (err.name !== 'AbortError' && !err.message.includes('removed from the document')) {
        console.error('Video play error:', err);
      }
    } finally {
      playPromiseRef.current = null;
    }
  };

  // Safe pause function
  const safePause = (video: HTMLVideoElement) => {
    if (!video.isConnected) return;
    
    // Cancel any pending play promise
    if (playPromiseRef.current) {
      playPromiseRef.current = null;
    }
    
    video.pause();
  };

  // Handle video time update for progress tracking
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoLoaded) return;

    const handleTimeUpdate = () => {
      if (!video.isConnected) return;
      const currentProgress = (video.currentTime / video.duration) * 100;
      setProgress(currentProgress);
    };

    const handleEnded = () => {
      if (!video.isConnected) return;
      // Auto-advance to next story
      if (currentIndex < stories.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setProgress(0);
      } else {
        // Loop back to first story
        setCurrentIndex(0);
        setProgress(0);
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);

    return () => {
      if (video.isConnected) {
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('ended', handleEnded);
      }
    };
  }, [currentIndex, stories.length, videoLoaded]);

  // Load video when intersection is detected
  useEffect(() => {
    if (isIntersecting && !videoLoaded) {
      setVideoLoaded(true);
    }
  }, [isIntersecting, videoLoaded]);

  // Reset progress when story changes
  useEffect(() => {
    setProgress(0);
    const video = videoRef.current;
    if (!video || !videoLoaded) return;

    video.currentTime = 0;
    safePlay(video);
  }, [currentIndex, videoLoaded]);

  // Handle play/pause on hover (only on devices that support hover)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !supportsHover) return;

    if (isHovered) {
      safePause(video);
    } else {
      safePlay(video);
    }
  }, [isHovered, supportsHover]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playPromiseRef.current) {
        playPromiseRef.current = null;
      }
    };
  }, []);

  const goToPrevious = () => {
    setCurrentIndex(currentIndex > 0 ? currentIndex - 1 : stories.length - 1);
  };

  const goToNext = () => {
    setCurrentIndex(currentIndex < stories.length - 1 ? currentIndex + 1 : 0);
  };

  // Handle mouse events (only on devices that support hover)
  const handleMouseEnter = () => {
    if (supportsHover) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    if (supportsHover) {
      setIsHovered(false);
    }
  };

  // Handle touch events for mobile
  const handleTouchStart = () => {
    // Clear any hover state on touch
    setIsHovered(false);
    
    // Ensure video continues playing after touch on mobile
    const video = videoRef.current;
    if (video && !supportsHover) {
      // Small delay to ensure touch interaction is complete
      setTimeout(() => {
        safePlay(video);
      }, 100);
    }
  };

  const currentStory = stories[currentIndex];

  return (
    <div className="w-full mb-24">
      <div 
        ref={containerRef}
        className="relative w-full aspect-video rounded-2xl overflow-hidden border-2 border-surface-3 shadow-lg bg-black group"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
      >
        {/* Progress indicators */}
        <div className="absolute top-4 left-4 right-4 z-20 flex gap-1.5">
          {stories.map((_, index) => (
            <div key={index} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white rounded-full transition-all duration-100 ease-linear"
                style={{
                  width: index < currentIndex ? '100%' : 
                         index === currentIndex ? `${progress}%` : '0%'
                }}
              />
            </div>
          ))}
        </div>

        {/* Video - Only load when component is visible */}
        {videoLoaded ? (
          <video
            ref={videoRef}
            src={currentStory.videoUrl}
            className="w-full h-full"
            style={{ 
              objectFit: currentStory.objectFit,
              padding: currentStory.padding || '0'
            }}
            muted
            playsInline
            preload="none"
          />
        ) : (
          <div 
            className="w-full h-full bg-gray-900"
            style={{ 
              padding: currentStory.padding || '0'
            }}
          />
        )}

        {/* Navigation arrows - hidden on mobile, visible on hover for desktop */}
        <div 
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 transition-opacity duration-200"
          style={{
            opacity: supportsHover && isHovered ? 1 : 0
          }}
        >
          <button
            onClick={goToPrevious}
            className="p-2 rounded-full bg-black/20 text-white hover:bg-black/40 transition-colors cursor-pointer"
            aria-label="Previous story"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>
        
        <div 
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 transition-opacity duration-200"
          style={{
            opacity: supportsHover && isHovered ? 1 : 0
          }}
        >
          <button
            onClick={goToNext}
            className="p-2 rounded-full bg-black/20 text-white hover:bg-black/40 transition-colors cursor-pointer"
            aria-label="Next story"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Click areas for navigation */}
        <button
          className="absolute left-0 top-0 w-1/3 h-full z-10 cursor-pointer"
          onClick={goToPrevious}
          aria-label="Previous story"
        />
        <button
          className="absolute right-0 top-0 w-1/3 h-full z-10 cursor-pointer"
          onClick={goToNext}
          aria-label="Next story"
        />
      </div>

    </div>
  );
} 