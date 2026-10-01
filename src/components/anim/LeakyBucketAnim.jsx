import { useRef } from 'react'
import AnimFrame from './AnimFrame'
import useAnimLoop from './useAnimLoop'

const RIM = 78
const BASE = 200
const FONT = 'var(--font-mono)'

/* Leaky bucket: bursty inflow, constant-rate outflow, red spill on overflow. */
export default function LeakyBucketAnim() {
  const svgRef = useRef(null)

  useAnimLoop(
    svgRef,
    (t) => {
      const svg = svgRef.current
      const water = svg.querySelector('[data-water]')
      const inDrops = svg.querySelectorAll('[data-in]')
      const outDrops = svg.querySelectorAll('[data-out]')
      const spills = svg.querySelectorAll('[data-spill]')
      const state = svg.querySelector('[data-state]')
      const level = Math.min(1, Math.max(0.08, 0.55 + 0.3 * Math.sin(t * 0.7) + 0.12 * Math.sin(t * 2.1 + 1)))
      const top = BASE - level * (BASE - RIM)
      water.setAttribute('y', String(top))
      water.setAttribute('height', String(BASE - top))
      const over = level > 0.86
      water.setAttribute('fill', over ? 'var(--drop)' : 'var(--flow)')
      state.textContent = over ? 'full: arrivals discarded' : 'draining at constant rate r'
      state.setAttribute('fill', over ? 'var(--drop)' : 'var(--ink-dim)')
      const gate = 0.35 + 0.55 * (0.5 + 0.5 * Math.sin(t * 0.9))
      inDrops.forEach((d, i) => {
        const p = (t * 0.9 + i * 0.37) % 1
        const on = p < gate
        d.setAttribute('opacity', on ? '1' : '0')
        if (on) {
          d.setAttribute('cx', String(176 + ((i * 37) % 48)))
          d.setAttribute('cy', String(26 + (p / gate) * (top - 30)))
        }
      })
      outDrops.forEach((d, i) => {
        const p = (t * 1.1 + i / outDrops.length) % 1
        d.setAttribute('cy', String(BASE + 14 + p * 34))
        d.setAttribute('opacity', String(1 - p * 0.6))
      })
      spills.forEach((d, i) => {
        if (!over) {
          d.setAttribute('opacity', '0')
          return
        }
        const p = (t * 1.4 + i / spills.length) % 1
        const left = i % 2 === 0
        d.setAttribute('cx', String(left ? 120 - p * 16 : 280 + p * 16))
        d.setAttribute('cy', String(RIM + 4 + p * 70))
        d.setAttribute('opacity', String(1 - p))
      })
    },
    3.4,
  )

  return (
    <AnimFrame
      title="leaky-bucket.sim"
      legend={[
        { color: 'var(--flow)', label: 'packets' },
        { color: 'var(--drop)', label: 'dropped on overflow' },
      ]}
      caption="Bursty arrivals fill the bucket of size B. The outlet leaks at a fixed rate r no matter how the input behaves."
    >
      <svg
        ref={svgRef}
        viewBox="0 0 400 290"
        role="img"
        aria-label="Leaky bucket animation: bursty packets fall in, a steady drip leaves the bottom, overflow spills red when full"
      >
        <defs>
          <clipPath id="leaky-clip">
            <path d={`M120 ${RIM} L280 ${RIM} L262 ${BASE} L138 ${BASE} Z`} />
          </clipPath>
        </defs>
        <text x="16" y="22" fill="var(--ink-dim)" fontSize="14" fontFamily={FONT}>bursty input</text>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <circle key={`in-${i}`} data-in r="5" cx="200" cy="26" fill="var(--flow)" />
        ))}
        <path d={`M120 ${RIM} L280 ${RIM} L262 ${BASE} L138 ${BASE} Z`} fill="var(--bg-2)" stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round" />
        <g clipPath="url(#leaky-clip)">
          <rect data-water x="110" y="140" width="180" height="60" fill="var(--flow)" fillOpacity="0.55" />
        </g>
        <path d={`M120 ${RIM} L280 ${RIM} L262 ${BASE} L138 ${BASE} Z`} fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round" />
        {/* capacity marker */}
        <line x1="302" y1={RIM} x2="302" y2={BASE} stroke="var(--ink-dim)" strokeWidth="1" />
        <line x1="297" y1={RIM} x2="307" y2={RIM} stroke="var(--ink-dim)" strokeWidth="1" />
        <line x1="297" y1={BASE} x2="307" y2={BASE} stroke="var(--ink-dim)" strokeWidth="1" />
        <text x="314" y="145" fill="var(--ink)" fontSize="15" fontFamily={FONT}>B</text>
        <text x="314" y="162" fill="var(--ink-dim)" fontSize="12" fontFamily={FONT}>size</text>
        {/* outlet */}
        <rect x="192" y={BASE} width="16" height="7" rx="1" fill="var(--ink)" />
        <text x="222" y={BASE + 34} fill="var(--ink)" fontSize="15" fontFamily={FONT}>r</text>
        <text x="238" y={BASE + 34} fill="var(--ink-dim)" fontSize="13" fontFamily={FONT}>steady output</text>
        {[0, 1, 2].map((i) => (
          <circle key={`out-${i}`} data-out r="3.6" cx="200" cy={BASE + 14} fill="var(--flow)" />
        ))}
        {[0, 1, 2, 3].map((i) => (
          <circle key={`sp-${i}`} data-spill r="4" cx="120" cy={RIM + 4} fill="var(--drop)" opacity="0" />
        ))}
        <text data-state x="16" y="280" fill="var(--ink-dim)" fontSize="14" fontFamily={FONT}>draining at constant rate r</text>
      </svg>
    </AnimFrame>
  )
}
