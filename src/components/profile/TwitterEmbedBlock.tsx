'use client'

interface TwitterEmbedBlockProps {
  tweetUrl: string
  handle?:  string
  caption?: string
  accent:   string
}

export default function TwitterEmbedBlock({ tweetUrl, handle, caption, accent }: TwitterEmbedBlockProps) {
  return (
    <section>
      <a
        href={tweetUrl || '#'}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full rounded-2xl p-4 hover:opacity-90 active:scale-[0.98] transition-all"
        style={{
          background: 'var(--pp-surface)',
          border: `1px solid ${accent}22`,
        }}
        onClick={tweetUrl ? undefined : (e) => e.preventDefault()}
      >
        {/* Header row */}
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
            style={{ background: accent }}
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </div>
          {handle && (
            <span className="text-xs font-bold" style={{ color: accent }}>@{handle}</span>
          )}
          <span className="ml-auto text-[10px]" style={{ color: 'var(--pp-text-muted)' }}>
            Post on X
          </span>
        </div>

        {/* Caption or fallback */}
        {caption ? (
          <p className="text-sm leading-relaxed" style={{ color: 'var(--pp-text)' }}>{caption}</p>
        ) : (
          <p className="text-sm" style={{ color: 'var(--pp-text-muted)' }}>View this post on X →</p>
        )}
      </a>
    </section>
  )
}
