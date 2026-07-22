import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getMediaKitData } from '@/app/actions/media-kit'
import MediaKitLocked from './MediaKitLocked'
import MediaKitView from './MediaKitView'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>
}): Promise<Metadata> {
  const { token } = await params
  const result = await getMediaKitData(token)

  if (result.status !== 'ok') return { title: 'Media Kit — WIMC' }

  return {
    title: `${result.data.displayName} — Media Kit — WIMC`,
    description: `Sponsor media kit for ${result.data.displayName} on When In My City.`,
    robots: { index: false, follow: false },
  }
}

export default async function MediaKitPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const result = await getMediaKitData(token)

  if (result.status === 'not_found') notFound()
  if (result.status === 'locked') {
    return <MediaKitLocked displayName={result.displayName} />
  }

  return <MediaKitView data={result.data} />
}
