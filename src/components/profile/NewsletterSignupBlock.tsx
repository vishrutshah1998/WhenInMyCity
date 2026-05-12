'use client'

import { useState, type FormEvent } from 'react'
import { subscribeToMakerNewsletter } from '@/app/actions/newsletter'

interface NewsletterSignupConfig {
  label: string
  placeholder: string
  button_label: string
  success_message: string
}

interface NewsletterSignupBlockProps {
  blockId: string
  profileId: string
  config: NewsletterSignupConfig
}

export default function NewsletterSignupBlock({ blockId, profileId, config }: NewsletterSignupBlockProps) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')
    const { error } = await subscribeToMakerNewsletter(profileId, email.trim(), blockId)
    if (error) {
      setStatus('error')
      setErrorMsg(error)
    } else {
      setStatus('success')
    }
  }

  if (status === 'success') {
    return (
      <section className="card-surface bg-surface-container-high rounded-2xl p-6 flex flex-col items-center gap-3 text-center">
        <span className="material-symbols-outlined text-primary text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
          mark_email_read
        </span>
        <p className="font-semibold text-on-surface">{config.success_message}</p>
      </section>
    )
  }

  return (
    <section className="card-surface bg-surface-container-high rounded-2xl p-6 flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
          mail
        </span>
        <h3 className="font-headline font-bold text-lg text-on-surface">{config.label}</h3>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); if (status === 'error') setStatus('idle') }}
          placeholder={config.placeholder}
          required
          disabled={status === 'loading'}
          className="w-full px-4 py-3 rounded-xl bg-surface-container-highest text-on-surface placeholder:text-on-surface-variant text-sm border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
        />

        {status === 'error' && (
          <p className="text-error text-xs px-1">{errorMsg}</p>
        )}

        <button
          type="submit"
          disabled={status === 'loading' || !email.trim()}
          className="w-full py-3 rounded-xl bg-primary text-on-primary font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === 'loading' ? 'Subscribing…' : config.button_label}
        </button>
      </form>
    </section>
  )
}
