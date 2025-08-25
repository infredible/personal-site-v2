'use client'

import { useState, useEffect } from 'react';
import { ChevronRight, X } from 'lucide-react';
import { PrototypeCategory } from '@/app/lib/prototypes';

interface PrototypeDrawerProps {
  categories: PrototypeCategory[];
  selectedPrototype: string | null;
  onSelectPrototype: (prototypeId: string) => void;
}

export function PrototypeDrawer({ categories, selectedPrototype, onSelectPrototype }: PrototypeDrawerProps) {
  const [isOpen, setIsOpen] = useState(true);

  // Load drawer state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('prototype-drawer-open');
    if (saved !== null) {
      setIsOpen(JSON.parse(saved));
    }
  }, []);

  // Save drawer state to localStorage
  useEffect(() => {
    localStorage.setItem('prototype-drawer-open', JSON.stringify(isOpen));
  }, [isOpen]);

  // Flatten all prototypes from all categories
  const allPrototypes = categories.flatMap(category => category.prototypes);

  return (
    <>
      {/* Drawer */}
      <div
        className={`fixed left-2 top-2 bottom-2 bg-background border border-border rounded-lg shadow-lg transition-transform duration-300 ease-out z-40 flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ width: '320px' }}
      >
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Playground</h2>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md hover:bg-muted transition-colors"
              aria-label="Close drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Prototypes List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-2">
            {allPrototypes.map((prototype) => (
              <button
                key={prototype.id}
                onClick={() => onSelectPrototype(prototype.id)}
                className={`block w-full text-left p-3 rounded-md text-sm transition-colors ${
                  selectedPrototype === prototype.id
                    ? 'bg-muted text-foreground'
                    : 'hover:bg-muted/50'
                }`}
              >
                <div className="font-medium">{prototype.title}</div>
                <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                  {prototype.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed left-4 top-4 z-50 p-2 bg-background border border-border rounded-md shadow-sm hover:bg-muted transition-all duration-300 ${
          isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        aria-label="Open prototypes drawer"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
