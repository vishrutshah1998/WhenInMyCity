'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Json } from '@/types/database'

export type OnboardingPersona = 'creator' | 'business' | 'explorer'

// ---------------------------------------------------------------------------
// saveOnboardingDraftPatch — DB-side jsonb merge via merge_onboarding_draft()
// (draft = draft || patch), never a client-side read-merge-write. Upserts
// the row if it doesn't exist yet. Pass an empty patch ({}) to update only
// last_step_path.
// ---------------------------------------------------------------------------

export async function saveOnboardingDraftPatch(
  persona: OnboardingPersona,
  patch: Record<string, Json>,
  lastStepPath?: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'You must be signed in to save onboarding progress.' }

  const admin = createAdminClient()
  const { error } = await admin.rpc('merge_onboarding_draft', {
    p_auth_user_id: user.id,
    p_persona: persona,
    p_patch: patch as Json,
    p_last_step_path: lastStepPath ?? null,
  })

  if (error) {
    console.error('[saveOnboardingDraftPatch]', error.message)
    return { error: 'Failed to save your progress.' }
  }
  return { error: null }
}

// ---------------------------------------------------------------------------
// getOnboardingDraft — the full draft for one persona, used by
// onboarding/layout.tsx to rehydrate sessionStorage on return.
// ---------------------------------------------------------------------------

export async function getOnboardingDraft(
  persona: OnboardingPersona,
): Promise<{ draft: Record<string, Json>; last_step_path: string | null } | null> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return null

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('onboarding_drafts')
    .select('draft, last_step_path')
    .eq('auth_user_id', user.id)
    .eq('persona', persona)
    .maybeSingle()

  if (error || !data) {
    if (error) console.error('[getOnboardingDraft]', error.message)
    return null
  }

  return { draft: (data.draft ?? {}) as Record<string, Json>, last_step_path: data.last_step_path }
}

// ---------------------------------------------------------------------------
// getLatestOnboardingDraft — the most recently updated resumable draft
// across all three personas. /onboarding (S1) doesn't know in advance which
// persona a returning user was working on, so it checks across all of them
// and offers to resume whichever is newest.
// ---------------------------------------------------------------------------

export async function getLatestOnboardingDraft(): Promise<
  { persona: OnboardingPersona; last_step_path: string } | null
> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return null

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('onboarding_drafts')
    .select('persona, last_step_path')
    .eq('auth_user_id', user.id)
    .not('last_step_path', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data || !data.last_step_path) {
    if (error) console.error('[getLatestOnboardingDraft]', error.message)
    return null
  }

  return { persona: data.persona as OnboardingPersona, last_step_path: data.last_step_path }
}

// ---------------------------------------------------------------------------
// deleteOnboardingDraft — called by "Start Fresh" on the resume prompt,
// which has no already-known userId in scope, so it re-derives one via
// getUser().
// ---------------------------------------------------------------------------

export async function deleteOnboardingDraft(persona: OnboardingPersona): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await deleteOnboardingDraftByUserId(user.id, persona)
}

// ---------------------------------------------------------------------------
// deleteOnboardingDraftByUserId — called by each persona's completion
// action once onboarding finishes, where the caller already has a
// known-good user.id from its own earlier auth check.
//
// Deliberately does NOT call getUser() itself: completeOnboarding() /
// completeExplorerOnboarding() / completeBusinessOnboarding() each call
// supabase.auth.updateUser() (to set onboarding_complete/persona metadata)
// immediately before this — and updateUser() can trigger a session/
// refresh-token rotation. A fresh createClient().auth.getUser() call
// right after that can lose the race against the rotation (same class of
// issue documented in explorer/E7's hasStartedSave guard) and silently
// see no user — deleteOnboardingDraft's own no-op-if-no-user fallback
// would then leave the draft row behind with no error anywhere. Confirmed
// happening in practice (not just theoretically) via a real onboarding
// resume test: explorer's draft row survived completion even though
// explorer_profiles was created correctly, with nothing in the server log.
// Reusing the userId the caller already authenticated with sidesteps the
// second getUser() call entirely, removing the race at its root.
// ---------------------------------------------------------------------------

export async function deleteOnboardingDraftByUserId(userId: string, persona: OnboardingPersona): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('onboarding_drafts')
    .delete()
    .eq('auth_user_id', userId)
    .eq('persona', persona)

  if (error) console.error('[deleteOnboardingDraft]', error.message)
}
