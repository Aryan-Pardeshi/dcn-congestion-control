import { useRef } from 'react'
import AnimFrame from './AnimFrame'
import useAnimLoop from './useAnimLoop'

const TOKENS = 8
const PACKETS = 6
const FONT = 'var(--font-mono)'
const PIPE_Y = 236
const GATE_X = 200

const tokenPos = (i) => ({ x: 156 + (i % 4) * 30, y: 118 - Math.floor(i / 4) * 30 })

/* Token bucket: violet tokens accrue steadily; packets leave only with a token. */
export default function TokenBucketAnim() {
  const svgRef = useRef(null)

  useAnimLoop(
    svgRef,
    (t) => {
      const svg = svgRef.current
      const tokenEls = svg.querySelectorAll('[data-token]')
      const packetEls = svg.querySelectorAll('[data-pkt]')
      const dripEls = svg.querySelectorAll('[data-drip]')
      const burst = svg.querySelector('[data-burst]')
      const gate = svg.querySelector('[data-gate]')
      const ph = t % 9
      const held =
        ph < 2.5
          ? Math.floor((ph / 2.5) * TOKENS)
          : ph < 4
            ? Math.max(0, TOKENS - Math.floor(((ph - 2.5) / 1.5) * TOKENS))
            : Math.min(TOKENS, Math.floor(((ph - 4) / 5) * TOKENS))
      tokenEls.forEach((el, i) => {
        el.setAttribute('opacity', i < held ? '1' : '0.14')
      })
      const fast = held >= 3
      const rate = fast ? 0.34 : 0.07
      packetEls.forEach((el, i) => {
        const p = (t * rate + i * 0.17) % 1
        el.setAttribute('cx', String(30 + p * 340))
        el.setAttribute('fill', fast ? 'var(--flow)' : 'var(--warn)')
        el.setAttribute('opacity', '1')
      })
      dripEls.forEach((el, i) => {
        const p = (t * 0.8 + i / dripEls.length) % 1
        el.setAttribute('cy', String(10 + p * 36))
        el.setAttribute('opacity', String(1 - p * 0.5))
      })
      gate.setAttribute('stroke', fast ? 'var(--ok)' : 'var(--warn)')
      burst.setAttribute('opacity', ph >= 2.5 && ph < 4 ? '1' : '0')
    },
    3.0,
  )

  return (
    <AnimFrame
      title="token-bucket.sim"
      legend={[
        { color: 'var(--token)', label: 'tokens' },
        { color: 'var(--flow)', label: 'packets passing' },
        { color: 'var(--warn)', label: 'packets waiting for a token' },
      ]}
      caption="Tokens arrive at rate r and are capped at C. A packet leaves only by spending a token, so saved tokens let a burst through at full speed."
    >
      <svg
        ref={svgRef}
        viewBox="0 0 400 290"
        role="img"
        aria-label="Token bucket animation: tokens accrue steadily, a burst of packets passes while tokens last, then packets wait"
      >
        {[0, 1, 2].map((i) => (
          <circle key={`d-${i}`} data-drip r="4" cx="222" cy="10" fill="var(--token)" />
        ))}
        <text x="238" y="30" fill="var(--ink)" fontSize="15" fontFamily={FONT}>r</text>
        <text x="254" y="30" fill="var(--ink-dim)" fontSize="13" fontFamily={FONT}>tokens per tick</text>
        <rect x="136" y="56" width="132" height="92" rx="6" fill="var(--bg-2)" stroke="var(--ink)" strokeWidth="2" />
        {Array.from({ length: TOKENS }).map((_, i) => {
          const { x, y } = tokenPos(i)
          return <circle key={`t-${i}`} data-token r="11" cx={x} cy={y} fill="var(--token)" opacity="1" />
        })}
        <text x="282" y="106" fill="var(--ink)" fontSize="15" fontFamily={FONT}>C</text>
        <text x="282" y="122" fill="var(--ink-dim)" fontSize="12" fontFamily={FONT}>capacity</text>
        {/* pipe + gate */}
        <line x1="14" y1={PIPE_Y} x2="386" y2={PIPE_Y} stroke="var(--line-strong)" strokeWidth="2" />
        <line x1={GATE_X} y1="150" x2={GATE_X} y2={PIPE_Y - 14} stroke="var(--ink-faint)" strokeWidth="1" strokeDasharray="3 3" />
        <line data-gate x1={GATE_X} y1={PIPE_Y - 16} x2={GATE_X} y2={PIPE_Y + 16} stroke="var(--ok)" strokeWidth="3" strokeLinecap="round" />
        {Array.from({ length: PACKETS }).map((_, i) => (
          <circle key={`p-${i}`} data-pkt r="7" cx={30} cy={PIPE_Y} fill="var(--flow)" stroke="var(--bg)" strokeWidth="1.5" />
        ))}
        <text x="16" y="196" fill="var(--ink-dim)" fontSize="13" fontFamily={FONT}>arriving packets</text>
        <text x="274" y="196" fill="var(--ink-dim)" fontSize="13" fontFamily={FONT}>sent</text>
        <text x={GATE_X + 10} y="266" fill="var(--ink-dim)" fontSize="12" fontFamily={FONT}>gate: 1 token per packet</text>
        <text data-burst x="16" y="282" fill="var(--token)" fontSize="14" fontFamily={FONT} opacity="0">burst passes on saved tokens</text>
      </svg>
    </AnimFrame>
  )
}
