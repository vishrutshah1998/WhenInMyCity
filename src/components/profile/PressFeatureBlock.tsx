'use client'

import Image from 'next/image'

interface Feature {
  outlet:    string
  url?:      string
  logo_url?: string
}

interface PressFeatureBlockProps {
  features: Feature[]
  heading?: string
  accent:   string
}

export default function PressFeatureBlock({ features, heading, accent }: PressFeatureBlockProps) {
  if (features.length === 0) return null

  return (
    <section
      className="w-full rounded-2xl p-5 flex flex-col gap-4"
      style={{ background: 'var(--pp-surface)' }}
    >
      <p
        className="text-[10px] font-bold uppercase tracking-widest text-center"
        style={{ color: 'var(--pp-text-muted)' }}
      >
        {heading ?? 'As seen in'}
      </p>

      <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-3">
        {features.map((f, i) => {
          const inner = f.logo_url ? (
            <Image
              src={f.logo_url}
              alt={f.outlet}
              width={88}
              height={28}
              className="object-contain h-7 w-auto"
              unoptimized
            />
          ) : (
            <span
              className="text-xs font-bold tracking-tight"
              style={{ color: 'var(--pp-text)' }}
            >
              {f.outlet}
            </span>
          )

          return f.url ? (
            <a
              key={i}
              href={f.url}
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-55 grayscale hover:opacity-80 hover:grayscale-0 transition-all"
            >
              {inner}
            </a>
          ) : (
            <div key={i} className="opacity-55 grayscale">
              {inner}
            </div>
          )
        })}
      </div>
    </section>
  )
}
