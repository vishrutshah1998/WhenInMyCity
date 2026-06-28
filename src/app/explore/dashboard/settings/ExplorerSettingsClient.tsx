'use client'

import { useState } from 'react'
import Link from 'next/link'

const LAVENDER = '#9B8FFF'

interface Props {
  profile: {
    display_name: string
    city: string
    notification_preferences: { whatsapp: boolean; digest_frequency: 'daily' | 'weekly' | 'never' }
  }
  username: string
  authEmail: string
}

export default function ExplorerSettingsClient({ profile, username, authEmail }: Props) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const rowStyle: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 0', borderBottom: '1px solid rgba(155,143,255,0.10)',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 700, color: '#9896B0',
    fontFamily: 'var(--font-jetbrains-mono)',
    letterSpacing: '0.1em', textTransform: 'uppercase',
  }
  const valueStyle: React.CSSProperties = {
    fontSize: 14, color: '#F0EFF8',
    fontFamily: 'var(--font-dm-sans)',
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 24px 80px' }}>
      <h1 style={{ fontFamily: 'var(--font-outfit)', fontSize: 24, fontWeight: 900, color: '#F0EFF8', marginBottom: 8 }}>
        Settings
      </h1>
      <p style={{ fontSize: 13, color: '#9896B0', marginBottom: 32 }}>
        Account and notification settings.
      </p>

      {/* Account section */}
      <div style={{
        background: '#131317', border: '1px solid rgba(155,143,255,0.15)',
        padding: '0 20px', marginBottom: 24,
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: LAVENDER, letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'var(--font-jetbrains-mono)', padding: '14px 0 10px', borderBottom: '1px solid rgba(155,143,255,0.1)' }}>
          Account
        </div>

        <div style={rowStyle}>
          <span style={labelStyle}>Username</span>
          <span style={valueStyle}>@{username}</span>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>Display Name</span>
          <span style={valueStyle}>{profile.display_name}</span>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>City</span>
          <span style={valueStyle}>{profile.city}</span>
        </div>
        <div style={{ ...rowStyle, borderBottom: 'none' }}>
          <span style={labelStyle}>Email</span>
          <span style={valueStyle}>{authEmail || '—'}</span>
        </div>
      </div>

      {/* Notifications section */}
      <div style={{
        background: '#131317', border: '1px solid rgba(155,143,255,0.15)',
        padding: '0 20px', marginBottom: 24,
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: LAVENDER, letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'var(--font-jetbrains-mono)', padding: '14px 0 10px', borderBottom: '1px solid rgba(155,143,255,0.1)' }}>
          Notifications
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>WhatsApp</span>
          <span style={valueStyle}>{profile.notification_preferences?.whatsapp ? 'On' : 'Off'}</span>
        </div>
        <div style={{ ...rowStyle, borderBottom: 'none' }}>
          <span style={labelStyle}>Digest</span>
          <span style={{ ...valueStyle, textTransform: 'capitalize' }}>{profile.notification_preferences?.digest_frequency ?? 'Weekly'}</span>
        </div>
      </div>

      {/* Edit profile link */}
      <Link
        href="/explore/dashboard"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '10px 20px',
          border: `1px solid ${LAVENDER}`,
          color: LAVENDER,
          fontFamily: 'var(--font-jetbrains-mono)',
          fontSize: 10, fontWeight: 700,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          textDecoration: 'none',
          marginBottom: 40,
          transition: 'background 150ms',
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>edit</span>
        Edit Profile
      </Link>

      {/* Danger zone */}
      <div style={{
        background: '#131317',
        border: '1px solid rgba(244,114,182,0.2)',
        borderLeft: '3px solid rgba(244,114,182,0.5)',
        padding: '16px 20px',
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#F472B6', letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'var(--font-jetbrains-mono)', marginBottom: 10 }}>
          Danger Zone
        </div>
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              background: 'transparent', border: '1px solid rgba(244,114,182,0.4)',
              color: '#F472B6', cursor: 'pointer', padding: '8px 16px',
              fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10,
              letterSpacing: '0.1em', textTransform: 'uppercase',
            }}
          >
            Delete Account
          </button>
        ) : (
          <div>
            <p style={{ fontSize: 13, color: '#F0EFF8', marginBottom: 12 }}>
              Are you sure? This cannot be undone. Contact support to proceed.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  background: 'transparent', border: '1px solid rgba(155,143,255,0.3)',
                  color: '#9896B0', cursor: 'pointer', padding: '6px 14px',
                  fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10,
                  textTransform: 'uppercase', letterSpacing: '0.1em',
                }}
              >
                Cancel
              </button>
              <a
                href="mailto:support@wheninmycity.com?subject=Delete%20my%20account"
                style={{
                  display: 'inline-block',
                  background: 'rgba(244,114,182,0.15)',
                  border: '1px solid rgba(244,114,182,0.5)',
                  color: '#F472B6', padding: '6px 14px',
                  fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10,
                  textTransform: 'uppercase', letterSpacing: '0.1em',
                  textDecoration: 'none',
                }}
              >
                Contact Support
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
