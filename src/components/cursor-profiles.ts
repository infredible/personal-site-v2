// Fake user profiles for multiplayer cursors
export interface CursorUser {
  id: string
  name: string
  color: string
  avatar: string
  personality: 'explorer' | 'reader' | 'scanner' | 'focused'
}

// Figma-inspired color palette for cursors
const CURSOR_COLORS = [
  '#FF6B6B', // Coral red
  '#4ECDC4', // Teal
  '#45B7D1', // Sky blue
  '#96CEB4', // Mint green
  '#FFEAA7', // Light yellow
  '#DDA0DD', // Plum
  '#FFB347', // Orange
  '#87CEEB', // Light blue
  '#F0A3FF', // Light purple
  '#0DD8D8', // Cyan
]

// Pool of rapper government name profiles
export const USER_PROFILES: CursorUser[] = [
  {
    id: 'shawn-carter',
    name: 'Shawn Carter',
    color: CURSOR_COLORS[0],
    avatar: 'SC',
    personality: 'focused'
  },
  {
    id: 'marshall-mathers',
    name: 'Marshall Mathers',
    color: CURSOR_COLORS[1],
    avatar: 'MM',
    personality: 'scanner'
  },
  {
    id: 'kendrick-duckworth',
    name: 'Kendrick Duckworth',
    color: CURSOR_COLORS[2],
    avatar: 'KD',
    personality: 'reader'
  },
  {
    id: 'aubrey-graham',
    name: 'Aubrey Graham',
    color: CURSOR_COLORS[3],
    avatar: 'AG',
    personality: 'explorer'
  },
  {
    id: 'nasir-jones',
    name: 'Nasir Jones',
    color: CURSOR_COLORS[4],
    avatar: 'NJ',
    personality: 'focused'
  },
  {
    id: 'calvin-broadus',
    name: 'Calvin Broadus',
    color: CURSOR_COLORS[5],
    avatar: 'CB',
    personality: 'reader'
  },
  {
    id: 'andre-young',
    name: 'Andre Young',
    color: CURSOR_COLORS[6],
    avatar: 'AY',
    personality: 'scanner'
  },
  {
    id: 'christopher-wallace',
    name: 'Christopher Wallace',
    color: CURSOR_COLORS[7],
    avatar: 'CW',
    personality: 'explorer'
  },
  {
    id: 'tyler-okonma',
    name: 'Tyler Okonma',
    color: CURSOR_COLORS[8],
    avatar: 'TO',
    personality: 'explorer'
  },
  {
    id: 'jacques-webster',
    name: 'Jacques Webster',
    color: CURSOR_COLORS[9],
    avatar: 'JW',
    personality: 'scanner'
  }
]

// Movement preferences based on personality
export const PERSONALITY_TRAITS = {
  explorer: {
    speed: 1.4,
    pauseProbability: 0.1,
    preferredTargets: ['h1', 'h2', '.story', 'a[href]'],
    movementPattern: 'wandering'
  },
  reader: {
    speed: 0.8,
    pauseProbability: 0.25,
    preferredTargets: ['p', 'h3', '.post'],
    movementPattern: 'sequential'
  },
  scanner: {
    speed: 1.8,
    pauseProbability: 0.05,
    preferredTargets: ['h1', 'h2', 'h3', 'nav'],
    movementPattern: 'jumping'
  },
  focused: {
    speed: 1.0,
    pauseProbability: 0.15,
    preferredTargets: ['.project', 'a[href]'],
    movementPattern: 'targeted'
  }
} as const

export function getRandomUser(): CursorUser {
  return USER_PROFILES[Math.floor(Math.random() * USER_PROFILES.length)]
}

export function getUserTrait(personality: CursorUser['personality']) {
  return PERSONALITY_TRAITS[personality]
}
