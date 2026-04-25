import React from 'react'

export function DuskTheme() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(to bottom, #2D1B69 0%, #7B2D8B 35%, #C0392B 65%, #FF6B35 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <svg
        viewBox="0 0 400 400"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Horizon line */}
        <line x1="0" y1="295" x2="400" y2="295" stroke="rgba(255,200,120,0.5)" strokeWidth="1.5" />

        {/* Abstract sun — half circle sitting on horizon */}
        <defs>
          <radialGradient id="dusk-sun" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#FFE066" stopOpacity="1"   />
            <stop offset="60%"  stopColor="#FF9F45" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#FF6B35" stopOpacity="0"   />
          </radialGradient>
        </defs>
        <ellipse cx="200" cy="295" rx="70" ry="70" fill="url(#dusk-sun)" />

        {/* Reflection shimmer on lower ground */}
        <rect x="0" y="295" width="400" height="105" fill="rgba(255,107,53,0.08)" />
        <line x1="170" y1="295" x2="200" y2="400" stroke="rgba(255,200,80,0.2)"  strokeWidth="1" />
        <line x1="185" y1="295" x2="210" y2="400" stroke="rgba(255,200,80,0.15)" strokeWidth="1" />
        <line x1="200" y1="295" x2="220" y2="400" stroke="rgba(255,200,80,0.2)"  strokeWidth="1" />
        <line x1="215" y1="295" x2="230" y2="400" stroke="rgba(255,200,80,0.1)"  strokeWidth="1" />

        {/* Stars */}
        {[
          [60,  50],  [130, 30],  [270, 45],  [340, 25],
          [80,  110], [310, 90],  [370, 140], [40, 170],
          [200, 80],  [160, 150], [250, 120],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="1.5" fill="rgba(255,255,255,0.7)" />
        ))}
      </svg>
    </div>
  )
}

export const DuskSwatch: React.CSSProperties = {
  background: 'linear-gradient(to bottom, #2D1B69 0%, #FF6B35 100%)',
  borderRadius: 4,
}
