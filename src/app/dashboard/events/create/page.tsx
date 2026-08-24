import { requireProfile } from '@/lib/auth/requireAuth'
import CreateEventForm from './create-event-form'

interface Props {
  searchParams: Promise<{ communityId?: string }>
}

export default async function DashboardCreateEventPage({ searchParams }: Props) {
  const { profile } = await requireProfile()
  const { communityId } = await searchParams

  return (
    <CreateEventForm
      profile={{
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        user_tier: profile.user_tier,
      }}
      communityId={communityId}
    />
  )
}
