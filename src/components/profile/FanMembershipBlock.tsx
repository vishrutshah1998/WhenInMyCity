'use client'

interface Tier {
  name:        string
  price_label: string
  benefits:    string[]
  is_featured?: boolean
}

interface FanMembershipBlockProps {
  tiers:    Tier[]
  heading?: string
  accent:   string
}

export default function FanMembershipBlock({ tiers, heading, accent }: FanMembershipBlockProps) {
  if (tiers.length === 0) return null

  return (
    <section
      className="w-full rounded-2xl p-5 flex flex-col gap-4"
      style={{ background: 'var(--pp-surface)' }}
    >
      {heading && (
        <p className="font-bold text-sm text-center" style={{ color: 'var(--pp-text)' }}>{heading}</p>
      )}

      <div className={`grid gap-3 ${tiers.length === 1 ? 'grid-cols-1' : tiers.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {tiers.map((tier, i) => (
          <div
            key={i}
            className="rounded-xl p-4 flex flex-col gap-2.5"
            style={tier.is_featured ? {
              background: `${accent}15`,
              border: `1.5px solid ${accent}50`,
            } : {
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {tier.is_featured && (
              <span
                className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full self-start"
                style={{ background: accent, color: '#fff' }}
              >
                Popular
              </span>
            )}

            <div>
              <p className="font-bold text-sm" style={{ color: 'var(--pp-text)' }}>{tier.name}</p>
              <p className="font-bold text-base mt-0.5" style={{ color: accent }}>{tier.price_label}</p>
            </div>

            {tier.benefits.length > 0 && (
              <ul className="flex flex-col gap-1.5">
                {tier.benefits.map((b, j) => (
                  <li key={j} className="flex items-start gap-1.5">
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0 mt-0.5 fill-current" style={{ color: accent }}>
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                    <span className="text-xs leading-relaxed" style={{ color: 'var(--pp-text-muted)' }}>{b}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
