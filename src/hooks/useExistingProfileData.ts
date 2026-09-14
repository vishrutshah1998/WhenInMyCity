'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export type ExistingProfileData = {
  name?: string
  city?: string
  instagram?: string
  bio?: string
  avatar_url?: string
}

export type ExistingProfilePersona = 'creator' | 'brand' | 'explorer' | 'venue'

// Persona-aware read for the ?mode=add&persona=X re-onboarding flow. Each
// persona has its own table — a "no row" result here correctly means "this
// account doesn't have that persona yet," which the callers already treat
// as add-new-persona defaults (no code change needed there).
export function useExistingProfileData(
  persona?: ExistingProfilePersona,
): {
  data: ExistingProfileData | null
  loading: boolean
} {
  const [data, setData] = useState<ExistingProfileData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      if (persona === 'creator') {
        const [{ data: userProfile }, { data: profile }] = await Promise.all([
          supabase.from('user_profiles').select('display_name').eq('id', user.id).maybeSingle(),
          supabase.from('creator_profiles').select('city, bio, instagram_handle, avatar_url').eq('auth_user_id', user.id).maybeSingle(),
        ])
        if (profile) {
          setData({
            name:       userProfile?.display_name ?? undefined,
            city:       profile.city ?? undefined,
            bio:        profile.bio ?? undefined,
            instagram:  profile.instagram_handle ?? undefined,
            avatar_url: profile.avatar_url ?? undefined,
          })
        }
        setLoading(false)
        return
      }

      if (persona === 'brand') {
        const [{ data: userProfile }, { data: profile }] = await Promise.all([
          supabase.from('user_profiles').select('display_name').eq('id', user.id).maybeSingle(),
          supabase.from('brand_profiles').select('business_name, city, bio, instagram_handle, avatar_url').eq('auth_user_id', user.id).maybeSingle(),
        ])
        if (profile) {
          setData({
            name:       profile.business_name ?? userProfile?.display_name ?? undefined,
            city:       profile.city ?? undefined,
            bio:        profile.bio ?? undefined,
            instagram:  profile.instagram_handle ?? undefined,
            avatar_url: profile.avatar_url ?? undefined,
          })
        }
        setLoading(false)
        return
      }

      if (persona === 'explorer') {
        // explorer_profiles has no bio/instagram_handle columns — those stay undefined.
        const { data: profile } = await supabase
          .from('explorer_profiles')
          .select('display_name, city, avatar_url')
          .eq('auth_user_id', user.id)
          .maybeSingle()
        if (profile) {
          setData({
            name:       profile.display_name ?? undefined,
            city:       profile.city ?? undefined,
            avatar_url: profile.avatar_url ?? undefined,
          })
        }
        setLoading(false)
        return
      }

      if (persona === 'venue') {
        // venue_profiles has its own `city` column (migration 007) and is
        // one-per-user (auth_user_id UNIQUE, same as brand_profiles) — no
        // multi-venue ambiguity to resolve. Query it directly instead of
        // the old fallback to account-level user_profiles.city below,
        // which was silently prefilling whatever OTHER persona's city
        // happened to be set there (e.g. an existing Brand's city leaking
        // into a first-time Venue). No avatar_url/bio columns on
        // venue_profiles besides `description` — mirrors brand_profiles'
        // bio slot.
        const [{ data: userProfile }, { data: profile }] = await Promise.all([
          supabase.from('user_profiles').select('display_name').eq('id', user.id).maybeSingle(),
          supabase.from('venue_profiles').select('name, city, description, instagram_handle').eq('auth_user_id', user.id).maybeSingle(),
        ])
        if (profile) {
          setData({
            name:       profile.name ?? userProfile?.display_name ?? undefined,
            city:       profile.city ?? undefined,
            bio:        profile.description ?? undefined,
            instagram:  profile.instagram_handle ?? undefined,
          })
        }
        setLoading(false)
        return
      }

      // No persona passed — unchanged pre-split behavior. Not hit by any
      // current caller (all onboarding entry points pass an explicit
      // persona), kept only as a defensive default.
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('display_name, city, instagram_handle, bio, avatar_url')
        .eq('id', user.id)
        .single()

      if (profile) {
        setData({
          name:        profile.display_name ?? undefined,
          city:        profile.city         ?? undefined,
          instagram:   profile.instagram_handle ?? undefined,
          bio:         profile.bio           ?? undefined,
          avatar_url:  profile.avatar_url    ?? undefined,
        })
      }
      setLoading(false)
    }
    fetch()
  }, [persona])

  return { data, loading }
}
