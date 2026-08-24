import type { Metadata } from 'next'
import { getApprovedCommunities } from '@/app/actions/communities'
import CirclesBrowseClient from './CirclesBrowseClient'

export const metadata: Metadata = {
  title: 'Circles — When In My City',
  description: 'Browse Communities on WIMC — groups like Garba In My City or Read In My City.',
}

export default async function CirclesIndexPage() {
  const communities = await getApprovedCommunities()
  return <CirclesBrowseClient initialCommunities={communities} />
}
