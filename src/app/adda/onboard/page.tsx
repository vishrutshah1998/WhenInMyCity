import { requireAuth } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import OnboardingShell from '@/components/adda/onboarding/OnboardingShell'

// Conversational onboarding flow — completely separate from the step-based
// /adda/onboarding route. Uses XState + Framer Motion for a Lemonade-style UX.
export default async function AddaOnboardPage() {
  const { user } = await requireAuth('/adda/onboard')

  // If this user already has an Adda, skip straight to the dashboard.
  const admin = createAdminClient()
  const { data: existing } = await admin
    .from('adda_profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (existing) redirect('/adda/dashboard')

  return <OnboardingShell />
}
