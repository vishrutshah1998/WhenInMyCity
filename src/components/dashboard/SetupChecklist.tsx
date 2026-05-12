'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { UserProfile } from '@/types/database'
import { dismissChecklistTask } from '@/app/actions/profile'

interface ChecklistTask {
  id: string
  label: string
  href?: string
  actionLabel: string
  autoCheck?: (profile: UserProfile) => boolean
  isShare?: boolean
}

const TASKS: ChecklistTask[] = [
  {
    id: 'photo',
    label: 'Add a profile photo',
    href: '/dashboard/profile',
    actionLabel: 'Add photo',
    autoCheck: (p) => p.avatar_url != null && p.avatar_url !== '',
  },
  {
    id: 'bio',
    label: 'Write your bio',
    href: '/dashboard/profile',
    actionLabel: 'Add bio',
    autoCheck: (p) => p.bio != null && p.bio !== '',
  },
  {
    id: 'social_link',
    label: 'Share your first social link',
    href: '/dashboard/profile',
    actionLabel: 'Add links',
    autoCheck: (p) =>
      p.social_links != null &&
      typeof p.social_links === 'object' &&
      Object.keys(p.social_links as Record<string, unknown>).length > 0,
  },
  {
    id: 'first_event',
    label: 'Create your first event',
    href: '/dashboard/events/create',
    actionLabel: 'Create event',
    autoCheck: (p) => p.cumulative_events_hosted > 0,
  },
  {
    id: 'theme',
    label: 'Customise your page theme',
    href: '/dashboard/studio',
    actionLabel: 'Open Studio',
  },
  {
    id: 'share',
    label: 'Share your page URL',
    actionLabel: 'Copy link',
    isShare: true,
  },
]

interface SetupChecklistProps {
  profile: UserProfile
}

export default function SetupChecklist({ profile }: SetupChecklistProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(
    new Set(profile.setup_checklist_dismissed ?? [])
  )
  const [copied, setCopied] = useState(false)
  const [, startTransition] = useTransition()
  const router = useRouter()

  function isDone(task: ChecklistTask): boolean {
    if (dismissed.has(task.id)) return true
    if (task.autoCheck) return task.autoCheck(profile)
    return false
  }

  function markDone(taskId: string) {
    setDismissed((prev) => new Set([...prev, taskId]))
    startTransition(() => {
      dismissChecklistTask(taskId).then(() => router.refresh())
    })
  }

  async function handleShare() {
    const url = `${window.location.origin}/${profile.username}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    markDone('share')
  }

  const numDone = TASKS.filter((t) => isDone(t)).length
  if (numDone === TASKS.length) return null

  const pct = Math.round((numDone / TASKS.length) * 100)

  return (
    <div style={{
      background: 'var(--wimc-bg-elevated)',
      border: '1px solid var(--wimc-border-default)',
      borderRadius: 18, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '18px 24px 14px',
        borderBottom: '1px solid var(--wimc-border-subtle)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontFamily: 'var(--font-syne)', fontSize: 15, fontWeight: 700 }}>
            Getting started
          </div>
          <div style={{
            fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11,
            color: 'var(--wimc-text-muted)',
          }}>
            {numDone} of {TASKS.length} complete
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ height: 4, background: 'var(--wimc-bg-overlay)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 2,
            background: 'linear-gradient(90deg, var(--wimc-coral), var(--wimc-amber))',
            width: `${pct}%`,
            transition: 'width 400ms ease',
          }} />
        </div>
      </div>

      {/* Task rows */}
      <div style={{ padding: '8px 0' }}>
        {TASKS.map((task) => {
          const done = isDone(task)
          return (
            <div
              key={task.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 24px',
                opacity: done ? 0.5 : 1,
                transition: 'opacity 300ms ease',
              }}
            >
              {/* Check circle */}
              <div style={{
                width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                border: done ? 'none' : '1.5px solid var(--wimc-border-strong)',
                background: done ? 'var(--wimc-success)' : 'transparent',
                display: 'grid', placeItems: 'center',
              }}>
                {done && (
                  <span className="material-symbols-outlined" style={{ fontSize: 13, color: '#fff', fontVariationSettings: "'FILL' 1" }}>
                    check
                  </span>
                )}
              </div>

              {/* Label */}
              <div style={{
                flex: 1, fontSize: 13.5, fontWeight: 500,
                textDecoration: done ? 'line-through' : 'none',
                color: done ? 'var(--wimc-text-muted)' : 'var(--wimc-text-primary)',
              }}>
                {task.label}
              </div>

              {/* Action */}
              {!done && (
                task.isShare ? (
                  <button
                    onClick={handleShare}
                    style={{
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      color: copied ? 'var(--wimc-success)' : 'var(--wimc-coral)',
                      background: 'transparent', border: 'none', padding: 0,
                      fontFamily: 'var(--font-dm-sans)',
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
                      {copied ? 'check' : 'content_copy'}
                    </span>
                    {copied ? 'Copied!' : task.actionLabel}
                  </button>
                ) : (
                  <Link
                    href={task.href!}
                    style={{
                      fontSize: 12, fontWeight: 600,
                      color: 'var(--wimc-coral)', textDecoration: 'none',
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}
                    onClick={() => task.id === 'theme' ? markDone('theme') : undefined}
                  >
                    {task.actionLabel}
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_forward</span>
                  </Link>
                )
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
