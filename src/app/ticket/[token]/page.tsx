import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'

// =============================================================================
// Public, no-login ticket-status page — keyed by the RSVP's qr_code_token
// (an unguessable UUID, the same credential already used at the door).
//
// This is the "view my RSVP without an account" link sent in the WhatsApp
// confirmation message (src/app/actions/rsvp.ts, src/app/api/webhooks/
// razorpay/route.ts) — it previously pointed at /api/qr/[token], a route
// that never existed. Fixed to point here for both guest and authenticated
// bookings; guests have no other way to retrieve their ticket.
// =============================================================================

export const metadata: Metadata = { title: 'Your Ticket — When In My City' }

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function formatTime(iso: string): string {
  return new Date(iso)
    .toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
    .toUpperCase()
}

function qrImageUrl(token: string): string {
  const data = encodeURIComponent(`WIMC-${token}`)
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${data}&color=3b0a00&bgcolor=ffffff&margin=8`
}

function ticketNumber(token: string): string {
  return `WIMC-${token.slice(0, 6).toUpperCase()}`
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  captured: { label: 'Confirmed', color: '#006a43' },
  pending: { label: 'Payment pending', color: '#B45309' },
  failed: { label: 'Payment failed', color: '#B91C1C' },
  refunded: { label: 'Refunded', color: '#57423e' },
  refund_failed: { label: 'Refund pending', color: '#B45309' },
}

export default async function TicketPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const admin = createAdminClient()

  const { data: rsvp } = await admin
    .from('rsvps')
    .select('attendee_name, payment_status, event_id, qr_code_token')
    .eq('qr_code_token', token)
    .maybeSingle()

  if (!rsvp) notFound()

  const { data: event } = await admin
    .from('events')
    .select('title, starts_at, venue_name, venue_address, cover_image_url, google_maps_url, status, whatsapp_group_url')
    .eq('id', rsvp.event_id)
    .maybeSingle()

  if (!event) notFound()

  const status = event.status === 'cancelled'
    ? { label: 'Event cancelled', color: '#57423e' }
    : STATUS_LABEL[rsvp.payment_status] ?? { label: rsvp.payment_status, color: '#57423e' }

  const showQR = rsvp.payment_status === 'captured' && event.status !== 'cancelled'

  return (
    <div className="bg-background text-on-surface font-sans min-h-screen flex flex-col items-center px-4 py-10" data-noise="true">
      <div className="w-full max-w-md">

        <header className="text-center mb-8">
          <span className="font-display font-black text-lg text-on-surface uppercase tracking-tighter">WIMC</span>
        </header>

        <section className="bg-surface-container-highest rounded-xl overflow-hidden shadow-[0_12px_32px_rgba(171,46,0,0.08)] mb-6">
          {event.cover_image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.cover_image_url} alt={event.title} className="w-full h-32 object-cover" />
          )}
          <div className="px-6 py-6">
            <div
              className="inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3"
              style={{ background: `${status.color}1A`, color: status.color }}
            >
              {status.label}
            </div>
            <h1 className="font-headline font-bold text-2xl text-on-surface mb-2">{event.title}</h1>
            <p className="text-on-surface-variant text-sm">{rsvp.attendee_name}</p>
            <div className="mt-4 flex flex-col gap-1.5 text-sm text-on-surface-variant">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">calendar_today</span>
                <span suppressHydrationWarning>{formatDate(event.starts_at)}, {formatTime(event.starts_at)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">location_on</span>
                <span>{event.venue_name}{event.venue_address ? `, ${event.venue_address}` : ''}</span>
              </div>
            </div>
            {event.google_maps_url && (
              <a
                href={event.google_maps_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-3 text-xs font-mono uppercase tracking-wider text-primary hover:underline"
              >
                Open in Maps →
              </a>
            )}
          </div>
        </section>

        {showQR ? (
          <section className="bg-surface-container-lowest rounded-xl p-8 mb-6 text-center">
            <p className="font-label font-bold text-xs uppercase tracking-widest text-on-surface-variant mb-4">
              Scan at Entrance
            </p>
            <div className="inline-block p-4 bg-white rounded-lg border border-outline-variant/20 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrImageUrl(rsvp.qr_code_token)} alt="Entry QR code" width={200} height={200} className="w-48 h-48" />
            </div>
            <p className="mt-4 font-bold text-on-surface">{ticketNumber(rsvp.qr_code_token)}</p>
            <p className="text-xs text-on-surface-variant">Non-transferable</p>
          </section>
        ) : (
          <section className="bg-surface-container-lowest rounded-xl p-8 mb-6 text-center">
            <p className="text-sm text-on-surface-variant">
              {event.status === 'cancelled'
                ? 'This event was cancelled. If you paid, a refund has been initiated.'
                : rsvp.payment_status === 'pending'
                  ? 'Your payment is still processing. This page will show your ticket once it clears.'
                  : rsvp.payment_status === 'failed'
                    ? 'This booking was not completed — the payment did not go through.'
                    : 'This booking has been refunded.'}
            </p>
          </section>
        )}

        {event.whatsapp_group_url && showQR && (
          <a
            href={event.whatsapp_group_url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-4 bg-[#25D366] text-white rounded-lg font-bold hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined">chat</span>
            Join WhatsApp Group
          </a>
        )}
      </div>

      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
      <style>{`.material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; display: inline-block; vertical-align: middle; }`}</style>
    </div>
  )
}
