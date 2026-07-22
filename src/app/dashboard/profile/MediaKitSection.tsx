'use client'

import { useState, useTransition } from 'react'
import { getMediaKitToken, regenerateMediaKitToken } from '@/app/actions/media-kit'
import { isLocalPlus } from '@/lib/tier'
import type { UserTier } from '@/types/database'

function buildLink(token: string): string {
  return `https://wheninmycity.com/media-kit/${token}`
}

export default function MediaKitSection({
  tier,
  initialToken,
}: {
  tier: UserTier
  initialToken: string | null
}) {
  const [token, setToken]         = useState(initialToken)
  const [copied, setCopied]       = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const unlocked = isLocalPlus(tier)

  function handleCopy() {
    setError(null)
    startTransition(async () => {
      let activeToken = token
      if (!activeToken) {
        const result = await getMediaKitToken()
        if (result.error || !result.token) { setError(result.error ?? 'Failed to generate link.'); return }
        activeToken = result.token
        setToken(activeToken)
      }
      navigator.clipboard.writeText(buildLink(activeToken)).catch(() => {})
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleRegenerate() {
    setError(null)
    startTransition(async () => {
      const result = await regenerateMediaKitToken()
      if (result.error || !result.token) { setError(result.error ?? 'Failed to regenerate link.'); return }
      setToken(result.token)
      navigator.clipboard.writeText(buildLink(result.token)).catch(() => {})
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <section style={{
      display: 'flex', flexDirection: 'column', gap: 12,
      background: 'var(--wimc-bg-elevated)',
      border: '1px solid var(--wimc-border-default)',
      padding: 24,
    }}>
      <h2 style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 14, color: 'var(--wimc-text-primary)', letterSpacing: '0.03em' }}>
        Media Kit
      </h2>

      {!unlocked ? (
        <p style={{ fontSize: 13, color: 'var(--wimc-text-muted)', lineHeight: 1.6 }}>
          Unlocks at Local tier — a shareable sponsor one-pager with your revenue, repeat-attendee
          rate, venue footprint, and booking-inquiry conversion.
        </p>
      ) : (
        <>
          <p style={{ fontSize: 13, color: 'var(--wimc-text-secondary)', lineHeight: 1.6 }}>
            A shareable, read-only page for sponsors and brands with your key stats. Regenerating
            invalidates the previous link.
          </p>

          {token && (
            <div style={{
              fontFamily: 'var(--font-jetbrains-mono)', fontSize: 12, color: 'var(--wimc-text-secondary)',
              background: 'var(--wimc-bg-overlay)', border: '1px solid var(--wimc-border-subtle)',
              padding: '10px 12px', wordBreak: 'break-all',
            }}>
              {buildLink(token)}
            </div>
          )}

          {error && (
            <p style={{ fontSize: 12, color: '#E8342A' }}>{error}</p>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleCopy}
              disabled={isPending}
              style={{
                background: copied ? '#4ADE80' : 'var(--wimc-coral)',
                color: copied ? '#07070A' : 'white',
                border: 'none', fontFamily: 'var(--font-jetbrains-mono)',
                fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
                padding: '10px 16px', cursor: isPending ? 'default' : 'pointer',
                opacity: isPending ? 0.6 : 1, transition: 'all 0.2s',
              }}
            >
              {copied ? 'Copied ✓' : token ? 'Copy Media Kit Link' : 'Generate Media Kit Link'}
            </button>

            {token && (
              <button
                onClick={handleRegenerate}
                disabled={isPending}
                style={{
                  background: 'transparent', color: 'var(--wimc-text-secondary)',
                  border: '1px solid var(--wimc-border-default)', fontFamily: 'var(--font-jetbrains-mono)',
                  fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
                  padding: '10px 16px', cursor: isPending ? 'default' : 'pointer',
                  opacity: isPending ? 0.6 : 1, transition: 'all 0.2s',
                }}
              >
                Regenerate Link
              </button>
            )}
          </div>
        </>
      )}
    </section>
  )
}
