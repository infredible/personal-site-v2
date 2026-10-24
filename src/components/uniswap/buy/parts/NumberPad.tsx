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

function buzz() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(25)
}

export function NumberPad({ onKey, className }: { onKey?: (key: KeypadKey) => void; className?: string }) {
  return (
    <div data-slot="buy-keypad" role="group" aria-label="Keypad" className={cn('grid grid-cols-3 px-uni-12', className)}>
      {ROWS.flat().map((key) => (
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
            'group flex h-[64px] items-center justify-center rounded-uni-full text-heading3 text-neutral1 outline-none select-none',
            onKey && 'cursor-pointer',
            'focus-visible:bg-surface2 [-webkit-tap-highlight-color:transparent]',
          )}
        >
          <span className="flex items-center justify-center transition-[scale] duration-100 ease-out group-active:scale-90">
            {key === 'backspace' ? <Backspace className="size-uni-24" /> : key}
          </span>
        </button>
      ))}
    </div>
  )
}
