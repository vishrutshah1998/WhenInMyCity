import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import RolePickerClient from './RolePickerClient'

/**
 * /onboarding/role
 *
 * Entry point for new users (Google OAuth and phone OTP) who haven't yet
 * completed any onboarding flow. Shows the Creator vs Explorer role picker.
 *
 * Guards:
 *  - Unauthenticated → /signin (middleware)
 *  - Already a creator (user_profiles row) → /dashboard
 *  - Already an explorer (explorer_profiles row) → /explore
 */
export default async function RolePage() {
  const { user } = await requireAuth('/onboarding/role')
  const admin = createAdminClient()

  const [{ data: creatorProfile }, { data: explorerProfile }] = await Promise.all([
    admin.from('user_profiles').select('id, creator_type').eq('id', user.id).maybeSingle(),
    admin.from('explorer_profiles').select('id').eq('auth_user_id', user.id).maybeSingle(),
  ])

  if (creatorProfile) {
    redirect(creatorProfile.creator_type === 'exploring' ? '/explore' : '/dashboard')
  }
  if (explorerProfile) redirect('/explore')

  return <RolePickerClient />
}
