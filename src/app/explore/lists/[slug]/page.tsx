import { notFound } from 'next/navigation'
import { getPublicSpotList } from '@/app/actions/spotLists'
import SpotListPublicPage    from './SpotListPublicPage'

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const list = await getPublicSpotList(slug)
  if (!list) return {}
  return {
    title:       `${list.title} — When In My City`,
    description: list.description ?? `A curated list of favorite spots by ${list.author_name}`,
  }
}

export default async function SpotListPage({ params }: Props) {
  const { slug } = await params
  const list = await getPublicSpotList(slug)
  if (!list) notFound()
  return <SpotListPublicPage list={list} />
}
