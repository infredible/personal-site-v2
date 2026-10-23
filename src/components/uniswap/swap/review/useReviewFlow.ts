'use client'

import * as React from 'react'
import type { SlippageSettings, SwapQuote, Token } from '../types'

/*
 * The review → confirm flow as a small state machine, plus a hook that plays
 * it on simulated wallet / chain timings.
 *
 *   review ──submit──▶ approve? ──▶ sign ──▶ pending ──▶ success
 *     │  ▲                 │           │                    │
 *     │  └─accept price    └─reject─┐  └─reject─┐           └─done─▶ review
 *     └─price moves                 ▼           ▼
 *                                rejected ──retry──▶ (the step that failed)
 *
 * `approve` only runs when the input token needs an allowance and hasn't got
 * one yet; a rejected approval retries the approval, a rejected signature
 * retries the signature (an approval that already landed is kept).
 */

export type ReviewPhase = 'review' | 'approve' | 'sign' | 'pending' | 'success' | 'rejected'

/** What's being swapped. The output amount lives in the flow state, since a re-quote can change it. */
export interface ReviewTrade {
  input: { token: Token; amount: number }
  output: { token: Token }
  quote: SwapQuote
  slippage: SlippageSettings
}

export interface ReviewFlowState {
  phase: ReviewPhase
  /** The input token needs an allowance before the swap can be signed. */
  needsApproval: boolean
  /** The approval landed (kept across a rejected signature). */
  approved: boolean
  /** The wallet step the user declined, while `phase` is 'rejected'. */
  failedStep: 'approve' | 'sign' | null
  /** Output amount the user has accepted: what the amounts show. */
  acceptedOutput: number
  /** A newer quote's output, waiting for the user to accept it. */
  updatedOutput: number | null
}

export type ReviewEvent =
  | { type: 'submit' }
  | { type: 'walletApproved' }
  | { type: 'walletRejected' }
  | { type: 'confirmed' }
  | { type: 'retry' }
  | { type: 'priceMoved'; output: number }
  | { type: 'acceptPrice' }
  | { type: 'reset'; state: ReviewFlowState }

export function reviewReducer(state: ReviewFlowState, event: ReviewEvent): ReviewFlowState {
  switch (event.type) {
    case 'submit':
      if (state.phase !== 'review' || state.updatedOutput !== null) return state
      return { ...state, phase: state.needsApproval && !state.approved ? 'approve' : 'sign' }
    case 'walletApproved':
      if (state.phase === 'approve') return { ...state, phase: 'sign', approved: true }
      if (state.phase === 'sign') return { ...state, phase: 'pending' }
      return state
    case 'walletRejected':
      if (state.phase !== 'approve' && state.phase !== 'sign') return state
      return { ...state, phase: 'rejected', failedStep: state.phase }
    case 'confirmed':
      return state.phase === 'pending' ? { ...state, phase: 'success' } : state
    case 'retry':
      if (state.phase !== 'rejected') return state
      return { ...state, phase: state.failedStep === 'approve' ? 'approve' : 'sign', failedStep: null }
    case 'priceMoved':
      return state.phase === 'review' ? { ...state, updatedOutput: event.output } : state
    case 'acceptPrice':
      if (state.updatedOutput === null) return state
      return { ...state, acceptedOutput: state.updatedOutput, updatedOutput: null }
    case 'reset':
      return event.state
  }
}

/** The main button's job in each state. */
export type ReviewAction = 'swap' | 'accept' | 'busy' | 'retry' | 'done'

export function getReviewAction(state: ReviewFlowState): ReviewAction {
  switch (state.phase) {
    case 'review':
      return state.updatedOutput !== null ? 'accept' : 'swap'
    case 'rejected':
      return 'retry'
    case 'success':
      return 'done'
    default:
      return 'busy'
  }
}

export type ReviewStepId = 'approve' | 'sign' | 'confirm'
export type ReviewStepStatus = 'upcoming' | 'active' | 'complete' | 'error'

