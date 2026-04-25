'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Image from 'next/image'
import type { Event } from '@/types/database'
import { addEventToPage } from '@/app/actions/blocks'

interface PublishedViewProps {
  event: Event
  rsvpCount: number
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatPrice(paise: number): string {
  if (paise === 0) return 'Free'
  return `₹${(paise / 100).toLocaleString('en-IN')}`
}

export default function PublishedView({ event, rsvpCount }: PublishedViewProps) {
  const router = useRouter()
  const eventUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/events/${event.slug}`
  const [addState, setAddState] = useState<'idle' | 'loading' | 'success'>('idle')

  async function handleAddToPage() {
    if (addState !== 'idle') return
    setAddState('loading')
    const { error } = await addEventToPage(event.id)
    if (!error) {
      setAddState('success')
    } else {
      setAddState('idle')
    }
  }

  function handleShareWhatsApp() {
    const text = encodeURIComponent(
      `🎉 *${event.title}*\n📅 ${formatDate(event.starts_at)}\n📍 ${event.venue_name}\n🎟️ ${formatPrice(event.ticket_price)}\n\nBook now: ${eventUrl}`,
    )
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(eventUrl).catch(() => {})
  }

  return (
    <div className="relative min-h-screen bg-background text-on-surface font-body flex flex-col">

      {/* Ambient orbs — give backdrop-blur something to blur */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10" aria-hidden>
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/25 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-[-5rem] w-80 h-80 bg-secondary/15 rounded-full blur-3xl" />
        <div className="absolute bottom-[-4rem] left-1/3 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="w-full top-0 sticky z-50 flex items-center justify-between px-6 py-4 bg-background/80 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/dashboard')}>
            <span className="material-symbols-outlined text-primary">close</span>
          </button>
          <h1 className="font-headline font-semibold text-lg text-primary">Create Event</h1>
        </div>
      </header>

      <main className="flex-1 px-6 pb-32 max-w-2xl mx-auto w-full">

        {/* Hero */}
        <section className="relative py-12 text-center overflow-hidden">
          <div className="absolute inset-0 pointer-events-none opacity-10"
            style={{
              backgroundImage: 'radial-gradient(#E8572A 1px, transparent 1px), radial-gradient(#CF4519 1px, transparent 1px)',
              backgroundSize: '40px 40px',
              backgroundPosition: '0 0, 20px 20px',
            }}
          />
          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-secondary/20 rounded-full shadow-lg mb-4">
              <span className="material-symbols-outlined text-secondary text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>celebration</span>
            </div>
            <h2 className="font-headline text-4xl md:text-5xl font-extrabold tracking-tight text-on-surface">
              Your event is live! 🔥
            </h2>
            <p className="font-body text-on-surface-variant text-lg">
              Share it with your audience…
            </p>
          </div>
        </section>

        {/* Event card */}
        <section className="mb-10">
          <div className="bg-white/[0.06] backdrop-blur-md border border-white/[0.09] rounded-2xl overflow-hidden shadow-xl shadow-black/30 flex flex-col md:flex-row hover:scale-[1.01] hover:bg-white/[0.08] transition-all duration-300">
            {event.cover_image_url && (
              <div className="md:w-2/5 h-48 md:h-auto overflow-hidden relative shrink-0">
                <Image
                  src={event.cover_image_url}
                  alt={event.title}
                  fill
                  className="object-cover"
                  unoptimized
                />
                <div className="absolute top-4 left-4">
                  <span className="bg-primary text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-md">Live</span>
                </div>
              </div>
            )}
            <div className="p-6 flex flex-col justify-between flex-1">
              <div>
                <h3 className="font-headline text-2xl font-bold text-on-surface mb-2">{event.title}</h3>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-on-surface-variant text-sm">
                    <span className="material-symbols-outlined text-primary text-lg">calendar_month</span>
                    <span suppressHydrationWarning>{formatDate(event.starts_at)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-on-surface-variant text-sm">
                    <span className="material-symbols-outlined text-primary text-lg">location_on</span>
                    <span>{event.venue_name}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-outline/10">
                <span className="font-headline font-bold text-xl text-primary">{formatPrice(event.ticket_price)}</span>
                <div className="flex items-center gap-2 text-on-surface-variant text-sm">
                  <span className="material-symbols-outlined text-sm">people</span>
                  <span>{rsvpCount} attendee{rsvpCount !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Share actions */}
        <section className="space-y-4">
          <button
            onClick={handleShareWhatsApp}
            className="w-full py-5 px-6 rounded-xl bg-gradient-to-br from-[#8E2600] to-primary text-white font-headline font-bold text-lg flex items-center justify-center gap-3 shadow-lg active:scale-[0.98] transition-all"
          >
            <span className="material-symbols-outlined">chat</span>
            Share on WhatsApp 💬
          </button>
          <button
            onClick={handleCopyLink}
            className="w-full py-4 px-6 rounded-xl border-2 border-outline text-on-surface font-headline font-semibold flex items-center justify-center gap-3 hover:bg-surface-container-low active:scale-[0.98] transition-all"
          >
            <span className="material-symbols-outlined">content_copy</span>
            Copy Event Link
          </button>
        </section>

        {/* Quick actions */}
        <section className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickAction icon="photo_camera" label="Instagram Story image" onClick={() => {}} />
          <AddToPageAction state={addState} onClick={handleAddToPage} />
          <QuickAction icon="visibility" label="View event page" onClick={() => router.push(`/events/${event.slug}`)} />
        </section>
      </main>

      {/* Fixed bottom bar */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-6 pb-6 pt-4 bg-background/90 backdrop-blur-md rounded-t-2xl border-t border-outline-variant/20 shadow-[0_-12px_32px_rgba(0,0,0,0.4)]">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex flex-col items-center justify-center text-on-surface-variant px-4 py-2 hover:text-on-surface transition-colors"
        >
          <span className="material-symbols-outlined mb-1">dashboard</span>
          <span className="font-body font-medium text-[10px] uppercase tracking-wider">Studio</span>
        </button>

        <button
          onClick={() => router.push(`/events/${event.slug}`)}
          className="flex flex-col items-center justify-center bg-gradient-to-br from-[#8E2600] to-primary text-white rounded-xl px-8 py-2 mb-2 shadow-lg active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined mb-1" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          <span className="font-body font-medium text-[10px] uppercase tracking-wider">View Event</span>
        </button>
      </nav>

      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
      <style>{`
        .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
        @keyframes arrow-bounce {
          0%   { transform: translateY(0) scale(1); opacity: 1; }
          40%  { transform: translateY(-8px) scale(1.15); opacity: 1; }
          70%  { transform: translateY(4px) scale(0.95); opacity: 1; }
          100% { transform: translateY(0) scale(1); opacity: 0; }
        }
        @keyframes check-pop {
          0%   { transform: scale(0) rotate(-20deg); opacity: 0; }
          60%  { transform: scale(1.25) rotate(5deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes ring-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(34,197,94,0.6); }
          70%  { box-shadow: 0 0 0 12px rgba(34,197,94,0); }
          100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
        }
        .animate-arrow-bounce { animation: arrow-bounce 0.5s ease-in-out forwards; }
        .animate-check-pop    { animation: check-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .animate-ring-pulse   { animation: ring-pulse 0.7s ease-out forwards; }
      `}</style>
    </div>
  )
}

function QuickAction({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center p-6 rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/[0.07] hover:bg-white/[0.08] hover:border-white/[0.13] shadow-lg shadow-black/20 transition-all text-center group"
    >
      <div className="w-12 h-12 bg-white/[0.07] backdrop-blur-sm border border-white/[0.10] rounded-full flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-white/[0.12] transition-all">
        <span className="material-symbols-outlined text-primary">{icon}</span>
      </div>
      <span className="font-label text-xs font-bold uppercase tracking-wider text-on-surface-variant">{label}</span>
    </button>
  )
}

function AddToPageAction({
  state,
  onClick,
}: {
  state: 'idle' | 'loading' | 'success'
  onClick: () => void
}) {
  const isSuccess = state === 'success'
  const isLoading = state === 'loading'

  return (
    <button
      onClick={onClick}
      disabled={state !== 'idle'}
      className="flex flex-col items-center justify-center p-6 rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/[0.07] hover:bg-white/[0.08] hover:border-white/[0.13] shadow-lg shadow-black/20 transition-all text-center group disabled:cursor-default"
    >
      <div
        className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-all duration-300 relative overflow-visible
          ${isSuccess ? 'bg-green-500/20 animate-ring-pulse' : 'bg-white/[0.07] backdrop-blur-sm border border-white/[0.10] group-hover:scale-110 group-hover:bg-white/[0.12]'}`}
      >
        {/* Idle / loading: arrow icon with bounce on loading */}
        {!isSuccess && (
          <span
            className={`material-symbols-outlined text-primary transition-opacity duration-200
              ${isLoading ? 'animate-arrow-bounce' : ''}`}
          >
            arrow_downward
          </span>
        )}

        {/* Success: green checkmark pop-in */}
        {isSuccess && (
          <span
            className="material-symbols-outlined text-green-500 animate-check-pop"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            check_circle
          </span>
        )}
      </div>

      <span
        className={`font-label text-xs font-bold uppercase tracking-wider transition-colors duration-300
          ${isSuccess ? 'text-green-500' : 'text-on-surface-variant'}`}
      >
        {isSuccess ? 'Added to page!' : isLoading ? 'Adding…' : 'Add to my page'}
      </span>
    </button>
  )
}
