'use client'

import Image from 'next/image'

interface Badge {
  label:    string
  icon_url?: string
  year?:    number
}

interface AwardsBadgesBlockProps {
  badges:   Badge[]
  heading?: string
  accent:   string
}

export default function AwardsBadgesBlock({ badges, heading, accent }: AwardsBadgesBlockProps) {
  if (badges.length === 0) return null

  return (
    <section
      className="w-full rounded-2xl p-5 flex flex-col gap-3"
      style={{ background: 'var(--pp-surface)' }}
    >
      {heading && (
        <p
          className="text-[10px] font-bold uppercase tracking-widest"
          style={{ color: 'var(--pp-text-muted)' }}
        >
          {heading}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {badges.map((b, i) => (
          <div
            key={i}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{
              background: `${accent}18`,
              color:      accent,
              border:     `1px solid ${accent}30`,
            }}
          >
            {b.icon_url ? (
              <Image
                src={b.icon_url}
                alt=""
                width={14}
                height={14}
                className="w-3.5 h-3.5 object-contain"
                unoptimized
              />
            ) : (
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            )}
            <span>{b.label}</span>
            {b.year && (
              <span className="opacity-60">· {b.year}</span>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
