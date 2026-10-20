// Token inventory for the /system catalog. Values live in ../theme.css;
// this file only lists names (and literal class names, so Tailwind generates them).

export const colorGroups = [
  {
    name: 'Neutral',
    description: 'Text and icons, from primary to disabled.',
    tokens: ['neutral1', 'neutral1Hovered', 'neutral2', 'neutral2Hovered', 'neutral3', 'neutral3Hovered'],
  },
  {
    name: 'Surface',
    description: 'Backgrounds, cards, inputs, and borders.',
    tokens: [
      'surface1',
      'surface1Hovered',
      'surface2',
      'surface2Hovered',
      'surface3',
      'surface3Solid',
      'surface3Hovered',
      'surface4',
      'surface5',
      'surface5Hovered',
    ],
  },
  {
    name: 'Accent',
    description: 'Brand pink for primary actions, plus a high-contrast accent3.',
    tokens: [
      'accent1',
      'accent1Hovered',
      'accent2',
      'accent2Hovered',
      'accent2Solid',
      'accent3',
      'accent3Hovered',
    ],
  },
  {
    name: 'Status',
    description: 'Success, warning, and critical states. The 2 variants are tinted backgrounds.',
    tokens: [
      'statusSuccess',
      'statusSuccessHovered',
      'statusSuccess2',
      'statusSuccess2Hovered',
      'statusWarning',
      'statusWarningHovered',
      'statusWarning2',
      'statusWarning2Hovered',
      'statusCritical',
      'statusCriticalHovered',
      'statusCritical2',
      'statusCritical2Hovered',
    ],
  },
] as const

export const typeScale = [
  { name: 'heading1', className: 'text-heading1' },
  { name: 'heading2', className: 'text-heading2' },
  { name: 'heading3', className: 'text-heading3' },
  { name: 'subheading1', className: 'text-subheading1' },
  { name: 'subheading2', className: 'text-subheading2' },
  { name: 'body1', className: 'text-body1' },
  { name: 'body2', className: 'text-body2' },
  { name: 'body3', className: 'text-body3' },
  { name: 'body4', className: 'text-body4' },
  { name: 'body5', className: 'text-body5' },
  { name: 'buttonLabel1', className: 'text-buttonLabel1' },
  { name: 'buttonLabel2', className: 'text-buttonLabel2' },
  { name: 'buttonLabel3', className: 'text-buttonLabel3' },
  { name: 'buttonLabel4', className: 'text-buttonLabel4' },
  { name: 'monospace', className: 'text-monospace font-uni-mono' },
] as const

export const radii = [
  { name: 'rounded4', className: 'rounded-uni-4' },
  { name: 'rounded6', className: 'rounded-uni-6' },
  { name: 'rounded8', className: 'rounded-uni-8' },
  { name: 'rounded12', className: 'rounded-uni-12' },
  { name: 'rounded16', className: 'rounded-uni-16' },
  { name: 'rounded20', className: 'rounded-uni-20' },
  { name: 'rounded24', className: 'rounded-uni-24' },
  { name: 'rounded32', className: 'rounded-uni-32' },
  { name: 'roundedFull', className: 'rounded-uni-full' },
] as const

export const spacing = [
  { name: 'spacing2', px: 2, className: 'w-uni-2' },
  { name: 'spacing4', px: 4, className: 'w-uni-4' },
  { name: 'spacing6', px: 6, className: 'w-uni-6' },
  { name: 'spacing8', px: 8, className: 'w-uni-8' },
  { name: 'spacing12', px: 12, className: 'w-uni-12' },
  { name: 'spacing16', px: 16, className: 'w-uni-16' },
  { name: 'spacing18', px: 18, className: 'w-uni-18' },
  { name: 'spacing20', px: 20, className: 'w-uni-20' },
  { name: 'spacing24', px: 24, className: 'w-uni-24' },
  { name: 'spacing28', px: 28, className: 'w-uni-28' },
  { name: 'spacing32', px: 32, className: 'w-uni-32' },
  { name: 'spacing36', px: 36, className: 'w-uni-36' },
  { name: 'spacing40', px: 40, className: 'w-uni-40' },
  { name: 'spacing48', px: 48, className: 'w-uni-48' },
  { name: 'spacing60', px: 60, className: 'w-uni-60' },
] as const

export const shadows = [
  { name: 'shadowShort', className: 'shadow-uni-short' },
  { name: 'shadowMedium', className: 'shadow-uni-medium' },
] as const

// How shadcn's semantic variables resolve inside the .uniswap scope
export const shadcnBridge = [
  { shadcn: '--background', uniswap: 'surface1' },
  { shadcn: '--foreground', uniswap: 'neutral1' },
  { shadcn: '--card / --popover', uniswap: 'surface1' },
  { shadcn: '--primary', uniswap: 'accent1' },
  { shadcn: '--secondary', uniswap: 'surface3' },
  { shadcn: '--muted', uniswap: 'surface2' },
  { shadcn: '--muted-foreground', uniswap: 'neutral2' },
  { shadcn: '--accent', uniswap: 'surface2Hovered' },
  { shadcn: '--destructive', uniswap: 'statusCritical' },
  { shadcn: '--border / --input', uniswap: 'surface3' },
  { shadcn: '--ring', uniswap: 'accent1' },
  { shadcn: '--radius', uniswap: 'rounded16' },
] as const
