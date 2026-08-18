import { getTierMetrics } from '@/app/actions/tier'
import TierClient from './TierClient'

export default async function TierPage() {
  const { tier, metrics, eventsAttendedIn90d, eventsHostedIn180d, eventsHostedIn365d } = await getTierMetrics()

  return (
    <TierClient
      tier={tier}
      metrics={metrics}
      eventsAttendedIn90d={eventsAttendedIn90d}
      eventsHostedIn180d={eventsHostedIn180d}
      eventsHostedIn365d={eventsHostedIn365d}
    />
  )
}
