'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SK, clearNewOnboardingKeys } from '@/lib/onboarding/session-keys'
import { completeExplorerOnboarding } from '@/app/actions/persona-complete'
import { updatePersonas } from '@/lib/onboarding/update-personas'
import { createClient } from '@/lib/supabase/client'
import { ArtifactStyles, ScaledStage, ExplorerTicket, formatMemberSince } from '@/components/onboarding/artifacts'
import { INTEREST_TAGS } from '@/lib/constants/interests'

function categoryLabel(cat: string): string {
  return cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

const ACCENT = '#9B8FFF'
const NAVY   = '#1A2744'
const DM     = "'DM Sans', sans-serif"
const ABRIL  = "var(--font-abril), 'Abril Fatface', serif"

const KEYFRAMES = `
@keyframes e7-pulse  { 0%,100%{opacity:1} 50%{opacity:0.4} }
@keyframes e7-spin   { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
@keyframes e7-fade-up { 0%{opacity:0;transform:translateY(12px)} 100%{opacity:1;transform:translateY(0)} }
`

export default function E7Page() {
  const router = useRouter()

  const [phase,        setPhase]        = useState<'saving' | 'revealed' | 'error'>('saving')
  const [cityName,     setCityName]     = useState('Your City')
  const [explorerName, setExplorerName] = useState('')
  const [isAddMode,       setIsAddMode]       = useState(false)
  const [submitError,     setSubmitError]     = useState<string | null>(null)
  const [isLeaving,       setIsLeaving]       = useState(false)
  const [pendingRedirect, setPendingRedirect] = useState<string | null>(null)
  const [accountId,       setAccountId]       = useState('')
  const [favoriteCategory, setFavoriteCategory] = useState<string | null>(null)
  const [joinedAt,        setJoinedAt]        = useState<Date | null>(null)
  const [avatarUrl,       setAvatarUrl]       = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mode = sessionStorage.getItem('wimc_ob_mode')
    const persona = sessionStorage.getItem(SK.persona)
    if (!mode && persona !== 'explorer') { router.replace('/onboarding'); return }

    setIsAddMode(mode === 'add')
    setExplorerName(sessionStorage.getItem(SK.e_name) || '')
    setCityName(sessionStorage.getItem(SK.e_city) || 'Your City')
    setPendingRedirect(sessionStorage.getItem('wimc_post_onboarding_redirect'))
    setAvatarUrl(sessionStorage.getItem(SK.e_avatar_url))

    async function save() {
      try {
        const interestIds = JSON.parse(sessionStorage.getItem(SK.e_interests) || '[]') as string[]
        await completeExplorerOnboarding({
          displayName:           sessionStorage.getItem(SK.e_name)         || '',
          username:              sessionStorage.getItem(SK.e_username)      || '',
          city:                  sessionStorage.getItem(SK.e_city)         || '',
          neighbourhood:         sessionStorage.getItem(SK.e_neighbourhood) || null,
          explorerScene:         sessionStorage.getItem(SK.e_scene)        || '',
          interestTags:          interestIds,
          preferredFormats:      JSON.parse(sessionStorage.getItem(SK.e_formats)   || '[]') as string[],
          priceRangeMaxPaise:    Number(sessionStorage.getItem(SK.e_price_max) ?? '1000') * 100,
          notificationPreferences: {
            whatsapp:         sessionStorage.getItem(SK.e_notif_wa) !== 'false',
            digest_frequency: (sessionStorage.getItem(SK.e_digest_freq) ?? 'weekly') as 'daily' | 'weekly' | 'never',
          },
          explorerCreatorIntent: sessionStorage.getItem(SK.e_intent)
            ? [sessionStorage.getItem(SK.e_intent)!]
            : [],
          avatarUrl: sessionStorage.getItem(SK.e_avatar_url) || null,
        })

        const topTag = INTEREST_TAGS.find(t => t.id === interestIds[0])
        setFavoriteCategory(topTag ? categoryLabel(topTag.category) : null)
        setJoinedAt(new Date())
        createClient().auth.getUser().then(({ data: { user } }) => {
          if (user) setAccountId(user.id)
        }).catch(() => {})

        setPhase('revealed')
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
        setPhase('error')
      }
    }
    save()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  async function finishOnboarding(dest: string) {
    if (isLeaving) return
    setIsLeaving(true)
    if (isAddMode) {
      try { await updatePersonas('explorer') } catch {}
    }
    try { sessionStorage.removeItem('wimc_post_onboarding_redirect') } catch {}
    clearNewOnboardingKeys()
    router.push(dest)
  }

  // ── Saving phase ─────────────────────────────────────────────────────────────
  if (phase === 'saving') {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />
        <div style={{
          position: 'fixed', inset: 0, background: NAVY,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 16,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            border: `2px solid ${ACCENT}`, borderTopColor: 'transparent',
            animation: 'e7-spin 1s linear infinite',
          }} />
          <span style={{ fontFamily: DM, fontSize: 14, color: 'rgba(255,255,255,0.40)' }}>
            Issuing your pass…
          </span>
        </div>
      </>
    )
  }

  // ── Error phase ──────────────────────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />
        <div style={{
          position: 'fixed', inset: 0, background: NAVY,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 40, color: ACCENT }}>error</span>
          <p style={{ fontFamily: DM, fontSize: 14, color: 'rgba(255,255,255,0.45)', maxWidth: 320, margin: 0 }}>
            {submitError || 'Could not issue your pass. Please try again.'}
          </p>
          <button
            onClick={() => router.replace('/onboarding/explorer/E6')}
            style={{ background: ACCENT, color: '#ffffff', fontFamily: DM, fontWeight: 600, fontSize: 14, padding: '12px 24px', border: 'none', cursor: 'pointer' }}
          >
            Go back
          </button>
        </div>
      </>
    )
  }

  // ── Revealed phase ───────────────────────────────────────────────────────────
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />

      <div style={{
        position: 'fixed', inset: 0, background: NAVY,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '24px 24px 80px',
        overflowY: 'auto',
      }}>
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', textAlign: 'center',
          width: '100%', maxWidth: 360,
          gap: 0,
        }}>

          {/* Explorer membership ticket artifact */}
          <div style={{ width: '100%', marginBottom: 36 }}>
            <ArtifactStyles />
            <ScaledStage width={720} height={320} maxWidth={340}>
              <ExplorerTicket
                displayName={explorerName || 'Explorer'}
                photoUrl={avatarUrl}
                city={cityName}
                memberSinceLabel={formatMemberSince(joinedAt)}
                favoriteCategory={favoriteCategory}
                accountId={accountId || explorerName}
              />
            </ScaledStage>
          </div>

          {/* Headline */}
          <h1 style={{
            fontFamily: ABRIL, fontSize: 'clamp(26px,6vw,36px)',
            color: '#F0EFF8', lineHeight: 1.1,
            margin: '0 0 10px',
            animation: 'e7-fade-up 0.5s ease 0.3s both',
          }}>
            {isAddMode ? '✦ Explorer added to your profile' : "You're in! Welcome to the culture."}
          </h1>
          <p style={{
            fontFamily: DM, fontSize: 15, color: 'rgba(255,255,255,0.45)',
            margin: '0 0 32px',
            animation: 'e7-fade-up 0.5s ease 0.4s both',
          }}>
            {isAddMode
              ? 'Switch between your personas from your dashboard.'
              : `Your explorer page is live. Start discovering what's on in ${cityName}.`}
          </p>

          {/* Single CTA */}
          <div style={{
            width: '100%',
            animation: 'e7-fade-up 0.5s ease 0.5s both',
          }}>
            <button
              type="button"
              onClick={() => finishOnboarding(pendingRedirect || '/explore/dashboard/studio')}
              disabled={isLeaving}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%',
                background: ACCENT, color: '#ffffff',
                fontFamily: DM, fontWeight: 600, fontSize: 16,
                padding: '16px 20px', border: 'none',
                cursor: isLeaving ? 'wait' : 'pointer',
                opacity: isLeaving ? 0.7 : 1,
              }}
            >
              <span>Continue to your dashboard</span>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_forward</span>
            </button>
          </div>

        </div>
      </div>

      {/* Footer: back only — same 72px band as every other screen's footer,
          Back anchored to the same far-left slot (this reveal screen has no
          "next step" CTA to pair it with; the primary action above is a
          terminal action, not a step-to-step Continue). */}
      <footer style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, height: 72, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'flex-start', padding: '0 24px',
        background: `linear-gradient(to top, ${NAVY} 60%, transparent 100%)`,
      }}>
        <button
          type="button"
          onClick={() => router.push('/onboarding/explorer/E6')}
          style={{ background: 'none', border: 'none', fontFamily: DM, fontSize: 15, color: 'rgba(255,255,255,0.25)', cursor: 'pointer', padding: 0 }}
        >
          ← Back
        </button>
      </footer>
    </>
  )
}
