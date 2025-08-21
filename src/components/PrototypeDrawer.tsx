'use client'

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { PrototypeCategory, Prototype } from '@/app/lib/prototypes';

interface PrototypeDrawerProps {
  categories: PrototypeCategory[];
  selectedPrototype: string | null;
  onSelectPrototype: (prototypeId: string) => void;
}

export function PrototypeDrawer({ categories, selectedPrototype, onSelectPrototype }: PrototypeDrawerProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['interaction-design']));

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

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const filteredCategories = categories.map(category => ({
    ...category,
    prototypes: category.prototypes.filter(prototype =>
      prototype.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prototype.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prototype.metadata.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  })).filter(category => category.prototypes.length > 0);

  const clearSearch = () => {
    setSearchQuery('');
  };

  return (
    <>
      {/* Drawer */}
      <div
        className={`fixed left-0 top-0 h-full bg-background border-r border-border transition-transform duration-300 ease-out z-40 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ width: '320px' }}
      >
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium">Prototypes</h2>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md hover:bg-muted transition-colors"
              aria-label="Close drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search prototypes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2 text-sm bg-muted rounded-md border-0 focus:ring-2 focus:ring-ring focus:ring-offset-0"
              spellCheck={false}
              autoComplete="off"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Categories */}
        <div className="flex-1 overflow-y-auto">
          {filteredCategories.length > 0 ? (
            <div className="p-4 space-y-4">
              {filteredCategories.map((category) => (
                <div key={category.id}>
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="flex items-center justify-between w-full text-left p-2 rounded-md hover:bg-muted transition-colors"
                  >
                    <div>
                      <div className="font-medium text-sm">{category.name}</div>
                      <div className="text-xs text-muted-foreground">{category.prototypes.length} items</div>
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 transition-transform ${
                        expandedCategories.has(category.id) ? 'rotate-90' : ''
                      }`}
                    />
                  </button>

                  {expandedCategories.has(category.id) && (
                    <div className="ml-4 mt-2 space-y-1">
                      {category.prototypes.map((prototype) => (
                        <button
                          key={prototype.id}
                          onClick={() => onSelectPrototype(prototype.id)}
                          className={`block w-full text-left p-2 rounded-md text-sm transition-colors ${
                            selectedPrototype === prototype.id
                              ? 'bg-muted text-foreground'
                              : 'hover:bg-muted/50'
                          }`}
                        >
                          <div className="font-medium">{prototype.title}</div>
                          <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                            {prototype.description}
                          </div>
                          {prototype.metadata.featured && (
                            <div className="flex items-center gap-1 mt-1">
                              <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                              <span className="text-xs text-yellow-600 dark:text-yellow-400">Featured</span>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <div className="text-sm">No prototypes found</div>
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="text-xs text-blue-500 hover:text-blue-600 mt-2"
                >
                  Clear search
                </button>
              )}
            </div>
          )}
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
