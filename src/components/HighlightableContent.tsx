'use client';
import React, { useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Sparkles } from "lucide-react";

// Orange highlight color
const HIGHLIGHT_COLOR = "rgba(255, 140, 0, 0.35)";

interface HighlightableContentProps {
  children: React.ReactNode;
}

interface HighlightState {
  text: string;
  rect: DOMRect | null;
}

export const HighlightableContent: React.FC<HighlightableContentProps> = ({ children }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [highlight, setHighlight] = useState<HighlightState | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // Only enable on desktop
  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 768;

  // Store last mouse position for fallback
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isDesktop) return;
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    if (!isDesktop) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setHighlight(null);
      setPopoverOpen(false);
      return;
    }
    const text = selection.toString();
    if (!text.trim()) {
      setHighlight(null);
      setPopoverOpen(false);
      return;
    }
    const range = selection.getRangeAt(0);
    let rect: DOMRect | null = null;
    const clientRects = Array.from(range.getClientRects());
    if (clientRects.length > 0) {
      // Calculate bounding box for all rects
      const minLeft = Math.min(...clientRects.map(r => r.left));
      const maxRight = Math.max(...clientRects.map(r => r.right));
      const minTop = Math.min(...clientRects.map(r => r.top));
      const width = maxRight - minLeft;
      // Notion-style: center horizontally above selection, just above minTop
      rect = {
        left: minLeft,
        right: maxRight,
        top: minTop,
        bottom: minTop, // not used
        width,
        height: 0,
        x: minLeft,
        y: minTop,
        toJSON: () => ({}),
      };
    } else if (mousePos) {
      // Fallback to mouse position if available
      rect = {
        left: mousePos.x,
        top: mousePos.y,
        right: mousePos.x,
        bottom: mousePos.y,
        width: 0,
        height: 0,
        x: mousePos.x,
        y: mousePos.y,
        toJSON: () => ({}),
      };
    }
    setHighlight({ text, rect });
    setPopoverOpen(true);
  };

  // Dismiss popover on click outside or Escape
  React.useEffect(() => {
    if (!popoverOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (contentRef.current && !contentRef.current.contains(e.target as Node)) {
        setPopoverOpen(false);
        setHighlight(null);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPopoverOpen(false);
        setHighlight(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [popoverOpen]);

  // Listen for selection changes to clear highlight and popover
  React.useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setHighlight(null);
        setPopoverOpen(false);
      }
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);

  // Ensure closing the popover also clears the highlight
  const handlePopoverOpenChange = (open: boolean) => {
    setPopoverOpen(open);
    if (!open) {
      setHighlight(null);
    }
  };

  // Clamp popover to viewport and center horizontally above selection
  const getPopoverStyle = () => {
    if (!highlight || !highlight.rect) return { display: 'none' };
    const padding = 8;
    const width = 180; // estimated popover width
    const height = 30; // estimated popover height
    // Center horizontally above selection
    const centerX = highlight.rect.left + highlight.rect.width / 2;
    let left = centerX - width / 2;
    let top = highlight.rect.top - height - padding;
    // Clamp left
    left = Math.max(padding, Math.min(left, window.innerWidth - width - padding));
    // Clamp top
    top = Math.max(padding, top);
    return {
      position: "fixed" as const,
      left,
      top,
      zIndex: 30,
    };
  };

  React.useEffect(() => {
    if (!highlight) {
      setPopoverOpen(false);
    }
  }, [highlight]);

  return (
    <div
      ref={contentRef}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      style={{ position: "relative" }}
    >
      {children}
      {highlight && highlight.rect && popoverOpen && (
        <Popover open={popoverOpen} onOpenChange={handlePopoverOpenChange}>
          <PopoverTrigger asChild>
            <button
              style={getPopoverStyle()}
              className="rounded-md bg-popover shadow-md/6 border px-3 py-1 cursor-pointer
               flex items-center gap-2 text-sm font-medium text-popover-foreground hover:scale-102 hover:bg-secondary transition-all duration-200"
              tabIndex={-1}
            >
              <Sparkles className="w-3.5 h-3.5 text-popover-foreground" />
              <span>Learn more</span>
            </button>
          </PopoverTrigger>
          {/* <PopoverContent side="bottom" align="start">
            <span className="text-muted-foreground">Coming soon: LLM explanation here.</span>
          </PopoverContent> */}
        </Popover>
      )}
    </div>
  );
}; 