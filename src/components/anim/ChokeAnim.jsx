import { useRef } from 'react'
import AnimFrame from './AnimFrame'
import useAnimLoop from './useAnimLoop'

const N = 8
const FONT = 'var(--font-mono)'
const LINE_Y = 100
const QTOP = 150
const QH = 96

/* Choke packet: queue crosses threshold, amber signal returns, source slows, queue drains. */
export default function ChokeAnim() {
  const svgRef = useRef(null)

  useAnimLoop(
    svgRef,
    (t) => {
      const svg = svgRef.current
      const pktEls = svg.querySelectorAll('[data-pkt]')
      const fill = svg.querySelector('[data-qfill]')
      const choke = svg.querySelector('[data-choke]')
      const chokeLabel = svg.querySelector('[data-chokelabel]')
      const srcState = svg.querySelector('[data-src-state]')
      const ph = t % 8
      const q = ph < 3 ? ph / 3 : ph < 5 ? 1 : Math.max(0, 1 - (ph - 5) / 3)
      const h = q * QH
      fill.setAttribute('y', String(QTOP + QH - h))
      fill.setAttribute('height', String(h))
      fill.setAttribute('fill', q > 0.62 ? 'var(--warn)' : 'var(--flow)')
      const slowed = ph >= 4 && ph < 7
      const rate = slowed ? 0.1 : 0.3
      pktEls.forEach((el, i) => {
        const p = (t * rate + i / N) % 1
        el.setAttribute('cx', String(84 + p * 232))
      })
      if (ph >= 3.4 && ph < 5.2) {
        const p = (ph - 3.4) / 1.8
        choke.setAttribute('opacity', '1')
        choke.setAttribute('cx', String(200 - p * 118))
        chokeLabel.setAttribute('opacity', '1')
        chokeLabel.setAttribute('x', String(200 - p * 118 + 10))
      } else {
        choke.setAttribute('opacity', '0')
        chokeLabel.setAttribute('opacity', '0')
      }
      srcState.textContent = slowed ? 'half rate' : 'full rate'
      srcState.setAttribute('fill', slowed ? 'var(--warn)' : 'var(--ink-dim)')
    },
    4.2,
  )

  return (
    <AnimFrame
      title="choke-packet.sim"
      legend={[
        { color: 'var(--flow)', label: 'data packets' },
        { color: 'var(--warn)', label: 'choke packet and queue above threshold' },
      ]}
      caption="When the router queue crosses the threshold it sends a choke packet back to the source. The source halves its rate and the queue drains."
    >
      <svg
        ref={svgRef}
        viewBox="0 0 400 290"
        role="img"
        aria-label="Choke packet animation: router queue fills past threshold, an amber choke packet returns to the source, the source slows and the queue drains"
      >
        <line x1="84" y1={LINE_Y} x2="316" y2={LINE_Y} stroke="var(--line-strong)" strokeWidth="2" />
        <line x1="200" y1={LINE_Y + 26} x2="82" y2={LINE_Y + 26} stroke="var(--warn)" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.6" />
        <rect x="14" y="72" width="70" height="56" rx="6" fill="var(--bg-2)" stroke="var(--ink)" strokeWidth="1.5" />
        <text x="49" y="105" fill="var(--ink)" fontSize="14" fontFamily={FONT} textAnchor="middle">Source</text>
        <text data-src-state x="49" y="150" fill="var(--ink-dim)" fontSize="13" fontFamily={FONT} textAnchor="middle">full rate</text>
        <rect x="165" y="72" width="70" height="56" rx="6" fill="var(--bg-2)" stroke="var(--ink)" strokeWidth="1.5" />
        <text x="200" y="105" fill="var(--ink)" fontSize="14" fontFamily={FONT} textAnchor="middle">Router</text>
        <rect x="316" y="72" width="70" height="56" rx="6" fill="var(--bg-2)" stroke="var(--ink)" strokeWidth="1.5" />
        <text x="351" y="105" fill="var(--ink)" fontSize="14" fontFamily={FONT} textAnchor="middle">Dest</text>
        {/* queue bar under the router */}
        <line x1="200" y1="128" x2="200" y2={QTOP} stroke="var(--line-strong)" strokeWidth="1.5" />
        <rect x="184" y={QTOP} width="32" height={QH} rx="3" fill="none" stroke="var(--ink-dim)" strokeWidth="1.2" />
        <rect data-qfill x="185" y={QTOP + QH} width="30" height="0" fill="var(--flow)" />
        <line x1="178" y1={QTOP + QH * 0.38} x2="224" y2={QTOP + QH * 0.38} stroke="var(--warn)" strokeWidth="1.6" strokeDasharray="4 3" />
        <text x="232" y={QTOP + QH * 0.38 + 4} fill="var(--warn)" fontSize="13" fontFamily={FONT}>threshold</text>
        <text x="232" y={QTOP + QH - 2} fill="var(--ink-dim)" fontSize="13" fontFamily={FONT}>queue</text>
        {Array.from({ length: N }).map((_, i) => (
          <circle key={i} data-pkt r="5.5" cx="84" cy={LINE_Y} fill="var(--flow)" />
        ))}
        <circle data-choke r="7" cx="200" cy={LINE_Y + 26} fill="var(--warn)" opacity="0" />
        <text data-chokelabel x="210" y={LINE_Y + 48} fill="var(--warn)" fontSize="14" fontFamily={FONT} opacity="0">choke</text>
        <text x="16" y="280" fill="var(--ink-dim)" fontSize="13" fontFamily={FONT}>closed loop: feedback from the router</text>
      </svg>
    </AnimFrame>
  )
}
