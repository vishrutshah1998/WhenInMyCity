import { requireProfile } from '@/lib/auth/requireAuth'
import RequestCircleClient from './RequestCircleClient'

export default async function RequestCirclePage() {
  await requireProfile()
  return <RequestCircleClient />
}
