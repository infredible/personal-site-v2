'use client';
import React, { useRef, useState } from "react";

// Orange highlight color
const HIGHLIGHT_COLOR = "rgba(255, 140, 0, 0.35)";

interface HighlightableContentProps {
  children: React.ReactNode;
}

export const HighlightableContent: React.FC<HighlightableContentProps> = ({ children }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [highlight, setHighlight] = useState<{
    text: string;
    rect: DOMRect | null;
  } | null>(null);

  // Only enable on desktop
  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 768;

  const handleMouseUp = () => {
    if (!isDesktop) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setHighlight(null);
      return;
    }
    const text = selection.toString();
    if (!text.trim()) {
      setHighlight(null);
      return;
    }
    // Get the bounding rect of the selection
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setHighlight({ text, rect });
    // Optionally, clear the selection (for now, keep it)
  };

  return (
    <div
      ref={contentRef}
      onMouseUp={handleMouseUp}
      style={{ position: "relative" }}
    >
      {children}
      {/* No highlight overlay here; only popover logic will use highlight state */}
    </div>
  );
}; 