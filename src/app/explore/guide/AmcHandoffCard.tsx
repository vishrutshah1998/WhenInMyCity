'use client'

import { useEffect, useState } from 'react'
import { markHandoffShown }    from '@/app/actions/civicReport'
import type { ForwardTarget, CivicCategory } from '@/app/actions/civicReport'

// ── Channel configuration ─────────────────────────────────────────────────────
// Phone numbers and portal URLs for each forward target.
// TODO: verify AMC WhatsApp number against current official AMC communications
//       before launch — civic helpline numbers are subject to change.

// AMC Ahmedabad Swachh + General Citizen Helpline (toll-free, nationally listed)
const AMC_PHONE    = '18002337777'
// AMC citizen services portal (complaint registration)
const AMC_PORTAL   = 'https://ahmedabad.municipalonline.in/'
// Traffic helpline (MoRTH national traffic helpline; local Ahmedabad Traffic Police
// can also be reached on 100 → ask for traffic department)
const TRAFFIC_PHONE = '1095'
// Gujarat Police e-FIR portal for online complaint registration
const GUJARAT_POLICE_EFIR = 'https://efir.gujaratpolice.gov.in/'

interface ChannelInfo {
  name:        string
  emoji:       string
  whatsapp:    string | null  // E.164 without '+', e.g. '919727555550'
  phone:       string | null  // as dialled locally, e.g. '18002337777'
  portalUrl:   string | null
  portalLabel: string | null
}

// Both 'swachhata' (not configured) and 'amc_channel' route here —
// the citizen channel for garbage/sanitation is AMC ward office when Swachhata
// is unavailable.
const AMC_CHANNEL: ChannelInfo = {
  name:        'AMC Ahmedabad',
  emoji:       '🏛',
  // TODO: confirm AMC WhatsApp number against official AMC communications
  whatsapp:    '919727555550',
  phone:       AMC_PHONE,
  portalUrl:   AMC_PORTAL,
  portalLabel: 'AMC Citizen Portal',
}

const CHANNEL: Record<ForwardTarget, ChannelInfo> = {
  swachhata:      AMC_CHANNEL,  // Swachhata not configured → fall through to AMC
  amc_channel:    AMC_CHANNEL,
  traffic_police: {
    name:        'Gujarat Traffic Police',
    emoji:       '🚔',
    whatsapp:    null,           // no verified WhatsApp for Gujarat Traffic Police
    phone:       TRAFFIC_PHONE,
    portalUrl:   GUJARAT_POLICE_EFIR,
    portalLabel: 'Gujarat Police e-FIR Portal',
  },
}

// ── Category display labels ────────────────────────────────────────────────────

const CATEGORY_LABEL: Record<CivicCategory, string> = {
  garbage:         'Garbage / Solid Waste',
  open_defecation: 'Open Defecation / Sanitation',
  pothole:         'Road Pothole',
  streetlight:     'Streetlight Issue',
  waterlogging:    'Waterlogging / Blocked Drain',
  water_supply:    'Water Supply Issue',
  tree:            'Tree / Fallen Debris',
  traffic:         'Traffic Issue',
}

// ── Pre-filled message builder ────────────────────────────────────────────────
// Builds a complaint message the user can paste into WhatsApp or read over phone.
// Kept deliberately short — the representative needs to understand it at a glance.

