import React from 'react'

export function BloomTheme() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#1A0A2E',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes wimc-bloom-pulse {
          0%,100% { transform: scale(1);    opacity: 0.85; }
          50%      { transform: scale(1.07); opacity: 1;    }
        }
      `}</style>
      <svg
        viewBox="0 0 400 400"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id="bloom-pink" cx="35%" cy="38%" r="50%">
            <stop offset="0%"   stopColor="#FF6B9D" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#FF6B9D" stopOpacity="0"   />
          </radialGradient>
          <radialGradient id="bloom-lavender" cx="65%" cy="60%" r="55%">
            <stop offset="0%"   stopColor="#C084FC" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#C084FC" stopOpacity="0"    />
          </radialGradient>
          <radialGradient id="bloom-white" cx="50%" cy="45%" r="25%">
            <stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0"    />
          </radialGradient>
        </defs>

        <ellipse
          cx="140" cy="152" rx="220" ry="200"
          fill="url(#bloom-pink)"
          style={{ animation: 'wimc-bloom-pulse 4s ease-in-out infinite', transformOrigin: '140px 152px' }}
        />
        <ellipse
          cx="260" cy="240" rx="210" ry="195"
          fill="url(#bloom-lavender)"
          style={{ animation: 'wimc-bloom-pulse 4s ease-in-out infinite', animationDelay: '-2s', transformOrigin: '260px 240px' }}
        />
        <ellipse
          cx="200" cy="180" rx="110" ry="100"
          fill="url(#bloom-white)"
        />
      </svg>
    </div>
  )
}

export const BloomSwatch: React.CSSProperties = {
  background: 'radial-gradient(circle at 40% 40%, #C084FC 0%, #1A0A2E 100%)',
  borderRadius: 4,
}
