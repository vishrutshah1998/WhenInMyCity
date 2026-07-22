import Image from 'next/image'
import { WimcWordmark } from '@/components/WimcWordmark'
import type { MediaKitData } from '@/app/actions/media-kit'

const CHALK      = '#F7F2E8'
const CHALK_2    = '#EDE7D6'
const INK        = '#1A1108'
const INK_2      = '#4A3F2F'
const INK_3      = '#7A6E5F'
const CORAL      = '#E8705A'
const TURMERIC   = '#F5A800'
const BORDER     = 'rgba(26,17,8,0.08)'
const BORDER_2   = 'rgba(26,17,8,0.14)'

const TIER_LABELS: Record<string, string> = {
  wanderer: 'Wanderer', local: 'Local', lantern: 'Lantern', beacon: 'Beacon',
}

function formatRupees(paise: number): string {
  const rupees = paise / 100
  return `₹${rupees.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

function formatPct(rate: number | null): string {
  if (rate === null) return 'Not enough data yet'
  return `${Math.round(rate * 100)}%`
}

function MetricTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{
      background: 'white', border: `1px solid ${BORDER}`, padding: '20px 22px',
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <p style={{
        fontFamily: 'var(--font-jetbrains-mono), monospace', fontSize: 10, fontWeight: 600,
        letterSpacing: '0.12em', textTransform: 'uppercase', color: INK_3,
      }}>
        {label}
      </p>
      <p style={{ fontFamily: 'var(--font-syne), sans-serif', fontWeight: 700, fontSize: 28, color: INK, lineHeight: 1.1 }}>
        {value}
      </p>
      {sub && <p style={{ fontSize: 12, color: INK_3 }}>{sub}</p>}
    </div>
  )
}

export default function MediaKitView({ data }: { data: MediaKitData }) {
  const { metrics } = data
  const hasAwardsOrPress = data.awards.length > 0 || data.press.length > 0

  return (
    <div style={{
      minHeight: '100vh', background: CHALK, color: INK,
      fontFamily: 'var(--font-dm-sans), sans-serif',
    }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px 80px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 }}>
          <WimcWordmark color={INK} height={22} />
          <p style={{
            fontFamily: 'var(--font-jetbrains-mono), monospace', fontSize: 10, fontWeight: 600,
            letterSpacing: '0.15em', textTransform: 'uppercase', color: INK_3,
          }}>
            Media Kit
          </p>
        </div>

        {/* Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 12 }}>
          {data.avatarUrl ? (
            <Image
              src={data.avatarUrl} alt={data.displayName} width={72} height={72}
              className="object-cover" unoptimized
              style={{ width: 72, height: 72, borderRadius: '50%', border: `1px solid ${BORDER_2}` }}
            />
          ) : (
            <div style={{
              width: 72, height: 72, borderRadius: '50%', background: CHALK_2,
              display: 'grid', placeItems: 'center', fontFamily: 'var(--font-syne), sans-serif',
              fontWeight: 700, fontSize: 24, color: INK_2, border: `1px solid ${BORDER_2}`,
            }}>
              {data.displayName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <h1 style={{ fontFamily: 'var(--font-syne), sans-serif', fontWeight: 700, fontSize: 26, marginBottom: 4 }}>
              {data.displayName}
            </h1>
            <p style={{ fontSize: 13, color: INK_3 }}>
              @{data.username} · {data.city}
              <span style={{
                marginLeft: 10, padding: '2px 8px', fontSize: 10, fontWeight: 700,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                color: CORAL, border: `1px solid ${CORAL}`, borderRadius: 3,
              }}>
                {TIER_LABELS[data.tier] ?? data.tier}
              </span>
            </p>
          </div>
        </div>

        {data.bio && (
          <p style={{ fontSize: 14.5, color: INK_2, lineHeight: 1.7, maxWidth: 620, marginBottom: 40 }}>
            {data.bio}
          </p>
        )}

        {/* Metrics */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12,
          marginBottom: 40,
        }}>
          <MetricTile
            label="Revenue Generated"
            value={formatRupees(metrics.revenueGeneratedPaise)}
            sub={`Across ${metrics.eventsHosted} event${metrics.eventsHosted === 1 ? '' : 's'}`}
          />
          <MetricTile
            label="Repeat Attendee Rate"
            value={formatPct(metrics.repeatAttendeeRate)}
            sub="Identified attendees returning across events"
          />
          <MetricTile
            label="Venue Footprint"
            value={String(metrics.distinctVenues)}
            sub="Distinct venues hosted at"
          />
          <MetricTile
            label="Inquiry Conversion"
            value={formatPct(metrics.bookingInquiries.conversionRate)}
            sub={`${metrics.bookingInquiries.accepted} accepted of ${metrics.bookingInquiries.received} received`}
          />
        </div>

        {/* Awards & Press */}
        {hasAwardsOrPress && (
          <div style={{ marginBottom: 24 }}>
            <p style={{
              fontFamily: 'var(--font-jetbrains-mono), monospace', fontSize: 10, fontWeight: 600,
              letterSpacing: '0.12em', textTransform: 'uppercase', color: INK_3, marginBottom: 12,
            }}>
              Awards & Press <span style={{ opacity: 0.7 }}>— self-reported</span>
            </p>

            {data.awards.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: data.press.length > 0 ? 16 : 0 }}>
                {data.awards.map((b, i) => (
                  <span key={i} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '6px 12px', fontSize: 12, fontWeight: 600,
                    background: 'white', border: `1px solid ${BORDER_2}`, borderRadius: 999, color: INK_2,
                  }}>
                    {b.label}{b.year ? ` · ${b.year}` : ''}
                  </span>
                ))}
              </div>
            )}

            {data.press.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
                {data.press.map((f, i) => (
                  <span key={i} style={{ fontSize: 13, fontWeight: 600, color: INK_2 }}>
                    {f.outlet}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ borderTop: `1px solid ${BORDER}`, marginTop: 40, paddingTop: 20 }}>
          <p style={{ fontSize: 11, color: INK_3 }}>
            Generated via <span style={{ color: TURMERIC, fontWeight: 600 }}>When In My City</span>
          </p>
        </div>
      </div>
    </div>
  )
}
