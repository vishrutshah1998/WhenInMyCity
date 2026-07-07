import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getVenuePublicPage } from '@/app/actions/venue'
import VenuePublicPage from './VenuePublicPage'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const result = await getVenuePublicPage(slug)

  if ('error' in result) return { title: 'Venue not found — WIMC' }

  const { venue } = result
  return {
    title: `${venue.name} — When In My City`,
    description: venue.description ?? `${venue.name} in ${venue.neighbourhood ?? venue.city}`,
    openGraph: {
      title: venue.name,
      description: venue.description ?? `${venue.name} in ${venue.city}`,
      images: venue.cover_image_url ? [{ url: venue.cover_image_url }] : [],
    },
  }
}

export default async function VenueSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const result = await getVenuePublicPage(slug)

  if ('error' in result) notFound()

  return (
    <VenuePublicPage
      venue={result.venue}
      upcomingEvents={result.upcomingEvents}
      pastEvents={result.pastEvents}
      stats={result.stats}
      theme={result.theme}
    />
  )
}
