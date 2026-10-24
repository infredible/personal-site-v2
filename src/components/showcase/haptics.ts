/*
 * Haptics for prototypes. Each pattern is one of iOS's feedback generators,
 * as a list of taps (strength 0-1, ms after the first). PhoneFrame draws a
 * pattern as the device buzzing; `playHaptic` also plays it on the visitor's
 * own phone where the browser allows:
 *
 *   Android (Vibration API)   the whole pattern
 *   iOS Safari 17.4+          one system tick per tap, by toggling a hidden
 *                             <input type="checkbox" switch>. Unofficial, needs
 *                             a recent user gesture, and Apple may close it
 *   elsewhere                 nothing (the drawn buzz still plays)
 */

export type HapticPattern = 'impact' | 'success' | 'error'

export const HAPTIC_PATTERNS: Record<HapticPattern, { at: number; strength: number }[]> = {
  /** UIImpactFeedbackGenerator(.light): one tap */
  impact: [{ at: 0, strength: 0.5 }],
  /** .notificationSuccess: a light tap, then a firmer one */
  success: [
    { at: 0, strength: 0.6 },
    { at: 110, strength: 1 },
  ],
  /** .notificationError: three quick, even taps */
  error: [
    { at: 0, strength: 0.9 },
    { at: 90, strength: 0.9 },
    { at: 180, strength: 1 },
  ],
}

/** How long one tap buzzes (ms). */
export const HAPTIC_TAP_MS = 60

export function playHaptic(pattern: HapticPattern) {
  if (typeof window === 'undefined') return
  const taps = HAPTIC_PATTERNS[pattern]
  if (typeof navigator.vibrate === 'function') {
    // [buzz, pause, buzz, ...]
    const sequence = taps.flatMap((tap, i) => {
      const buzz = Math.round(HAPTIC_TAP_MS * (0.4 + tap.strength * 0.6))
      const next = taps[i + 1]
      return next ? [buzz, Math.max(0, next.at - tap.at - buzz)] : [buzz]
    })
    navigator.vibrate(sequence)
    return
  }
  if (isIOS()) taps.forEach((tap) => window.setTimeout(iosTick, tap.at))
}

function isIOS() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

/** Safari ticks the Taptic Engine when a switch toggles; a label click toggles it. */
function iosTick() {
  const label = document.createElement('label')
  const input = document.createElement('input')
  input.type = 'checkbox'
  input.setAttribute('switch', '')
  label.style.display = 'none'
  label.appendChild(input)
  document.body.appendChild(label)
  label.click()
  label.remove()
}
