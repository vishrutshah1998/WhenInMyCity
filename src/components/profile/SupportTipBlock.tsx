'use client'

import { useState } from 'react'

interface SupportTipBlockProps {
  message: string
  upiVpa: string
  presetAmountsPaise: number[]
  thankYouMessage: string
  creatorName: string
}

export default function SupportTipBlock({ message, upiVpa, presetAmountsPaise, thankYouMessage, creatorName }: SupportTipBlockProps) {
  const [tipped, setTipped] = useState(false)

  function handleTip(amountPaise: number) {
    const amountRupees = amountPaise / 100
    const encoded = encodeURIComponent
    const upiUrl = `upi://pay?pa=${encoded(upiVpa)}&pn=${encoded(creatorName)}&am=${amountRupees.toFixed(2)}&cu=INR&tn=${encoded('Support via WIMC')}`
    window.location.href = upiUrl
    setTimeout(() => setTipped(true), 800)
  }

  if (tipped) {
    return (
      <section className="card-surface bg-surface-container-high rounded-2xl p-6 flex flex-col items-center gap-3 text-center">
        <span className="text-3xl">🙏</span>
        <p className="font-semibold text-on-surface">{thankYouMessage}</p>
      </section>
    )
  }

  return (
    <section className="card-surface bg-surface-container-high rounded-2xl p-6 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
          favorite
        </span>
        <p className="text-sm text-on-surface leading-snug">{message}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {presetAmountsPaise.map((paise) => {
          const rupees = paise / 100
          return (
            <button
              key={paise}
              onClick={() => handleTip(paise)}
              className="flex-1 min-w-[72px] py-3 px-2 rounded-xl bg-primary-container text-on-primary-container font-bold text-sm hover:opacity-90 active:scale-[0.97] transition-all"
            >
              ₹{rupees % 1 === 0 ? rupees.toFixed(0) : rupees.toFixed(2)}
            </button>
          )
        })}
      </div>

      <p className="text-center text-[11px] text-on-surface-variant">
        Powered by UPI · Opens your payment app
      </p>
    </section>
  )
}
