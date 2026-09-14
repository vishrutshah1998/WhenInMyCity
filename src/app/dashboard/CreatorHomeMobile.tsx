'use client'

import Link from 'next/link'
import type { UserProfile, Event, Notification } from '@/types/database'
import PostComposer from '@/components/dashboard/PostComposer'
import type { CreatorPost } from '@/app/actions/posts'
import BookingConfirmedBanner from '@/components/shared/BookingConfirmedBanner'
import { EventTicket, formatPaiseCompact } from '@/app/dashboard/homeShared'
import PaperCard from '@/components/ui/PaperCard'
import IconChip from '@/components/ui/IconChip'

// Extracted verbatim from dashboard/page.tsx's old `md:hidden` mobile block —
// same JSX, unchanged — so it can be mounted as the Creator carousel's Home
// slot. Visibility is now the carousel's job (mounted only inside its
// `lg:hidden` wrapper), so this component itself carries no responsive gate.

interface Props {
  displayName:             string
  profile:                 UserProfile | null
  subscriberCount:         number
  upcomingEvents:          Event[]
  requestsCount:           number
  availablePaise:          number
  mtdEarnedPaise:          number
  confirmedNotifications:  Notification[]
  soldCountMap:            Record<string, number>
  onPostCreated:           (post: CreatorPost) => void
}