export interface ReviewStep {
  id: ReviewStepId
  status: ReviewStepStatus
}

/** The steps this trade needs, with each one's status. Empty while reviewing. */
export function getReviewSteps(state: ReviewFlowState): ReviewStep[] {
  const { phase, failedStep } = state
  if (phase === 'review') return []
  const steps: ReviewStep[] = []
  if (state.needsApproval) {
    steps.push({
      id: 'approve',
      status: state.approved
        ? 'complete'
        : phase === 'approve'
          ? 'active'
          : phase === 'rejected' && failedStep === 'approve'
            ? 'error'
            : 'upcoming',
    })
  }
  steps.push({
    id: 'sign',
    status:
      phase === 'sign'
        ? 'active'
        : phase === 'rejected'
          ? failedStep === 'sign'
            ? 'error'
            : 'upcoming'
          : phase === 'pending' || phase === 'success'
            ? 'complete'
            : 'upcoming',
  })
  steps.push({
    id: 'confirm',
    status: phase === 'pending' ? 'active' : phase === 'success' ? 'complete' : 'upcoming',
  })
  return steps
}

/** Simulated wallet / chain latencies (ms). Long enough to read each state. */
export const REVIEW_TIMINGS = {
  /** Approval: sign in wallet + the approval landing */
  approve: 1700,
  /** Signing the swap in the wallet */
  sign: 1500,
  /** Submitted → confirmed onchain */
  confirm: 2200,
  /** A wallet rejection comes back a little faster than an approval */
  reject: 1100,
}

export type WalletResponse = 'approve' | 'reject'

export interface UseReviewFlowOptions {
  /** Don't advance on the simulated timings (static frames, paused presets). */
  paused?: boolean
  /** What the simulated wallet does at the next wallet step. */
  walletResponse?: WalletResponse
  timings?: typeof REVIEW_TIMINGS
  onChange?: (state: ReviewFlowState) => void
}

/**
 * Plays the flow. Timers belong to the current phase: any event (or unmount)
 * clears them, so the flow can be interrupted, reset or jumped at any point.
 */
export function useReviewFlow(initial: ReviewFlowState, options: UseReviewFlowOptions = {}) {
  const { paused = false, walletResponse = 'approve', timings = REVIEW_TIMINGS, onChange } = options
  const [state, dispatch] = React.useReducer(reviewReducer, initial)

  // Read at the moment the wallet answers, so flipping it mid-wait doesn't restart the wait
  const response = React.useRef(walletResponse)
  response.current = walletResponse

  const changed = React.useRef(onChange)
  changed.current = onChange
  React.useEffect(() => changed.current?.(state), [state])

  React.useEffect(() => {
    if (paused) return
    const { phase } = state
    if (phase === 'approve' || phase === 'sign') {
      const reject = response.current === 'reject'
      const wait = reject ? timings.reject : phase === 'approve' ? timings.approve : timings.sign
      const id = window.setTimeout(() => dispatch({ type: reject ? 'walletRejected' : 'walletApproved' }), wait)
      return () => window.clearTimeout(id)
    }
    if (phase === 'pending') {
      const id = window.setTimeout(() => dispatch({ type: 'confirmed' }), timings.confirm)
      return () => window.clearTimeout(id)
    }
    // A new state object per phase/step keys the effect, so retries restart the wait
  }, [state, paused, timings])

  const actions = React.useMemo(
    () => ({
      submit: () => dispatch({ type: 'submit' }),
      retry: () => dispatch({ type: 'retry' }),
      acceptPrice: () => dispatch({ type: 'acceptPrice' }),
      movePrice: (output: number) => dispatch({ type: 'priceMoved', output }),
      reset: (next: ReviewFlowState) => dispatch({ type: 'reset', state: next }),
    }),
    [],
  )

  return { state, ...actions }
}
