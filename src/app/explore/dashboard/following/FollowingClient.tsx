'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { unfollowMaker } from '@/app/actions/explorer'
import { profileUrl } from '@/lib/profile-url'

const LAVENDER = '#9B8FFF'

interface Creator {
  id: string
  display_name: string
  username: string
  creator_type: string
  city: string
  avatar_url: string | null
}

export default function FollowingClient({ creators }: { creators: Creator[] }) {
  const [localCreators, setLocalCreators] = useState(creators)
  const [isPending, startTransition] = useTransition()

  function handleUnfollow(creatorId: string) {
    setLocalCreators(prev => prev.filter(c => c.id !== creatorId))
    startTransition(async () => {
      await unfollowMaker(creatorId)
    })
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px 80px' }}>
      <h1 style={{ fontFamily: 'var(--font-outfit)', fontSize: 24, fontWeight: 900, color: '#F0EFF8', marginBottom: 8 }}>
        Following
      </h1>
      <p style={{ fontSize: 13, color: '#9896B0', marginBottom: 28 }}>
        Creators you follow — their new events show up first.
      </p>

      {localCreators.length === 0 ? (
        <div style={{
          background: '#131317', border: '1px solid rgba(155,143,255,0.15)',
          padding: '40px 24px', textAlign: 'center',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#9896B0', display: 'block', marginBottom: 10 }}>
            group
          </span>
          <p style={{ fontSize: 13, color: '#9896B0', margin: '0 0 16px' }}>
            You&apos;re not following anyone yet.
          </p>
          <Link
            href="/explore"
            style={{
              display: 'inline-block',
              padding: '9px 20px',
              background: LAVENDER,
              color: '#07070A',
              fontFamily: 'var(--font-jetbrains-mono)',
              fontSize: 10, fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              textDecoration: 'none',
            }}
          >
            Discover creators →
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {localCreators.map(c => {
            const initials = c.display_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
            const url = profileUrl(c.city, c.username)
            return (
              <div
                key={c.id}
                style={{
                  background: '#131317',
                  border: '1px solid rgba(155,143,255,0.15)',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                }}
              >
                <Link href={url} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                  {c.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.avatar_url}
                      alt={c.display_name}
                      style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                    />
                  ) : (
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                      background: `linear-gradient(135deg, ${LAVENDER}, rgba(155,143,255,0.4))`,
                      display: 'grid', placeItems: 'center',
                      fontFamily: 'var(--font-outfit)', fontSize: 15, fontWeight: 700, color: '#fff',
                    }}>
                      {initials}
                    </div>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontFamily: 'var(--font-dm-sans)',
                      fontSize: 14, fontWeight: 600, color: '#F0EFF8',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {c.display_name}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-jetbrains-mono)',
                      fontSize: 9, color: '#9896B0',
                      textTransform: 'uppercase', letterSpacing: '0.1em',
                    }}>
                      {c.creator_type?.replace(/_/g, ' ')} · {c.city}
                    </div>
                  </div>
                </Link>
                <button
                  onClick={() => handleUnfollow(c.id)}
                  disabled={isPending}
                  style={{
                    background: 'transparent', border: '1px solid rgba(244,114,182,0.3)',
                    color: '#F472B6', cursor: 'pointer', padding: '4px 10px',
                    fontFamily: 'var(--font-jetbrains-mono)', fontSize: 9,
                    letterSpacing: '0.1em', textTransform: 'uppercase', borderRadius: 4,
                    transition: 'all 150ms', flexShrink: 0,
                  }}
                >
                  Unfollow
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
