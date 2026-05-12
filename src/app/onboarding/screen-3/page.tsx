'use client'

import { useState, useTransition, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { WimcLogo } from '@/components/WimcLogo'
import { completeOnboarding, uploadOnboardingAvatar } from '@/app/actions/onboarding'
import { getCategoryColors, getCategoryConfig, CREATOR_CATEGORIES, EXPLORING_OPTION } from '@/lib/constants/categories'
import { recommendScheme, getValueAxis, VALUE_CALLOUT } from '@/lib/theme/hsv'
import type { ValueCluster } from '@/lib/theme/hsv'
import type { CreatorType } from '@/types/database'
import type { Screen1Data, Screen2Data } from '@/types/onboarding'
import { PLATFORM_REGISTRY } from '@/app/onboarding/platforms/page'

function normalizeUrl(url: string, platform: string): string {
  if (platform === 'whatsapp') return url
  if (url && !url.startsWith('http')) return `https://${url}`
  return url
}

function loadScreenData(): { s1: Screen1Data | null; s2: Screen2Data | null; platforms: string[] } {
  if (typeof window === 'undefined') return { s1: null, s2: null, platforms: [] }
  try {
    const s1 = JSON.parse(sessionStorage.getItem('wimc_s1') || 'null')
    const s2 = JSON.parse(sessionStorage.getItem('wimc_s2') || 'null')
    const platforms = JSON.parse(sessionStorage.getItem('wimc_platforms') || '[]')
    return { s1, s2, platforms: Array.isArray(platforms) ? platforms : [] }
  } catch {
    return { s1: null, s2: null, platforms: [] }
  }
}

// ── Theme scheme data (client-side) ──────────────────────────────────────────

type BackgroundStyle = 'solid' | 'pattern' | 'aurora'

interface SchemeData {
  bg: string
  surface: string
  primary: string
  text: string
  textMuted: string
  fontVar: string
  heavyBorders: boolean
  noiseBg: boolean
  backgroundStyle: BackgroundStyle
  light: boolean
  label: string
}

// SVG noise for grain texture overlay
const NOISE_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`

const FULL_SCHEME_DATA: Record<string, SchemeData> = {
  // Bold & Textured — all have archivo-black (3) + space-grotesk (steel), heavy ink treatment
  turmeric: { bg: '#1A1108', surface: '#2c1e0f', primary: '#F5A800', text: '#f7f2e8', textMuted: 'rgba(247,242,232,0.5)', fontVar: 'var(--font-archivo-black)', heavyBorders: true,  noiseBg: true,  backgroundStyle: 'solid',   light: false, label: 'Turmeric' },
  pista:    { bg: '#1A1108', surface: '#2c1e0f', primary: '#2D7A4F', text: '#f7f2e8', textMuted: 'rgba(247,242,232,0.5)', fontVar: 'var(--font-archivo-black)', heavyBorders: true,  noiseBg: true,  backgroundStyle: 'solid',   light: false, label: 'Pista' },
  gulaal:   { bg: '#1A1108', surface: '#2c1e0f', primary: '#E8342A', text: '#f7f2e8', textMuted: 'rgba(247,242,232,0.5)', fontVar: 'var(--font-archivo-black)', heavyBorders: false, noiseBg: true,  backgroundStyle: 'solid',   light: false, label: 'Gulaal' },
  steel:    { bg: '#14130E', surface: '#3d3d3d', primary: '#5B8DEF', text: '#e7e2d8', textMuted: 'rgba(231,226,216,0.5)', fontVar: 'var(--font-space-grotesk)', heavyBorders: true,  noiseBg: true,  backgroundStyle: 'solid',   light: false, label: 'Steel' },
  // Dark & Vivid — clean dark backgrounds, each with a distinct vivid accent
  default:  { bg: '#121212', surface: '#1e1e1e', primary: '#E8572A', text: '#f5f0e8', textMuted: 'rgba(245,240,232,0.5)', fontVar: 'var(--font-archivo-black)', heavyBorders: false, noiseBg: false, backgroundStyle: 'solid',   light: false, label: 'Ember' },
  indigo:   { bg: '#1A1108', surface: '#241a34', primary: '#818CF8', text: '#f7f2e8', textMuted: 'rgba(247,242,232,0.5)', fontVar: 'var(--font-archivo-black)', heavyBorders: false, noiseBg: true,  backgroundStyle: 'solid',   light: false, label: 'Indigo' },
  sienna:   { bg: '#1A1108', surface: '#321e0f', primary: '#C04A00', text: '#f7f2e8', textMuted: 'rgba(247,242,232,0.5)', fontVar: 'var(--font-inter)',          heavyBorders: false, noiseBg: false, backgroundStyle: 'solid',   light: false, label: 'Sienna' },
  forest:   { bg: '#0a1a14', surface: '#163a2c', primary: '#6EE7B7', text: '#d1fae5', textMuted: 'rgba(209,250,229,0.5)', fontVar: 'var(--font-playfair)',        heavyBorders: false, noiseBg: false, backgroundStyle: 'pattern', light: false, label: 'Forest' },
  // Atmospheric — aurora gradient glow, mixed fonts
  midnight: { bg: '#080812', surface: '#14143a', primary: '#818CF8', text: '#e8e8ff', textMuted: 'rgba(232,232,255,0.5)', fontVar: 'var(--font-inter)',          heavyBorders: false, noiseBg: false, backgroundStyle: 'aurora',  light: false, label: 'Midnight' },
  ocean:    { bg: '#071724', surface: '#0f2d45', primary: '#22D3EE', text: '#d0eeff', textMuted: 'rgba(208,238,255,0.5)', fontVar: 'var(--font-space-grotesk)',   heavyBorders: false, noiseBg: false, backgroundStyle: 'aurora',  light: false, label: 'Ocean' },
  neel:     { bg: '#0B1420', surface: '#162e4c', primary: '#F5A800', text: '#f7f2e8', textMuted: 'rgba(247,242,232,0.5)', fontVar: 'var(--font-archivo-black)',  heavyBorders: false, noiseBg: false, backgroundStyle: 'aurora',  light: false, label: 'Neel' },
  aurora:   { bg: '#0F0B1A', surface: '#1E1530', primary: '#D946EF', text: '#f5eeff', textMuted: 'rgba(245,238,255,0.5)', fontVar: 'var(--font-playfair)',        heavyBorders: false, noiseBg: false, backgroundStyle: 'aurora',  light: false, label: 'Aurora' },
  // Light & Natural — bright/pastel backgrounds, accessible and warm
  blush:      { bg: '#FFF1F3', surface: '#fce2e8', primary: '#E11D48', text: '#1c0714', textMuted: 'rgba(28,7,20,0.5)',     fontVar: 'var(--font-playfair)',        heavyBorders: false, noiseBg: false, backgroundStyle: 'solid',   light: true,  label: 'Blossom'    },
  sand:       { bg: '#FDFAF5', surface: '#ece4d2', primary: '#B45309', text: '#1c150a', textMuted: 'rgba(28,21,10,0.5)',    fontVar: 'var(--font-inter)',           heavyBorders: false, noiseBg: false, backgroundStyle: 'solid',   light: true,  label: 'Ivory'      },
  sage:       { bg: '#F4F7F2', surface: '#e5ede0', primary: '#3D7F53', text: '#1a2e1d', textMuted: 'rgba(26,46,29,0.5)',    fontVar: 'var(--font-inter)',           heavyBorders: false, noiseBg: false, backgroundStyle: 'solid',   light: true,  label: 'Sage'       },
  mint:       { bg: '#EFF9F6', surface: '#d5efea', primary: '#0C8B6B', text: '#0d2b24', textMuted: 'rgba(13,43,36,0.5)',    fontVar: 'var(--font-space-grotesk)',   heavyBorders: false, noiseBg: false, backgroundStyle: 'solid',   light: true,  label: 'Mint'       },
  // Six new HSV sampling points — filling blind spots in the coordinate space
  electric:   { bg: '#080C10', surface: '#0f1a22', primary: '#00E5FF', text: '#E0FAFF', textMuted: 'rgba(224,250,255,0.45)', fontVar: 'var(--font-space-grotesk)', heavyBorders: false, noiseBg: false, backgroundStyle: 'aurora',  light: false, label: 'Electric'   },
  velvet:     { bg: '#0C0508', surface: '#1c0a12', primary: '#8B2340', text: '#F5E8EC', textMuted: 'rgba(245,232,236,0.45)', fontVar: 'var(--font-playfair)',       heavyBorders: true,  noiseBg: true,  backgroundStyle: 'solid',   light: false, label: 'Velvet'     },
  nightforest:{ bg: '#060E08', surface: '#0d1e12', primary: '#7EC8A0', text: '#D4F5E2', textMuted: 'rgba(212,245,226,0.45)', fontVar: 'var(--font-playfair)',       heavyBorders: false, noiseBg: false, backgroundStyle: 'pattern', light: false, label: 'Nightforest'},
  parchment:  { bg: '#F7F3E9', surface: '#ede7d4', primary: '#4A3728', text: '#2E1F14', textMuted: 'rgba(46,31,20,0.45)',    fontVar: 'var(--font-inter)',           heavyBorders: false, noiseBg: false, backgroundStyle: 'solid',   light: true,  label: 'Parchment'  },
  gallery:    { bg: '#FAFAFA', surface: '#f0f0f0', primary: '#1A1A1A', text: '#0A0A0A', textMuted: 'rgba(10,10,10,0.4)',     fontVar: 'var(--font-inter)',           heavyBorders: false, noiseBg: false, backgroundStyle: 'solid',   light: true,  label: 'Gallery'    },
  terracotta: { bg: '#FAF0E6', surface: '#edd9c4', primary: '#C4552A', text: '#2C1A0E', textMuted: 'rgba(44,26,14,0.45)',    fontVar: 'var(--font-inter)',           heavyBorders: false, noiseBg: false, backgroundStyle: 'solid',   light: true,  label: 'Terracotta' },
}

// ── Platform SVG icons ────────────────────────────────────────────────────────
// viewBox="0 0 24 24", fill="currentColor" unless noted

const PLATFORM_SVG: Record<string, React.ReactElement> = {
  instagram: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17">
      <path d="M12 0C8.74 0 8.333.015 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.74 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.74 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  ),
  youtube: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17">
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  ),
  whatsapp: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  ),
  spotify: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
    </svg>
  ),
  soundcloud: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17">
      <path d="M11.56 8.87V17h8.76a2.74 2.74 0 000-5.48 2.75 2.75 0 00-.28.02 4.12 4.12 0 00-7.44-2.67M0 15.12a1.88 1.88 0 001.88 1.88 1.88 1.88 0 001.88-1.88V9.37a1.88 1.88 0 00-1.88-1.88A1.88 1.88 0 000 9.37v5.75M4.96 15.26a1.74 1.74 0 001.74 1.74 1.74 1.74 0 001.74-1.74V8.4a1.74 1.74 0 00-1.74-1.74A1.74 1.74 0 004.96 8.4v6.86M9.72 15.26a1.74 1.74 0 001.74 1.74V7.2a4.11 4.11 0 00-1.74.57v7.49z"/>
    </svg>
  ),
  twitter: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  ),
  linkedin: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  ),
  website: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="17" height="17">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
    </svg>
  ),
  telegram: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17">
      <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
    </svg>
  ),
  substack: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17">
      <path d="M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24L12 18.11 22.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z"/>
    </svg>
  ),
  behance: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17">
      <path d="M6.938 4.503c.702 0 1.34.06 1.92.188.577.13 1.07.33 1.485.61.41.28.733.65.96 1.12.225.47.34 1.05.34 1.73 0 .74-.17 1.36-.507 1.86-.338.5-.837.9-1.502 1.22.906.26 1.576.72 2.022 1.37.448.66.665 1.45.665 2.36 0 .75-.13 1.39-.41 1.93-.28.55-.67 1-1.16 1.35-.48.345-1.05.6-1.67.767-.61.165-1.252.254-1.91.254H0V4.51h6.938zm-.588 5.717c.624 0 1.138-.15 1.544-.462.403-.31.605-.792.605-1.447 0-.34-.06-.626-.18-.86-.117-.235-.28-.423-.49-.567-.21-.143-.456-.245-.734-.31a3.698 3.698 0 00-.906-.09H2.59v3.736zm.262 6.066c.35 0 .68-.034.99-.1.31-.067.586-.177.823-.337.24-.162.43-.373.574-.632.14-.26.21-.587.21-.98 0-.776-.21-1.33-.63-1.66-.42-.334-1.01-.5-1.76-.5H2.59v4.21zm10.82 1.2a4.44 4.44 0 003.327-1.334l-1.52-1.143c-.4.498-.98.748-1.75.748-.682 0-1.24-.19-1.66-.57-.42-.38-.665-.945-.73-1.69H22.3c.017-.22.028-.425.028-.625 0-.813-.144-1.543-.43-2.194a5.02 5.02 0 00-1.175-1.666 5.165 5.165 0 00-1.752-1.052 6.24 6.24 0 00-2.19-.37c-.82 0-1.583.137-2.29.412a5.473 5.473 0 00-1.826 1.17 5.42 5.42 0 00-1.21 1.82 6.44 6.44 0 00-.434 2.4c0 .884.14 1.69.43 2.41a5.357 5.357 0 001.21 1.81 5.26 5.26 0 001.826 1.14c.706.264 1.47.396 2.29.396zm2.27-6.53H14.44c.084-.676.33-1.21.74-1.6.41-.39.94-.585 1.6-.585.648 0 1.18.196 1.595.586.415.39.655.924.716 1.6zM16.06 5.52h4.51v1.39H16.06V5.52z"/>
    </svg>
  ),
  github: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
    </svg>
  ),
}

// ── Theme swatch card ─────────────────────────────────────────────────────────

function ThemeSwatch({
  scheme,
  isSelected,
  onSelect,
  selectionColor,
}: {
  scheme: string
  isSelected: boolean
  onSelect: () => void
  selectionColor: string
}) {
  const s = FULL_SCHEME_DATA[scheme]
  if (!s) return null

  const cardBorder = s.heavyBorders
    ? `2px solid ${s.primary}`
    : `1px solid ${s.light ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.1)'}`

  return (
    <button
      type="button"
      onClick={onSelect}
      className="relative flex-shrink-0 rounded-xl overflow-hidden transition-all duration-150 active:scale-95"
      style={{
        width: 72, height: 96,
        backgroundColor: s.bg,
        border: cardBorder,
        outline: isSelected ? `3px solid ${selectionColor}` : '2px solid transparent',
        outlineOffset: isSelected ? 2 : 0,
      }}
    >
      {/* Aurora glow */}
      {s.backgroundStyle === 'aurora' && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `radial-gradient(ellipse 90% 70% at 15% 15%, ${s.primary}50, transparent 70%)`,
        }} />
      )}
      {/* Dot pattern */}
      {s.backgroundStyle === 'pattern' && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.25,
          backgroundImage: `radial-gradient(circle, ${s.primary} 1px, transparent 1px)`,
          backgroundSize: '8px 8px',
        }} />
      )}
      {/* Noise grain */}
      {s.noiseBg && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.05,
          backgroundImage: NOISE_SVG, backgroundSize: '64px 64px',
        }} />
      )}

      {/* "Aa" font sample + mini accent bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 28,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5,
      }}>
        <span style={{
          fontFamily: s.fontVar,
          fontSize: 24,
          fontWeight: s.heavyBorders ? 900 : 700,
          color: s.text,
          lineHeight: 1,
          letterSpacing: s.heavyBorders ? '-1px' : '0px',
        }}>
          Aa
        </span>
        <div style={{
          width: 28, height: s.heavyBorders ? 3 : 2,
          borderRadius: s.heavyBorders ? 1 : 9999,
          backgroundColor: s.primary,
        }} />
      </div>

      {/* Bottom label strip */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 28,
        backgroundColor: s.primary,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{
          fontFamily: s.fontVar,
          fontSize: 8, fontWeight: 700, letterSpacing: '0.4px',
          color: s.light ? '#1a1a1a' : '#fff',
          textTransform: 'uppercase',
        }}>
          {s.label}
        </span>
      </div>

      {/* Selected check */}
      {isSelected && (
        <div style={{
          position: 'absolute', top: 5, right: 5,
          width: 16, height: 16, borderRadius: '50%',
          backgroundColor: selectionColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span className="material-symbols-outlined text-white" style={{ fontSize: 10, fontVariationSettings: "'wght' 700, 'FILL' 1" }}>check</span>
        </div>
      )}
    </button>
  )
}

