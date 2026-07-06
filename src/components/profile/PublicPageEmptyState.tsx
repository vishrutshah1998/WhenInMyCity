import React from 'react'

interface PublicPageEmptyStateProps {
  displayName: string
  isOwner: boolean
  isPreview: boolean
  followSlot?: React.ReactNode
}

export default function PublicPageEmptyState({
  displayName,
  isOwner,
  isPreview,
  followSlot,
}: PublicPageEmptyStateProps) {
  const forOwner = isOwner || isPreview

  return (
    <section className="card-surface bg-surface-container-high rounded-2xl flex flex-col items-center gap-5 py-14 px-6 text-center border-2 border-dashed border-outline-variant">
      <span
        className="material-symbols-outlined text-5xl text-primary"
        style={{ fontVariationSettings: "'FILL' 0, 'wght' 200" }}
        aria-hidden="true"
      >
        {forOwner ? 'add_circle' : 'auto_awesome'}
      </span>
      <div className="flex flex-col gap-2 max-w-xs">
        <p className="font-display font-black text-xl text-on-surface leading-snug">
          {forOwner
            ? 'Your page is looking empty.'
            : `${displayName}’s page is just getting started.`}
        </p>
        <p className="font-mono text-xs text-on-surface/50 leading-relaxed">
          {forOwner
            ? 'Add your first block in the editor to bring it to life.'
            : 'Check back soon for events and updates.'}
        </p>
      </div>
      {!forOwner && followSlot && (
        <div className="mt-1">{followSlot}</div>
      )}
    </section>
  )
}
