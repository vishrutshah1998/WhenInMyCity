'use client'

import { useState } from 'react'

interface Props {
  username: string
  city:     string
  variant?: 'strip' | 'sidebar' | 'floating'
  label?: string
}

export default function ZineShareButton({
  username,
  city,
  variant = 'sidebar',
  label = 'COPY LINK',
}: Props) {
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    const citySlug = city.toLowerCase().replace(/\s+/g, '-')
    const url = `https://wheninmycity.com/${citySlug}/${username}`

    // Try native share first (mobile — opens iOS/Android share sheet)
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `@${username} on When In My City`,
          text:  `Check out @${username}'s page on WIMC`,
          url,
        })
        return
      } catch {
        // User cancelled or browser blocked — fall through to clipboard
      }
    }

    // Clipboard fallback (desktop / older browsers)
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const el = document.createElement('textarea')
      el.value = url
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (variant === 'floating') {
    return (
      <button
        onClick={handleShare}
        title={copied ? 'Copied!' : 'Share this page'}
        className="fixed bottom-8 right-8 z-50 w-14 h-14 bg-[#E8705A] text-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center stamp-thump"
      >
        <span className="material-symbols-outlined text-[20px]">
          {copied ? 'check' : 'link'}
        </span>
      </button>
    )
  }

  if (variant === 'strip') {
    return (
      <button
        onClick={handleShare}
        className="bg-[#E8705A] text-white px-4 py-2 border border-black active:translate-y-[1px] transition-transform stamp-thump"
        style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
      >
        <span className="text-[10px] font-bold uppercase tracking-widest">
          {copied ? 'COPIED! ✓' : label}
        </span>
      </button>
    )
  }

  // sidebar variant
  return (
    <button
      onClick={handleShare}
      className="w-full bg-[#E8705A] text-white py-3 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-2 stamp-thump"
      style={{ fontFamily: 'var(--font-outfit, var(--font-syne))' }}
    >
      <span className="material-symbols-outlined text-[18px]">
        {copied ? 'check' : 'link'}
      </span>
      <span className="font-black text-[16px] uppercase">
        {copied ? 'COPIED!' : label}
      </span>
    </button>
  )
}
