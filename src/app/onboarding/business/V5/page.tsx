'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function V5Page() {
  const router = useRouter()
  useEffect(() => { router.replace('/onboarding/business/V6') }, [router])
  return null
}
