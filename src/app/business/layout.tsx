import { requireAuth } from '@/lib/auth/requireAuth'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function BusinessLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireAuth('/business')
  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('user_profiles')
    .select('personas, creator_type')
    .eq('id', user.id)
    .maybeSingle()

  const personas = (profile?.personas ?? []) as string[]
  const hasBusinessPersona =
    personas.includes('brand') ||
    personas.includes('business') ||
    personas.includes('venue') ||
    profile?.creator_type === 'business_brand'

  if (!hasBusinessPersona) redirect('/dashboard')

  return <>{children}</>
}
