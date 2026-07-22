import { WimcWordmark } from '@/components/WimcWordmark'

const CHALK = '#F7F2E8'
const INK   = '#1A1108'
const INK_2 = '#4A3F2F'

export default function MediaKitLocked({ displayName }: { displayName: string }) {
  return (
    <div style={{
      minHeight: '100vh', background: CHALK, color: INK,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 24, textAlign: 'center', fontFamily: 'var(--font-dm-sans), sans-serif',
    }}>
      <WimcWordmark color={INK} height={24} />
      <h1 style={{
        fontFamily: 'var(--font-syne), sans-serif', fontWeight: 700, fontSize: 22,
        marginTop: 32, marginBottom: 12, maxWidth: 440,
      }}>
        This media kit link isn&apos;t active right now
      </h1>
      <p style={{ fontSize: 14, color: INK_2, maxWidth: 420, lineHeight: 1.6 }}>
        {displayName}&apos;s account tier has changed since this link was shared, so the media kit
        is temporarily unavailable. The link will start working again automatically once the tier
        requirement is met.
      </p>
    </div>
  )
}
