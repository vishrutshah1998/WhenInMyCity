'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SK, clearNewOnboardingKeys, LEGACY_KEYS } from '@/lib/onboarding/session-keys'
import { updatePersonas } from '@/lib/onboarding/update-personas'
import { completeOnboarding } from '@/app/actions/onboarding'
import { INTEREST_TAGS } from '@/lib/constants/interests'
import { V2_CREATOR_TYPES } from '@/types/onboarding'
import { getCategoryColour } from '@/lib/onboarding/design-tokens'
import { ArtifactStyles, ScaledStage, CreatorPoster, DEFAULT_MOOD, type PosterMood } from '@/components/onboarding/artifacts'

type CreatorTypeV2 = typeof V2_CREATOR_TYPES[number]
function isValidCreatorType(v: string): v is CreatorTypeV2 {
  return (V2_CREATOR_TYPES as readonly string[]).includes(v)
}

// ── Ticket reveal constants ───────────────────────────────────────────────────
const CORAL = '#E8705A'
const NAVY  = '#1A2744'
const MONO  = "var(--font-jetbrains-mono), 'JetBrains Mono', monospace"
const BARLOW = "var(--font-barlow), 'Barlow Condensed', sans-serif"
const ABRIL = "var(--font-abril), 'Abril Fatface', serif"

const REVEAL_KEYFRAMES = `
@keyframes c8b-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
@keyframes ticket-stamp-in  { 0%{transform:scale(4) rotate(-12deg);opacity:0} 60%{transform:scale(0.92) rotate(-12deg);opacity:1} 100%{transform:scale(1) rotate(-12deg);opacity:1} }
@keyframes ticket-fade-up   { 0%{opacity:0;transform:translateY(20px)} 100%{opacity:1;transform:translateY(0)} }
@keyframes ticket-reveal    { 0%{opacity:0} 100%{opacity:1} }
@keyframes ticket-pulse     { 0%,100%{opacity:1} 50%{opacity:0.4} }
@keyframes ticket-line-in   { 0%{width:0} 100%{width:100%} }
@keyframes ticket-in        { 0%{opacity:0;transform:translateY(16px) rotate(-1deg)} 100%{opacity:1;transform:translateY(0) rotate(-1deg)} }
`

// ── Block catalogue ──────────────────────────────────────────────────────────

interface BlockOption {
  key: string
  icon: string
  label: string
  description: string
}

const BLOCK_OPTIONS: BlockOption[] = [
  { key: 'text_bio',          icon: 'person',          label: 'Bio',               description: 'A short introduction in your own words' },
  { key: 'social_links_row',  icon: 'link',            label: 'Social Links',      description: 'Instagram, YouTube, Spotify, and more' },
  { key: 'creator_type_badge',icon: 'badge',           label: 'Creator Badge',     description: 'Shows your category at a glance' },
  { key: 'event_listing',     icon: 'event',           label: 'Events',            description: 'Your upcoming and past events' },
  { key: 'community_stats',   icon: 'bar_chart',       label: 'Community Stats',   description: 'Events hosted, attendees, and ratings' },
  { key: 'booking_request',   icon: 'calendar_add_on', label: 'Book Me',           description: 'Let people request to book you' },
  { key: 'newsletter_signup', icon: 'mail',            label: 'Newsletter',        description: 'Collect email subscribers' },
  { key: 'collab_invite',     icon: 'handshake',       label: 'Collaboration',     description: 'Invite others to work with you' },
  { key: 'whatsapp_community',icon: 'forum',           label: 'WhatsApp Community',description: 'Link to your WhatsApp group' },
  { key: 'city_community',    icon: 'location_city',   label: 'City Community',    description: 'Connect with your local scene' },
]

