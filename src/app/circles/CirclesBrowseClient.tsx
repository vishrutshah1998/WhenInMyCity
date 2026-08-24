'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import type { CommunityWithMemberCount } from '@/app/actions/communities'
import { getApprovedCommunities } from '@/app/actions/communities'
import { CITIES } from '@/lib/constants/interests'
import { CREATOR_CATEGORIES } from '@/lib/constants/categories'

export default function CirclesBrowseClient({ initialCommunities }: { initialCommunities: CommunityWithMemberCount[] }) {
  const [communities, setCommunities] = useState(initialCommunities)
  const [city, setCity] = useState<string | undefined>(undefined)
  const [category, setCategory] = useState<string | undefined>(undefined)
  const [isPending, startTransition] = useTransition()

  function applyFilters(nextCity: string | undefined, nextCategory: string | undefined) {
    setCity(nextCity)
    setCategory(nextCategory)
    startTransition(async () => {
      const result = await getApprovedCommunities({ city: nextCity, category: nextCategory })
      setCommunities(result)
    })
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', minHeight: '100vh', background: 'var(--wimc-bg-base)', padding: '32px 20px 80px' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11, fontWeight: 700, color: 'var(--wimc-coral)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>
          Communities
        </div>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-abril)', fontSize: 30, color: 'var(--wimc-text-primary)', fontWeight: 400 }}>
          Circles worth joining
        </h1>
        <p style={{ fontSize: 14, color: 'var(--wimc-text-secondary)', marginTop: 8, fontFamily: 'var(--font-dm-sans)' }}>
          Notice boards for scenes across the city — Garba In My City, Read In My City, and more.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
        <FilterRow
          label="City"
          options={CITIES.map((c) => ({ id: c.id, label: c.name }))}
          active={city}
          onSelect={(id) => applyFilters(city === id ? undefined : id, category)}
        />
        <FilterRow
          label="Category"
          options={CREATOR_CATEGORIES.map((c) => ({ id: c.id, label: c.label }))}
          active={category}
          onSelect={(id) => applyFilters(city, category === id ? undefined : id)}
        />
      </div>

      {isPending ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--wimc-text-muted)', fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em' }}>
          Loading…
        </div>
      ) : communities.length === 0 ? (
        <EmptyState hasFilters={!!(city || category)} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {communities.map((c) => (
            <CircleCard key={c.id} community={c} />
          ))}
        </div>
      )}
    </div>
  )
}

function FilterRow({
  label, options, active, onSelect,
}: {
  label: string
  options: { id: string; label: string }[]
  active: string | undefined
  onSelect: (id: string) => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <span style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10, fontWeight: 700, color: 'var(--wimc-text-muted)', textTransform: 'uppercase', flexShrink: 0 }}>
        {label}
      </span>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {options.map((o) => {
          const isActive = active === o.id
          return (
            <button
              key={o.id}
              onClick={() => onSelect(o.id)}
              style={{
                fontFamily: 'var(--font-dm-sans)', fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 999, cursor: 'pointer',
                background: isActive ? 'var(--wimc-coral)' : 'transparent',
                color: isActive ? '#FEFCF8' : 'var(--wimc-text-secondary)',
                border: isActive ? 'none' : '1px solid var(--wimc-border-default)',
              }}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function CircleCard({ community }: { community: CommunityWithMemberCount }) {
  return (
    <Link
      href={`/circles/${community.slug}`}
      style={{
        display: 'block', background: 'var(--wimc-bg-elevated)', border: '1px solid var(--wimc-border-default)',
        textDecoration: 'none', overflow: 'hidden',
      }}
    >
      <div style={{ height: 96, position: 'relative' }}>
        {community.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={community.cover_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'radial-gradient(120% 140% at 15% 0%, #E9DFC8 0%, #DED0AE 42%, #CBB985 100%)' }} />
        )}
      </div>
      <div style={{ padding: '12px 14px' }}>
        <div style={{ fontFamily: 'var(--font-abril)', fontSize: 16, color: 'var(--wimc-text-primary)', lineHeight: 1.2, marginBottom: 6 }}>
          {community.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10, color: 'var(--wimc-text-muted)', textTransform: 'uppercase' }}>
          <span>{community.memberCount} member{community.memberCount === 1 ? '' : 's'}</span>
          {community.city && <span>· {community.city}</span>}
        </div>
      </div>
    </Link>
  )
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 24px' }}>
      <span className="material-symbols-outlined" style={{ fontSize: 30, color: 'var(--wimc-text-muted)', display: 'block', marginBottom: 12 }}>groups</span>
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--wimc-text-primary)', marginBottom: 6, fontFamily: 'var(--font-dm-sans)' }}>
        {hasFilters ? 'No Circles match those filters yet' : 'No Circles yet'}
      </div>
      <p style={{ fontSize: 13, color: 'var(--wimc-text-secondary)', marginBottom: 20, fontFamily: 'var(--font-dm-sans)' }}>
        {hasFilters ? 'Try a different city or category, or start one yourself.' : 'Be the first to start one.'}
      </p>
      <Link
        href="/circles/new"
        style={{
          display: 'inline-block', padding: '11px 20px', borderRadius: 999, background: 'var(--wimc-coral)',
          color: '#FEFCF8', textDecoration: 'none', fontFamily: 'var(--font-dm-sans)', fontWeight: 700, fontSize: 13,
        }}
      >
        Start a Circle
      </Link>
    </div>
  )
}
