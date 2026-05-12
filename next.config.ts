import type { NextConfig } from 'next'

// Extract the Supabase storage hostname so Next.js can optimise those images.
// Falls back to a wildcard Supabase pattern when the env var isn't set (CI / local).
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : '*.supabase.co'

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Only allow Server Actions from the canonical origin. Prevents cross-origin
      // script injection (e.g. from compromised CDN scripts on creator pages or
      // future subdomains) from invoking actions with a signed-in user's cookie.
      allowedOrigins: [
        'wheninmycity.com',
        'www.wheninmycity.com',
        process.env.NEXT_PUBLIC_APP_URL ?? '',
      ].filter(Boolean),
    },
  },
  images: {
    remotePatterns: [
      // YouTube video thumbnails used in youtube_embed blocks.
      { protocol: 'https', hostname: 'img.youtube.com' },
      // Supabase Storage — avatars, gallery images, event covers, adda covers.
      { protocol: 'https', hostname: supabaseHost },
      // Instagram CDN — thumbnails in instagram_embed blocks.
      { protocol: 'https', hostname: '*.cdninstagram.com' },
    ],
  },
}

export default nextConfig
