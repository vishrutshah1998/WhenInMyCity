'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCategoryColors } from '@/lib/constants/categories'
import { PLATFORM_REGISTRY } from '@/lib/platforms'
import type { Screen1Data } from '@/types/onboarding'

// SVG icons matching screen-3 PLATFORM_SVG (viewBox 0 0 24 24)
const PLATFORM_SVG: Record<string, React.ReactElement> = {
  instagram: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="26" height="26">
      <path d="M12 0C8.74 0 8.333.015 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.74 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.74 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  ),
  youtube: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="26" height="26">
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  ),
  whatsapp: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="26" height="26">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  ),
  spotify: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="26" height="26">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
    </svg>
  ),
  soundcloud: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="26" height="26">
      <path d="M11.56 8.87V17h8.76a2.74 2.74 0 000-5.48 2.75 2.75 0 00-.28.02 4.12 4.12 0 00-7.44-2.67M0 15.12a1.88 1.88 0 001.88 1.88 1.88 1.88 0 001.88-1.88V9.37a1.88 1.88 0 00-1.88-1.88A1.88 1.88 0 000 9.37v5.75M4.96 15.26a1.74 1.74 0 001.74 1.74 1.74 1.74 0 001.74-1.74V8.4a1.74 1.74 0 00-1.74-1.74A1.74 1.74 0 004.96 8.4v6.86M9.72 15.26a1.74 1.74 0 001.74 1.74V7.2a4.11 4.11 0 00-1.74.57v7.49z"/>
    </svg>
  ),
  twitter: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  ),
  linkedin: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="26" height="26">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  ),
  website: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
    </svg>
  ),
  telegram: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="26" height="26">
      <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
    </svg>
  ),
  substack: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="26" height="26">
      <path d="M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24L12 18.11 22.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z"/>
    </svg>
  ),
  behance: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="26" height="26">
      <path d="M6.938 4.503c.702 0 1.34.06 1.92.188.577.13 1.07.33 1.485.61.41.28.733.65.96 1.12.225.47.34 1.05.34 1.73 0 .74-.17 1.36-.507 1.86-.338.5-.837.9-1.502 1.22.906.26 1.576.72 2.022 1.37.448.66.665 1.45.665 2.36 0 .75-.13 1.39-.41 1.93-.28.55-.67 1-1.16 1.35-.48.345-1.05.6-1.67.767-.61.165-1.252.254-1.91.254H0V4.51h6.938zm-.588 5.717c.624 0 1.138-.15 1.544-.462.403-.31.605-.792.605-1.447 0-.34-.06-.626-.18-.86-.117-.235-.28-.423-.49-.567-.21-.143-.456-.245-.734-.31a3.698 3.698 0 00-.906-.09H2.59v3.736zm.262 6.066c.35 0 .68-.034.99-.1.31-.067.586-.177.823-.337.24-.162.43-.373.574-.632.14-.26.21-.587.21-.98 0-.776-.21-1.33-.63-1.66-.42-.334-1.01-.5-1.76-.5H2.59v4.21zm10.82 1.2a4.44 4.44 0 003.327-1.334l-1.52-1.143c-.4.498-.98.748-1.75.748-.682 0-1.24-.19-1.66-.57-.42-.38-.665-.945-.73-1.69H22.3c.017-.22.028-.425.028-.625 0-.813-.144-1.543-.43-2.194a5.02 5.02 0 00-1.175-1.666 5.165 5.165 0 00-1.752-1.052 6.24 6.24 0 00-2.19-.37c-.82 0-1.583.137-2.29.412a5.473 5.473 0 00-1.826 1.17 5.42 5.42 0 00-1.21 1.82 6.44 6.44 0 00-.434 2.4c0 .884.14 1.69.43 2.41a5.357 5.357 0 001.21 1.81 5.26 5.26 0 001.826 1.14c.706.264 1.47.396 2.29.396zm2.27-6.53H14.44c.084-.676.33-1.21.74-1.6.41-.39.94-.585 1.6-.585.648 0 1.18.196 1.595.586.415.39.655.924.716 1.6zM16.06 5.52h4.51v1.39H16.06V5.52z"/>
    </svg>
  ),
  github: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="26" height="26">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
    </svg>
  ),
}


const MAX_SELECTIONS = 5

