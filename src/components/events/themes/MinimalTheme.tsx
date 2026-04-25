const BLOBS = [
  { x: '8%',  y: '4%',  size: '46%', color: '#2A2A2A', delay: '0s',    dur: '8s'  },
  { x: '50%', y: '2%',  size: '44%', color: '#383838', delay: '-1.3s', dur: '9s'  },
  { x: '6%',  y: '36%', size: '42%', color: '#1E1E1E', delay: '-2.6s', dur: '10s' },
  { x: '52%', y: '34%', size: '46%', color: '#444444', delay: '-3.9s', dur: '8.5s'},
  { x: '10%', y: '58%', size: '44%', color: '#303030', delay: '-5.2s', dur: '9.5s'},
  { x: '48%', y: '60%', size: '42%', color: '#242424', delay: '-6.5s', dur: '7.5s'},
]

export function MinimalTheme() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#0F0F0F',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes wimc-blob {
          0%,100% { transform: translate(0,0) scale(1); }
          33%      { transform: translate(14px,-18px) scale(1.06); }
          66%      { transform: translate(-10px,10px) scale(0.95); }
        }
      `}</style>
      {BLOBS.map((b, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: b.x,
            top: b.y,
            width: b.size,
            height: b.size,
            borderRadius: '50%',
            background: b.color,
            filter: 'blur(40px)',
            animation: `wimc-blob ${b.dur} ease-in-out infinite`,
            animationDelay: b.delay,
          }}
        />
      ))}
    </div>
  )
}

export const MinimalSwatch: React.CSSProperties = {
  background: 'linear-gradient(135deg, #1E1E1E 0%, #444 100%)',
  borderRadius: 4,
}
