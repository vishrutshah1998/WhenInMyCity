'use client'

interface RubberStampProps {
  text: string
  color?: string
  rotate?: number
  size?: number
  opacity?: number
  className?: string
  animate?: boolean
}

export default function RubberStamp({
  text,
  color = '#5DD9D0',
  rotate = -12,
  size = 48,
  opacity = 0.5,
  className = '',
  animate = false,
}: RubberStampProps) {
  const lines = text.split('\n')
  const fontSize = Math.max(6, size / 8)

  return (
    <div
      className={`flex items-center justify-center pointer-events-none select-none flex-shrink-0${animate ? ' rubber-stamp-animate' : ''}${className ? ' ' + className : ''}`}
      style={
        animate
          ? ({
              width: size,
              height: size,
              '--stamp-rotate': `${rotate}deg`,
              '--stamp-opacity': opacity,
            } as React.CSSProperties)
          : {
              width: size,
              height: size,
              transform: `rotate(${rotate}deg)`,
              opacity,
            }
      }
    >
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Outer ring */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: `2px dashed ${color}`,
            opacity: 0.8,
          }}
        />
        {/* Inner ring */}
        <div
          style={{
            position: 'absolute',
            inset: 4,
            borderRadius: '50%',
            border: `1px solid ${color}`,
            opacity: 0.4,
          }}
        />
        {/* Text */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            padding: '0 6px',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {lines.map((line, i) => (
            <span
              key={i}
              style={{
                fontFamily: 'var(--font-jetbrains-mono), monospace',
                fontSize,
                fontWeight: 700,
                color,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                lineHeight: 1.1,
                textAlign: 'center',
                whiteSpace: 'nowrap',
              }}
            >
              {line}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
