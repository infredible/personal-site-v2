'use client'

import { cn } from '@/lib/utils'
import type { KeypadKey } from '../buy'
import { Backspace } from '../icons'

/*
 * The keypad: 3 × 4 keys, 64px tall, no fill. A press scales the label down
 * (100ms) and buzzes 25ms where the Vibration API exists (Android Chrome; iOS
 * ignores it), as the prototype does.
 */

const ROWS: KeypadKey[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', 'backspace'],
]

const LABELS: Partial<Record<KeypadKey, string>> = { '.': 'Decimal point', backspace: 'Delete' }

const COLUMN_ALIGN = ['justify-start', 'justify-center', 'justify-end'] as const

function buzz() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(25)
}

export function NumberPad({ onKey, className }: { onKey?: (key: KeypadKey) => void; className?: string }) {
  return (
    <div data-slot="buy-keypad" role="group" aria-label="Keypad" className={cn('grid grid-cols-3 px-uni-12', className)}>
      {ROWS.flat().map((key, i) => (
        <button
          key={key}
          type="button"
          aria-label={LABELS[key]}
          tabIndex={onKey ? undefined : -1}
          onClick={() => {
            if (!onKey) return
            buzz()
            onKey(key)
          }}
          className={cn(
            // Full-width tap target; the 64px label area sits at the column's edge, as the prototype's justify-between row does
            'group flex h-[64px] items-center rounded-uni-full text-heading3 text-neutral1 outline-none select-none [font-weight:500]',
            COLUMN_ALIGN[i % 3],
            onKey && 'cursor-pointer',
            '[-webkit-tap-highlight-color:transparent]',
          )}
        >
          <span
            className={cn(
              'flex h-[64px] w-[64px] items-center justify-center rounded-uni-full transition-[scale] duration-100 ease-out group-active:scale-90',
              // The ring goes on the key's circle, not the full-width cell
              'group-focus-visible:bg-surface2 group-focus-visible:outline-2 group-focus-visible:outline-solid group-focus-visible:outline-neutral1',
            )}
          >
            {key === 'backspace' ? <Backspace className="size-uni-24" /> : key}
          </span>
        </button>
      ))}
    </div>
  )
}
