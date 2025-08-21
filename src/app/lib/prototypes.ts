import { ComponentType } from 'react';
import { AnimatedButton } from '@/components/prototypes/AnimatedButton';
import { DragInteractions } from '@/components/prototypes/DragInteractions';
import { AnimatedCharts } from '@/components/prototypes/AnimatedCharts';
import { MasonryGrid } from '@/components/prototypes/MasonryGrid';

export interface Prototype {
  id: string;
  title: string;
  description: string;
  category: string;
  type: 'component' | 'video' | 'image' | 'embed';
  component?: ComponentType<any>;
  mediaUrl?: string;
  embedUrl?: string;
  metadata: {
    date: string;
    tags: string[];
    featured?: boolean;
  };
}

export interface PrototypeCategory {
  id: string;
  name: string;
  description: string;
  prototypes: Prototype[];
}

// Sample prototypes data - this will be expanded with actual prototypes
export const prototypes: PrototypeCategory[] = [
  {
    id: 'interaction-design',
    name: 'Interaction Design',
    description: 'Interactive UI components and micro-interactions',
    prototypes: [
      {
        id: 'animated-button',
        title: 'Animated Button States',
        description: 'Exploration of button hover and click animations',
        category: 'interaction-design',
        type: 'component',
        component: AnimatedButton,
        metadata: {
          date: '2024-01-15',
          tags: ['animation', 'buttons', 'micro-interactions'],
          featured: true,
        },
      },
      {
        id: 'drag-interactions',
        title: 'Drag & Drop Interface',
        description: 'Custom drag and drop with visual feedback',
        category: 'interaction-design',
        type: 'component',
        component: DragInteractions,
        metadata: {
          date: '2024-01-20',
          tags: ['drag-drop', 'gestures'],
        },
      },
    ],
  },
  {
    id: 'data-visualization',
    name: 'Data Visualization',
    description: 'Charts, graphs, and data representation experiments',
    prototypes: [
      {
        id: 'animated-charts',
        title: 'Animated Chart Transitions',
        description: 'Smooth transitions between different chart types',
        category: 'data-visualization',
        type: 'component',
        component: AnimatedCharts,
        metadata: {
          date: '2024-01-10',
          tags: ['charts', 'animation', 'd3'],
        },
      },
    ],
  },
  {
    id: 'layout-experiments',
    name: 'Layout Experiments',
    description: 'Creative layouts and responsive design patterns',
    prototypes: [
      {
        id: 'masonry-grid',
        title: 'Masonry Grid Layout',
        description: 'Dynamic masonry grid with smooth reordering',
        category: 'layout-experiments',
        type: 'component',
        component: MasonryGrid,
        metadata: {
          date: '2024-01-25',
          tags: ['layout', 'grid', 'responsive'],
        },
      },
    ],
  },
];

export function getAllPrototypes(): Prototype[] {
  return prototypes.flatMap(category => category.prototypes);
}

export function getPrototypesByCategory(categoryId: string): Prototype[] {
  const category = prototypes.find(cat => cat.id === categoryId);
  return category ? category.prototypes : [];
}

export function getPrototype(id: string): Prototype | null {
  const allPrototypes = getAllPrototypes();
  return allPrototypes.find(prototype => prototype.id === id) || null;
}

export function getCategories(): PrototypeCategory[] {
  return prototypes;
}
