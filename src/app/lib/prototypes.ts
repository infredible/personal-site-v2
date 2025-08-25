import { ComponentType } from 'react';
import { EthereumChart } from '@/components/prototypes/EthereumChart';
import { DragInteractions } from '@/components/prototypes/DragInteractions';
import { AnimatedCharts } from '@/components/prototypes/AnimatedCharts';
import { MasonryGrid } from '@/components/prototypes/MasonryGrid';
import { HighlightToLearn } from '@/components/prototypes/HighlightToLearn';
import { CryptoChatbox } from '@/components/prototypes/CryptoChatbox';

export interface Prototype {
  id: string;
  title: string;
  description: string;
  type: 'component' | 'video' | 'image' | 'embed';
  component?: ComponentType;
  mediaUrl?: string;
  embedUrl?: string;
}

// Flat list of all prototypes
export const prototypes: Prototype[] = [
  {
    id: 'highlight-to-learn',
    title: 'Highlight to Learn',
    description: 'AI-powered contextual explanations for highlighted text',
    type: 'component',
    component: HighlightToLearn,
  },
  {
    id: 'crypto-chatbox',
    title: 'Crypto chatbox',
    description: 'AI chat interface with blockchain network and model selection',
    type: 'component',
    component: CryptoChatbox,
  },
  {
    id: 'eth-price-chart',
    title: 'Lil\' Price Chart',
    description: 'Real-time Ethereum price visualization with CoinGecko API integration',
    type: 'component',
    component: EthereumChart,
  },
  {
    id: 'drag-interactions',
    title: 'Drag & Drop Interface',
    description: 'Custom drag and drop with visual feedback',
    type: 'component',
    component: DragInteractions,
  },
  {
    id: 'animated-charts',
    title: 'Animated Chart Transitions',
    description: 'Smooth transitions between different chart types',
    type: 'component',
    component: AnimatedCharts,
  },
  {
    id: 'masonry-grid',
    title: 'Masonry Grid Layout',
    description: 'Dynamic masonry grid with smooth reordering',
    type: 'component',
    component: MasonryGrid,
  },
];

export function getAllPrototypes(): Prototype[] {
  return prototypes;
}

export function getPrototype(id: string): Prototype | null {
  return prototypes.find(prototype => prototype.id === id) || null;
}
