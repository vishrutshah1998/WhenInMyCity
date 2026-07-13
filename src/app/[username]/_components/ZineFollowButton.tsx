'use client'

import { useState, useTransition } from 'react'
import { toggleFollow } from '@/app/actions/follows'

interface Props {
  creatorId: string
  initialIsFollowing: boolean
  username: string
  /** If true, renders full-width (mobile below-cover style) */
  fullWidth?: boolean
}

export default function ZineFollowButton({
  creatorId,
  initialIsFollowing,
  username,
  fullWidth = false,
}: Props) {
  const [following, setFollowing] = useState(initialIsFollowing)
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      const result = await toggleFollow(creatorId)
      if (result.success) setFollowing(result.following)
    })
  }

  const baseClass = [
    'flex items-center justify-center gap-2',
    'border-2 border-black',
    'font-black uppercase text-[18px]',
    'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
    'hover:translate-x-[-2px] hover:translate-y-[-2px]',
    'hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]',
    'active:translate-x-[2px] active:translate-y-[2px]',
    'active:shadow-none',
    'transition-all stamp-thump cursor-pointer',
    fullWidth ? 'w-full py-4 px-6' : 'px-8 py-4',
    following
      ? 'bg-ds-teal text-[#1A2744]'
      : 'bg-ds-coral text-white',
    isPending ? 'opacity-60 pointer-events-none' : '',
  ].filter(Boolean).join(' ')

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={baseClass}
      style={{ fontFamily: 'var(--font-outfit, var(--font-syne))' }}
    >
      <span className="material-symbols-outlined text-[20px]">
        {following ? 'check_circle' : 'notifications'}
      </span>
      {following ? `UPDATES ON ✓` : `GET UPDATES`}
    </button>
  )
}
