'use client'

import { useState, useEffect } from 'react'

interface AnnouncementBlockProps {
  text: string
  ctaLabel?: string
  ctaUrl?: string
  showCountdown: boolean
  countdownTarget?: string
  backgroundStyle: 'primary' | 'dark' | 'accent'
  accent: string
}

function useCountdown(target?: string) {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null)

  useEffect(() => {
    if (!target) return

    function tick() {
      const diff = new Date(target!).getTime() - Date.now()
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })
        return
      }
      const days    = Math.floor(diff / 86400000)
      const hours   = Math.floor((diff % 86400000) / 3600000)
      const minutes = Math.floor((diff % 3600000) / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      setTimeLeft({ days, hours, minutes, seconds })
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [target])

  return timeLeft
}

export default function AnnouncementBlock({ text, ctaLabel, ctaUrl, showCountdown, countdownTarget, backgroundStyle, accent }: AnnouncementBlockProps) {
  const countdown = useCountdown(showCountdown ? countdownTarget : undefined)

  const bgStyle: React.CSSProperties =
    backgroundStyle === 'dark'
      ? { background: 'rgb(var(--color-surface-container-lowest))' }
      : backgroundStyle === 'accent'
      ? { background: 'rgba(var(--color-tertiary) / 0.15)', border: '1px solid rgba(var(--color-tertiary) / 0.25)' }
      : { background: accent }

  const textColor: React.CSSProperties =
    backgroundStyle === 'dark' || backgroundStyle === 'accent'
      ? { color: 'rgb(var(--color-on-surface))' }
      : { color: '#fff' }

  const ctaStyle: React.CSSProperties =
    backgroundStyle === 'primary'
      ? { background: 'rgba(255,255,255,0.2)', color: '#fff' }
      : { background: accent, color: '#fff' }

  return (
    <section>
      <div className="card-surface rounded-2xl px-6 py-5 flex flex-col gap-3" style={bgStyle}>
        <p className="font-headline font-bold text-lg leading-snug text-center" style={textColor}>
          {text}
        </p>

        {showCountdown && countdown !== null && (
          <div className="flex justify-center gap-3">
            {[
              { value: countdown.days,    label: 'days' },
              { value: countdown.hours,   label: 'hrs' },
              { value: countdown.minutes, label: 'min' },
              { value: countdown.seconds, label: 'sec' },
            ].map(({ value, label }) => (
              <div key={label} className="flex flex-col items-center min-w-[44px]">
                <span
                  className="font-headline font-bold text-2xl leading-none tabular-nums"
                  style={backgroundStyle === 'primary' ? { color: '#fff' } : { color: accent }}
                >
                  {String(value).padStart(2, '0')}
                </span>
                <span className="text-[10px] uppercase tracking-wider opacity-70" style={textColor}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        )}

        {ctaLabel && ctaUrl && (
          <a
            href={ctaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="self-center px-6 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all"
            style={ctaStyle}
          >
            {ctaLabel}
          </a>
        )}
      </div>
    </section>
  )
}
