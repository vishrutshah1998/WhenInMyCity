'use client'

import Link from 'next/link'

const ACCENT: Record<string, string> = {
  creator:  '#F5A800',
  explorer: '#9B8FFF',
  venue:    '#5DD9D0',
  brand:    '#F5A800',
}

const DASHBOARD_URL: Record<string, string> = {
  creator:  '/dashboard',
  brand:    '/business/brand/dashboard',
  venue:    '/business/venue/dashboard',
  explorer: '/explore/dashboard',
}

const LABEL: Record<string, string> = {
  creator:  'Creator',
  explorer: 'Explorer',
  venue:    'Adda',
  brand:    'Brand',
}

export default function PersonaSwitcherPills({
  personas,
  currentPersona,
  variant = 'light',
}: {
  personas: string[]
  currentPersona: string
  variant?: 'light' | 'dark'
}) {
  if (personas.length <= 1) return null

  const isDark = variant === 'dark'

  return (
    <div style={{
      display: 'flex', gap: 8,
      padding: '12px 24px 0',
      background: isDark ? '#07070A' : '#F2EDE3',
    }}>
      {personas.map(p => {
        const isActive = p === currentPersona
        const href = DASHBOARD_URL[p] ?? '/dashboard'
        const accent = ACCENT[p] ?? '#F5A800'
        return (
          <Link
            key={p}
            href={href}
            onClick={(e) => { if (isActive) e.preventDefault() }}
            style={{
              padding: '6px 16px',
              borderRadius: 9999,
              fontSize: 13,
              fontWeight: 700,
              fontFamily: 'var(--font-jetbrains-mono)',
              textTransform: 'capitalize',
              background: isActive
                ? accent
                : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(26,39,68,0.08)',
              color: isActive
                ? '#1A2744'
                : isDark ? 'rgba(255,255,255,0.45)' : 'rgba(26,39,68,0.45)',
              transition: 'all 0.15s ease',
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            {LABEL[p] ?? p}
          </Link>
        )
      })}
    </div>
  )
}
