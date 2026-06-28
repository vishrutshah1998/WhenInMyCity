'use client'

interface PushpinProps {
  color?: string
  className?: string
  size?: number       // head diameter in px (alias for pinSize)
  pinSize?: number    // kept for backward compat
  bodyHeight?: number
}

export default function Pushpin({
  color = '#5DD9D0',
  className = '',
  size,
  pinSize = 14,
  bodyHeight,
}: PushpinProps) {
  const headSize = size ?? pinSize
  const stemHeight = bodyHeight ?? Math.round(headSize * 0.6)
  const stemWidth = Math.max(2, Math.round(headSize * 0.14))

  return (
    <div className={`absolute z-10 flex flex-col items-center ${className}`}>
      <div
        style={{
          width: headSize,
          height: headSize,
          borderRadius: '50%',
          backgroundColor: color,
          border: '1.5px solid rgba(0,0,0,0.15)',
          boxShadow: `0 2px 4px rgba(0,0,0,0.25), inset 0 1px 2px rgba(255,255,255,0.3)`,
          flexShrink: 0,
        }}
      />
      <div
        style={{
          width: stemWidth,
          height: stemHeight,
          backgroundColor: 'rgba(0,0,0,0.35)',
          marginTop: -1,
          borderRadius: `0 0 ${stemWidth}px ${stemWidth}px`,
        }}
      />
    </div>
  )
}
