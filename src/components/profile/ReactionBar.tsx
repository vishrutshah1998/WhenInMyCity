'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReactionCount {
  emoji: string
  count: number
}

interface Props {
  postId:              string
  initialReactions:    ReactionCount[]
  initialUserReactions: string[]
  viewerUserId:        string | null
}

const EMOJIS = ['🔥', '❤️', '👏', '🎉', '💭'] as const

// ---------------------------------------------------------------------------
// ReactionBar
// ---------------------------------------------------------------------------

export default function ReactionBar({
  postId,
  initialReactions,
  initialUserReactions,
  viewerUserId,
}: Props) {
  const router = useRouter()
  const [reactions,     setReactions]     = useState<ReactionCount[]>(initialReactions)
  const [userReactions, setUserReactions] = useState<string[]>(initialUserReactions)

  const totalCount = reactions.reduce((s, r) => s + r.count, 0)

  async function handleReact(emoji: string) {
    if (!viewerUserId) {
      router.push(`/signin?next=${encodeURIComponent(window.location.pathname)}`)
      return
    }

    const hasReacted = userReactions.includes(emoji)

    // Optimistic update
    setReactions((prev) => {
      const exists = prev.find((r) => r.emoji === emoji)
      if (exists) {
        return prev
          .map((r) => r.emoji === emoji ? { ...r, count: hasReacted ? r.count - 1 : r.count + 1 } : r)
          .filter((r) => r.count > 0)
      }
      if (!hasReacted) return [...prev, { emoji, count: 1 }]
      return prev
    })
    setUserReactions((prev) =>
      hasReacted ? prev.filter((e) => e !== emoji) : [...prev, emoji],
    )

    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    if (hasReacted) {
      await db
        .from('post_reactions')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', viewerUserId)
        .eq('emoji', emoji)
    } else {
      await db
        .from('post_reactions')
        .insert({ post_id: postId, user_id: viewerUserId, emoji })
    }
  }

  const visibleReactions = reactions.filter((r) => r.count > 0)
  const showAllPicker    = totalCount === 0

  return (
    <div className="flex gap-2 flex-wrap">
      {showAllPicker ? (
        /* No reactions yet — show faint picker */
        <div className="flex gap-1">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleReact(emoji)}
              className="text-[16px] transition-opacity hover:opacity-60"
              style={{ opacity: 0.2 }}
              title={`React with ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      ) : (
        /* Show existing counts + allow adding new */
        <>
          {visibleReactions.map(({ emoji, count }) => {
            const active = userReactions.includes(emoji)
            return (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                className="flex items-center gap-1 px-2 py-0.5 transition-all"
                style={{
                  borderRadius:    999,
                  border:          active ? '1px solid #E8705A' : '1px solid rgba(26,39,68,0.1)',
                  backgroundColor: active ? 'rgba(232,112,90,0.08)' : 'transparent',
                }}
              >
                <span className="text-[14px]">{emoji}</span>
                <span
                  className="text-[12px]"
                  style={{
                    fontFamily: 'var(--font-dm-sans)',
                    color:      active ? '#E8705A' : 'rgba(26,39,68,0.4)',
                  }}
                >
                  {count}
                </span>
              </button>
            )
          })}
          {/* Allow adding new reaction types not yet present */}
          {EMOJIS.filter((e) => !visibleReactions.find((r) => r.emoji === e)).map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleReact(emoji)}
              className="text-[14px] transition-opacity hover:opacity-60"
              style={{ opacity: 0.15 }}
              title={`React with ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </>
      )}
    </div>
  )
}
