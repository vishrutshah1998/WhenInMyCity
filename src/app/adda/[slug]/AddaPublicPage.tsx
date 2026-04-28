'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { AddaProfile, AddaTier, Event, UserProfile } from '@/types/database'
import type { PricingConfig } from '@/types/marketplace'

// ─── Types ────────────────────────────────────────────────────────────────────

interface UpcomingEvent extends Event {
  maker: Pick<UserProfile, 'display_name' | 'username' | 'avatar_url' | 'creator_type'>
}

interface PastEvent {
  title: string
  date: string
  attendee_count: number
  cover_image_url: string | null
}

interface Props {
  adda: AddaProfile
  upcomingEvents: UpcomingEvent[]
  pastEvents: PastEvent[]
  stats: { total_events: number; average_rating: number }
}

// ─── Static maps ──────────────────────────────────────────────────────────────

const ADDA_TYPE_LABELS: Record<string, string> = {
  cafe: 'Café',
  coworking: 'Coworking',
  gallery: 'Gallery',
  community_hall: 'Community Hall',
  rooftop: 'Rooftop',
  garden: 'Garden',
  studio: 'Studio',
  library: 'Library',
  restaurant: 'Restaurant',
}

const AMENITY_META: Record<string, { icon: string; label: string }> = {
  projector:     { icon: 'slideshow',       label: 'Projector' },
  pa_system:     { icon: 'speaker',         label: 'PA System' },
  natural_light: { icon: 'wb_sunny',        label: 'Natural Light' },
  parking:       { icon: 'local_parking',   label: 'Parking' },
  accessible:    { icon: 'accessible',      label: 'Accessible' },
  wifi:          { icon: 'wifi',            label: 'Wi-Fi' },
  whiteboard:    { icon: 'edit_square',     label: 'Whiteboard' },
  kitchen:       { icon: 'kitchen',         label: 'Kitchen' },
  outdoor_space: { icon: 'park',            label: 'Outdoor Space' },
  ac:            { icon: 'ac_unit',         label: 'AC' },
}

const PRICING_MODEL_LABELS: Record<string, string> = {
  fixed_rental:    'Fixed Rental',
  door_split:      'Door Split',
  hybrid:          'Hybrid',
  f_and_b_minimum: 'F&B Minimum',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

function formatTime(iso: string): string {
  return new Date(iso)
    .toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
    .toUpperCase()
}

function formatPrice(paise: number): string {
  if (paise === 0) return 'Free'
  return `₹${Math.round(paise / 100).toLocaleString('en-IN')}`
}

function formatPricing(model: string, config: PricingConfig | null): string {
  if (!config) return PRICING_MODEL_LABELS[model] ?? model
  switch (model) {
    case 'fixed_rental':
      return config.fixed_rental_paise
        ? `₹${Math.round(config.fixed_rental_paise / 100).toLocaleString('en-IN')} / event`
        : 'Fixed rental'
    case 'door_split':
      return config.door_split_percent != null
        ? `${config.door_split_percent}% door split`
        : 'Door split'
    case 'hybrid':
      return `₹${Math.round((config.hybrid_rental_paise ?? 0) / 100).toLocaleString('en-IN')} + ${config.hybrid_split_percent ?? 0}% split`
    case 'f_and_b_minimum':
      return config.f_and_b_minimum_paise
        ? `₹${Math.round(config.f_and_b_minimum_paise / 100).toLocaleString('en-IN')} F&B minimum`
        : 'F&B minimum'
    default:
      return model.replace(/_/g, ' ')
  }
}

function whatsappHref(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  const number = digits.startsWith('91') ? digits : `91${digits}`
  return `https://wa.me/${number}`
}

// ─── Tier badges ─────────────────────────────────────────────────────────────

const TIER_META: Record<Exclude<AddaTier, 'open'>, {
  label: string; icon: string; bg: string; border: string; color: string
}> = {
  verified:  { label: 'Verified Adda',  icon: 'verified',          bg: 'rgba(77,210,177,0.15)',  border: 'rgba(77,210,177,0.4)',  color: 'var(--wimc-teal)' },
  beloved:   { label: 'Beloved Adda',   icon: 'favorite',          bg: 'rgba(245,168,0,0.15)',   border: 'rgba(245,168,0,0.4)',   color: 'var(--wimc-amber)' },
  legendary: { label: 'Legendary Adda', icon: 'workspace_premium', bg: 'rgba(168,85,247,0.15)',  border: 'rgba(168,85,247,0.4)',  color: '#a855f7' },
}

function AddaTierBadge({ tier, size = 'md' }: { tier: AddaTier; size?: 'sm' | 'md' }) {
  if (tier === 'open') return null
  const m = TIER_META[tier]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: size === 'sm' ? '2px 8px' : '3px 10px', borderRadius: 9999,
      background: m.bg, border: `1px solid ${m.border}`, color: m.color,
      fontSize: size === 'sm' ? 10 : 11, fontWeight: 600,
      fontFamily: 'var(--font-jetbrains-mono)',
      textTransform: 'uppercase', letterSpacing: '0.04em',
    }}>
      <span className="material-symbols-outlined" style={{ fontSize: size === 'sm' ? 11 : 12 }}>{m.icon}</span>
      {m.label}
    </span>
  )
}

