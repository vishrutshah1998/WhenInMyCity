'use client'

// Dynamically imported by KpiCard — never SSR'd (Recharts touches DOM on init).
import { LineChart, Line, ResponsiveContainer } from 'recharts'

interface Props { data: number[] }

export default function SparklineChart({ data }: Props) {
  const chartData = data.map((v, i) => ({ i, v }))
  return (
    <ResponsiveContainer width="100%" height={64}>
      <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
        <Line
          type="monotone"
          dataKey="v"
          stroke="var(--adda-amber)"
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
