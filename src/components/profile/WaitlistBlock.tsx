'use client'

import { useState } from 'react'
import { joinWaitlist } from '@/app/actions/digital'

interface WaitlistBlockProps {
  blockId:      string
  label:        string
  description?: string
  accent:       string
  initialCount?: number
}

export default function WaitlistBlock({
  blockId, label, description, accent, initialCount = 0,
}: WaitlistBlockProps) {
  const [email,  setEmail]  = useState('')
  const [name,   setName]   = useState('')
  const [state,  setState]  = useState<'idle' | 'loading' | 'success' | 'already' | 'error'>('idle')
  const [error,  setError]  = useState<string | null>(null)
  const [count,  setCount]  = useState(initialCount)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setState('loading')
    setError(null)

    const result = await joinWaitlist({ blockId, email: email.trim(), name: name.trim() || undefined })

    if ('error' in result) {
      setState('error')
      setError(result.error)
      return
    }

    if (result.alreadyJoined) {
      setState('already')
    } else {
      setState('success')
      setCount(c => c + 1)
    }
  }

  if (state === 'success') {
    return (
      <section
        className="w-full rounded-2xl p-5 flex flex-col items-center gap-2 text-center"
        style={{ background: `${accent}10`, border: `1px solid ${accent}25` }}
      >
        <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: accent }}>
          <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 fill-white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
        </div>
        <p className="font-bold text-sm" style={{ color: 'var(--pp-text)' }}>{"You're on the list!"}</p>
        {count > 1 && (
          <p className="text-xs" style={{ color: 'var(--pp-text-muted)' }}>{count.toLocaleString('en-IN')} people ahead of you</p>
        )}
      </section>
    )
  }

  if (state === 'already') {
    return (
      <section
        className="w-full rounded-2xl p-5 text-center"
        style={{ background: 'var(--pp-surface)' }}
      >
        <p className="text-sm font-semibold" style={{ color: 'var(--pp-text-muted)' }}>
          {"You're already on this waitlist ✓"}
        </p>
      </section>
    )
  }

  return (
    <section
      className="w-full rounded-2xl p-5 flex flex-col gap-3"
      style={{ background: 'var(--pp-surface)' }}
    >
      <div>
        <p className="font-bold text-sm" style={{ color: 'var(--pp-text)' }}>{label}</p>
        {description && (
          <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--pp-text-muted)' }}>{description}</p>
        )}
        {count > 0 && (
          <p className="text-xs mt-1 font-semibold" style={{ color: accent }}>
            {count.toLocaleString('en-IN')} {count === 1 ? 'person' : 'people'} already joined
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your name (optional)"
          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
          style={{
            background: 'rgba(255,255,255,0.06)',
            color: 'var(--pp-text)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        />
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
          style={{
            background: 'rgba(255,255,255,0.06)',
            color: 'var(--pp-text)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        />
        {state === 'error' && error && (
          <p className="text-xs text-red-400">{error}</p>
        )}
        <button
          type="submit"
          disabled={state === 'loading' || !email.trim()}
          className="w-full py-2.5 rounded-xl text-sm font-bold transition-all active:scale-[0.97] disabled:opacity-60"
          style={{ background: accent, color: '#fff' }}
        >
          {state === 'loading' ? 'Joining…' : 'Join waitlist'}
        </button>
      </form>
    </section>
  )
}
