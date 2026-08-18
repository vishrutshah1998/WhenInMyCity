'use client'

import Link from 'next/link'
import type { WorkspaceLink } from '@/lib/constants/bottomNavConfigs'

// Extracted from ExplorerProfileHubClient's original inline "Switch Workspace"
// block so Creator's profile hub can reuse it instead of hand-rolling a third
// copy. Per-workspace coloring (ws.color) is data-driven via WorkspaceLink;
// only the section label and trailing arrow read from the caller's own page
// theme, since Explorer's hub is a dark theme and Creator's is a light
// cream/paper theme.

interface Props {
  workspaces:  WorkspaceLink[]
  accentColor: string
  mutedColor:  string
}

export default function WorkspaceSwitcherList({ workspaces, accentColor, mutedColor }: Props) {
  if (workspaces.length === 0) return null

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{
        fontFamily: 'var(--font-jetbrains-mono)',
        fontSize: 10, fontWeight: 700,
        color: accentColor, letterSpacing: '0.2em', textTransform: 'uppercase',
        marginBottom: 14,
      }}>
        Switch Workspace
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {workspaces.map(ws => (
          <Link
            key={ws.href}
            href={ws.href}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '11px 14px', textDecoration: 'none',
              border: `1px solid ${ws.color}33`,
              background: `${ws.color}0D`,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: ws.color, flexShrink: 0 }}>
              {ws.icon}
            </span>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: ws.color, fontFamily: 'var(--font-dm-sans)' }}>
              {ws.label}
            </span>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: mutedColor, flexShrink: 0 }}>
              arrow_forward
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
