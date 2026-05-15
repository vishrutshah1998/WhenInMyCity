'use client'

import { useState, useRef, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { completeOnboarding, uploadOnboardingAvatar } from '@/app/actions/onboarding'
import { INTEREST_TAGS } from '@/lib/constants/interests'

const E = [0.22, 1, 0.36, 1] as const
const LAVENDER = '#9B8FFF'

// ---------------------------------------------------------------------------
// Color schemes for theme picker
// ---------------------------------------------------------------------------

const SCHEMES = [
  { id: 'default',  label: 'Ember',    bg: '#121212', primary: '#E8572A' },
  { id: 'midnight', label: 'Midnight', bg: '#080812', primary: '#818CF8' },
  { id: 'ocean',    label: 'Ocean',    bg: '#071724', primary: '#22D3EE' },
  { id: 'forest',   label: 'Forest',   bg: '#0F231A', primary: '#6EE7B7' },
  { id: 'blush',    label: 'Blossom',  bg: '#FFF1F3', primary: '#E11D48' },
  { id: 'sand',     label: 'Ivory',    bg: '#FDFAF5', primary: '#B45309' },
  { id: 'pista',    label: 'Pista',    bg: '#1A1108', primary: '#2D7A4F' },
  { id: 'gulaal',   label: 'Gulaal',   bg: '#1A1108', primary: '#E8342A' },
  { id: 'neel',     label: 'Neel',     bg: '#0B1420', primary: '#F5A800' },
  { id: 'turmeric', label: 'Turmeric', bg: '#1A1108', primary: '#F5A800' },
  { id: 'sienna',   label: 'Sienna',   bg: '#1A1108', primary: '#C04A00' },
  { id: 'indigo',   label: 'Indigo',   bg: '#1A1108', primary: '#818CF8' },
] as const

type SchemeId = typeof SCHEMES[number]['id']

// ---------------------------------------------------------------------------
// Section header w/ Skip link
// ---------------------------------------------------------------------------

function SectionHeader({ label, onSkip }: { label: string; onSkip?: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <span
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.26em',
          textTransform: 'uppercase',
          color: `${LAVENDER}88`,
        }}
      >
        {label}
      </span>
      {onSkip && (
        <button
          type="button"
          onClick={onSkip}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-dm-sans)',
            fontSize: 12, color: '#5C5A72', padding: 0,
          }}
        >
          Skip →
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Live boarding pass preview (responds to colorScheme changes)
// ---------------------------------------------------------------------------

