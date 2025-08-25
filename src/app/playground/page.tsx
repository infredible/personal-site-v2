'use client'

import { useState, useEffect, Suspense } from 'react';
import { getAllPrototypes, getPrototype } from '@/app/lib/prototypes';
import { PrototypeDrawer } from '@/components/PrototypeDrawer';
import { PrototypeCanvas } from '@/components/PrototypeCanvas';
import { PageTransition, FloatingBackButton } from '@/components';
import { useSearchParams } from 'next/navigation';

function PlaygroundContent() {
  const searchParams = useSearchParams();
  const prototypes = getAllPrototypes();
  const [selectedPrototype, setSelectedPrototype] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(true);

  // Handle URL-based deep linking
  useEffect(() => {
    const prototypeParam = searchParams.get('prototype');
    if (prototypeParam) {
      const prototype = getPrototype(prototypeParam);
      if (prototype) {
        setSelectedPrototype(prototypeParam);
      }
    } else {
      // Default to first prototype
      if (prototypes.length > 0) {
        setSelectedPrototype(prototypes[0].id);
      }
    }
  }, [searchParams, prototypes]);

  // Update URL when prototype changes
  const handleSelectPrototype = (prototypeId: string) => {
    setSelectedPrototype(prototypeId);
    
    // Update URL without page reload
    const newUrl = `${window.location.pathname}?prototype=${prototypeId}`;
    window.history.replaceState({}, '', newUrl);
  };

  // Listen for drawer state changes
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('prototype-drawer-open');
      if (saved !== null) {
        setDrawerOpen(JSON.parse(saved));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Check initial state
    handleStorageChange();
    
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const currentPrototype = selectedPrototype ? getPrototype(selectedPrototype) : null;

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        {/* Back button */}
        <FloatingBackButton />
        
        {/* Drawer */}
        <PrototypeDrawer
          prototypes={prototypes}
          selectedPrototype={selectedPrototype}
          onSelectPrototype={handleSelectPrototype}
        />

        {/* Canvas */}
        <PrototypeCanvas
          prototype={currentPrototype}
          drawerOpen={drawerOpen}
        />
      </div>
    </PageTransition>
  );
}

export default function PlaygroundPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium mb-2">Loading prototypes...</div>
          <div className="text-sm text-muted-foreground">Preparing your creative experiments</div>
        </div>
      </div>
    }>
      <PlaygroundContent />
    </Suspense>
  );
}
