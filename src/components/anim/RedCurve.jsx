import { useRef } from 'react'
import AnimFrame from './AnimFrame'
import useAnimLoop from './useAnimLoop'

const FONT = 'var(--font-mono)'
const OX = 60
const OY = 226
const EX = 380
const TOP = 52
const MINTH = 176
const MAXTH = 300
const MAXPY = 128

/* RED curve: drop probability vs average queue; marker sweeps the avg axis. */
export default function RedCurve() {
  const svgRef = useRef(null)

  useAnimLoop(
    svgRef,
    (t) => {
      const svg = svgRef.current
      const marker = svg.querySelector('[data-marker]')
      const dot = svg.querySelector('[data-dot]')
      const pText = svg.querySelector('[data-p]')
      const stateText = svg.querySelector('[data-state]')
      const yForX = (x) => {
        if (x < MINTH) return OY
        if (x < MAXTH) return OY - ((x - MINTH) / (MAXTH - MINTH)) * (OY - MAXPY)
        return TOP
      }
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
        state = 'random early drop'
        color = 'var(--warn)'
      } else {
        p = 1
        state = 'drop all'
        color = 'var(--drop)'
      }
      pText.textContent = `p = ${p === 0 ? '0.00' : p === 1 ? '1.00' : p.toFixed(3)}`
      stateText.textContent = state
      stateText.setAttribute('fill', color)
      dot.setAttribute('fill', color)
    },
    2.2,
  )

  return (
    <AnimFrame
      title="red-curve.sim"
      legend={[
        { color: 'var(--flow)', label: 'enqueue' },
        { color: 'var(--warn)', label: 'random early drop' },
        { color: 'var(--drop)', label: 'drop all' },
      ]}
      caption="RED tracks the average queue. Below minTh nothing is dropped. Between minTh and maxTh the drop probability rises to maxP. Above maxTh every arrival is dropped."
    >
      <svg
        ref={svgRef}
        viewBox="0 0 400 290"
        role="img"
        aria-label="RED drop probability curve: zero until minTh, rising linearly to maxP at maxTh, then one"
      >
        <rect x={OX} y={TOP} width={MINTH - OX} height={OY - TOP} fill="var(--flow)" fillOpacity="0.1" />
        <rect x={MINTH} y={TOP} width={MAXTH - MINTH} height={OY - TOP} fill="var(--warn)" fillOpacity="0.1" />
        <rect x={MAXTH} y={TOP} width={EX - MAXTH} height={OY - TOP} fill="var(--drop)" fillOpacity="0.1" />
        <text x={(OX + MINTH) / 2} y={TOP + 18} fill="var(--flow)" fontSize="12" fontFamily={FONT} textAnchor="middle">enqueue</text>
        <text x={(MINTH + MAXTH) / 2} y={TOP + 18} fill="var(--warn)" fontSize="12" fontFamily={FONT} textAnchor="middle">early drop</text>
        <text x={(MAXTH + EX) / 2} y={TOP + 18} fill="var(--drop)" fontSize="12" fontFamily={FONT} textAnchor="middle">drop all</text>
        <line x1={OX} y1={OY} x2={EX} y2={OY} stroke="var(--ink-dim)" strokeWidth="1.2" />
        <line x1={OX} y1={OY} x2={OX} y2={TOP} stroke="var(--ink-dim)" strokeWidth="1.2" />
        <path d={`M${OX} ${OY} H${MINTH} L${MAXTH} ${MAXPY} L${MAXTH} ${TOP} H${EX}`} fill="none" stroke="var(--ink)" strokeWidth="2.4" strokeLinejoin="round" />
        <line x1={MINTH} y1={OY} x2={MINTH} y2={OY + 7} stroke="var(--ink-dim)" strokeWidth="1.2" />
        <text x={MINTH} y={OY + 22} fill="var(--ink)" fontSize="13.5" fontFamily={FONT} textAnchor="middle">minTh</text>
        <line x1={MAXTH} y1={OY} x2={MAXTH} y2={OY + 7} stroke="var(--ink-dim)" strokeWidth="1.2" />
        <text x={MAXTH} y={OY + 22} fill="var(--ink)" fontSize="13.5" fontFamily={FONT} textAnchor="middle">maxTh</text>
        <line x1={OX - 6} y1={MAXPY} x2={OX} y2={MAXPY} stroke="var(--ink-dim)" strokeWidth="1.2" />
        <line x1={OX} y1={MAXPY} x2={MAXTH} y2={MAXPY} stroke="var(--ink-faint)" strokeWidth="1" strokeDasharray="3 4" />
        <text x={OX - 10} y={MAXPY + 4} fill="var(--ink)" fontSize="13.5" fontFamily={FONT} textAnchor="end">maxP</text>
        <text x={OX - 10} y={TOP + 4} fill="var(--ink-dim)" fontSize="13" fontFamily={FONT} textAnchor="end">1</text>
        <text x={OX - 10} y={OY + 4} fill="var(--ink-dim)" fontSize="13" fontFamily={FONT} textAnchor="end">0</text>
        <text transform={`rotate(-90 14 ${(OY + TOP) / 2})`} x="14" y={(OY + TOP) / 2} fill="var(--ink-dim)" fontSize="13" fontFamily={FONT} textAnchor="middle">drop probability</text>
        <text x={(OX + EX) / 2} y={OY + 44} fill="var(--ink-dim)" fontSize="13" fontFamily={FONT} textAnchor="middle">average queue length</text>
        <line data-marker x1="150" y1={TOP} x2="150" y2={OY} stroke="var(--ink-dim)" strokeWidth="1" strokeDasharray="4 3" />
        <circle data-dot r="6" cx="150" cy="150" fill="var(--flow)" stroke="var(--bg)" strokeWidth="1.5" />
        <text data-p x={OX} y="22" fill="var(--ink)" fontSize="15" fontFamily={FONT}>p = 0.00</text>
        <text data-state x={EX} y="22" fill="var(--flow)" fontSize="15" fontFamily={FONT} textAnchor="end">enqueue</text>
      </svg>
    </AnimFrame>
  )
}
