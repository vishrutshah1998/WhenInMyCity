import type { NextConfig } from 'next'

// Extract the Supabase storage hostname so Next.js can optimise those images.
// Falls back to a wildcard Supabase pattern when the env var isn't set (CI / local).
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : '*.supabase.co'

const nextConfig: NextConfig = {
  async redirects() {
    // Onboarding v1 → v2: old screen-N routes redirect to the new entry point.
    // Handles stale bookmarks, browser history, and any cached ?next= params.
    const oldScreens = [
      'screen-1', 'screen-2', 'screen-3', 'screen-4',
      'screen-5', 'screen-6', 'screen-7',
      'reveal', 'polish', 'complete',
    ]
    return oldScreens.map(slug => ({
      source:      `/onboarding/${slug}`,
      destination: '/onboarding',
      permanent:   false,
    }))
  },
  experimental: {
    serverActions: {
      // Only allow Server Actions from the canonical origin. Prevents cross-origin
      // script injection (e.g. from compromised CDN scripts on creator pages or
      // future subdomains) from invoking actions with a signed-in user's cookie.
      allowedOrigins: [
        'wheninmycity.com',
        'www.wheninmycity.com',
        process.env.NEXT_PUBLIC_APP_URL ?? '',
        // Dev-only: lets a phone on the same Wi-Fi hit the dev server via LAN IP
        // (e.g. http://192.168.1.11:3000) for on-device testing. Update the IP
        // below if it changes, or add more via a comma-separated
        // NEXT_PUBLIC_DEV_LAN_ORIGINS env var instead of editing this file.
        ...(process.env.NODE_ENV !== 'production'
          ? ['192.168.1.11:3000', ...(process.env.NEXT_PUBLIC_DEV_LAN_ORIGINS?.split(',') ?? [])]
          : []),
      ].filter(Boolean),
      // Server Actions default to a 1 MB body limit; onboarding avatar/logo
      // uploads (uploadOnboardingAvatar in src/app/actions/onboarding.ts) validate
      // up to 5 MB, so raise the limit here to match.
      bodySizeLimit: '5mb',
    },
  },
  images: {
    remotePatterns: [
      // YouTube video thumbnails used in youtube_embed blocks.
      { protocol: 'https', hostname: 'img.youtube.com' },
      // Supabase Storage — avatars, gallery images, event covers, venue covers.
      { protocol: 'https', hostname: supabaseHost },
      // Instagram CDN — thumbnails in instagram_embed blocks.
      { protocol: 'https', hostname: '*.cdninstagram.com' },
    ],
  },
}

export default nextConfig
