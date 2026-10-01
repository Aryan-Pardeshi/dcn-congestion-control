import { useEffect, useRef } from 'react'

const OX = 52
const OY = 192
const EX = 322
const TOP = 26
const MINTH = 142
const MAXTH = 252
const MAXPY = 82

/* RED curve: drop probability vs average queue; marker sweeps the avg axis. */
export default function RedCurve() {
  const svgRef = useRef(null)

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return undefined
    const marker = svg.querySelector('[data-marker]')
    const dot = svg.querySelector('[data-dot]')
    const pText = svg.querySelector('[data-p]')
    const stateText = svg.querySelector('[data-state]')
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    let raf = 0
    let visible = true
    const io = new IntersectionObserver((es) => {
      visible = es[0].isIntersecting
    })
    io.observe(svg)

    const yForX = (x) => {
      if (x < MINTH) return OY
      if (x < MAXTH) return OY - ((x - MINTH) / (MAXTH - MINTH)) * (OY - MAXPY)
      return TOP
    }
    const draw = (t) => {
      const x = OX + (EX - OX) * (0.5 + 0.48 * Math.sin(t * 0.55))
      const y = yForX(x)
      marker.setAttribute('x1', String(x))
      marker.setAttribute('x2', String(x))
      dot.setAttribute('cx', String(x))
      dot.setAttribute('cy', String(y))
      let p
      let state
      let color
      if (x < MINTH) {
        p = 0
        state = 'enqueue'
        color = 'var(--flow)'
      } else if (x < MAXTH) {
        p = ((x - MINTH) / (MAXTH - MINTH)) * 0.1
        state = 'probabilistic drop'
        color = 'var(--warn)'
      } else {
        p = 1
        state = 'forced drop'
        color = 'var(--drop)'
      }
      pText.textContent = `p=${p.toFixed(p < 1 && p > 0 ? 3 : 1)}`
      stateText.textContent = state
      stateText.setAttribute('fill', color)
      dot.setAttribute('fill', color)
    }

    if (mq.matches) {
      draw(2.2)
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
    <svg viewBox="0 0 340 230" width="100%" role="img" aria-label="RED drop probability curve: zero until minTh, rising linearly to maxP at maxTh, then one" ref={svgRef}>
      <rect x={OX} y={TOP} width={MINTH - OX} height={OY - TOP} fill="var(--flow)" fillOpacity="0.10" />
      <rect x={MINTH} y={TOP} width={MAXTH - MINTH} height={OY - TOP} fill="var(--warn)" fillOpacity="0.10" />
      <rect x={MAXTH} y={TOP} width={EX - MAXTH} height={OY - TOP} fill="var(--drop)" fillOpacity="0.10" />
      <line x1={OX} y1={OY} x2={EX} y2={OY} stroke="var(--ink-dim)" strokeWidth="1" />
      <line x1={OX} y1={OY} x2={OX} y2={TOP} stroke="var(--ink-dim)" strokeWidth="1" />
      <path d={`M${OX} ${OY} H${MINTH} L${MAXTH} ${MAXPY} L${MAXTH} ${TOP} H${EX}`} fill="none" stroke="var(--ink)" strokeWidth="2" />
      <line x1={MINTH} y1={OY} x2={MINTH} y2={OY + 6} stroke="var(--ink-dim)" strokeWidth="1" />
      <text x={MINTH - 16} y={OY + 18} fill="var(--ink-dim)" fontSize="10" fontFamily="var(--font-mono)">minTh</text>
      <line x1={MAXTH} y1={OY} x2={MAXTH} y2={OY + 6} stroke="var(--ink-dim)" strokeWidth="1" />
      <text x={MAXTH - 16} y={OY + 18} fill="var(--ink-dim)" fontSize="10" fontFamily="var(--font-mono)">maxTh</text>
      <text x={OX - 38} y={MAXPY + 3} fill="var(--ink-dim)" fontSize="10" fontFamily="var(--font-mono)">maxP</text>
      <line x1={OX} y1={MAXPY} x2={OX + 6} y2={MAXPY} stroke="var(--ink-dim)" strokeWidth="1" />
      <line data-marker x1="150" y1={TOP} x2="150" y2={OY} stroke="var(--ink-dim)" strokeWidth="1" strokeDasharray="4 3" />
      <circle data-dot r="5" cx="150" cy="150" fill="var(--flow)" stroke="var(--bg)" strokeWidth="1" />
      <text data-p x={OX} y="16" fill="var(--ink)" fontSize="11" fontFamily="var(--font-mono)">p=0.0</text>
      <text data-state x="120" y="16" fill="var(--flow)" fontSize="11" fontFamily="var(--font-mono)">enqueue</text>
      <text x={EX - 78} y={OY - 6} fill="var(--ink-dim)" fontSize="10" fontFamily="var(--font-mono)">avg queue</text>
    </svg>
  )
}
