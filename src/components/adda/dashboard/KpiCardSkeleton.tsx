// Shown inside <Suspense fallback> while KPI data is loading.
export default function KpiCardSkeleton() {
  return (
    <div style={{
      background: 'var(--venue-bg-surface)',
      border: '1px solid var(--venue-border-subtle)',
      borderRadius: 12,
      padding: '20px 20px 0',
      overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ width: 80, height: 11, background: 'var(--venue-bg-hover)', borderRadius: 4 }} />
        <div style={{ width: 40, height: 11, background: 'var(--venue-bg-hover)', borderRadius: 4 }} />
      </div>
      <div style={{ width: 120, height: 28, background: 'var(--venue-bg-hover)', borderRadius: 4, marginBottom: 8 }} />
      <div style={{ width: 60, height: 10, background: 'var(--venue-bg-hover)', borderRadius: 4, marginBottom: 16 }} />
      <div style={{ height: 64, background: 'var(--venue-bg-hover)', marginLeft: -20, marginRight: -20 }} />
    </div>
  )
}

export function KpiCardSkeletonRow() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <KpiCardSkeleton key={i} />
      ))}
    </div>
  )
}