export default function PlatformsPage() {
  const router = useRouter()
  const [s1, setS1] = useState<Screen1Data | null>(null)
  const [selected, setSelected] = useState<string[]>([])

  useEffect(() => {
    try {
      const data = JSON.parse(sessionStorage.getItem('wimc_s1') || 'null')
      if (!data) { router.replace('/onboarding/screen-1'); return }
      setS1(data)
      // Restore previous selections if user navigated back
      const saved = JSON.parse(sessionStorage.getItem('wimc_platforms') || '[]')
      if (Array.isArray(saved)) setSelected(saved)
    } catch {
      router.replace('/onboarding/screen-1')
    }
  }, [router])

  const colors = getCategoryColors(s1?.creatorType ?? null)

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((p) => p !== id)
        : prev.length < MAX_SELECTIONS ? [...prev, id] : prev,
    )
  }

  function handleContinue(skip = false) {
    const platforms = skip ? [] : selected
    sessionStorage.setItem('wimc_platforms', JSON.stringify(platforms))
    router.push('/onboarding/screen-3')
  }

  if (!s1) return null

  return (
    <div className="flex flex-col min-h-screen bg-background text-on-surface font-body">
      {/* Ambient glow */}
      <div
        className="fixed inset-0 -z-10 pointer-events-none transition-opacity duration-700"
        style={{ background: `radial-gradient(ellipse 60% 40% at 70% 5%, ${colors.secondary}70, transparent)` }}
      />

      {/* Header */}
      <header className="w-full flex items-center justify-between px-6 py-4">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors active:scale-95"
        >
          <span className="material-symbols-outlined" style={{ color: colors.primary }}>arrow_back</span>
        </button>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-32 bg-surface-container-high rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: '75%', backgroundColor: colors.primary }}
            />
          </div>
          <span className="text-xs text-on-surface-variant font-medium">3 / 4</span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-6 pt-4 pb-44 max-w-xl mx-auto w-full space-y-8">
        <div>
          <p className="text-sm font-medium text-on-surface-variant mb-1">
            Hey, {s1.displayName.split(' ')[0]} 👋
          </p>
          <h1 className="text-2xl font-headline font-extrabold text-on-surface tracking-tight leading-snug">
            Where are you<br />already creating?
          </h1>
          <p className="text-sm text-on-surface-variant mt-2">
            Pick up to {MAX_SELECTIONS} platforms — we'll add them to your page.
          </p>
        </div>

        {/* Platform grid */}
        <div className="grid grid-cols-3 gap-3">
          {PLATFORM_REGISTRY.map((platform) => {
            const isSelected = selected.includes(platform.id)
            const isDisabled = !isSelected && selected.length >= MAX_SELECTIONS
            return (
              <button
                key={platform.id}
                type="button"
                onClick={() => !isDisabled && toggle(platform.id)}
                className="relative flex flex-col items-center justify-center gap-2 p-4 rounded-2xl transition-all duration-150 active:scale-95 border-2 text-center"
                style={{
                  backgroundColor: isSelected ? `${platform.color}18` : 'rgba(255,255,255,0.03)',
                  borderColor: isSelected ? platform.color : 'rgba(255,255,255,0.1)',
                  opacity: isDisabled ? 0.35 : 1,
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                }}
              >
                {isSelected && (
                  <div
                    className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: platform.color }}
                  >
                    <span className="material-symbols-outlined text-white" style={{ fontSize: 12, fontVariationSettings: "'FILL' 1" }}>check</span>
                  </div>
                )}
                <div
                  style={{
                    color: isSelected ? platform.color : 'rgba(255,255,255,0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 26,
                    height: 26,
                  }}
                >
                  {PLATFORM_SVG[platform.id] ?? <span className="text-2xl leading-none">{platform.emoji}</span>}
                </div>
                <span
                  className="text-xs font-semibold leading-tight"
                  style={{ color: isSelected ? platform.color : 'rgba(255,255,255,0.7)' }}
                >
                  {platform.label}
                </span>
              </button>
            )
          })}
        </div>

        {/* Selection counter */}
        {selected.length > 0 && (
          <p className="text-center text-sm font-medium" style={{ color: colors.primary }}>
            {selected.length} of {MAX_SELECTIONS} selected
          </p>
        )}
      </main>

      {/* Fixed CTA */}
      <footer className="fixed bottom-0 left-0 w-full z-50 px-6 py-5 bg-background/90 backdrop-blur-sm border-t border-outline-variant/10">
        <div className="max-w-xl mx-auto flex flex-col gap-3">
          <button
            type="button"
            onClick={() => handleContinue(false)}
            disabled={selected.length === 0}
            className="w-full py-4 px-6 font-headline font-bold rounded-xl shadow-lg active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed text-white"
            style={{ backgroundColor: colors.primary }}
          >
            Continue
            <span className="material-symbols-outlined text-lg">arrow_forward</span>
          </button>
          <button
            type="button"
            onClick={() => handleContinue(true)}
            className="w-full py-2 text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors"
          >
            Skip for now
          </button>
        </div>
      </footer>

      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
      <style>{`.material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }`}</style>
    </div>
  )
}
