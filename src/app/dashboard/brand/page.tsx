import { redirect } from 'next/navigation'

// Brand dashboard moved to /business/brand — outside the creator layout.
export default function OldBrandDashboardPage() {
  redirect('/business/brand/dashboard')
}
