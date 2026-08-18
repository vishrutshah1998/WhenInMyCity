import Link from 'next/link'
import type { Event } from '@/types/database'

interface CancelledEventNoticeProps {
  event:      Pick<Event, 'title'>
  hadBooking: boolean
}

export default function CancelledEventNotice({ event, hadBooking }: CancelledEventNoticeProps) {
  return (
    <div className="bg-background text-on-surface font-sans min-h-screen" data-noise="true">
      <header className="fixed top-0 w-full z-50 bg-surface/90 backdrop-blur-md border-b-2 border-dashed border-outline-variant">
        <div className="flex items-center px-6 h-14 max-w-7xl mx-auto">
          <Link
            href="/explore?tab=events"
            className="p-2 -ml-2 rounded-full hover:bg-surface-container-high transition-colors active:scale-95"
          >
            <span className="material-symbols-outlined text-primary">arrow_back</span>
          </Link>
          <span className="ml-4 font-display font-black text-lg text-on-surface uppercase tracking-tighter">WIMC</span>
        </div>
      </header>

      <main className="pt-14 min-h-screen flex items-center justify-center px-6">
        <section className="card-surface bg-surface-container-high rounded-2xl flex flex-col items-center gap-5 py-14 px-6 text-center border-2 border-dashed border-outline-variant max-w-md w-full">
          <span
            className="material-symbols-outlined text-5xl text-error"
            style={{ fontVariationSettings: "'FILL' 0, 'wght' 200" }}
            aria-hidden="true"
          >
            event_busy
          </span>
          <div className="flex flex-col gap-2">
            <p className="font-display font-black text-xl text-on-surface leading-snug">
              {event.title}
            </p>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-error">
              Cancelled
            </p>
            <p className="font-mono text-xs text-on-surface/50 leading-relaxed max-w-xs">
              {hadBooking
                ? 'This event was cancelled by the organiser. Your refund has been initiated and will reflect within 5–7 business days.'
                : 'This event was cancelled by the organiser.'}
            </p>
          </div>
          <Link
            href="/explore?tab=events"
            className="mt-1 font-mono text-xs uppercase tracking-[0.15em] text-primary hover:underline"
          >
            Browse other events
          </Link>
        </section>
      </main>
    </div>
  )
}
