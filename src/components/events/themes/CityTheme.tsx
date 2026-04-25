import React from 'react'

export function CityTheme() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#1A0800',
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
        {/* Geometric background pattern (diamonds/triangles) */}
        <defs>
          <pattern id="city-grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <polygon points="20,0 40,20 20,40 0,20" fill="none" stroke="#E8572A" strokeWidth="0.5" opacity="0.3" />
          </pattern>
          <linearGradient id="city-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#E8572A" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#F5A623" stopOpacity="0.1"  />
          </linearGradient>
        </defs>

        {/* Pattern fill — upper 70% */}
        <rect width="400" height="280" fill="url(#city-grid)" />
        <rect width="400" height="280" fill="url(#city-sky)"  />

        {/* Accent circles — warm amber dots scattered in pattern */}
        {[
          [20,20],[60,20],[100,20],[140,20],[180,20],[220,20],[260,20],[300,20],[340,20],[380,20],
          [40,60],[80,60],[160,60],[240,60],[320,60],
          [20,100],[100,100],[180,100],[260,100],[340,100],
        ].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="3" fill="#F5A623" opacity="0.5" />
        ))}

        {/* Cityscape silhouette — bottom 35% */}
        <g fill="#E8572A" opacity="0.9">
          {/* Building 1 */}
          <rect x="0"   y="310" width="45"  height="90" />
          <rect x="12"  y="285" width="22"  height="25" />
          {/* Building 2 */}
          <rect x="50"  y="320" width="35"  height="80" />
          {/* Building 3 — tall */}
          <rect x="90"  y="250" width="30"  height="150" />
          <rect x="98"  y="235" width="14"  height="15" />
          {/* Antenna */}
          <line x1="105" y1="235" x2="105" y2="215" stroke="#E8572A" strokeWidth="3" />
          {/* Building 4 */}
          <rect x="125" y="290" width="50"  height="110" />
          <rect x="135" y="275" width="30"  height="15" />
          {/* Building 5 */}
          <rect x="180" y="305" width="40"  height="95" />
          {/* Building 6 — tall center */}
          <rect x="225" y="240" width="55"  height="160" />
          <rect x="238" y="225" width="28"  height="15" />
          <line x1="252" y1="225" x2="252" y2="200" stroke="#F5A623" strokeWidth="3" />
          <circle cx="252" cy="198" r="4" fill="#F5A623" opacity="0.8" />
          {/* Building 7 */}
          <rect x="285" y="300" width="40"  height="100" />
          {/* Building 8 */}
          <rect x="330" y="275" width="35"  height="125" />
          <rect x="338" y="260" width="20"  height="15" />
          {/* Building 9 */}
          <rect x="370" y="315" width="30"  height="85" />
        </g>

        {/* Ground */}
        <rect x="0" y="390" width="400" height="10" fill="#F5A623" opacity="0.4" />

        {/* Window lights */}
        <g fill="#FDFAF6" opacity="0.6">
          <rect x="97"  y="260" width="4" height="5" />
          <rect x="106" y="260" width="4" height="5" />
          <rect x="97"  y="272" width="4" height="5" />
          <rect x="235" y="252" width="4" height="5" />
          <rect x="245" y="252" width="4" height="5" />
          <rect x="255" y="252" width="4" height="5" />
          <rect x="235" y="264" width="4" height="5" />
          <rect x="255" y="264" width="4" height="5" />
          <rect x="335" y="280" width="4" height="5" />
          <rect x="345" y="280" width="4" height="5" />
          <rect x="335" y="292" width="4" height="5" />
          <rect x="130" y="282" width="4" height="5" />
          <rect x="142" y="282" width="4" height="5" />
          <rect x="155" y="282" width="4" height="5" />
        </g>
      </svg>
    </div>
  )
}

export const CitySwatch: React.CSSProperties = {
  background: 'linear-gradient(135deg, #E8572A 0%, #F5A623 60%, #1A0800 100%)',
  borderRadius: 4,
}