export default function CreatorHomeMobile({
  displayName, profile, subscriberCount, upcomingEvents, requestsCount,
  availablePaise, mtdEarnedPaise, confirmedNotifications, soldCountMap, onPostCreated,
}: Props) {
  return (
    <div className="min-h-screen pb-6" style={{ background: 'var(--wimc-bg-base)' }}>

      {/* Greeting — navy strip */}
      <div style={{ background: '#1A2744', padding: '16px' }}>
        <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontFamily: 'var(--font-jetbrains-mono)', marginBottom: 4, letterSpacing: 1.5 }}>WELCOME BACK,</p>
        <p style={{ fontFamily: 'var(--font-abril)', fontSize: 28, color: 'white', lineHeight: 1.1, margin: 0 }}>{displayName}</p>
        <p style={{ fontSize: 8, color: '#E8705A', textTransform: 'uppercase', marginTop: 4, fontFamily: 'var(--font-jetbrains-mono)', letterSpacing: 1.5 }}>CREATOR // ACTIVE</p>
      </div>

      {/* Stat pills */}
      <div className="overflow-x-auto py-4 no-scrollbar px-4" style={{ borderBottom: '1px solid rgba(26,39,68,0.1)' }}>
        <div style={{ display: 'flex', gap: 12 }}>
          {[
            { value: String(subscriberCount), label: 'SUBSCRIBERS', color: '#E8705A' },
            { value: String(upcomingEvents.length), label: 'EVENTS', color: '#E8705A' },
            { value: String(profile?.monthly_page_visitors ?? 0), label: 'VIEWS', color: '#E8705A' },
            { value: String(requestsCount), label: 'REQUESTS', color: '#E8705A' },
            { value: formatPaiseCompact(availablePaise), label: 'EARNINGS', color: '#D97706', href: '/dashboard/payouts' },
          ].map(({ value, label, color, href }) => (
            <PaperCard
              key={label}
              href={href}
              borderColor="var(--wimc-text-primary)"
              background="var(--wimc-bg-elevated)"
              padding="12px 16px"
              style={{ minWidth: 110, flexShrink: 0 }}
            >
              <p style={{ fontFamily: 'var(--font-syne)', fontSize: 24, fontWeight: 900, color, lineHeight: 1, margin: 0 }}>{value}</p>
              <p style={{ fontSize: 9, color: 'rgba(26,39,68,0.4)', textTransform: 'uppercase', fontFamily: 'var(--font-jetbrains-mono)', marginTop: 6, letterSpacing: 1 }}>{label}</p>
            </PaperCard>
          ))}
        </div>
      </div>

      {/* Expand your presence — shown when user has missing personas.
          Mirrors dashboard/page.tsx's desktop-only PaperCard "EXPAND YOUR
          PRESENCE" block (same missing-persona logic, same link targets,
          same copy) — that block never had a mobile counterpart since this
          component was extracted from the old md:hidden block, which
          predated the CTA. Styled to match this file's existing
          borderLeft-accent card idiom (Earn/Progress snapshots below)
          rather than the desktop PaperCard component, which isn't
          exported (page.tsx can't have extra named exports under the App
          Router's page-file constraints). */}
      {(() => {
        const ALL_P = ['creator', 'explorer', 'venue', 'brand'] as const
        const personas = profile?.personas ?? []
        const missing = ALL_P.filter(p => !personas.includes(p))
        if (missing.length === 0) return null
        const PERSONA_URL: Record<string, string> = {
          creator: '/onboarding?mode=add&persona=creator', explorer: '/onboarding?mode=add&persona=explorer',
          venue: '/onboarding?mode=add&persona=venue', brand: '/onboarding?mode=add&persona=brand',
        }
        const PERSONA_LABEL: Record<string, string> = {
          creator: 'Become a Creator', explorer: 'Become an Explorer',
          venue: 'List an Venue', brand: 'Add a Brand',
        }
        return (
          <div style={{ margin: '0 16px 16px', padding: '14px 16px', background: '#FEFCF8', border: '1px solid rgba(93,217,208,0.25)', borderLeft: '3px solid #5DD9D0' }}>
            <p style={{ fontSize: 8, color: '#5DD9D0', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 6 }}>✦ EXPAND YOUR PRESENCE</p>
            <p style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 13, fontWeight: 700, color: '#1A2744', marginBottom: 10 }}>Add another side to your WIMC profile</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {missing.map(p => (
                <Link
                  key={p}
                  href={PERSONA_URL[p]}
                  style={{ padding: '7px 14px', background: '#1A2744', color: '#F2EDE3', textDecoration: 'none', fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-jetbrains-mono)', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 13 }}>add</span>
                  {PERSONA_LABEL[p]}
                </Link>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Earn snapshot — compact card gateway to /dashboard/earn */}
      <PaperCard
        href="/dashboard/earn"
        borderColor="var(--wimc-text-primary)"
        background="var(--wimc-bg-elevated)"
        padding="14px 16px"
        style={{ margin: '0 16px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <IconChip color="#FFD23F">
            <span className="material-symbols-outlined" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>sell</span>
          </IconChip>
          <div>
            <p style={{ fontSize: 8, color: 'rgba(26,39,68,0.4)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 2 }}>EARN HUB</p>
            <p style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 14, fontWeight: 700, color: '#1A2744', lineHeight: 1.2 }}>
              {formatPaiseCompact(mtdEarnedPaise)}{' '}
              <span style={{ fontSize: 11, fontWeight: 400, color: 'rgba(26,39,68,0.5)' }}>this month</span>
            </p>
          </div>
        </div>
        <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#D97706' }}>arrow_forward</span>
      </PaperCard>

      {/* Confirmed booking banner */}
      <div style={{ padding: '16px 16px 0' }}>
        <BookingConfirmedBanner notifications={confirmedNotifications} theme="light" />
      </div>

      {/* PostComposer */}
      <div style={{ padding: '16px' }}>
        <PostComposer onPostCreated={onPostCreated} />
      </div>

      {/* Upcoming Events as tickets */}
      <div style={{ padding: '0 16px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 10, color: '#1A2744', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: 1.5 }}>YOUR EVENTS</span>
          <Link href="/dashboard/events/create" style={{ fontSize: 9, color: '#E8705A', border: '1px solid rgba(232,112,90,0.3)', padding: '4px 10px', fontFamily: 'var(--font-jetbrains-mono)', textDecoration: 'none', letterSpacing: 1 }}>
            PIN +
          </Link>
        </div>
        {upcomingEvents.length === 0 ? (
          <div style={{ border: '1px dashed rgba(26,39,68,0.18)', borderRadius: 16, padding: '24px', textAlign: 'center' }}>
            <p style={{ fontSize: 10, color: 'rgba(26,39,68,0.35)', textTransform: 'uppercase', fontFamily: 'var(--font-jetbrains-mono)' }}>No events pinned yet</p>
          </div>
        ) : (
          <PaperCard
            borderColor="var(--wimc-text-primary)"
            background="var(--wimc-bg-elevated)"
            padding={0}
            style={{ overflow: 'hidden' }}
          >
            {upcomingEvents.slice(0, 3).map(ev => <EventTicket key={ev.id} ev={ev} soldCount={soldCountMap[ev.id] ?? 0} />)}
          </PaperCard>
        )}
      </div>

      {/* Quick actions */}
      <div style={{ padding: '0 16px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {[
          { icon: 'edit_note',  label: 'MY PAGE',   href: '/dashboard/studio' },
          { icon: 'event',      label: 'ADD EVENT', href: '/dashboard/events/create' },
          { icon: 'bar_chart',  label: 'ANALYTICS', href: '/dashboard/analytics' },
          { icon: 'sell',       label: 'EARN',      href: '/dashboard/earn' },
        ].map(({ icon, label, href }) => (
          <PaperCard
            key={label}
            href={href}
            borderColor="var(--wimc-text-primary)"
            background="var(--wimc-bg-elevated)"
            padding={16}
            style={{ aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 26, color: '#E8705A', fontVariationSettings: "'FILL' 1" }}>{icon}</span>
            <span style={{ fontSize: 9, color: '#1A2744', textTransform: 'uppercase', fontFamily: 'var(--font-jetbrains-mono)', textAlign: 'center', letterSpacing: 1 }}>{label}</span>
          </PaperCard>
        ))}
      </div>

      {/* Marquee */}
      <div style={{ background: '#1A2744', height: 30, display: 'flex', alignItems: 'center', overflow: 'hidden', marginTop: 8 }}>
        <div className="flex whitespace-nowrap board-marquee">
          {[0, 1].map((k) => (
            <span key={k} style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontFamily: 'var(--font-jetbrains-mono)', letterSpacing: '0.3em', paddingRight: '2rem' }}>
              CITY CREATORS · OFFLINE FIRST · LOCAL SCENE ·&nbsp;
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
