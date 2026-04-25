'use client'

import { useState, useTransition } from 'react'
import { followMaker, unfollowMaker } from '@/app/actions/explorer'

interface Props {
  makerId: string
  initialIsFollowing: boolean
}

export default function FollowButton({ makerId, initialIsFollowing }: Props) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [isPending, startTransition] = useTransition()

  function toggle() {
    startTransition(async () => {
      const { error } = isFollowing
        ? await unfollowMaker(makerId)
        : await followMaker(makerId)
      if (!error) setIsFollowing((prev) => !prev)
    })
  }

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 20px',
        borderRadius: 9999,
        fontSize: 13,
        fontWeight: 600,
        cursor: isPending ? 'wait' : 'pointer',
        opacity: isPending ? 0.7 : 1,
        border: isFollowing ? '1.5px solid currentColor' : 'none',
        background: isFollowing ? 'transparent' : 'var(--md-sys-color-primary, #E8572A)',
        color: isFollowing ? 'var(--md-sys-color-primary, #E8572A)' : '#fff',
        transition: 'all 200ms ease',
      }}
    >
      <span
        className="material-symbols-outlined"
        style={{
          fontSize: 16,
          fontVariationSettings: isFollowing ? "'FILL' 1" : "'FILL' 0",
        }}
      >
        {isFollowing ? 'person_check' : 'person_add'}
      </span>
      {isFollowing ? 'Following' : 'Follow'}
    </button>
  )
}
