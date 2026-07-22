'use client'

import { useState } from 'react'
import Image from 'next/image'
import { initiateDigitalPurchase, confirmDigitalPurchase } from '@/app/actions/digital'

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open(): void
      on(event: string, cb: () => void): void
    }
  }
}

type ShopItem = {
  id: string
  image_url: string
  name: string
  link_type: 'external' | 'internal_product'
  external_url?: string
  price_display?: string
  internal_block_id?: string
}

type Product = { title: string; price_paise: number; cover_image_url?: string | null }

interface ShopTheLookBlockProps {
  title?:    string
  items:     ShopItem[]
  products:  Record<string, Product>
  accent:    string
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

export default function ShopTheLookBlock({ title, items, products, accent }: ShopTheLookBlockProps) {
  const [itemState, setItemState] = useState<Record<string, 'idle' | 'loading' | 'error'>>({})
  const [itemError, setItemError] = useState<Record<string, string>>({})

  const renderable = items.filter((item) => item.link_type === 'external' || (item.internal_block_id && products[item.internal_block_id]))
  if (!renderable.length) return null

  async function handleBuyInternal(blockId: string) {
    setItemState((prev) => ({ ...prev, [blockId]: 'loading' }))
    setItemError((prev) => ({ ...prev, [blockId]: '' }))

    const result = await initiateDigitalPurchase({ blockId })
    if ('error' in result) {
      setItemState((prev) => ({ ...prev, [blockId]: 'error' }))
      setItemError((prev) => ({ ...prev, [blockId]: result.error }))
      return
    }

    try {
      await loadRazorpay()
    } catch {
      setItemState((prev) => ({ ...prev, [blockId]: 'error' }))
      setItemError((prev) => ({ ...prev, [blockId]: 'Could not load payment widget. Please try again.' }))
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
          setItemState((prev) => ({ ...prev, [blockId]: 'error' }))
          setItemError((prev) => ({ ...prev, [blockId]: confirm.error }))
        } else {
          window.open(confirm.fileUrl, '_blank', 'noopener,noreferrer')
          setItemState((prev) => ({ ...prev, [blockId]: 'idle' }))
        }
      },
    })
    rzp.on('payment.failed', () => {
      setItemState((prev) => ({ ...prev, [blockId]: 'error' }))
      setItemError((prev) => ({ ...prev, [blockId]: 'Payment failed. Please try again.' }))
    })
    rzp.open()
    setItemState((prev) => ({ ...prev, [blockId]: 'idle' }))
  }

  return (
    <section className="w-full flex flex-col gap-3">
      {title && <p className="font-bold text-sm" style={{ color: 'var(--pp-text)' }}>{title}</p>}
      <div className="grid grid-cols-2 gap-3">
        {renderable.map((item) => {
          const isInternal = item.link_type === 'internal_product'
          const product = isInternal && item.internal_block_id ? products[item.internal_block_id] : undefined
          const priceLabel = isInternal ? (product ? formatPrice(product.price_paise) : undefined) : item.price_display
          const state = (item.internal_block_id && itemState[item.internal_block_id]) || 'idle'
          const error = item.internal_block_id ? itemError[item.internal_block_id] : undefined

          const card = (
            <div className="rounded-xl overflow-hidden" style={{ background: 'var(--pp-surface)' }}>
              <div className="w-full aspect-square relative bg-black/10">
                {item.image_url && <Image src={item.image_url} alt={item.name} fill className="object-cover" unoptimized />}
              </div>
              <div className="p-2.5 flex flex-col gap-0.5">
                <p className="text-xs font-bold truncate" style={{ color: 'var(--pp-text)' }}>{item.name}</p>
                {priceLabel && <p className="text-xs" style={{ color: accent }}>{priceLabel}</p>}
                {error && <p className="text-[10px] text-red-400 mt-0.5">{error}</p>}
              </div>
            </div>
          )

          if (isInternal) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => item.internal_block_id && handleBuyInternal(item.internal_block_id)}
                disabled={state === 'loading'}
                className="text-left active:scale-[0.98] transition-transform disabled:opacity-60"
              >
                {card}
              </button>
            )
          }

          return (
            <a key={item.id} href={item.external_url || '#'} target="_blank" rel="noopener noreferrer" className="active:scale-[0.98] transition-transform">
              {card}
            </a>
          )
        })}
      </div>
    </section>
  )
}
