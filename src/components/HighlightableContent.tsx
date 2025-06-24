'use client';
import React, { useRef, useState } from "react";
import { Sparkles } from "lucide-react";

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
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState("");

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
      resetStates();
      return;
    }
    const text = selection.toString();
    if (!text.trim()) {
      setHighlight(null);
      setPopoverOpen(false);
      resetStates();
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
    resetStates(); // Reset all explanation states
  };

  // Reset all explanation states
  const resetStates = () => {
    setLoading(false);
    setStreaming(false);
    setStreamedText("");
  };

  // Dismiss popover on click outside or Escape
  React.useEffect(() => {
    if (!popoverOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (contentRef.current && !contentRef.current.contains(e.target as Node)) {
        setPopoverOpen(false);
        setHighlight(null);
        resetStates();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPopoverOpen(false);
        setHighlight(null);
        resetStates();
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
        resetStates();
      }
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);

  // Simulate loading and streaming
  const handleShowExplanation = async () => {
    if (!highlight?.text) return;
    
    setLoading(true);
    setStreamedText("");
    
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          highlighted: highlight.text,
          context: getPageTextContent(),
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      if (!res.body) {
        throw new Error("No response body");
      }

      setLoading(false);
      setStreaming(true);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        if (value) {
          const chunk = decoder.decode(value);
          setStreamedText((prev) => prev + chunk);
        }
        done = doneReading;
      }

      setStreaming(false);
    } catch (err) {
      console.error('Error fetching explanation:', err);
      setLoading(false);
      setStreaming(false);
      setStreamedText("Sorry, there was an error fetching the explanation. Please try again.");
    }
  };

  // Helper to get the full page text content for context
  const getPageTextContent = () => {
    if (!contentRef.current) return "";
    return contentRef.current.innerText || "";
  };

  // Get positioning for the container (unified for both states)
  const getContainerStyle = () => {
    if (!highlight || !highlight.rect) return { display: 'none' };
    const padding = 8;
    
    // Dynamic positioning based on state
    const centerX = highlight.rect.left + highlight.rect.width / 2;
    const top = highlight.rect.top - padding;
    
    if (showContainer) {
      // Explanation container positioning with fixed width
      const containerWidth = 380;
      let left = centerX - containerWidth / 2;
      left = Math.max(padding, Math.min(left, window.innerWidth - containerWidth - padding));
      
      return {
        position: "fixed" as const,
        left,
        top,
        zIndex: 30,
        transform: 'translateY(-100%)',
        width: containerWidth,
        transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
      };
    } else {
      // Button positioning - let it size naturally, then center
      return {
        position: "fixed" as const,
        left: centerX,
        top,
        zIndex: 30,
        transform: 'translate(-50%, -100%)',
        transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
      };
    }
  };

  React.useEffect(() => {
    if (!highlight) {
      setPopoverOpen(false);
      resetStates();
    }
  }, [highlight]);

  const showContainer = loading || streaming || streamedText;

  return (
    <div
      ref={contentRef}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      style={{ position: "relative" }}
    >
      {children}
      {highlight && highlight.rect && popoverOpen && (
        // Single morphing container
        <div
          style={getContainerStyle()}
          className={`
            rounded-lg bg-popover shadow-lg border text-sm text-popover-foreground
            transition-all duration-80 ease-out overflow-hidden
            ${showContainer ? 'p-4' : 'p-0.5'}
          `}
        >
          {!showContainer ? (
            // Button content
            <button
              className="w-full cursor-pointer flex items-center gap-2 font-medium text-xs py-1 px-2 text-popover-foreground rounded-sm hover:bg-secondary transition-transform duration-80"
              onClick={handleShowExplanation}
              disabled={loading}
            >
              <Sparkles className="w-3.5 h-3.5 text-popover-foreground" />
              <span>Learn more</span>
            </button>
          ) : (
            // Explanation content
            <div className="max-w-sm">
              <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
                <Sparkles className="w-3 h-3" />
                <span>Explanation</span>
                {streaming && (
                  <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
                )}
              </div>
              
              {loading && (
                <div className="flex items-center gap-2 text-muted-foreground animate-in fade-in-0 duration-200">
                  <span className="w-4 h-4 animate-spin border-2 border-yellow-400 border-t-transparent rounded-full"></span>
                  <span>Generating explanation…</span>
                </div>
              )}
              
              {(streaming || streamedText) && (
                <div className="animate-in fade-in-0 slide-in-from-top-1 duration-500">
                  <p className="leading-relaxed">
                    {streamedText}
                    {streaming && <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1"></span>}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 