function MiniPassPreview({ displayName, city, scheme }: { displayName: string; city: string; scheme: typeof SCHEMES[number] }) {
  return (
    <div
      style={{
        width: '100%',
        height: 90,
        background: scheme.bg,
        border: `1px solid ${scheme.primary}28`,
        position: 'relative',
        overflow: 'hidden',
        transition: 'background 0.3s ease, border-color 0.3s ease',
      }}
    >
      {/* Left accent bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: scheme.primary, opacity: 0.7, transition: 'background 0.3s ease' }} />

      {/* Top strip */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 20, background: `linear-gradient(90deg, ${scheme.primary}18 0%, transparent 60%)`, borderBottom: `1px solid ${scheme.primary}18`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px 0 10px' }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 6, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.18)' }}>WHEN IN MY CITY</span>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 6, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: `${scheme.primary}70`, transition: 'color 0.3s ease' }}>CULTURE PASS</span>
      </div>

      {/* Name */}
      <div style={{ position: 'absolute', top: 26, left: 10, right: 10 }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 6, letterSpacing: '0.22em', textTransform: 'uppercase', color: `${scheme.primary}60`, marginBottom: 2, transition: 'color 0.3s ease' }}>PASSENGER</div>
        <div style={{ fontFamily: 'var(--font-syne)', fontSize: 14, fontWeight: 900, color: '#F0EFF8', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayName || 'YOUR NAME'}
        </div>
      </div>

      {/* City */}
      <div style={{ position: 'absolute', bottom: 12, left: 10 }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 6, letterSpacing: '0.22em', textTransform: 'uppercase', color: `${scheme.primary}60`, marginBottom: 2, transition: 'color 0.3s ease' }}>DESTINATION</div>
        <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.04em' }}>
          {(city || 'YOUR CITY').toUpperCase()}
        </div>
      </div>

      {/* Barcode */}
      <div style={{ position: 'absolute', bottom: 10, right: 12, display: 'flex', gap: 1, opacity: 0.15 }}>
        {[2,1,3,1,2,1,2,3,1].map((w, i) => <div key={i} style={{ width: w * 2, height: 20, background: scheme.primary }} />)}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function PolishPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Form state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [bio, setBio] = useState('')
  const [colorScheme, setColorScheme] = useState<SchemeId>('default')
  const [socialLinks, setSocialLinks] = useState<{ platform: string; url: string }[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Skip flags
  const [skipAvatar, setSkipAvatar] = useState(false)
  const [skipBio, setSkipBio] = useState(false)
  const [skipTheme, setSkipTheme] = useState(false)
  const [skipSocials, setSkipSocials] = useState(false)

  // Cached session data
  const [passData, setPassData] = useState({ displayName: '', username: '', city: '', creatorType: '', subTypes: [] as string[], interestTags: [] as string[] })

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      const s1 = JSON.parse(sessionStorage.getItem('wimc_s1') || 'null') as { displayName?: string; username?: string; creatorType?: string } | null
      if (!s1?.displayName) { router.replace('/onboarding/screen-1'); return }

      const s2 = JSON.parse(sessionStorage.getItem('wimc_s2') || '{}') as { city?: string; subtypes?: string[]; interestTags?: string[] }
      const city = s2.city ?? sessionStorage.getItem('wimc_city') ?? ''
      if (!city) { router.replace('/onboarding/screen-4'); return }

      const platforms: string[] = JSON.parse(sessionStorage.getItem('wimc_platforms') || '[]')

      setPassData({
        displayName:  s1.displayName,
        username:     s1.username ?? '',
        city,
        creatorType:  s1.creatorType ?? '',
        subTypes:     JSON.parse(sessionStorage.getItem('wimc_subtypes') || '[]'),
        interestTags: s2.interestTags ?? [],
      })

      if (platforms.length > 0) {
        setSocialLinks(platforms.map(id => ({ platform: id, url: '' })))
      }
    } catch { /* ignore */ }
  }, [router])

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarUploading(true)
    setAvatarError(null)
    const fd = new FormData()
    fd.append('file', file)
    const result = await uploadOnboardingAvatar(fd)
    setAvatarUploading(false)
    if (result.error) { setAvatarError(result.error); return }
    if (result.url) setAvatarUrl(result.url)
  }

  function handleSocialUrl(platform: string, url: string) {
    setSocialLinks(prev => prev.map(l => l.platform === platform ? { ...l, url } : l))
  }

  const activeScheme = SCHEMES.find(s => s.id === colorScheme) ?? SCHEMES[0]

  function handleSubmit() {
    startTransition(async () => {
      setSubmitError(null)

      const { displayName, username, creatorType, subTypes, city, interestTags } = passData

      // Ensure min 3 interest tags
      const tags = interestTags.length >= 3
        ? interestTags
        : [
            ...interestTags,
            ...INTEREST_TAGS
              .filter(t => !interestTags.includes(t.id))
              .slice(0, 3 - interestTags.length)
              .map(t => t.id),
          ]

      const result = await completeOnboarding({
        displayName,
        username,
        creatorType: creatorType as Parameters<typeof completeOnboarding>[0]['creatorType'],
        subTypes,
        city,
        interestTags: tags,
        bio: skipBio ? undefined : (bio.trim() || undefined),
        socialLinks: skipSocials ? [] : socialLinks.filter(l => l.url.trim()),
        colorScheme: skipTheme ? undefined : colorScheme,
      })

      if (result.error) {
        setSubmitError(result.error)
        return
      }

      router.push('/onboarding/complete')
    })
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 100px' }}>
        <div style={{ maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Chat bubble */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: E }}
            style={{
              background: '#0D0D12',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              padding: '14px 18px',
            }}
          >
            <p style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 17, fontWeight: 700, color: '#F0EFF8', margin: 0, lineHeight: 1.4 }}>
              Make it yours. All of this is optional.
            </p>
          </motion.div>

          {/* ── AVATAR ───────────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: E, delay: 0.06 }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleAvatarChange}
              style={{ display: 'none' }}
            />
            {/* Large centered photo square */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              style={{
                display: 'block',
                margin: '0 auto',
                width: 120, height: 120,
                background: avatarUrl ? 'transparent' : `${LAVENDER}10`,
                border: `1px solid ${avatarUrl ? LAVENDER : 'rgba(255,255,255,0.10)'}`,
                borderRadius: 0,
                overflow: 'hidden',
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              {avatarUrl
                ? <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" width="32" height="32">
                      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                  </div>
                )
              }
            </button>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 10 }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>
                {avatarUploading ? 'UPLOADING…' : 'ADD A PHOTO'}
              </span>
              <button
                type="button"
                onClick={() => setSkipAvatar(true)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-dm-sans)', fontSize: 12, color: '#5C5A72', padding: 0 }}
              >
                SKIP
              </button>
            </div>
            {avatarError && (
              <p style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 12, color: '#FF6B6B', margin: '6px 0 0', textAlign: 'center' }}>{avatarError}</p>
            )}
          </motion.div>

          {/* ── BIO ──────────────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: E, delay: 0.1 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700, letterSpacing: '0.26em', textTransform: 'uppercase', color: `${LAVENDER}88` }}>
                BIO
              </span>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontFamily: 'monospace', fontSize: 8, color: bio.length > 70 ? '#FF6B6B' : `${LAVENDER}55` }}>
                  {bio.length}/80
                </span>
                <button type="button" onClick={() => setSkipBio(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-dm-sans)', fontSize: 12, color: '#5C5A72', padding: 0 }}>
                  Skip
                </button>
              </div>
            </div>
            {skipBio ? (
              <div style={{ padding: '12px 0', fontFamily: 'var(--font-dm-sans)', fontSize: 13, color: '#5C5A72' }}>
                No bio — <button type="button" onClick={() => setSkipBio(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: LAVENDER, fontSize: 13, padding: 0 }}>undo</button>
              </div>
            ) : (
              <input
                type="text"
                placeholder="Three words that describe you."
                value={bio}
                onChange={e => setBio(e.target.value.slice(0, 80))}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: `1px solid ${LAVENDER}22`,
                  outline: 'none',
                  padding: '8px 0',
                  fontFamily: 'var(--font-dm-sans)',
                  fontSize: 15,
                  fontWeight: 500,
                  color: '#F0EFF8',
                  caretColor: LAVENDER,
                  display: 'block',
                }}
                className="placeholder-[#3C3A52]"
              />
            )}
          </motion.div>

          {/* ── PICK YOUR VIBE COLOUR ─────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: E, delay: 0.14 }}
          >
            <SectionHeader label="Pick your vibe colour" onSkip={skipTheme ? undefined : () => setSkipTheme(true)} />
            {skipTheme ? (
              <div style={{ padding: '12px 0', fontFamily: 'var(--font-dm-sans)', fontSize: 13, color: '#5C5A72' }}>
                Default — <button type="button" onClick={() => setSkipTheme(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: LAVENDER, fontSize: 13, padding: 0 }}>undo</button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
                  {SCHEMES.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setColorScheme(s.id)}
                      title={s.label}
                      style={{
                        width: 36,
                        height: 36,
                        background: s.primary,
                        border: colorScheme === s.id ? `2px solid #F0EFF8` : `2px solid transparent`,
                        borderRadius: '50%',
                        cursor: 'pointer',
                        flexShrink: 0,
                        outline: colorScheme === s.id ? `2px solid ${s.primary}` : 'none',
                        outlineOffset: 2,
                        transition: 'border-color 0.15s ease, outline-color 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {colorScheme === s.id && (
                        <svg width="14" height="12" viewBox="0 0 14 12" fill="none">
                          <path d="M1.5 6L5.5 10L12.5 2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
                <MiniPassPreview
                  displayName={passData.displayName}
                  city={passData.city}
                  scheme={activeScheme}
                />
              </>
            )}
          </motion.div>

          {/* ── SOCIAL LINKS ─────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: E, delay: 0.18 }}
          >
            <SectionHeader label="Link your platforms" onSkip={skipSocials ? undefined : () => setSkipSocials(true)} />
            {skipSocials ? (
              <div style={{ padding: '12px 0', fontFamily: 'var(--font-dm-sans)', fontSize: 13, color: '#5C5A72' }}>
                No links — <button type="button" onClick={() => setSkipSocials(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: LAVENDER, fontSize: 13, padding: 0 }}>undo</button>
              </div>
            ) : socialLinks.length === 0 ? (
              <p style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 13, color: '#5C5A72', margin: 0 }}>
                No platforms selected — <button type="button" onClick={() => router.push('/onboarding/screen-7')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: LAVENDER, fontSize: 13, padding: 0 }}>go back to add them</button>
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {socialLinks.map(link => (
                  <div
                    key={link.platform}
                    style={{
                      border: `1px solid ${LAVENDER}18`,
                      background: `${LAVENDER}04`,
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{ padding: '6px 14px', borderBottom: `1px solid ${LAVENDER}10`, background: `${LAVENDER}06` }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 8, fontWeight: 700, letterSpacing: '0.26em', textTransform: 'uppercase', color: `${LAVENDER}70` }}>
                        {link.platform}
                      </span>
                    </div>
                    <input
                      type="text"
                      placeholder={`Your ${link.platform} URL`}
                      value={link.url}
                      onChange={e => handleSocialUrl(link.platform, e.target.value)}
                      style={{
                        width: '100%',
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        padding: '10px 14px',
                        fontFamily: 'var(--font-dm-sans)',
                        fontSize: 14,
                        fontWeight: 400,
                        color: '#F0EFF8',
                        caretColor: LAVENDER,
                        display: 'block',
                      }}
                      className="placeholder-[#3C3A52]"
                    />
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Submit error */}
          {submitError && (
            <p style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 13, color: '#FF6B6B', margin: 0, textAlign: 'center' }}>
              {submitError}
            </p>
          )}
        </div>
      </div>

      {/* Sticky CTA */}
      <footer
        className="ob-cta-footer"
        style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          padding: '14px 24px',
          background: 'rgba(7,7,10,0.92)',
          backdropFilter: 'blur(14px)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          zIndex: 50,
        }}
      >
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <motion.button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            whileTap={{ scale: 0.98 }}
            style={{
              width: '100%',
              padding: '16px 24px',
              background: isPending ? `${LAVENDER}66` : LAVENDER,
              color: '#07070A',
              fontFamily: 'var(--font-syne)',
              fontWeight: 900,
              fontSize: 15,
              borderRadius: 0,
              border: 'none',
              cursor: isPending ? 'default' : 'pointer',
              transition: 'background 0.2s ease',
            }}
          >
            {isPending ? 'Finishing up…' : 'DONE. LET ME IN. →'}
          </motion.button>
        </div>
      </footer>
    </div>
  )
}
