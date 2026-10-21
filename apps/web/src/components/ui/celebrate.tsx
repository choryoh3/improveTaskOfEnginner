'use client'

import { useEffect, useState } from 'react'

const COLORS = [
  'var(--primary)',
  'var(--success)',
  'var(--warning)',
  'var(--info)',
  'var(--destructive)',
]
const PARTICLES = Array.from({ length: 28 }, (_, i) => {
  // 決定的に散らす(乱数を使うと SSR とクライアントで食い違う)
  const angle = (i / 28) * Math.PI * 2
  const distance = 70 + ((i * 37) % 60)
  return {
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance - 20,
    rotate: (i * 53) % 360,
    color: COLORS[i % COLORS.length]!,
    delay: (i % 5) * 20,
  }
})

/** 一定時間だけ紙吹雪を出す。`active` が false → true になるたびに再生する。 */
export function Celebrate({ active }: { active: boolean }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!active) return
    setVisible(true)
    const timer = setTimeout(() => setVisible(false), 1800)
    return () => clearTimeout(timer)
  }, [active])

  if (!visible) return null
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
    >
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="absolute size-2 rounded-sm"
          style={{
            backgroundColor: p.color,
            animation: `confetti 1.2s var(--ease-out-expo) ${p.delay}ms both`,
            ['--x' as string]: `${p.x}px`,
            ['--y' as string]: `${p.y}px`,
            ['--r' as string]: `${p.rotate}deg`,
          }}
        />
      ))}
    </div>
  )
}