function buildMessage(args: {
  category:      CivicCategory
  description:   string
  lat?:          number
  lng?:          number
  reportId?:     string
  vehicleNumber?: string
  violationLabel?: string
}): string {
  const isTraffic = args.category === 'traffic' && !!args.vehicleNumber
  const lines: string[] = isTraffic
    ? ['🚔 Traffic Violation Report (via WIMC / When In My City)']
    : ['🔴 Civic Issue Report (via WIMC / When In My City)']

  if (isTraffic) {
    lines.push(`Violation: ${args.violationLabel ?? 'Traffic violation'}`)
    lines.push(`Vehicle:   ${args.vehicleNumber}`)
  } else {
    lines.push(`Issue: ${CATEGORY_LABEL[args.category] ?? args.category}`)
  }

  if (args.description) lines.push(`Details: ${args.description}`)

  if (args.lat != null && args.lng != null) {
    lines.push(`Location: ${args.lat.toFixed(5)}, ${args.lng.toFixed(5)}`)
    lines.push(`Map: https://maps.google.com/?q=${args.lat.toFixed(5)},${args.lng.toFixed(5)}`)
  }

  if (args.reportId) {
    lines.push(`WIMC Ref: ${args.reportId.slice(0, 8).toUpperCase()}`)
  }

  if (isTraffic) {
    lines.push('I am the reporting witness and can be contacted for verification.')
  }

  return lines.join('\n')
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface AmcHandoffCardProps {
  reportId:       string
  forwardTarget:  ForwardTarget
  category:       CivicCategory
  description?:   string
  lat?:           number
  lng?:           number
  // Traffic violations only — never shown to other users
  vehicleNumber?: string
  violationLabel?: string
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AmcHandoffCard({
  reportId,
  forwardTarget,
  category,
  description,
  lat,
  lng,
  vehicleNumber,
  violationLabel,
}: AmcHandoffCardProps) {
  const [copied,      setCopied]      = useState(false)
  const [handoffDone, setHandoffDone] = useState(false)

  const ch      = CHANNEL[forwardTarget]
  const message = buildMessage({
    category,
    description:    description ?? '',
    lat,
    lng,
    reportId,
    vehicleNumber,
    violationLabel,
  })
  const waUrl   = ch.whatsapp
    ? `https://wa.me/${ch.whatsapp}?text=${encodeURIComponent(message)}`
    : null

  // Mark handoff shown as soon as the card renders — the report has been handed
  // off to the user for direct submission. Fire-and-forget; UI does not depend
  // on this completing. Uses markHandoffShown which guards against overwriting
  // a 'forwarded' status and verifies user_id ownership.
  useEffect(() => {
    markHandoffShown(reportId).catch(() => { /* non-critical */ })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId])

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API may be blocked (insecure origin or permissions);
      // the message is visible in the pre block so the user can copy manually.
    }
  }

  function handleChannelClick() {
    setHandoffDone(true)
  }

  // ── Shared style fragments ─────────────────────────────────────────────────

  const actionBtn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 9,
    padding: '11px 14px', borderRadius: 9,
    border: '1px solid var(--wimc-border-default)',
    background: 'var(--wimc-bg-base)',
    color: 'var(--wimc-text-primary)',
    textDecoration: 'none',
    fontSize: 13, fontWeight: 500,
    fontFamily: 'var(--font-dm-sans)',
    transition: 'border-color 150ms',
    width: '100%', boxSizing: 'border-box',
  }

  return (
    <div style={{
      background: 'var(--wimc-bg-elevated)',
      border: '1px solid var(--wimc-border-default)',
      borderRadius: 12, overflow: 'hidden',
    }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        padding: '11px 14px',
        borderBottom: '1px solid var(--wimc-border-subtle)',
        display: 'flex', alignItems: 'center', gap: 9,
      }}>
        <span style={{ fontSize: 17, flexShrink: 0 }}>{ch.emoji}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 12, fontWeight: 700,
            color: 'var(--wimc-text-primary)',
            fontFamily: 'var(--font-dm-sans)',
          }}>
            Submit directly to {ch.name}
          </div>
          <div style={{
            fontSize: 10, color: 'var(--wimc-text-muted)',
            fontFamily: 'var(--font-jetbrains-mono)', marginTop: 2,
          }}>
            WIMC does not track this complaint after handoff
          </div>
        </div>
      </div>

      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* ── Pre-filled message block ─────────────────────────────────────── */}
        <div>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 6,
          }}>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'var(--wimc-text-muted)', fontFamily: 'var(--font-jetbrains-mono)',
            }}>
              Pre-filled message
            </span>
            <button
              onClick={copyMessage}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '3px 10px', borderRadius: 6,
                border: '1px solid var(--wimc-border-default)',
                background: 'transparent',
                color: copied ? 'var(--wimc-teal)' : 'var(--wimc-text-secondary)',
                fontSize: 11, fontWeight: 500, cursor: 'pointer',
                fontFamily: 'var(--font-dm-sans)', transition: 'color 150ms',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
                {copied ? 'check' : 'content_copy'}
              </span>
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre style={{
            margin: 0, padding: '10px 12px', borderRadius: 8,
            background: 'var(--wimc-bg-base)',
            border: '1px solid var(--wimc-border-subtle)',
            fontSize: 11, lineHeight: 1.7,
            color: 'var(--wimc-text-secondary)',
            fontFamily: 'var(--font-jetbrains-mono)',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
            {message}
          </pre>
        </div>

        {/* ── Channel action buttons ───────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

          {waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleChannelClick}
              style={{
                ...actionBtn,
                background: '#25D366',
                color: '#fff',
                fontWeight: 700,
                border: 'none',
                fontFamily: 'var(--font-syne)',
              }}
            >
              {/* WhatsApp logo mark */}
              <svg
                width="18" height="18" viewBox="0 0 24 24"
                fill="currentColor" style={{ flexShrink: 0 }}
                aria-hidden="true"
              >
                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 9.27 20.92 6.78 19.05 4.91 17.18 3.03 14.69 2 12.04 2zm.01 1.67c2.2 0 4.26.86 5.82 2.42 1.55 1.56 2.41 3.63 2.41 5.83 0 4.54-3.7 8.23-8.24 8.23-1.48 0-2.93-.39-4.19-1.15l-.3-.17-3.12.82.84-3.04-.2-.32A8.07 8.07 0 0 1 3.8 11.91c.01-4.54 3.7-8.24 8.25-8.24zM8.53 7.33c-.16 0-.43.06-.66.31-.22.25-.87.86-.87 2.07 0 1.22.89 2.39 1.02 2.56.14.17 1.76 2.67 4.25 3.73.59.27 1.05.42 1.41.53.59.19 1.13.16 1.56.1.48-.07 1.46-.6 1.67-1.18.21-.58.21-1.08.15-1.18-.06-.1-.22-.17-.47-.29-.25-.12-1.47-.72-1.69-.8-.23-.08-.37-.12-.56.12-.16.25-.64.8-.78.97-.14.17-.28.19-.52.07-.25-.13-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.12-.24-.01-.39.11-.5.11-.11.27-.29.37-.44.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.11-.56-1.35-.77-1.84-.2-.48-.4-.42-.56-.43-.14 0-.3-.01-.47-.01z"/>
              </svg>
              Send via WhatsApp to {ch.name}
            </a>
          )}

          {ch.portalUrl && (
            <a
              href={ch.portalUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleChannelClick}
              style={actionBtn}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--wimc-text-muted)', flexShrink: 0 }}>
                open_in_new
              </span>
              {ch.portalLabel} ↗
            </a>
          )}

          {ch.phone && (
            <a
              href={`tel:${ch.phone}`}
              onClick={handleChannelClick}
              style={actionBtn}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--wimc-text-muted)', flexShrink: 0 }}>
                call
              </span>
              {ch.name} Helpline ·{' '}
              {forwardTarget === 'traffic_police'
                ? '1095 (Traffic)'
                : `${AMC_PHONE} (Toll-free)`}
            </a>
          )}

        </div>

        {/* ── Handoff initiated feedback ───────────────────────────────────── */}
        {handoffDone && (
          <div style={{
            padding: '9px 12px', borderRadius: 8,
            background: 'rgba(77,210,177,0.08)',
            border: '1px solid rgba(77,210,177,0.2)',
            fontSize: 11, color: 'var(--wimc-teal)',
            fontFamily: 'var(--font-jetbrains-mono)',
          }}>
            ✓ Contact initiated — follow up directly with {ch.name} for status updates
          </div>
        )}

      </div>
    </div>
  )
}
