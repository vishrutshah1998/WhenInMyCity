import { requireProfile } from '@/lib/auth/requireAuth'
import CreateEventForm from './create-event-form'

export default async function DashboardCreateEventPage() {
  const { profile } = await requireProfile()

  return (
    <CreateEventForm
      profile={{
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        user_tier: profile.user_tier,
      }}
    />
  )
}
