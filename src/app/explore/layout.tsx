'use client'

import type { ReactNode } from 'react'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import ExploreNav from './ExploreNav'
import { WimcWordmark } from '@/components/WimcWordmark'
import { BottomNav } from '@/components/ui/BottomNav'
import { createClient } from '@/lib/supabase/client'

export default function ExploreLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [userCity, setUserCity] = useState<string | null>(null)

  useEffect(() => {
    // Fetch the explorer profile city so ExploreNav can gate the City Guide tab
    // to users in cities with an active City (Government Edition).
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return
      supabase
        .from('explorer_profiles')
        .select('city')
        .eq('auth_user_id', data.user.id)
        .maybeSingle()
        .then(({ data: ep }) => {
          if (ep?.city) setUserCity(ep.city)
        })
    })
  }, [])

  // Dashboard routes have their own sidebar layout — skip the public header
  if (pathname?.startsWith('/explore/dashboard')) {
    return <>{children}</>
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--wimc-bg-base)' }}>
      <div style={{
        background: 'var(--wimc-bg-raised)',
        borderBottom: '1px solid var(--wimc-border-subtle)',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '16px 0',
          }}>
            <Link href="/explore" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
              <WimcWordmark color="#E8705A" height={28} />
            </Link>
            <span style={{
              marginLeft: 4, fontSize: 11, color: 'var(--wimc-text-secondary)',
              fontFamily: 'var(--font-jetbrains-mono)',
              letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>
              Explorer
            </span>
            <Link
              href="/explore/dashboard"
              title="My dashboard"
              style={{
                marginLeft: 'auto',
                display: 'grid', placeItems: 'center',
                width: 32, height: 32, borderRadius: 8,
                border: '1px solid var(--wimc-border-subtle)',
                color: 'var(--wimc-text-secondary)',
                textDecoration: 'none', flexShrink: 0,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>person</span>
            </Link>
          </div>
          <ExploreNav userCity={userCity} />
        </div>
      </div>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '28px 24px 96px' }}>
        {children}
      </main>

      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  )
}
