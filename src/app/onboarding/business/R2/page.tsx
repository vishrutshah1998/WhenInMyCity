'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function R2Page() {
  const router = useRouter()
  useEffect(() => { router.replace('/onboarding/business/R3') }, [router])
  return null
}