function Stars({ rating }: { rating: number }) {
  const full = Math.floor(rating)
  const half = rating - full >= 0.5
  return (
    <span style={{ display: 'inline-flex', gap: 1, color: 'var(--wimc-amber)', fontSize: 14 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className="material-symbols-outlined" style={{ fontSize: 16 }}>
          {i < full ? 'star' : i === full && half ? 'star_half' : 'star_outline'}
        </span>
      ))}
    </span>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AddaPublicPage({ adda, upcomingEvents, pastEvents, stats }: Props) {
  const pricingConfig = adda.pricing_config as PricingConfig | null
  const hasGallery = adda.gallery_images?.length > 0

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--wimc-bg-base)',
      color: 'var(--wimc-text-primary)',
      fontFamily: 'var(--font-dm-sans), sans-serif',
      paddingBottom: 96,
    }}>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', height: 340, background: 'var(--wimc-bg-raised)' }}>
        {adda.cover_image_url ? (
          <Image
            src={adda.cover_image_url}
            alt={adda.name}
            fill
            style={{ objectFit: 'cover' }}
            priority
          />
        ) : (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(135deg, rgba(232,87,42,0.15) 0%, rgba(10,10,11,0.8) 100%)',
            display: 'grid', placeItems: 'center',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 72, color: 'var(--wimc-text-muted)', opacity: 0.3 }}>
              apartment
            </span>
          </div>
        )}
        {/* Gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, transparent 30%, rgba(10,10,11,0.92) 100%)',
        }} />

        {/* Back link */}
        <div style={{ position: 'absolute', top: 16, left: 16 }}>
          <Link
            href="/dashboard/venues"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '6px 12px', borderRadius: 8,
              background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--wimc-text-secondary)', fontSize: 13, textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
            Venues
          </Link>
        </div>

        {/* Hero text */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '0 24px 24px',
          maxWidth: 800, margin: '0 auto',
        }}>
          {/* Type chips + tier badge + trending */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {adda.adda_type.map((t) => (
              <span key={t} style={{
                padding: '3px 10px', borderRadius: 9999,
                background: 'rgba(232,87,42,0.15)',
                border: '1px solid rgba(232,87,42,0.3)',
                color: 'var(--wimc-coral)', fontSize: 11, fontWeight: 600,
                fontFamily: 'var(--font-jetbrains-mono)',
                textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>
                {ADDA_TYPE_LABELS[t] ?? t}
              </span>
            ))}
            <AddaTierBadge tier={adda.adda_tier} />
            {adda.trending_until && new Date(adda.trending_until) > new Date() && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '3px 10px', borderRadius: 9999,
                background: 'rgba(232,87,42,0.25)',
                border: '1px solid rgba(232,87,42,0.55)',
                color: '#ff7a45', fontSize: 11, fontWeight: 600,
                fontFamily: 'var(--font-jetbrains-mono)',
                textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>
                🔥 Trending
              </span>
            )}
          </div>

          {/* Name + verified */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h1 style={{
              fontFamily: 'var(--font-syne)', fontWeight: 800,
              fontSize: 'clamp(24px, 5vw, 36px)',
              color: '#fff', margin: 0, lineHeight: 1.1,
            }}>
              {adda.name}
            </h1>
            {adda.is_verified && (
              <span
                className="material-symbols-outlined"
                title="Verified Venue"
                style={{ fontSize: 22, color: 'var(--wimc-teal)', flexShrink: 0 }}
              >
                verified
              </span>
            )}
          </div>

          {/* Location */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>location_on</span>
            {[adda.neighbourhood, adda.city].filter(Boolean).join(', ')}
          </div>
        </div>
      </div>

      {/* ── Stats bar ─────────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--wimc-bg-raised)',
        borderBottom: '1px solid var(--wimc-border-subtle)',
      }}>
        <div style={{
          maxWidth: 800, margin: '0 auto', padding: '0 24px',
          display: 'flex', gap: 32, height: 56, alignItems: 'center',
        }}>
          <StatItem icon="event" label="Events hosted" value={stats.total_events.toString()} />
          {stats.average_rating > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Stars rating={stats.average_rating} />
              <span style={{
                fontSize: 13, color: 'var(--wimc-text-secondary)',
                fontFamily: 'var(--font-jetbrains-mono)',
              }}>
                {stats.average_rating.toFixed(1)}
              </span>
            </div>
          )}
          {adda.capacity_max && (
            <StatItem icon="people" label="Max capacity" value={adda.capacity_max.toString()} />
          )}
        </div>
      </div>

      {/* ── Gallery strip ─────────────────────────────────────────────────── */}
      {hasGallery && (
        <div style={{
          overflowX: 'auto',
          padding: '16px 24px',
          display: 'flex', gap: 12,
          scrollbarWidth: 'none',
          borderBottom: '1px solid var(--wimc-border-subtle)',
        }}>
          {adda.gallery_images.map((url, i) => (
            <div key={i} style={{
              position: 'relative', flexShrink: 0,
              width: 160, height: 110, borderRadius: 10, overflow: 'hidden',
              background: 'var(--wimc-bg-raised)',
            }}>
              <Image src={url} alt={`${adda.name} ${i + 1}`} fill style={{ objectFit: 'cover' }} />
            </div>
          ))}
        </div>
      )}

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px 0' }}>

        {/* About */}
        {adda.description && (
          <Section title="About">
            <p style={{
              fontSize: 15, lineHeight: 1.7,
              color: 'var(--wimc-text-secondary)', margin: 0,
            }}>
              {adda.description}
            </p>
          </Section>
        )}

        {/* Amenities */}
        {adda.amenities?.length > 0 && (
          <Section title="Amenities">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {adda.amenities.map((a) => {
                const meta = AMENITY_META[a] ?? { icon: 'check_circle', label: a }
                return (
                  <div key={a} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '7px 14px', borderRadius: 9999,
                    background: 'var(--wimc-bg-raised)',
                    border: '1px solid var(--wimc-border-subtle)',
                    fontSize: 13, color: 'var(--wimc-text-primary)',
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--wimc-teal)' }}>
                      {meta.icon}
                    </span>
                    {meta.label}
                  </div>
                )
              })}
            </div>
          </Section>
        )}

        {/* Capacity + Pricing */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 40 }}>
          {/* Capacity */}
          <div style={{
            padding: 20, borderRadius: 14,
            background: 'var(--wimc-bg-raised)',
            border: '1px solid var(--wimc-border-subtle)',
          }}>
            <div style={{
              fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
              color: 'var(--wimc-text-muted)', marginBottom: 12,
              fontFamily: 'var(--font-jetbrains-mono)',
            }}>
              Capacity
            </div>
            {adda.capacity_min != null && adda.capacity_max != null && (
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--wimc-text-primary)', marginBottom: 8 }}>
                {adda.capacity_min}–{adda.capacity_max}
                <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--wimc-text-muted)', marginLeft: 4 }}>
                  guests
                </span>
              </div>
            )}
            {(adda.capacity_configurations as { type: string; capacity: number }[] | null)?.map((c) => (
              <div key={c.type} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '6px 0',
                borderTop: '1px solid var(--wimc-border-subtle)',
                fontSize: 13,
              }}>
                <span style={{ color: 'var(--wimc-text-secondary)', textTransform: 'capitalize' }}>
                  {c.type.replace(/_/g, ' ')}
                </span>
                <span style={{ color: 'var(--wimc-text-primary)', fontWeight: 600 }}>{c.capacity}</span>
              </div>
            ))}
          </div>

          {/* Pricing */}
          <div style={{
            padding: 20, borderRadius: 14,
            background: 'var(--wimc-bg-raised)',
            border: '1px solid var(--wimc-border-subtle)',
          }}>
            <div style={{
              fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
              color: 'var(--wimc-text-muted)', marginBottom: 12,
              fontFamily: 'var(--font-jetbrains-mono)',
            }}>
              Pricing
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 12px', borderRadius: 9999,
              background: 'rgba(77,210,177,0.1)',
              border: '1px solid rgba(77,210,177,0.25)',
              color: 'var(--wimc-teal)', fontSize: 12, fontWeight: 600,
              fontFamily: 'var(--font-jetbrains-mono)',
              marginBottom: 12,
            }}>
              {PRICING_MODEL_LABELS[adda.pricing_model] ?? adda.pricing_model}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--wimc-text-primary)' }}>
              {formatPricing(adda.pricing_model, pricingConfig)}
            </div>
          </div>
        </div>

        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <Section title={`Upcoming Events (${upcomingEvents.length})`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {upcomingEvents.map((ev) => (
                <Link
                  key={ev.id}
                  href={`/events/${ev.slug}`}
                  style={{ textDecoration: 'none', display: 'block' }}
                >
                  <div style={{
                    display: 'flex', gap: 14, alignItems: 'flex-start',
                    padding: 14, borderRadius: 12,
                    background: 'var(--wimc-bg-raised)',
                    border: '1px solid var(--wimc-border-subtle)',
                    transition: 'border-color 150ms',
                  }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--wimc-coral)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--wimc-border-subtle)')}
                  >
                    {/* Cover */}
                    <div style={{
                      position: 'relative', flexShrink: 0,
                      width: 72, height: 72, borderRadius: 8, overflow: 'hidden',
                      background: 'var(--wimc-bg-overlay)',
                    }}>
                      {ev.cover_image_url ? (
                        <Image src={ev.cover_image_url} alt={ev.title} fill style={{ objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}>
                          <span className="material-symbols-outlined" style={{ color: 'var(--wimc-text-muted)', fontSize: 28 }}>event</span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 15, fontWeight: 700,
                        color: 'var(--wimc-text-primary)',
                        marginBottom: 4, lineHeight: 1.3,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {ev.title}
                      </div>
                      <div style={{
                        fontSize: 12, color: 'var(--wimc-text-secondary)', marginBottom: 6,
                        fontFamily: 'var(--font-jetbrains-mono)',
                      }}>
                        {formatDate(ev.starts_at)} · {formatTime(ev.starts_at)}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        {/* Maker */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{
                            width: 20, height: 20, borderRadius: '50%',
                            background: 'var(--wimc-coral)', overflow: 'hidden',
                            flexShrink: 0, display: 'grid', placeItems: 'center',
                          }}>
                            {ev.maker.avatar_url ? (
                              <Image src={ev.maker.avatar_url} alt="" width={20} height={20} style={{ objectFit: 'cover' }} />
                            ) : (
                              <span style={{ color: '#fff', fontSize: 10, fontWeight: 700 }}>
                                {(ev.maker.display_name ?? ev.maker.username ?? '?')[0].toUpperCase()}
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: 12, color: 'var(--wimc-text-muted)' }}>
                            {ev.maker.display_name ?? ev.maker.username}
                          </span>
                        </div>
                        {/* Price */}
                        <span style={{
                          fontSize: 13, fontWeight: 700,
                          color: ev.ticket_price === 0 ? 'var(--wimc-teal)' : 'var(--wimc-coral)',
                          fontFamily: 'var(--font-jetbrains-mono)',
                        }}>
                          {formatPrice(ev.ticket_price)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </Section>
        )}

        {/* Past Events */}
        {pastEvents.length > 0 && (
          <Section title="Past Events">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
              {pastEvents.map((ev, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 10, alignItems: 'center',
                  padding: '10px 12px', borderRadius: 10,
                  background: 'var(--wimc-bg-raised)',
                  border: '1px solid var(--wimc-border-subtle)',
                }}>
                  <div style={{
                    position: 'relative', flexShrink: 0,
                    width: 40, height: 40, borderRadius: 6, overflow: 'hidden',
                    background: 'var(--wimc-bg-overlay)',
                  }}>
                    {ev.cover_image_url ? (
                      <Image src={ev.cover_image_url} alt={ev.title} fill style={{ objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}>
                        <span className="material-symbols-outlined" style={{ color: 'var(--wimc-text-muted)', fontSize: 18 }}>event</span>
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 600, color: 'var(--wimc-text-primary)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      marginBottom: 2,
                    }}>
                      {ev.title}
                    </div>
                    <div style={{
                      fontSize: 11, color: 'var(--wimc-text-muted)',
                      fontFamily: 'var(--font-jetbrains-mono)',
                    }}>
                      {formatDate(ev.date)} · {ev.attendee_count} attended
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Contact */}
        {(adda.contact_whatsapp || adda.contact_email || adda.instagram_handle) && (
          <Section title="Contact">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {adda.contact_whatsapp && (
                <a
                  href={whatsappHref(adda.contact_whatsapp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7,
                    padding: '9px 16px', borderRadius: 9999,
                    background: 'rgba(37,211,102,0.1)',
                    border: '1px solid rgba(37,211,102,0.25)',
                    color: '#25d366', fontSize: 13, fontWeight: 600,
                    textDecoration: 'none', transition: 'background 150ms',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chat</span>
                  WhatsApp
                </a>
              )}
              {adda.contact_email && (
                <a
                  href={`mailto:${adda.contact_email}`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7,
                    padding: '9px 16px', borderRadius: 9999,
                    background: 'rgba(59,130,246,0.1)',
                    border: '1px solid rgba(59,130,246,0.25)',
                    color: '#3b82f6', fontSize: 13, fontWeight: 600,
                    textDecoration: 'none', transition: 'background 150ms',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>mail</span>
                  Email
                </a>
              )}
              {adda.instagram_handle && (
                <a
                  href={`https://instagram.com/${adda.instagram_handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7,
                    padding: '9px 16px', borderRadius: 9999,
                    background: 'rgba(225,48,108,0.1)',
                    border: '1px solid rgba(225,48,108,0.25)',
                    color: '#e1306c', fontSize: 13, fontWeight: 600,
                    textDecoration: 'none', transition: 'background 150ms',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>photo_camera</span>
                  @{adda.instagram_handle}
                </a>
              )}
            </div>
          </Section>
        )}

      </div>

      {/* ── Sticky CTA ────────────────────────────────────────────────────── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        padding: '12px 24px',
        background: 'rgba(10,10,11,0.92)', backdropFilter: 'blur(16px)',
        borderTop: '1px solid var(--wimc-border-subtle)',
        display: 'flex', justifyContent: 'center', gap: 12,
        zIndex: 50,
      }}>
        <Link
          href={`/dashboard/venues?city=${encodeURIComponent(adda.city)}`}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '11px 28px', borderRadius: 10,
            background: 'var(--wimc-coral)', color: '#fff',
            fontWeight: 700, fontSize: 14, textDecoration: 'none',
            fontFamily: 'var(--font-syne)',
            transition: 'opacity 150ms',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.88')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>send</span>
          Book this Venue
        </Link>
      </div>

    </div>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <h2 style={{
        fontFamily: 'var(--font-syne)', fontWeight: 700,
        fontSize: 16, color: 'var(--wimc-text-primary)',
        margin: '0 0 16px',
      }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

function StatItem({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--wimc-text-muted)' }}>
        {icon}
      </span>
      <span style={{
        fontFamily: 'var(--font-jetbrains-mono)', fontWeight: 700,
        fontSize: 14, color: 'var(--wimc-text-primary)',
      }}>
        {value}
      </span>
      <span style={{ fontSize: 12, color: 'var(--wimc-text-muted)' }}>{label}</span>
    </div>
  )
}
