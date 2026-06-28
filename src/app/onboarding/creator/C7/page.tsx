'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function C7Page() {
  const router = useRouter()
  useEffect(() => { router.replace('/onboarding/creator/C8') }, [router])
  return null
}
