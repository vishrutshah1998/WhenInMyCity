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

export function useExistingProfileData(): {
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
  }, [])

  return { data, loading }
}
