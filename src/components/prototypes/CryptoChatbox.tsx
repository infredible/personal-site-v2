'use client'

import { useState } from 'react';
import { ChevronDown, Send } from 'lucide-react';

// Network configurations
const NETWORKS = [
  { id: 'all', name: 'All Networks', icon: '🌐', color: 'text-muted-foreground' },
  { id: 'ethereum', name: 'Ethereum', icon: '⟠', color: 'text-blue-500' },
  { id: 'unichain', name: 'Unichain', icon: '🦄', color: 'text-pink-500' },
  { id: 'base', name: 'Base', icon: '🔵', color: 'text-blue-600' },
  { id: 'arbitrum', name: 'Arbitrum', icon: '🔷', color: 'text-blue-400' },
  { id: 'polygon', name: 'Polygon', icon: '⬟', color: 'text-purple-500' },
  { id: 'optimism', name: 'Optimism', icon: '🔴', color: 'text-red-500' },
];

// AI Model configurations  
const AI_MODELS = [
  { id: 'auto', name: 'Auto', description: 'Best model for the task', icon: '✨' },
  { id: 'gpt-5', name: 'GPT-5', description: 'Latest OpenAI model', icon: '🤖' },
  { id: 'gpt-4', name: 'GPT-4', description: 'Advanced reasoning', icon: '🧠' },
  { id: 'gpt-4o', name: 'GPT-4o', description: 'Optimized for speed', icon: '⚡' },
  { id: 'claude-4-sonnet', name: 'Claude 4 Sonnet', description: 'Balanced performance', icon: '📝' },
  { id: 'claude-4.1-opus', name: 'Claude 4.1 Opus', description: 'Highest capability', icon: '🎭' },
];

interface DropdownProps {
  label: string;
  value: string;
  options: typeof NETWORKS | typeof AI_MODELS;
  onSelect: (value: string) => void;
  className?: string;
}

function Dropdown({ label, value, options, onSelect, className = '' }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(opt => opt.id === value);

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-muted rounded-full text-sm font-medium hover:bg-muted/80 transition-colors"
      >
        <span className="text-sm">{selectedOption?.icon}</span>
        <span>{selectedOption?.name}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown menu */}
          <div className="absolute top-full left-0 mt-2 bg-background border border-border rounded-lg shadow-lg z-20 min-w-[200px] max-h-60 overflow-y-auto">
            {options.map((option) => (
              <button
                key={option.id}
                onClick={() => {
                  onSelect(option.id);
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted transition-colors first:rounded-t-lg last:rounded-b-lg"
              >
                <span className="text-sm">{option.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{option.name}</div>
                  {'description' in option && option.description && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {option.description}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function CryptoChatbox() {
  const [selectedNetwork, setSelectedNetwork] = useState('all');
  const [selectedModel, setSelectedModel] = useState('auto');
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = () => {
    if (inputValue.trim()) {
      setIsTyping(true);
      // Simulate AI thinking
      setTimeout(() => {
        setIsTyping(false);
        setInputValue('');
      }, 1500);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="prototype-container flex flex-col items-center min-h-[500px] p-8">
      {/* Clean, Minimal Chat Interface */}
      <div className="w-full max-w-3xl space-y-4">
        {/* Main Input Area */}
        <div className="relative">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What do you want to do onchain today?"
            className="w-full min-h-[80px] p-4 pb-12 pr-12 bg-background border border-border rounded-2xl resize-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none placeholder:text-muted-foreground text-base leading-relaxed"
            disabled={isTyping}
          />
          
          {/* Controls inside input - bottom left */}
          <div className="absolute bottom-3 left-3 flex gap-2 items-center">
            <Dropdown
              label="Network"
              value={selectedNetwork}
              options={NETWORKS}
              onSelect={setSelectedNetwork}
            />
            <Dropdown
              label="Model"
              value={selectedModel}
              options={AI_MODELS}
              onSelect={setSelectedModel}
            />
          </div>
          
          {/* Send Button - bottom right */}
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isTyping}
            className="absolute bottom-3 right-3 p-2 bg-foreground text-background rounded-full hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {/* Status indicator */}
        {isTyping && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span>AI is thinking...</span>
          </div>
        )}
      </div>

      {/* Caption */}
      <p className="text-sm text-muted-foreground max-w-3xl text-left mt-12 leading-relaxed">
        A crypto-focused AI chat interface with network and model selection. Explores conversational UX patterns for blockchain interactions and multi-model AI assistance.
      </p>
    </div>
  );
}
