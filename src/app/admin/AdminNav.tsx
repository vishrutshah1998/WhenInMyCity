'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/admin/payouts', label: 'Payouts', icon: 'payments' },
  { href: '/admin/events',  label: 'Events',  icon: 'event' },
  { href: '/admin/addas',   label: 'Addas',   icon: 'apartment' },
]

export default function AdminNav() {
  const pathname = usePathname()

  return (
    <nav style={{ display: 'flex', gap: 4 }}>
      {NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 7, fontSize: 13, fontWeight: 600,
              textDecoration: 'none',
              background: active ? 'var(--wimc-coral-dim)' : 'transparent',
              color: active ? 'var(--wimc-coral-light)' : 'var(--wimc-text-secondary)',
              transition: 'background 180ms, color 180ms',
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: 18,
                fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0",
              }}
            >
              {item.icon}
            </span>
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
