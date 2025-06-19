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
  const videoRef = useRef<HTMLVideoElement>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);

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
    if (!video) return;

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
  }, [currentIndex, stories.length]);

  // Reset progress when story changes
  useEffect(() => {
    setProgress(0);
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = 0;
    safePlay(video);
  }, [currentIndex]);

  // Handle play/pause on hover
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isHovered) {
      safePause(video);
    } else {
      safePlay(video);
    }
  }, [isHovered]);

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

  const currentStory = stories[currentIndex];

  return (
    <div className="w-full mb-24">
      <div 
        className="relative w-full aspect-video rounded-2xl overflow-hidden border-2 border-surface-3 shadow-lg bg-black"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
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

        {/* Video */}
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
          preload="metadata"
        />

        {/* Navigation arrows */}
        {isHovered && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/20 text-white hover:bg-black/40 transition-colors cursor-pointer"
              aria-label="Previous story"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/20 text-white hover:bg-black/40 transition-colors cursor-pointer"
              aria-label="Next story"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

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