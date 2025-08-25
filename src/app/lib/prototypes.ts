import { ComponentType } from 'react';
import { EthereumChart } from '@/components/prototypes/EthereumChart';
import { DragInteractions } from '@/components/prototypes/DragInteractions';
import { AnimatedCharts } from '@/components/prototypes/AnimatedCharts';
import { MasonryGrid } from '@/components/prototypes/MasonryGrid';
import { HighlightToLearn } from '@/components/prototypes/HighlightToLearn';

export interface Prototype {
  id: string;
  title: string;
  description: string;
  category: string;
  type: 'component' | 'video' | 'image' | 'embed';
  component?: ComponentType;
  mediaUrl?: string;
  embedUrl?: string;
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
        id: 'eth-price-chart',
        title: 'Lil\' Price Chart',
        description: 'Real-time Ethereum price visualization with CoinGecko API integration',
        category: 'data-visualization',
        type: 'component',
        component: EthereumChart,
      },
      {
        id: 'drag-interactions',
        title: 'Drag & Drop Interface',
        description: 'Custom drag and drop with visual feedback',
        category: 'interaction-design',
        type: 'component',
        component: DragInteractions,
      },
      {
        id: 'highlight-to-learn',
        title: 'Highlight to Learn',
        description: 'AI-powered contextual explanations for highlighted text',
        category: 'interaction-design',
        type: 'component',
        component: HighlightToLearn,
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