// ── Live preview panel ────────────────────────────────────────────────────────

function ProfilePreview({
  displayName,
  username,
  bio,
  avatarPreview,
  categoryLabel,
  categoryColor,
  selectedPlatforms,
  colorScheme,
}: {
  displayName: string
  username: string
  bio: string
  avatarPreview: string | null
  categoryLabel: string
  categoryColor: string
  selectedPlatforms: string[]
  colorScheme: string
}) {
  const s = FULL_SCHEME_DATA[colorScheme] ?? FULL_SCHEME_DATA['default']

  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const cardBorder = s.heavyBorders
    ? `2px solid ${s.primary}50`
    : `1px solid ${s.light ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'}`

  return (
    <div style={{
      background: s.bg,
      borderRadius: 20,
      padding: '28px 20px',
      border: cardBorder,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 14, textAlign: 'center',
      position: 'sticky', top: 80,
      fontFamily: s.fontVar,
      overflow: 'hidden',
    }}>
      {/* Aurora bg effect */}
      {s.backgroundStyle === 'aurora' && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
          background: `radial-gradient(ellipse 70% 50% at 20% 0%, ${s.primary}30, transparent 70%)`,
        }} />
      )}
      {/* Pattern dots */}
      {s.backgroundStyle === 'pattern' && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.08,
          backgroundImage: `radial-gradient(circle, ${s.primary} 1px, transparent 1px)`,
          backgroundSize: '10px 10px',
        }} />
      )}
      {/* Noise grain */}
      {s.noiseBg && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.04,
          backgroundImage: NOISE_SVG, backgroundSize: '96px 96px',
        }} />
      )}

      {/* All content above overlays */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, width: '100%' }}>
        {/* Live preview label */}
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: s.textMuted, fontFamily: 'monospace' }}>
          Live Preview
        </div>

        {/* Avatar */}
        <div style={{
          width: 72, height: 72, borderRadius: '50%', overflow: 'hidden',
          background: `linear-gradient(135deg, ${s.primary}60, ${s.primary}20)`,
          display: 'grid', placeItems: 'center', flexShrink: 0,
          border: s.heavyBorders ? `3px solid ${s.primary}` : `3px solid ${s.primary}40`,
        }}>
          {avatarPreview ? (
            <Image src={avatarPreview} alt="Avatar" width={72} height={72} style={{ width: '100%', height: '100%', objectFit: 'cover' }} unoptimized />
          ) : (
            <span style={{ fontSize: 22, fontWeight: 700, color: s.primary }}>{initials || '?'}</span>
          )}
        </div>

        {/* Name + handle */}
        <div>
          <div style={{ fontWeight: 800, fontSize: 17, color: s.text, lineHeight: 1.2, fontFamily: s.fontVar }}>
            {displayName || 'Your Name'}
          </div>
          <div style={{ fontSize: 12, color: s.textMuted, marginTop: 3, fontFamily: 'monospace' }}>
            @{username || 'yourname'}
          </div>
          {categoryLabel && (
            <span style={{
              display: 'inline-block', marginTop: 8,
              padding: '3px 10px',
              borderRadius: s.heavyBorders ? 4 : 9999,
              fontSize: 11, fontWeight: 600,
              background: `${categoryColor}20`, color: categoryColor,
              border: s.heavyBorders ? `1px solid ${categoryColor}60` : 'none',
              fontFamily: s.fontVar,
            }}>
              {categoryLabel}
            </span>
          )}
        </div>

        {/* Bio */}
        {bio ? (
          <p style={{ fontSize: 12, color: s.textMuted, lineHeight: 1.6, margin: 0, fontFamily: s.fontVar }}>
            {bio}
          </p>
        ) : (
          <p style={{ fontSize: 12, color: s.light ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>
            Your bio will appear here…
          </p>
        )}

        {/* Platform icon circles */}
        {selectedPlatforms.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {selectedPlatforms.slice(0, 7).map((id) => {
              const p = PLATFORM_REGISTRY.find((pr) => pr.id === id)
              if (!p) return null
              const icon = PLATFORM_SVG[id]
              return (
                <div
                  key={id}
                  title={p.label}
                  style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: `${p.color}22`,
                    border: `1.5px solid ${p.color}50`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: p.color, flexShrink: 0,
                  }}
                >
                  {icon ?? <span style={{ fontSize: 14 }}>{p.emoji}</span>}
                </div>
              )
            })}
          </div>
        )}

        {/* URL */}
        <div style={{ fontSize: 10, color: s.textMuted, fontFamily: 'monospace' }}>
          wheninmycity.com/{username || 'yourname'}
        </div>
      </div>
    </div>
  )
}

