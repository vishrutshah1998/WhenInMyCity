import SkeletonCard from '@/components/ui/SkeletonCard'

// Shown inside <Suspense fallback> while KPI data is loading — mirrors
// KpiCard.tsx's real shape via the shared SkeletonCard (components/ui/),
// same one used for the page-level loading skeleton below.
export function KpiCardSkeletonRow() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonCard
          key={i}
          radius={18}
          accentColor="var(--venue-accent)"
          borderColor="var(--venue-border-subtle)"
          background="var(--venue-bg-surface)"
          fillColor="var(--venue-bg-hover)"
        />
      ))}
    </div>
  )
}
