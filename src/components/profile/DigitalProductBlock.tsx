'use client'

import { useState } from 'react'
import Image from 'next/image'
import { initiateDigitalPurchase, confirmDigitalPurchase } from '@/app/actions/digital'

// Declare window.Razorpay for TypeScript
declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open(): void
      on(event: string, cb: () => void): void
    }
  }
}

interface DigitalProductBlockProps {
  blockId:        string
  title:          string
  description?:   string
  pricePaise:     number
  coverImageUrl?: string
  accent:         string
}

function formatPrice(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN')}`
}

async function loadRazorpay(): Promise<void> {
  if (window.Razorpay) return
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload  = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Razorpay'))
    document.head.appendChild(script)
  })
}

export default function DigitalProductBlock({
  blockId, title, description, pricePaise, coverImageUrl, accent,
}: DigitalProductBlockProps) {
  const [state,  setState]  = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error,  setError]  = useState<string | null>(null)
  const [fileUrl, setFileUrl] = useState<string | null>(null)

  async function handleBuy() {
    setState('loading')
    setError(null)

    const result = await initiateDigitalPurchase({ blockId })
    if ('error' in result) {
      setState('error')
      setError(result.error)
      return
    }

    try {
      await loadRazorpay()
    } catch {
      setState('error')
      setError('Could not load payment widget. Please try again.')
      return
    }

    const rzp = new window.Razorpay({
      key:         process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? '',
      amount:      result.amount,
      currency:    'INR',
      name:        'When In My City',
      description: result.title,
      order_id:    result.razorpayOrderId,
      image:       result.coverImageUrl ?? undefined,
      theme:       { color: accent },
      modal:       { backdropclose: false, escape: false },
      handler: async (response: {
        razorpay_order_id: string
        razorpay_payment_id: string
        razorpay_signature: string
      }) => {
        const confirm = await confirmDigitalPurchase({
          purchaseId:        result.purchaseId,
          razorpayOrderId:   response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        })
        if ('error' in confirm) {
          setState('error')
          setError(confirm.error)
        } else {
          setFileUrl(confirm.fileUrl)
          setState('success')
        }
      },
    })
    rzp.on('payment.failed', () => {
      setState('error')
      setError('Payment failed. Please try again.')
    })
    rzp.open()
    setState('idle')
  }

  if (state === 'success' && fileUrl) {
    return (
      <section
        className="w-full rounded-2xl p-5 flex flex-col items-center gap-3 text-center"
        style={{ background: `${accent}12`, border: `1px solid ${accent}30` }}
      >
        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: accent }}>
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
        </div>
        <p className="font-bold text-sm" style={{ color: 'var(--pp-text)' }}>Purchase complete!</p>
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-5 py-2.5 rounded-xl text-sm font-bold text-white"
          style={{ background: accent }}
        >
          Download now
        </a>
      </section>
    )
  }

  return (
    <section
      className="w-full rounded-2xl overflow-hidden"
      style={{ background: 'var(--pp-surface)' }}
    >
      {coverImageUrl && (
        <div className="w-full aspect-[2/1] relative">
          <Image src={coverImageUrl} alt={title} fill className="object-cover" unoptimized />
        </div>
      )}
      <div className="p-5 flex flex-col gap-3">
        <div>
          <p className="font-bold text-sm" style={{ color: 'var(--pp-text)' }}>{title}</p>
          {description && (
            <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--pp-text-muted)' }}>{description}</p>
          )}
        </div>

        {state === 'error' && error && (
          <p className="text-xs text-red-400">{error}</p>
        )}

        <button
          onClick={handleBuy}
          disabled={state === 'loading'}
          className="w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.97] disabled:opacity-60"
          style={{ background: accent, color: '#fff' }}
        >
          {state === 'loading' ? 'Opening…' : `Buy · ${formatPrice(pricePaise)}`}
        </button>
        <p className="text-center text-[10px]" style={{ color: 'var(--pp-text-muted)' }}>
          Secure payment via Razorpay
        </p>
      </div>
    </section>
  )
}
