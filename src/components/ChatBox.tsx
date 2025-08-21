'use client'

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, RotateCcw } from 'lucide-react';

interface ChatBoxProps {
  onTransform: (persona: string) => Promise<void>;
  onReset: () => void;
  isTransformed: boolean;
  isLoading: boolean;
}

export function ChatBox({ onTransform, onReset, isTransformed, isLoading }: ChatBoxProps) {
  const [input, setInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    await onTransform(input.trim());
    setInput('');
    setIsExpanded(false);
    setIsFocused(false);
  };

  const handleReset = () => {
    onReset();
    setInput('');
    setIsExpanded(false);
    setIsFocused(false);
  };

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <AnimatePresence>
        {isTransformed && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={handleReset}
            className="mb-3 px-3 py-2 bg-muted/80 backdrop-blur-sm rounded-full text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 mx-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Back to the old me
          </motion.button>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ width: '280px', scale: 1 }}
        animate={{ 
          width: isExpanded ? '320px' : '280px',
          scale: isFocused ? 1 : 1
        }}
        whileHover={{ scale: 1.01 }}
        transition={{ 
          type: 'spring', 
          stiffness: 300, 
          damping: 30,
          mass: 0.8
        }}
        className="bg-background/80 backdrop-blur-sm border rounded-full shadow-lg overflow-hidden"
      >
        <form onSubmit={handleSubmit} className="flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => {
              setIsExpanded(true);
              setIsFocused(true);
            }}
            onBlur={() => {
              if (!input.trim()) {
                setIsExpanded(false);
              }
              setIsFocused(false);
            }}
            placeholder="Who do you want me to be?"
            disabled={isLoading}
            className="flex-1 px-4 py-3 bg-transparent border-none outline-none placeholder-muted-foreground text-sm disabled:opacity-50"
            autoComplete="off"
            spellCheck="false"
          />
          
          <AnimatePresence>
            {(input.trim() || isExpanded) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ 
                  type: 'spring',
                  stiffness: 400,
                  damping: 25,
                  mass: 0.6
                }}
                className="flex items-center gap-1 pr-2"
              >

                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="p-1.5 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full"
                    />
                  ) : (
                    <ArrowUp className="w-3.5 h-3.5" />
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </motion.div>
    </div>
  );
}
