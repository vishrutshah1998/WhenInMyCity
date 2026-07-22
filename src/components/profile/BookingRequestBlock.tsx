'use client'

import { useState, type FormEvent } from 'react'
import { submitBookingInquiry } from '@/app/actions/booking'

interface BookingRequestBlockProps {
  blockId:         string
  creatorId:       string
  label:           string
  description?:    string
  categories:      string[]
  capacityStatus?: 'open' | 'closed' | 'waitlist'
}

const CAPACITY_BADGE: Record<'open' | 'closed' | 'waitlist', { label: string; className: string }> = {
  open:     { label: 'Open',     className: 'bg-primary/15 text-primary' },
  closed:   { label: 'Closed',   className: 'bg-error/15 text-error' },
  waitlist: { label: 'Waitlist', className: 'bg-tertiary/15 text-tertiary' },
}

export default function BookingRequestBlock({ blockId, creatorId, label, description, categories, capacityStatus }: BookingRequestBlockProps) {
  const [name,      setName]      = useState('')
  const [email,     setEmail]     = useState('')
  const [eventType, setEventType] = useState(categories[0] ?? '')
  const [message,   setMessage]   = useState('')
  const [status,    setStatus]    = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg,  setErrorMsg]  = useState('')

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (status === 'loading') return
    setStatus('loading')

    const result = await submitBookingInquiry({
      creatorId,
      blockId,
      requesterName:  name.trim(),
      requesterEmail: email.trim(),
      eventType:      eventType || undefined,
      message:        message.trim() || undefined,
    })

    if (result.success) {
      setStatus('success')
    } else {
      setStatus('error')
      setErrorMsg(result.error ?? 'Something went wrong.')
    }
  }

  if (status === 'success') {
    return (
      <section className="card-surface bg-surface-container-high rounded-2xl p-6 flex flex-col items-center gap-3 text-center">
        <span className="material-symbols-outlined text-primary text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
          check_circle
        </span>
        <p className="font-semibold text-on-surface">Inquiry sent! The creator will get back to you.</p>
      </section>
    )
  }

  const inputCls = 'w-full px-4 py-3 rounded-xl bg-surface-container-highest text-on-surface placeholder:text-on-surface-variant text-sm border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60'

  return (
    <section className="card-surface bg-surface-container-high rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-start justify-between gap-3">
          <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            event_available
          </span>
          {capacityStatus && (
            <span className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wide ${CAPACITY_BADGE[capacityStatus].className}`}>
              {CAPACITY_BADGE[capacityStatus].label}
            </span>
          )}
        </div>
        <h3 className="font-headline font-bold text-lg text-on-surface">{label}</h3>
        {description && <p className="text-xs text-on-surface-variant leading-relaxed">{description}</p>}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          required
          disabled={status === 'loading'}
          className={inputCls}
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          disabled={status === 'loading'}
          className={inputCls}
        />

        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                disabled={status === 'loading'}
                onClick={() => setEventType(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  eventType === cat
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-highest text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell me about your event (date, location, audience size…)"
          rows={3}
          disabled={status === 'loading'}
          className={`${inputCls} resize-none`}
        />

        {status === 'error' && (
          <p className="text-error text-xs px-1">{errorMsg}</p>
        )}

        <button
          type="submit"
          disabled={status === 'loading' || !name.trim() || !email.trim()}
          className="w-full py-3 rounded-xl bg-primary text-on-primary font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === 'loading' ? 'Sending…' : 'Send Inquiry'}
        </button>
      </form>
    </section>
  )
}
