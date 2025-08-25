'use client'

import { Prototype } from '@/app/lib/prototypes';

interface PrototypeCanvasProps {
  prototype: Prototype | null;
  drawerOpen?: boolean; // Made optional since it's not used
}

export function PrototypeCanvas({ prototype }: PrototypeCanvasProps) {
  if (!prototype) {
    return (
      <div
        className={`transition-all duration-300 ease-out min-h-screen flex items-center justify-center`}
      >
        <div className="text-center max-w-md px-6">
          <h2 className="text-2xl font-medium font-serif mb-4">Design Engineering Prototypes</h2>
          <p className="text-muted-foreground">
            Select a prototype from the drawer to explore different design engineering experiments and interactions.
          </p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (prototype.type) {
      case 'component':
        if (prototype.component) {
          const Component = prototype.component;
          return <Component />;
        }
        return (
          <div className="text-center text-muted-foreground">
            Component not found
          </div>
        );

      case 'video':
        return (
          <div className="w-full max-w-4xl mx-auto">
            <video
              src={prototype.mediaUrl}
              controls
              muted
              playsInline
              className="w-full rounded-lg shadow-lg"
            />
          </div>
        );

      case 'image':
        return (
          <div className="w-full max-w-4xl mx-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={prototype.mediaUrl}
              alt={prototype.title}
              className="w-full rounded-lg shadow-lg"
            />
          </div>
        );

      case 'embed':
        return (
          <div className="w-full max-w-4xl mx-auto">
            <iframe
              src={prototype.embedUrl}
              className="w-full h-[600px] rounded-lg shadow-lg border"
              title={prototype.title}
            />
          </div>
        );

      default:
        return (
          <div className="text-center text-muted-foreground">
            Unknown prototype type
          </div>
        );
    }
  };

  return (
    <div
      className={`transition-all duration-300 ease-out min-h-screen`}
    >
      {/* Header */}
      <div className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="p-6">
          <div className="max-w-xl mx-auto px-6 pt-24 pb-4">
            <h1 className="text-2xl font-medium font-serif mb-2">{prototype.title}</h1>
            <p className="text-muted-foreground">{prototype.description}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="w-full">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
