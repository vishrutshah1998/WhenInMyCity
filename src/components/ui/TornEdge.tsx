interface TornEdgeProps {
  position?: 'top' | 'bottom'
  color?: string
  height?: number
  className?: string
}

export function TornEdge({
  position = 'top',
  color = '#F5ECD7',
  height = 14,
  className = '',
}: TornEdgeProps) {
  const peaks = Array.from({ length: 20 }, (_, i) => {
    const x = (i / 19) * 100
    const y = i % 2 === 0 ? 0 : 100
    return `${x}% ${y}%`
  })

  const clipPath =
    position === 'top'
      ? `polygon(0% 0%, ${peaks.join(', ')}, 100% 0%)`
      : `polygon(0% 100%, ${peaks
          .map((p) => {
            const [x, y] = p.split(' ')
            return `${x} ${100 - parseInt(y)}%`
          })
          .join(', ')}, 100% 100%)`

  return (
    <div
      className={`absolute inset-x-0 pointer-events-none z-10 ${className}`}
      style={{
        [position]: 0,
        height,
        backgroundColor: color,
        clipPath,
      }}
    />
  )
}
