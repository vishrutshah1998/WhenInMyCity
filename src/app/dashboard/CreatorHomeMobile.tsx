'use client'

import Link from 'next/link'
import type { UserProfile, Event, Notification } from '@/types/database'
import PostComposer from '@/components/dashboard/PostComposer'
import type { CreatorPost } from '@/app/actions/posts'
import BookingConfirmedBanner from '@/components/shared/BookingConfirmedBanner'
import { EventTicket, formatPaiseCompact } from '@/app/dashboard/homeShared'

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
    <div className="min-h-screen pb-6" style={{ background: '#F2EDE3' }}>

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
          ].map(({ value, label, color, href }) => {
            const content = (
              <>
                <p style={{ fontFamily: 'var(--font-syne)', fontSize: 24, fontWeight: 900, color, lineHeight: 1, margin: 0 }}>{value}</p>
                <p style={{ fontSize: 9, color: 'rgba(26,39,68,0.4)', textTransform: 'uppercase', fontFamily: 'var(--font-jetbrains-mono)', marginTop: 6, letterSpacing: 1 }}>{label}</p>
              </>
            )
            return href ? (
              <a key={label} href={href} style={{ background: '#FEFCF8', border: '1px solid rgba(26,39,68,0.12)', borderTop: `2px solid ${color}`, padding: '12px 16px', minWidth: 110, flexShrink: 0, textDecoration: 'none', display: 'block' }}>
                {content}
              </a>
            ) : (
              <div key={label} style={{ background: '#FEFCF8', border: '1px solid rgba(26,39,68,0.12)', padding: '12px 16px', minWidth: 110, flexShrink: 0 }}>
                {content}
              </div>
            )
          })}
        </div>
      </div>

      {/* Earn snapshot — compact card gateway to /dashboard/earn */}
      <a
        href="/dashboard/earn"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          margin: '0 16px 16px',
          padding: '14px 16px',
          background: '#FEFCF8',
          border: '1px solid rgba(217,119,6,0.2)',
          borderLeft: '3px solid #D97706',
          textDecoration: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#D97706', fontVariationSettings: "'FILL' 1" }}>sell</span>
          <div>
            <p style={{ fontSize: 8, color: 'rgba(26,39,68,0.4)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 2 }}>EARN HUB</p>
            <p style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 14, fontWeight: 700, color: '#1A2744', lineHeight: 1.2 }}>
              {formatPaiseCompact(mtdEarnedPaise)}{' '}
              <span style={{ fontSize: 11, fontWeight: 400, color: 'rgba(26,39,68,0.5)' }}>this month</span>
            </p>
          </div>
        </div>
        <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#D97706' }}>arrow_forward</span>
      </a>

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
          <div style={{ border: '1px dashed rgba(26,39,68,0.18)', padding: '24px', textAlign: 'center' }}>
            <p style={{ fontSize: 10, color: 'rgba(26,39,68,0.35)', textTransform: 'uppercase', fontFamily: 'var(--font-jetbrains-mono)' }}>No events pinned yet</p>
          </div>
        ) : (
          <div style={{ border: '1px solid rgba(26,39,68,0.12)', background: '#FEFCF8', overflow: 'hidden' }}>
            {upcomingEvents.slice(0, 3).map(ev => <EventTicket key={ev.id} ev={ev} soldCount={soldCountMap[ev.id] ?? 0} />)}
          </div>
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
          <a key={label} href={href} style={{ background: '#FEFCF8', border: '1px solid rgba(26,39,68,0.12)', padding: 16, aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, textDecoration: 'none' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 26, color: '#E8705A', fontVariationSettings: "'FILL' 1" }}>{icon}</span>
            <span style={{ fontSize: 9, color: '#1A2744', textTransform: 'uppercase', fontFamily: 'var(--font-jetbrains-mono)', textAlign: 'center', letterSpacing: 1 }}>{label}</span>
          </a>
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
