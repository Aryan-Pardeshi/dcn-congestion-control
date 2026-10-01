import { useEffect, useRef } from 'react'

/* Leaky bucket: bursty inflow, constant-rate outflow, red spill on overflow. */
export default function LeakyBucketAnim() {
  const svgRef = useRef(null)

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return undefined
    const water = svg.querySelector('[data-water]')
    const inDrops = Array.from(svg.querySelectorAll('[data-in]'))
    const outDrops = Array.from(svg.querySelectorAll('[data-out]'))
    const spills = Array.from(svg.querySelectorAll('[data-spill]'))
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    let raf = 0
    let visible = true
    const io = new IntersectionObserver((es) => {
      visible = es[0].isIntersecting
    })
    io.observe(svg)

    const draw = (t) => {
      const level = Math.min(1, Math.max(0.08, 0.55 + 0.3 * Math.sin(t * 0.7) + 0.12 * Math.sin(t * 2.1 + 1)))
      const top = 168 - level * 100
      water.setAttribute('y', String(top))
      water.setAttribute('height', String(168 - top))
      const over = level > 0.86
      water.setAttribute('fill', over ? 'var(--drop)' : 'var(--flow)')
      water.setAttribute('fill-opacity', '0.55')
      const gate = 0.35 + 0.55 * (0.5 + 0.5 * Math.sin(t * 0.9))
      inDrops.forEach((d, i) => {
        const p = (t * 0.9 + i * 0.37) % 1
        const on = p < gate
        d.setAttribute('opacity', on ? '1' : '0')
        if (on) {
          d.setAttribute('cx', String(130 + ((i * 37) % 40)))
          d.setAttribute('cy', String(10 + (p / gate) * (top - 14)))
          d.setAttribute('fill', 'var(--flow)')
        }
      })
      outDrops.forEach((d, i) => {
        const p = (t * 1.1 + i / outDrops.length) % 1
        d.setAttribute('cy', String(184 + p * 26))
        d.setAttribute('opacity', '1')
      })
      spills.forEach((d, i) => {
        if (!over) {
          d.setAttribute('opacity', '0')
          return
        }
        const p = (t * 1.4 + i / spills.length) % 1
        const left = i % 2 === 0
        d.setAttribute('cx', String(left ? 88 - p * 10 : 212 + p * 10))
        d.setAttribute('cy', String(66 + p * 60))
        d.setAttribute('opacity', String(1 - p))
      })
    }

    if (mq.matches) {
      draw(3.4)
      return () => io.disconnect()
    }
    const start = performance.now()
    const frame = (now) => {
      if (visible) draw((now - start) / 1000)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
    }
  }, [])

  return (
    <svg ref={svgRef} viewBox="0 0 300 220" width="100%" role="img" aria-label="Leaky bucket animation: bursty packets fall in, a steady drip leaves the bottom, overflow spills red when full">
      <defs>
        <clipPath id="leaky-clip">
          <path d="M92 62 L208 62 L194 170 L106 170 Z" />
        </clipPath>
      </defs>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <circle key={`in-${i}`} data-in r="4" cx="150" cy="10" fill="var(--flow)" />
      ))}
      <path d="M92 62 L208 62 L194 170 L106 170 Z" fill="none" stroke="var(--ink)" strokeWidth="2" />
      <g clipPath="url(#leaky-clip)">
        <rect data-water x="88" y="110" width="124" height="60" fill="var(--flow)" fillOpacity="0.55" />
      </g>
      <line x1="92" y1="62" x2="208" y2="62" stroke="var(--ink-dim)" strokeWidth="1" strokeDasharray="4 3" />
      {/* capacity arrow B */}
      <line x1="222" y1="62" x2="222" y2="170" stroke="var(--ink-dim)" strokeWidth="1" />
      <line x1="218" y1="62" x2="226" y2="62" stroke="var(--ink-dim)" strokeWidth="1" />
      <line x1="218" y1="170" x2="226" y2="170" stroke="var(--ink-dim)" strokeWidth="1" />
      <text x="228" y="120" fill="var(--ink)" fontSize="11" fontFamily="var(--font-mono)">B</text>
      {/* outlet hole + rate label */}
      <rect x="143" y="170" width="14" height="6" fill="var(--ink)" />
      <text x="162" y="180" fill="var(--ink-dim)" fontSize="11" fontFamily="var(--font-mono)">r</text>
      {[0, 1, 2].map((i) => (
        <circle key={`out-${i}`} data-out r="3" cx="150" cy="184" fill="var(--flow)" />
      ))}
      {[0, 1, 2, 3].map((i) => (
        <circle key={`sp-${i}`} data-spill r="3.5" cx="88" cy="66" fill="var(--drop)" opacity="0" />
      ))}
      <text x="12" y="212" fill="var(--ink-dim)" fontSize="10" fontFamily="var(--font-mono)">bursty in, steady out; red spills = drops</text>
    </svg>
  )
}