// ── Theme picker data ─────────────────────────────────────────────────────────

type StyleCategory = 'bold' | 'vivid' | 'atmospheric' | 'natural'

const STYLE_CATEGORIES: Record<StyleCategory, { label: string; tagline: string; schemes: string[] }> = {
  bold:        { label: 'Bold & Raw',       tagline: 'Ink grain, heavy type, raw energy — for creators who take up space',        schemes: ['turmeric', 'gulaal', 'steel', 'velvet', 'terracotta', 'pista'] },
  vivid:       { label: 'Dark & Electric',  tagline: 'Deep dark backgrounds with one charged accent — night-mode creators',        schemes: ['default', 'indigo', 'sienna', 'electric', 'nightforest', 'forest'] },
  atmospheric: { label: 'Atmospheric',      tagline: 'Aurora glow and gradient depth — for creators who want a cinematic feel',    schemes: ['midnight', 'ocean', 'neel', 'aurora', 'parchment'] },
  natural:     { label: 'Light & Natural',  tagline: 'Bright, airy, and easy — for creators whose world runs on daylight',        schemes: ['blush', 'sand', 'sage', 'mint', 'gallery'] },
}

const SCHEME_TO_CATEGORY: Record<string, StyleCategory> = {
  turmeric: 'bold', gulaal: 'bold', steel: 'bold', velvet: 'bold', terracotta: 'bold', pista: 'bold',
  default: 'vivid', indigo: 'vivid', sienna: 'vivid', electric: 'vivid', nightforest: 'vivid', forest: 'vivid',
  midnight: 'atmospheric', ocean: 'atmospheric', neel: 'atmospheric', aurora: 'atmospheric', parchment: 'atmospheric',
  blush: 'natural', sand: 'natural', sage: 'natural', mint: 'natural', gallery: 'natural',
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function Screen3Page() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [s1, setS1] = useState<Screen1Data | null>(null)
  const [s2, setS2] = useState<Screen2Data | null>(null)
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [bio, setBio] = useState('')
  const [socialInputs, setSocialInputs] = useState<Record<string, string>>({})
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [colorScheme, setColorScheme] = useState<string>('default')
  const [activeCategory, setActiveCategory] = useState<StyleCategory>('vivid')
  const [tabOrder, setTabOrder] = useState<StyleCategory[]>(['bold', 'vivid', 'atmospheric', 'natural'])
  const [recommendation, setRecommendation] = useState<{
    secondary?: string
    confidence: 'high' | 'medium'
    valueCluster: ValueCluster
  }>({ confidence: 'high', valueCluster: 'mixed' })
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const { s1: data1, s2: data2, platforms } = loadScreenData()
    if (!data1 || !data2) {
      router.replace('/onboarding/screen-1')
      return
    }
    setS1(data1)
    setS2(data2)
    setSelectedPlatforms(platforms)

    const persona = (() => {
      try { return sessionStorage.getItem('wimc_persona') ?? 'creator' } catch { return 'creator' }
    })()
    const interestTagIds: string[] = data2.interestTags ?? []

    const rec = recommendScheme(data1.creatorType, persona, interestTagIds)
    const { cluster } = getValueAxis(interestTagIds)

    const recommendedTab = SCHEME_TO_CATEGORY[rec.primary] ?? 'vivid'
    setColorScheme(rec.primary)
    setActiveCategory(recommendedTab)
    setRecommendation({ secondary: rec.secondary, confidence: rec.confidence, valueCluster: cluster })

    const defaultOrder: StyleCategory[] = ['bold', 'vivid', 'atmospheric', 'natural']
    const idx = defaultOrder.indexOf(recommendedTab)
    setTabOrder(idx > 0 ? [...defaultOrder.slice(idx), ...defaultOrder.slice(0, idx)] : defaultOrder)
  }, [router])

  useEffect(() => {
    return () => { if (avatarPreview) URL.revokeObjectURL(avatarPreview) }
  }, [avatarPreview])

  const colors = getCategoryColors(s1?.creatorType ?? null)

  const categoryConfig = s1?.creatorType && s1.creatorType !== 'exploring'
    ? getCategoryConfig(s1.creatorType as CreatorType)
    : null

  const categoryLabel = s1?.creatorType === 'exploring'
    ? EXPLORING_OPTION.label
    : CREATOR_CATEGORIES.find((c) => c.id === s1?.creatorType)?.label ?? ''

  const city = s2?.city ?? ''
  const rawBioSuggestion = categoryConfig?.bioSuggestion ?? ''
  const bioSuggestion = city
    ? rawBioSuggestion.replace(/\[city\]/g, city)
    : rawBioSuggestion
  const bioPlaceholder = bioSuggestion
    ? `e.g. ${bioSuggestion}`
    : city
      ? `e.g. Who are you and what do you create in ${city}?`
      : 'e.g. Who are you and what do you create?'

  const platformsToShow = selectedPlatforms.length > 0
    ? selectedPlatforms
        .map((id) => PLATFORM_REGISTRY.find((p) => p.id === id))
        .filter(Boolean) as typeof PLATFORM_REGISTRY
    : (categoryConfig?.suggestedPlatforms ?? [])

  function handleSocialInput(platform: string, value: string) {
    setSocialInputs((prev) => ({ ...prev, [platform]: value }))
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleSubmit = useCallback(() => {
    if (!s1 || !s2) return
    setError(null)

    startTransition(async () => {
      const socialLinks = Object.entries(socialInputs)
        .filter(([, url]) => url.trim().length > 0)
        .map(([platform, url]) => ({ platform, url: normalizeUrl(url.trim(), platform) }))

      const result = await completeOnboarding({
        displayName: s1.displayName,
        username: s1.username,
        creatorType: s1.creatorType,
        subTypes: s2.subTypes,
        city: s2.city,
        interestTags: s2.interestTags ?? [],
        bio: bio.trim() || undefined,
        socialLinks,
        colorScheme: colorScheme as Parameters<typeof completeOnboarding>[0]['colorScheme'],
      })

      if (result.error) { setError(result.error); return }

      if (avatarFile) {
        const fd = new FormData()
        fd.append('file', avatarFile)
        const { error: avatarErr } = await uploadOnboardingAvatar(fd)
        if (avatarErr) console.warn('[onboarding] avatar upload skipped:', avatarErr)
      }

      sessionStorage.removeItem('wimc_s1')
      sessionStorage.removeItem('wimc_s2')
      sessionStorage.removeItem('wimc_platforms')
      sessionStorage.removeItem('wimc_goal')

      router.push(
        `/onboarding/complete?username=${encodeURIComponent(result.username)}&name=${encodeURIComponent(s1.displayName)}`,
      )
    })
  }, [s1, s2, bio, socialInputs, avatarFile, colorScheme, router])

  if (!s1 || !s2) return null

  const hasNoSocialInput = platformsToShow.length > 0 && Object.values(socialInputs).every(v => !v.trim())

  return (
    <div className="flex flex-col min-h-screen bg-background text-on-surface font-body">
      {/* Ambient glow */}
      <div
        className="fixed inset-0 -z-10 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 50% 35% at 80% 0%, ${colors.secondary}60, transparent)` }}
      />

      {/* Header */}
      <header className="w-full flex items-center justify-between px-6 py-4 relative">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors active:scale-95"
        >
          <span className="material-symbols-outlined" style={{ color: colors.primary }}>arrow_back</span>
        </button>
        <span className="absolute left-1/2 -translate-x-1/2"><WimcLogo size="xs" /></span>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-32 bg-surface-container-high rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: '100%', backgroundColor: colors.primary }}
            />
          </div>
          <span className="text-xs text-on-surface-variant font-medium">4 / 4</span>
        </div>
      </header>

      {/* Two-column layout on desktop */}
      <div className="flex-1 px-6 pt-4 pb-44 w-full mx-auto" style={{ maxWidth: 900 }}>
        <div className="flex gap-10 items-start">

          {/* Left: form */}
          <div className="flex-1 min-w-0 space-y-10">
            {/* Heading */}
            <div>
              <p className="text-sm font-medium text-on-surface-variant mb-1">Almost done ✨</p>
              <h1 className="text-2xl font-headline font-extrabold text-on-surface tracking-tight">
                Add a photo and a quick bio.
              </h1>
              <p className="text-sm text-on-surface-variant mt-1">
                This is exactly how your public page will look.
              </p>
            </div>

            {/* Avatar upload */}
            <section className="flex items-center gap-5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="relative w-20 h-20 rounded-full overflow-hidden flex items-center justify-center bg-surface-container-high border-4 border-surface shrink-0 group transition-transform hover:scale-105 active:scale-95 shadow-sm"
              >
                {avatarPreview ? (
                  <Image src={avatarPreview} alt="Avatar" width={80} height={80} className="w-full h-full object-cover" unoptimized />
                ) : (
                  <span className="material-symbols-outlined text-3xl text-on-surface-variant" style={{ fontVariationSettings: "'FILL' 1" }}>photo_camera</span>
                )}
                <div
                  className="absolute bottom-0.5 right-0.5 w-7 h-7 rounded-full flex items-center justify-center border-2 border-background"
                  style={{ backgroundColor: colors.primary }}
                >
                  <span className="material-symbols-outlined text-white text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
                </div>
              </button>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} />
              <div>
                <p className="font-headline font-bold text-on-surface text-base">{s1.displayName}</p>
                <p className="text-sm text-on-surface-variant">@{s1.username}</p>
                {categoryLabel && (
                  <span
                    className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                    style={{ backgroundColor: `${colors.primary}20`, color: colors.primary }}
                  >
                    {categoryLabel}
                  </span>
                )}
              </div>
            </section>

            {/* Bio */}
            <section className="space-y-3">
              <label className="block text-base font-semibold text-on-surface" htmlFor="bio">
                Tell people who you are in 1–2 lines.
                <span className="text-sm font-normal text-on-surface-variant ml-2">(optional)</span>
              </label>
              <textarea
                id="bio"
                placeholder={bioPlaceholder}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={160}
                rows={3}
                className="w-full px-5 py-4 rounded-xl bg-surface-container-low border-2 border-transparent focus:border-primary/30 focus:bg-surface-container transition-all text-on-surface placeholder:text-on-surface-variant/40 outline-none resize-none text-sm"
              />
              <div className="flex items-center justify-between px-1">
                <p className="text-xs text-on-surface-variant/60">{bio.length}/160</p>
              </div>
              {bioSuggestion && !bio && (
                <button
                  type="button"
                  onClick={() => setBio(bioSuggestion)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors hover:bg-surface-container"
                  style={{ borderColor: `${colors.primary}40`, color: colors.primary }}
                >
                  <span className="material-symbols-outlined text-sm">auto_fix_high</span>
                  Try a suggestion
                </button>
              )}
            </section>

            {/* Theme picker */}
            <section className="space-y-4">
              <div>
                <p className="text-base font-semibold text-on-surface">Choose your page style</p>
                <p className="text-sm text-on-surface-variant mt-0.5">Color scheme, font, and layout — you can always change this later.</p>
              </div>

              {/* Style category tabs */}
              <div className="flex flex-wrap gap-2">
                {tabOrder.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 border"
                    style={{
                      backgroundColor: activeCategory === cat ? colors.primary : 'transparent',
                      borderColor: activeCategory === cat ? colors.primary : 'rgba(255,255,255,0.2)',
                      color: activeCategory === cat ? '#fff' : 'inherit',
                    }}
                  >
                    {STYLE_CATEGORIES[cat].label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-on-surface-variant -mt-1">{STYLE_CATEGORIES[activeCategory].tagline}</p>

              {/* Recommendation callout */}
              {recommendation.confidence === 'high' && (
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium"
                  style={{ backgroundColor: `${colors.primary}12`, color: colors.primary }}
                >
                  <span style={{ fontSize: 14 }}>✦</span>
                  <span>
                    <span className="font-bold">Picked for you · </span>
                    {FULL_SCHEME_DATA[colorScheme]?.label ?? colorScheme}
                    {recommendation.valueCluster !== 'mixed' && (
                      <span className="font-normal opacity-75"> — {VALUE_CALLOUT[recommendation.valueCluster]}</span>
                    )}
                  </span>
                </div>
              )}

              {/* Theme swatches */}
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
                {STYLE_CATEGORIES[activeCategory].schemes.map((scheme) => (
                  <ThemeSwatch
                    key={scheme}
                    scheme={scheme}
                    isSelected={colorScheme === scheme}
                    onSelect={() => setColorScheme(scheme)}
                    selectionColor={colors.primary}
                  />
                ))}
                {/* Secondary "alt" swatch when Hue and Value axes diverge */}
                {recommendation.confidence === 'medium' && recommendation.secondary &&
                  !STYLE_CATEGORIES[activeCategory].schemes.includes(recommendation.secondary) && (
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <span className="text-xs text-on-surface-variant opacity-60">alt →</span>
                    <ThemeSwatch
                      scheme={recommendation.secondary}
                      isSelected={colorScheme === recommendation.secondary}
                      onSelect={() => {
                        setColorScheme(recommendation.secondary!)
                        setActiveCategory(SCHEME_TO_CATEGORY[recommendation.secondary!] ?? 'vivid')
                      }}
                      selectionColor={colors.primary}
                    />
                  </div>
                )}
              </div>
            </section>

            {/* Social links from platform picker */}
            {platformsToShow.length > 0 && (
              <section className="space-y-4">
                <div>
                  <p className="text-base font-semibold text-on-surface">
                    Add your links
                    <span className="text-sm font-normal text-on-surface-variant ml-2">(optional)</span>
                  </p>
                  <p className="text-sm text-on-surface-variant mt-0.5">Skip for now — you can add these from your profile later.</p>
                </div>
                <div className="space-y-3">
                  {platformsToShow.map((p) => (
                    <div key={p.id}>
                      <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">
                        {p.label}
                      </label>
                      <input
                        type="text"
                        placeholder={p.placeholder}
                        value={socialInputs[p.id] ?? ''}
                        onChange={(e) => handleSocialInput(p.id, e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-surface-container-low border-2 border-transparent focus:border-primary/30 focus:bg-surface-container transition-all text-on-surface placeholder:text-on-surface-variant/40 outline-none text-sm"
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {error && <p className="text-error text-sm font-medium">{error}</p>}
          </div>

          {/* Right: live preview (desktop only) */}
          <div className="hidden lg:block w-72 shrink-0">
            <ProfilePreview
              displayName={s1.displayName}
              username={s1.username}
              bio={bio}
              avatarPreview={avatarPreview}
              categoryLabel={categoryLabel}
              categoryColor={colors.primary}
              selectedPlatforms={selectedPlatforms}
              colorScheme={colorScheme}
            />
          </div>
        </div>
      </div>

      {/* Fixed CTA */}
      <footer className="fixed bottom-0 left-0 w-full z-50 px-6 py-5 bg-background/90 backdrop-blur-sm border-t border-outline-variant/10">
        <div className="max-w-xl mx-auto">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="w-full py-4 px-6 font-headline font-bold rounded-xl shadow-lg active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed text-white"
            style={{ backgroundColor: colors.primary }}
          >
            {isPending ? 'Launching your page…' : 'Launch my page 🚀'}
          </button>
        </div>
      </footer>

      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
      <style>{`.material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }`}</style>
    </div>
  )
}
