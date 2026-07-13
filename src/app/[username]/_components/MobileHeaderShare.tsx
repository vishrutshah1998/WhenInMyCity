'use client'

interface Props {
  displayName: string
  username:    string
  city:        string
}

export default function MobileHeaderShare({ displayName, username, city }: Props) {
  function handleShare() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      const citySlug = city.toLowerCase().replace(/\s+/g, '-')
      navigator.share({
        title: `${displayName} on WIMC`,
        url:   `https://wheninmycity.com/${citySlug}/${username}`,
      })
    }
  }

  return (
    <button
      onClick={handleShare}
      className="text-[#1A2744]/60 hover:text-ds-coral transition-colors"
    >
      <span className="material-symbols-outlined text-[20px]">share</span>
    </button>
  )
}
