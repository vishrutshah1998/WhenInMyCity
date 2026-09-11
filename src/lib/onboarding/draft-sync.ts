'use client'

import { saveOnboardingDraftPatch, type OnboardingPersona } from '@/app/actions/onboarding-draft'

export type { OnboardingPersona }

// Mirrors sessionStorage's own write-timing exactly (see session-keys.ts
// callers): per-keystroke fields debounce, discrete actions (file upload,
// a toggle click) fire immediately, and step-boundary "Continue" handlers
// flush and await before navigating away.
const DEBOUNCE_MS = 600

const pending: Partial<Record<OnboardingPersona, Record<string, string>>> = {}
const timers: Partial<Record<OnboardingPersona, ReturnType<typeof setTimeout>>> = {}

function stripPrefix(key: string): string {
  return key.replace(/^wimc_ob_/, '')
}

function flushPersona(persona: OnboardingPersona): Promise<void> {
  const timer = timers[persona]
  if (timer) { clearTimeout(timer); delete timers[persona] }
  const patch = pending[persona]
  if (!patch || Object.keys(patch).length === 0) return Promise.resolve()
  delete pending[persona]
  return saveOnboardingDraftPatch(persona, patch).then(() => {}).catch(() => {})
}

/**
 * Mirrors a sessionStorage.setItem(key, value) call to the server draft.
 * Call this alongside the existing sessionStorage.setItem — it does not
 * touch sessionStorage itself, only queues (or immediately fires, per
 * opts.immediate) a debounced server patch for the same key/value.
 */
export function queueDraftPatch(
  persona: OnboardingPersona,
  key: string,
  value: string,
  opts?: { immediate?: boolean },
): void {
  pending[persona] = { ...(pending[persona] ?? {}), [stripPrefix(key)]: value }
  const timer = timers[persona]
  if (timer) clearTimeout(timer)
  if (opts?.immediate) {
    delete timers[persona]
    void flushPersona(persona)
    return
  }
  timers[persona] = setTimeout(() => { void flushPersona(persona) }, DEBOUNCE_MS)
}

/**
 * Flushes any pending debounced patch for a persona immediately and awaits
 * it. Call this right before a step's "Continue" handler navigates —
 * that's the moment most likely to be followed by a tab close, so the save
 * can't be left to a timer that might not fire in time.
 */
export async function flushDraftPatch(persona: OnboardingPersona): Promise<void> {
  await flushPersona(persona)
}

const lastStepTimers: Partial<Record<OnboardingPersona, ReturnType<typeof setTimeout>>> = {}

/**
 * Records the step route the user just reached, so /onboarding can offer to
 * resume there. Debounced, not immediate — this fire-and-forget upsert races
 * against each persona's completion action, which deletes the draft row
 * once onboarding finishes; landing after that deletion would silently
 * resurrect a draft row for a persona that just finished (confirmed
 * happening in practice, not just theoretically, via a real resume test:
 * clicking through V8 — the business-path completion screen — fast enough
 * that an immediate save raced the delete). Called from
 * onboarding/layout.tsx on every valid step pathname; not user-entered
 * data, so losing one write just means resume lands a step earlier, never
 * on a broken state.
 */
export function queueLastStepPath(persona: OnboardingPersona, path: string): void {
  const timer = lastStepTimers[persona]
  if (timer) clearTimeout(timer)
  lastStepTimers[persona] = setTimeout(() => {
    delete lastStepTimers[persona]
    void saveOnboardingDraftPatch(persona, {}, path).catch(() => {})
  }, DEBOUNCE_MS)
}

/**
 * Cancels every pending debounced write for a persona — both queueDraftPatch
 * field patches and queueLastStepPath — WITHOUT firing them. Call this at
 * the start of a completion screen's own submit handler (R5's handleDone,
 * V8's handleDone), before calling completeBusinessOnboarding /
 * completeVenueOnboarding: either debounce, left to fire on its own timer,
 * can still land its upsert AFTER that action's own delete of the draft
 * row and silently resurrect it for a persona that just finished —
 * confirmed happening in practice for both (not just theoretically) via
 * real resume tests: a stray row with the previous field patch and no
 * last_step_path, and separately one still carrying an earlier step's
 * last_step_path because a TERMINAL_STEPS pathname (see onboarding/
 * layout.tsx) skips queuing its own call without also clearing whatever
 * the step before it had pending. Once onboarding is complete there's
 * nothing left to resume into, so there's nothing lost by discarding both
 * outright rather than flushing them.
 */
export function cancelPendingDraftWrites(persona: OnboardingPersona): void {
  const fieldTimer = timers[persona]
  if (fieldTimer) { clearTimeout(fieldTimer); delete timers[persona] }
  delete pending[persona]

  const stepTimer = lastStepTimers[persona]
  if (stepTimer) { clearTimeout(stepTimer); delete lastStepTimers[persona] }
}
