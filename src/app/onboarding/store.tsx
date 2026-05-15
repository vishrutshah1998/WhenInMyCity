'use client'

// Onboarding state for the conversational one-question-per-screen flow.
// Screens 0–9 map to: name, category, sub-types, city, interests,
// platforms, avatar, bio, theme, complete.
//
// The provider hydrates from sessionStorage on mount so legacy multi-page
// screens (screen-1, screen-2, screen-3) write-through without changes.

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type ReactNode,
} from 'react'
import type { V2_CREATOR_TYPES } from '@/types/onboarding'

export type PersonaType = 'creator' | 'business' | 'personal'
export type V2CreatorType = typeof V2_CREATOR_TYPES[number]

export interface OnboardingState {
  // Active logical screen (0–9). Used by new conversational screens.
  currentScreen: number
  // Which screen indices have a confirmed answer.
  completedScreens: number[]

  // Screen 0 — name
  displayName: string
  username: string

  // Screen 1 — who you are
  persona: PersonaType | null
  creatorType: V2CreatorType | null

  // Screen 2 — event sub-types
  subTypes: string[]

  // Screen 3 — city
  city: string

  // Screen 4 — interests
  interestTags: string[]

  // Screen 5 — platforms
  platforms: string[]

  // Screen 6 — avatar (in-memory only, not persisted to sessionStorage)
  avatarFile: File | null
  avatarPreview: string | null

  // Screen 7 — bio
  bio: string

  // Screen 8 — theme
  colorScheme: string
}

export type OnboardingAction =
  | { type: 'NAVIGATE'; screen: number }
  | { type: 'MARK_COMPLETE'; screen: number }
  | { type: 'SET_NAME'; displayName: string; username: string }
  | { type: 'SET_PERSONA'; persona: PersonaType }
  | { type: 'SET_CREATOR_TYPE'; creatorType: V2CreatorType }
  | { type: 'SET_SUB_TYPES'; subTypes: string[] }
  | { type: 'SET_CITY'; city: string }
  | { type: 'SET_INTEREST_TAGS'; interestTags: string[] }
  | { type: 'SET_PLATFORMS'; platforms: string[] }
  | { type: 'SET_AVATAR'; file: File; preview: string }
  | { type: 'CLEAR_AVATAR' }
  | { type: 'SET_BIO'; bio: string }
  | { type: 'SET_COLOR_SCHEME'; colorScheme: string }
  | { type: 'HYDRATE'; patch: Partial<Omit<OnboardingState, 'avatarFile' | 'avatarPreview'>> }
  | { type: 'RESET' }

const INITIAL: OnboardingState = {
  currentScreen: 0,
  completedScreens: [],
  displayName: '',
  username: '',
  persona: null,
  creatorType: null,
  subTypes: [],
  city: '',
  interestTags: [],
  platforms: [],
  avatarFile: null,
  avatarPreview: null,
  bio: '',
  colorScheme: 'default',
}

function reducer(s: OnboardingState, a: OnboardingAction): OnboardingState {
  switch (a.type) {
    case 'NAVIGATE':
      return { ...s, currentScreen: a.screen }

    case 'MARK_COMPLETE':
      return s.completedScreens.includes(a.screen)
        ? s
        : { ...s, completedScreens: [...s.completedScreens, a.screen] }

    case 'SET_NAME':
      return { ...s, displayName: a.displayName, username: a.username }

    case 'SET_PERSONA':
      return { ...s, persona: a.persona }

    case 'SET_CREATOR_TYPE':
      return { ...s, creatorType: a.creatorType }

    case 'SET_SUB_TYPES':
      return { ...s, subTypes: a.subTypes }

    case 'SET_CITY':
      return { ...s, city: a.city }

    case 'SET_INTEREST_TAGS':
      return { ...s, interestTags: a.interestTags }

    case 'SET_PLATFORMS':
      return { ...s, platforms: a.platforms }

    case 'SET_AVATAR':
      return { ...s, avatarFile: a.file, avatarPreview: a.preview }

    case 'CLEAR_AVATAR':
      return { ...s, avatarFile: null, avatarPreview: null }

    case 'SET_BIO':
      return { ...s, bio: a.bio }

    case 'SET_COLOR_SCHEME':
      return { ...s, colorScheme: a.colorScheme }

    case 'HYDRATE':
      return { ...s, ...a.patch }

    case 'RESET':
      return INITIAL

    default:
      return s
  }
}

interface OnboardingCtx {
  state: OnboardingState
  dispatch: React.Dispatch<OnboardingAction>
}

const Ctx = createContext<OnboardingCtx | null>(null)

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL)

  // Hydrate from sessionStorage keys written by the legacy screens so the
  // MiniBoardingPass shows accurate data even before screens are refactored.
  useEffect(() => {
    try {
      const s1 = JSON.parse(sessionStorage.getItem('wimc_s1') || 'null') as {
        displayName?: string; username?: string; creatorType?: V2CreatorType
      } | null
      const s2 = JSON.parse(sessionStorage.getItem('wimc_s2') || 'null') as {
        subTypes?: string[]; city?: string; interestTags?: string[]
      } | null
      const persona = sessionStorage.getItem('wimc_persona') as PersonaType | null
      const rawPlatforms = JSON.parse(sessionStorage.getItem('wimc_platforms') || 'null')
      const platforms: string[] = Array.isArray(rawPlatforms) ? rawPlatforms : []

      const patch: Partial<Omit<OnboardingState, 'avatarFile' | 'avatarPreview'>> = {}
      const completed: number[] = []

      if (s1?.displayName) {
        patch.displayName = s1.displayName
        patch.username = s1.username ?? ''
        completed.push(0)
      }
      if (s1?.creatorType) {
        patch.creatorType = s1.creatorType
        completed.push(1)
      }
      if (persona) patch.persona = persona
      if (s2?.subTypes?.length) { patch.subTypes = s2.subTypes; completed.push(2) }
      if (s2?.city)             { patch.city = s2.city; completed.push(3) }
      if (s2?.interestTags?.length) { patch.interestTags = s2.interestTags; completed.push(4) }
      if (platforms.length)     { patch.platforms = platforms; completed.push(5) }

      if (completed.length) patch.completedScreens = completed

      if (Object.keys(patch).length) dispatch({ type: 'HYDRATE', patch })
    } catch {
      // sessionStorage unavailable (e.g. SSR or private mode) — silently skip
    }
  }, [])

  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useOnboarding(): OnboardingCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useOnboarding must be used inside <OnboardingProvider>')
  return ctx
}
