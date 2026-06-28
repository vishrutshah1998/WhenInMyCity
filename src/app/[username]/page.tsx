import { notFound, permanentRedirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { cityToSlug } from '@/lib/profile-url'

// ---------------------------------------------------------------------------
// Legacy /{username} route — redirects to canonical /{city}/{username}
// ---------------------------------------------------------------------------

export default async function UsernamePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const supabase     = await createClient()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('username, city')
    .eq('username', username)
    .maybeSingle()

  if (!profile) notFound()

  if (!profile.city) {
    // City missing — redirect to safe fallback slug rather than producing /null/{username}
    permanentRedirect(`/india/${profile.username}`)
  }

  permanentRedirect(`/${cityToSlug(profile.city)}/${profile.username}`)
}