const DEFAULT_BLOCKS_BY_CREATOR_TYPE: Record<string, string[]> = {
  music:                  ['text_bio', 'social_links_row', 'creator_type_badge', 'event_listing'],
  comedy_theatre:         ['text_bio', 'social_links_row', 'creator_type_badge', 'event_listing'],
  art_design:             ['text_bio', 'social_links_row', 'creator_type_badge', 'event_listing'],
  video_content:          ['text_bio', 'social_links_row', 'creator_type_badge', 'event_listing'],
  teaching_coaching:      ['text_bio', 'social_links_row', 'creator_type_badge', 'event_listing', 'community_stats'],
  lifestyle_wellness:     ['text_bio', 'social_links_row', 'creator_type_badge', 'event_listing'],
  business_brand:         ['text_bio', 'social_links_row', 'creator_type_badge', 'event_listing', 'booking_request'],
  professional_portfolio: ['text_bio', 'social_links_row', 'creator_type_badge', 'event_listing'],
  community_impact:       ['text_bio', 'social_links_row', 'creator_type_badge', 'event_listing', 'community_stats'],
  exploring:              ['text_bio', 'social_links_row', 'event_listing'],
}

// ── Block thumbnails ─────────────────────────────────────────────────────────

function BlockThumbnail({ blockKey, accent, isChecked }: { blockKey: string; accent: string; isChecked: boolean }) {
  const hi = isChecked ? accent : 'rgba(255,255,255,0.35)'
  const lo = 'rgba(255,255,255,0.14)'
  const bg = 'rgba(255,255,255,0.07)'
  const p = { width: 60, height: 40, viewBox: '0 0 60 40', fill: 'none', style: { flexShrink: 0 } }

  switch (blockKey) {
    case 'text_bio':
      return (
        <svg {...p}>
          <rect x="4" y="7" width="52" height="3.5" rx="1.5" fill={hi}/>
          <rect x="4" y="14" width="46" height="3" rx="1.5" fill={lo}/>
          <rect x="4" y="20" width="52" height="3" rx="1.5" fill={lo}/>
          <rect x="4" y="26" width="30" height="3" rx="1.5" fill={lo}/>
          <rect x="4" y="32" width="18" height="3" rx="1.5" fill={bg}/>
        </svg>
      )
    case 'social_links_row':
      return (
        <svg {...p}>
          <circle cx="11" cy="20" r="7" fill={hi}/>
          <circle cx="28" cy="20" r="7" fill={lo}/>
          <circle cx="45" cy="20" r="7" fill={lo}/>
        </svg>
      )
    case 'creator_type_badge':
      return (
        <svg {...p}>
          <rect x="8" y="14" width="44" height="12" rx="6" fill={hi}/>
          <rect x="20" y="18" width="20" height="4" rx="2" fill="rgba(255,255,255,0.5)"/>
        </svg>
      )
    case 'event_listing':
      return (
        <svg {...p}>
          <rect x="2" y="3" width="56" height="15" rx="3" fill={hi}/>
          <rect x="6" y="7" width="10" height="7" rx="1" fill="rgba(255,255,255,0.3)"/>
          <rect x="20" y="8" width="22" height="3" rx="1" fill="rgba(255,255,255,0.55)"/>
          <rect x="20" y="13" width="14" height="2" rx="1" fill="rgba(255,255,255,0.3)"/>
          <rect x="2" y="22" width="56" height="15" rx="3" fill={lo}/>
          <rect x="6" y="26" width="10" height="7" rx="1" fill={bg}/>
          <rect x="20" y="27" width="18" height="3" rx="1" fill={lo}/>
          <rect x="20" y="32" width="11" height="2" rx="1" fill={bg}/>
        </svg>
      )
    case 'community_stats':
      return (
        <svg {...p}>
          <rect x="1" y="8" width="18" height="24" rx="2" fill={lo}/>
          <rect x="21" y="8" width="18" height="24" rx="2" fill={lo}/>
          <rect x="41" y="8" width="18" height="24" rx="2" fill={lo}/>
          <rect x="4" y="13" width="12" height="7" rx="1" fill={hi}/>
          <rect x="24" y="13" width="12" height="7" rx="1" fill={hi}/>
          <rect x="44" y="13" width="12" height="7" rx="1" fill={hi}/>
          <rect x="4" y="22" width="12" height="3" rx="1" fill={bg}/>
          <rect x="24" y="22" width="12" height="3" rx="1" fill={bg}/>
          <rect x="44" y="22" width="12" height="3" rx="1" fill={bg}/>
        </svg>
      )
    case 'booking_request':
      return (
        <svg {...p}>
          <rect x="4" y="11" width="52" height="18" rx="5" fill={hi}/>
          <rect x="14" y="17" width="28" height="6" rx="2" fill="rgba(255,255,255,0.55)"/>
        </svg>
      )
    case 'newsletter_signup':
      return (
        <svg {...p}>
          <rect x="2" y="13" width="36" height="12" rx="3" fill={bg} stroke={lo} strokeWidth="1"/>
          <rect x="6" y="17" width="16" height="4" rx="1.5" fill={lo}/>
          <rect x="40" y="13" width="18" height="12" rx="3" fill={hi}/>
          <rect x="44" y="17" width="10" height="4" rx="1.5" fill="rgba(255,255,255,0.55)"/>
        </svg>
      )
    case 'collab_invite':
      return (
        <svg {...p}>
          <circle cx="16" cy="18" r="8" fill={lo}/>
          <circle cx="29" cy="18" r="8" fill={lo} fillOpacity="0.7"/>
          <rect x="40" y="12" width="18" height="12" rx="3" fill={hi}/>
          <rect x="45" y="17" width="8" height="2.5" rx="1" fill="rgba(255,255,255,0.6)"/>
          <rect x="48" y="14" width="2.5" height="8" rx="1" fill="rgba(255,255,255,0.6)"/>
        </svg>
      )
    case 'whatsapp_community':
      return (
        <svg {...p}>
          <rect x="4" y="5" width="42" height="22" rx="5" fill={hi}/>
          <polygon points="10,27 4,34 18,27" fill={hi}/>
          <rect x="10" y="11" width="28" height="3" rx="1.5" fill="rgba(255,255,255,0.55)"/>
          <rect x="10" y="17" width="18" height="3" rx="1.5" fill="rgba(255,255,255,0.35)"/>
          <rect x="48" y="13" width="8" height="10" rx="2" fill={lo}/>
        </svg>
      )
    case 'city_community':
      return (
        <svg {...p}>
          <rect x="4" y="8" width="52" height="28" rx="3" fill={bg} stroke={lo} strokeWidth="1"/>
          <line x1="4" y1="22" x2="56" y2="22" stroke={lo} strokeWidth="0.5"/>
          <line x1="30" y1="8" x2="30" y2="36" stroke={lo} strokeWidth="0.5"/>
          <circle cx="30" cy="20" r="6" fill={hi}/>
          <circle cx="30" cy="20" r="2.5" fill="rgba(255,255,255,0.6)"/>
          <line x1="30" y1="26" x2="30" y2="32" stroke={hi} strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      )
    default:
      return null
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function C8bSectionsPage() {
  const router = useRouter()

  const [checked,      setChecked]      = useState<Set<string>>(new Set())
  const [creatorType,  setCreatorType]  = useState('')
  const [category,     setCategory]     = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [loaded,       setLoaded]       = useState(false)

  // Reveal state (post-submit)
  const [revealPhase,     setRevealPhase]     = useState<'form' | 'revealed'>('form')
  const [displayName,     setDisplayName]     = useState('')
  const [username,        setUsername]        = useState('')
  const [city,            setCity]            = useState('')
  const [isAddMode,       setIsAddMode]       = useState(false)
  const [isLeaving,       setIsLeaving]       = useState(false)
  const [pendingRedirect, setPendingRedirect] = useState<string | null>(null)
  const [interestTagIds,  setInterestTagIds]  = useState<string[]>([])
  const [mood,            setMood]            = useState<PosterMood>(DEFAULT_MOOD)
  const [avatarUrl,       setAvatarUrl]       = useState<string | null>(null)

  const accent = getCategoryColour(category)
  const tagLabels = interestTagIds
    .map(id => INTEREST_TAGS.find(t => t.id === id)?.label)
    .filter((v): v is string => Boolean(v))
    .slice(0, 3)

  useEffect(() => {
    const rawCat = sessionStorage.getItem(SK.c_category) || ''
    if (!sessionStorage.getItem(SK.c_name)) {
      router.replace('/onboarding/creator/C2')
      return
    }

    setCategory(rawCat)
    const ct = isValidCreatorType(rawCat) ? rawCat : 'exploring'
    setCreatorType(ct)

    const defaults = DEFAULT_BLOCKS_BY_CREATOR_TYPE[ct] ?? ['text_bio', 'social_links_row', 'event_listing']
    setChecked(new Set(defaults))

    setDisplayName(sessionStorage.getItem(SK.c_name) || '')
    setUsername(sessionStorage.getItem(SK.c_final_username) || sessionStorage.getItem(SK.c_username) || '')
    setCity(sessionStorage.getItem(SK.c_city) || '')
    setIsAddMode(sessionStorage.getItem('wimc_ob_mode') === 'add')
    setPendingRedirect(sessionStorage.getItem('wimc_post_onboarding_redirect'))

    try {
      const raw: unknown[] = JSON.parse(sessionStorage.getItem(SK.c_interests) || '[]')
      setInterestTagIds(raw.map(i =>
        typeof i === 'string' ? i : (typeof i === 'object' && i !== null && 'tag' in i ? String((i as {tag:unknown}).tag) : '')
      ).filter(Boolean))
    } catch {}

    try {
      const themeRaw = sessionStorage.getItem(SK.c_theme_json)
      const parsed = themeRaw ? JSON.parse(themeRaw) as Record<string, unknown> : null
      const savedMood = parsed?.posterMood
      if (savedMood === 'moody' || savedMood === 'editorial' || savedMood === 'vivid') setMood(savedMood)
    } catch {}

    setAvatarUrl(sessionStorage.getItem(SK.c_avatar_url))

    setLoaded(true)
  }, [router])

  function toggle(key: string) {
    setChecked(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  async function handleCreate() {
    if (isSubmitting) return
    setIsSubmitting(true)
    setError(null)

    // Reconstruct the full profile data from session
    const dn           = sessionStorage.getItem(SK.c_name)           || ''
    const finalUser    = sessionStorage.getItem(SK.c_final_username) || sessionStorage.getItem(SK.c_username) || ''
    const cityVal      = sessionStorage.getItem(SK.c_city)           || ''
    const bio          = sessionStorage.getItem(SK.c_bio)            || ''
    const colorScheme  = sessionStorage.getItem(SK.c_colorscheme)    || ''
    const themeRaw     = sessionStorage.getItem(SK.c_theme_json)

    let subTypesArr: string[] = []
    try { subTypesArr = JSON.parse(sessionStorage.getItem(SK.c_subtypes) || '[]') } catch {}

    let offlineActsArr: string[] = []
    try { offlineActsArr = JSON.parse(sessionStorage.getItem(SK.c_offline_acts) || '[]') } catch {}

    let tagsArr: string[] = []
    try {
      const raw: unknown[] = JSON.parse(sessionStorage.getItem(SK.c_interests) || '[]')
      tagsArr = raw.map(i =>
        typeof i === 'string' ? i : (typeof i === 'object' && i !== null && 'tag' in i ? String((i as {tag:unknown}).tag) : '')
      ).filter(Boolean)
    } catch {}

    let handlesObj: Record<string, string> = {}
    try { handlesObj = JSON.parse(sessionStorage.getItem(SK.c_social_handles) || '{}') } catch {}

    let pageThemeJson: Record<string, unknown> | undefined
    try { if (themeRaw) pageThemeJson = JSON.parse(themeRaw) } catch {}
    pageThemeJson = { ...(pageThemeJson ?? {}), posterMood: mood }

    const ct: CreatorTypeV2 = isValidCreatorType(creatorType) ? creatorType : 'exploring'

    const paddedTags = tagsArr.length >= 3
      ? tagsArr
      : [...tagsArr, ...INTEREST_TAGS.filter(t => !tagsArr.includes(t.id)).slice(0, 3 - tagsArr.length).map(t => t.id)]

    const links = Object.entries(handlesObj)
      .filter(([, url]) => url.trim())
      .map(([platform, url]) => ({ platform, url }))

    const selectedBlocks = BLOCK_OPTIONS.map(b => b.key).filter(k => checked.has(k))

    try {
      const result = await completeOnboarding({
        displayName: dn,
        username: finalUser,
        creatorType: ct,
        city: cityVal,
        subTypes: subTypesArr,
        offlineActivities: offlineActsArr,
        interestTags: paddedTags,
        bio: bio || undefined,
        colorScheme: colorScheme as Parameters<typeof completeOnboarding>[0]['colorScheme'],
        socialLinks: links,
        pageThemeJson: pageThemeJson ?? undefined,
      }, selectedBlocks)

      if (result.error) {
        setError(result.error)
        setIsSubmitting(false)
        return
      }

    } catch {
      setError('Something went wrong. Please try again.')
      setIsSubmitting(false)
      return
    }

    // Transition to reveal — session cleanup happens in handleContinueToStudio
    setRevealPhase('revealed')
  }

  async function handleContinueToStudio() {
    if (isLeaving) return
    setIsLeaving(true)
    if (isAddMode) {
      try { await updatePersonas('creator') } catch {}
    }
    const dest = pendingRedirect || '/dashboard/studio'
    try { sessionStorage.removeItem('wimc_post_onboarding_redirect') } catch {}
    clearNewOnboardingKeys()
    LEGACY_KEYS.forEach(k => { try { sessionStorage.removeItem(k) } catch {} })
    router.replace(dest)
  }

  if (!loaded) {
    return (
      <>
        <style>{`@keyframes c8b-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
        <div style={{
          position: 'fixed', inset: 0, background: '#1A2744',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'transparent',
            animation: 'c8b-spin 1s linear infinite',
          }} />
        </div>
      </>
    )
  }

  // ── Reveal phase (post-submit) ────────────────────────────────────────────────
  if (revealPhase === 'revealed') {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: REVEAL_KEYFRAMES }} />
        <div style={{
          position: 'fixed', inset: 0, background: NAVY,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '24px 24px 40px', overflowY: 'auto',
          animation: 'ticket-reveal 0.6s ease both',
        }}>
          {/* WIMC wordmark — top left */}
          <div style={{ position: 'absolute', top: 24, left: 28, animation: 'ticket-fade-up 0.5s ease 0.2s both' }}>
            <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 14, color: `${accent}80`, letterSpacing: '0.15em' }}>
              WHEN IN MY CITY
            </span>
          </div>

          {/* Live status — top right */}
          <div style={{
            position: 'absolute', top: 24, right: 28,
            display: 'flex', alignItems: 'center', gap: 6,
            animation: 'ticket-fade-up 0.5s ease 0.2s both',
          }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22C55E', animation: 'ticket-pulse 2s ease-in-out infinite' }} />
            <span style={{ fontFamily: MONO, fontSize: 9, color: '#22C55E', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
              PAGE LIVE
            </span>
          </div>

          {/* Main content */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: 440, width: '100%' }}>

            {/* Overline */}
            <p style={{
              fontFamily: MONO, fontSize: 9, color: `${CORAL}99`,
              letterSpacing: '0.35em', textTransform: 'uppercase',
              margin: '0 0 12px', animation: 'ticket-fade-up 0.5s ease 0.3s both',
            }}>
              — YOUR PAGE IS LIVE —
            </p>

            {/* Artist name */}
            <h1 style={{
              fontFamily: ABRIL, fontSize: 'clamp(36px, 10vw, 64px)',
              color: '#F0EFF8', lineHeight: 1.0, margin: '0 0 8px',
              textAlign: 'center', animation: 'ticket-fade-up 0.6s ease 0.4s both',
              textTransform: 'uppercase',
            }}>
              {displayName}
            </h1>

            {/* City · Category */}
            {(city || category) && (
              <p style={{
                fontFamily: BARLOW, fontWeight: 600, fontSize: 13,
                color: `${accent}90`, letterSpacing: '0.25em',
                textTransform: 'uppercase', margin: '0 0 36px',
                animation: 'ticket-fade-up 0.5s ease 0.5s both',
              }}>
                {[category, city].filter(Boolean).join(' · ')}
              </p>
            )}

            {/* Event poster artifact */}
            <div style={{ width: '100%', marginBottom: 40 }}>
              <ArtifactStyles />
              <ScaledStage width={480} height={720} maxWidth={300}>
                <CreatorPoster
                  displayName={displayName}
                  city={city}
                  tags={tagLabels}
                  photoUrl={avatarUrl}
                  handle={username}
                  mood={mood}
                />
              </ScaledStage>
            </div>

            {/* Separator */}
            <div style={{ width: '100%', maxWidth: 360, marginBottom: 28, animation: 'ticket-fade-up 0.4s ease 1.3s both' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, height: 1, background: `${accent}20` }} />
                <span style={{ fontFamily: MONO, fontSize: 9, color: `${accent}50`, letterSpacing: '0.25em' }}>WHAT&apos;S NEXT</span>
                <div style={{ flex: 1, height: 1, background: `${accent}20` }} />
              </div>
            </div>

            {/* Single CTA */}
            <div style={{ width: '100%', maxWidth: 360, animation: 'ticket-fade-up 0.5s ease 1.4s both' }}>
              <button
                type="button"
                onClick={handleContinueToStudio}
                disabled={isLeaving}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', background: accent, color: NAVY,
                  fontFamily: MONO, fontWeight: 700, fontSize: 13,
                  letterSpacing: '0.10em', textTransform: 'uppercase',
                  padding: '16px 20px', border: `1px solid ${NAVY}`,
                  boxShadow: '6px 6px 0px 0px rgba(0,0,0,0.9)',
                  cursor: isLeaving ? 'default' : 'pointer',
                  opacity: isLeaving ? 0.6 : 1,
                  transition: 'transform 120ms, box-shadow 120ms',
                }}
                onMouseDown={e => { const b = e.currentTarget; b.style.transform = 'translate(3px,3px)'; b.style.boxShadow = '3px 3px 0px 0px rgba(0,0,0,0.9)' }}
                onMouseUp={e => { const b = e.currentTarget; b.style.transform = ''; b.style.boxShadow = '6px 6px 0px 0px rgba(0,0,0,0.9)' }}
              >
                <span>Continue to your page</span>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
              </button>
            </div>
          </div>

          {/* Bottom watermark */}
          <div style={{
            position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
            animation: 'ticket-fade-up 0.4s ease 1.6s both', whiteSpace: 'nowrap',
          }}>
            <span style={{ fontFamily: MONO, fontSize: 9, color: `${accent}25`, letterSpacing: '0.20em' }}>
              NODE_ID: C008B-CREATOR · PAGE: LIVE
            </span>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
      />
      <style>{`
        @keyframes c8b-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .c8b-block-item { transition: background 0.15s, border-color 0.15s; }
        .c8b-block-item:hover { background: rgba(255,255,255,0.06) !important; }
        .c8b-cta:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
        .c8b-cta:active:not(:disabled) { transform: translateY(0); }
        .c8b-cta { transition: opacity 0.15s, transform 0.15s; }
      `}</style>

      <div style={{
        minHeight: '100dvh', background: '#1A2744',
        display: 'flex', flexDirection: 'column',
        fontFamily: "'DM Sans', sans-serif",
      }}>

        {/* Header bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px 0', flexShrink: 0,
        }}>
          <button onClick={() => router.back()} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', gap: 6,
            fontFamily: "'DM Sans', sans-serif", fontSize: 13, padding: 0,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
            Back
          </button>
          <div style={{ display: 'flex', gap: 4 }}>
            {[1,2,3,4,5,6,7,8,9].map(n => (
              <div key={n} style={{
                width: n === 9 ? 20 : 6, height: 4, borderRadius: 2,
                background: n <= 9 ? accent : 'rgba(255,255,255,0.15)',
              }} />
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '32px 24px 140px',
          maxWidth: 560, width: '100%', margin: '0 auto',
        }}>

          <div style={{ marginBottom: 8 }}>
            <span style={{
              fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
              fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
              color: accent,
            }}>
              Almost there
            </span>
          </div>

          <h1 style={{
            fontFamily: "var(--font-abril), 'Abril Fatface', serif",
            fontSize: 'clamp(28px, 7vw, 40px)',
            color: '#F0EFF8', lineHeight: 1.05, margin: '0 0 12px',
          }}>
            What goes on<br />your page?
          </h1>
          <p style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 15,
            color: 'rgba(255,255,255,0.55)', margin: '0 0 32px', lineHeight: 1.55,
          }}>
            We&apos;ve pre-selected the best sections for your profile.
            Uncheck anything you don&apos;t need right now — you can always add more later.
          </p>

          {/* Block checklist */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {BLOCK_OPTIONS.map(block => {
              const isChecked = checked.has(block.key)
              return (
                <button
                  key={block.key}
                  className="c8b-block-item"
                  onClick={() => toggle(block.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    background: isChecked ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.025)',
                    border: `1.5px solid ${isChecked ? accent : 'rgba(255,255,255,0.10)'}`,
                    borderRadius: 12, padding: '14px 16px',
                    cursor: 'pointer', textAlign: 'left', width: '100%',
                  }}
                >
                  {/* Checkbox */}
                  <div style={{
                    width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                    border: `2px solid ${isChecked ? accent : 'rgba(255,255,255,0.25)'}`,
                    background: isChecked ? accent : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.15s, border-color 0.15s',
                  }}>
                    {isChecked && (
                      <span className="material-symbols-outlined" style={{ fontSize: 13, color: '#fff', fontVariationSettings: "'wght' 700, 'FILL' 1" }}>check</span>
                    )}
                  </div>

                  {/* Icon */}
                  <div style={{
                    width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                    background: isChecked ? `${accent}20` : 'rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.15s',
                  }}>
                    <span className="material-symbols-outlined" style={{
                      fontSize: 18, color: isChecked ? accent : 'rgba(255,255,255,0.45)',
                      fontVariationSettings: "'FILL' 1",
                    }}>
                      {block.icon}
                    </span>
                  </div>

                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
                      fontSize: 14, color: isChecked ? '#F0EFF8' : 'rgba(255,255,255,0.65)',
                      marginBottom: 2, transition: 'color 0.15s',
                    }}>
                      {block.label}
                    </div>
                    <div style={{
                      fontFamily: "'DM Sans', sans-serif", fontSize: 12,
                      color: 'rgba(255,255,255,0.35)', lineHeight: 1.4,
                    }}>
                      {block.description}
                    </div>
                  </div>

                  {/* Layout thumbnail */}
                  <BlockThumbnail blockKey={block.key} accent={accent} isChecked={isChecked} />
                </button>
              )
            })}
          </div>

          {error && (
            <div style={{
              marginTop: 20, padding: '12px 16px', background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10,
              fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#FCA5A5',
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Fixed bottom CTA */}
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          padding: '16px 24px 32px',
          background: 'linear-gradient(to top, #1A2744 70%, transparent)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        }}>
          <button
            className="c8b-cta"
            onClick={handleCreate}
            disabled={isSubmitting || checked.size === 0}
            style={{
              width: '100%', maxWidth: 560,
              background: checked.size === 0 ? 'rgba(255,255,255,0.1)' : accent,
              color: '#ffffff',
              fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 16,
              padding: '16px 24px', border: 'none', borderRadius: 14,
              cursor: checked.size === 0 ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              opacity: isSubmitting ? 0.7 : 1,
            }}
          >
            {isSubmitting ? (
              <>
                <div style={{
                  width: 16, height: 16, borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
                  animation: 'c8b-spin 0.8s linear infinite', flexShrink: 0,
                }} />
                Creating your page...
              </>
            ) : (
              <>
                Create my page
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
              </>
            )}
          </button>
          <p style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 11,
            color: 'rgba(255,255,255,0.25)', margin: 0, textAlign: 'center',
          }}>
            {checked.size} section{checked.size !== 1 ? 's' : ''} selected &middot; you can edit anytime
          </p>
        </div>
      </div>
    </>
  )
}
