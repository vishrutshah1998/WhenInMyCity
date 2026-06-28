import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getAddaPublicPage } from '@/app/actions/adda'
import AddaPublicPage from './AddaPublicPage'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const result = await getAddaPublicPage(slug)

  if ('error' in result) return { title: 'Venue not found — WIMC' }

  const { adda } = result
  return {
    title: `${adda.name} — When In My City`,
    description: adda.description ?? `${adda.name} in ${adda.neighbourhood ?? adda.city}`,
    openGraph: {
      title: adda.name,
      description: adda.description ?? `${adda.name} in ${adda.city}`,
      images: adda.cover_image_url ? [{ url: adda.cover_image_url }] : [],
    },
  }
}

export default async function AddaSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const result = await getAddaPublicPage(slug)

  if ('error' in result) notFound()

  return (
    <AddaPublicPage
      adda={result.adda}
      upcomingEvents={result.upcomingEvents}
      pastEvents={result.pastEvents}
      stats={result.stats}
      theme={result.theme}
    />
  )
}
