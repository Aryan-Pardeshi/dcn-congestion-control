import { useEffect, useRef } from 'react'
import './HeroTopology.css'

const SOURCES = [
  { id: 'S1', label: 'CS Lab', y: 52 },
  { id: 'S2', label: 'Admin', y: 142 },
  { id: 'S3', label: 'Library', y: 232 },
]
const R1 = { x: 268, y: 160 }
const IN = 12
const OUT = 4
const SLOTS = 10

/* Hero: three sources feed R1 faster than the bottleneck drains; buffer fills,
   drops fall red, a choke dot returns, the source backs off, the loop repeats. */
export default function HeroTopology() {
  const svgRef = useRef(null)

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return undefined
    const inDots = Array.from(svg.querySelectorAll('[data-indot]'))
    const outDots = Array.from(svg.querySelectorAll('[data-outdot]'))
    const dropDots = Array.from(svg.querySelectorAll('[data-dropdot]'))
    const slots = Array.from(svg.querySelectorAll('[data-slot]'))
    const choke = svg.querySelector('[data-choke]')
    const chokeTag = svg.querySelector('[data-choketag]')
    const status = svg.querySelector('[data-status]')
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    let raf = 0
    let visible = true
    const io = new IntersectionObserver((es) => {
      visible = es[0].isIntersecting
    })
    io.observe(svg)

    const pathX = (sx, p) => sx + (R1.x - sx) * p
    const pathY = (sy, p) => sy + (R1.y - sy) * p

    const draw = (t) => {
      const cyc = t % 8
      const fill = cyc < 4 ? 0.15 + (cyc / 4) * 0.85 : cyc < 6 ? 1 : Math.max(0.15, 1 - ((cyc - 6) / 2) * 0.85)
      const slowed = cyc >= 5.6
      const full = fill >= 0.99
      const nFilled = Math.round(fill * SLOTS)
      slots.forEach((s, i) => {
        const fromBottom = SLOTS - 1 - i
        const on = fromBottom < nFilled
        s.setAttribute('opacity', on ? '1' : '0.18')
        if (on) s.setAttribute('fill', full ? 'var(--drop)' : fill > 0.6 ? 'var(--warn)' : 'var(--flow)')
      })
      const speed = slowed ? 0.09 : 0.22
      inDots.forEach((d, i) => {
        const src = SOURCES[i % 3]
        const p = (t * speed + i * 0.083) % 1
        const near = p > 0.86
        if (full && near) {
          d.setAttribute('opacity', '0')
          const dd = dropDots[i % dropDots.length]
          dd.setAttribute('opacity', '1')
          dd.setAttribute('cx', String(pathX(104, p)))
          dd.setAttribute('cy', String(pathY(src.y + 14, 0.95) + (p - 0.86) * 320))
          dd.setAttribute('fill', 'var(--drop)')
        } else {
          d.setAttribute('opacity', String(p > 0.97 ? 1 - (p - 0.97) / 0.03 : 1))
          d.setAttribute('cx', String(pathX(104, p)))
          d.setAttribute('cy', String(pathY(src.y + 14, p)))
          d.setAttribute('fill', slowed ? 'var(--warn)' : 'var(--flow)')
        }
      })
      if (!full) dropDots.forEach((dd) => dd.setAttribute('opacity', '0'))
      outDots.forEach((d, i) => {
        const p = (t * 0.16 + i / OUT) % 1
        d.setAttribute('cx', String(342 + p * 92))
        d.setAttribute('cy', String(R1.y))
        d.setAttribute('opacity', '0.9')
      })
      const s2 = SOURCES[1]
      if (cyc >= 5 && cyc < 6.6) {
        const p = (cyc - 5) / 1.6
        choke.setAttribute('opacity', '1')
        choke.setAttribute('cx', String(R1.x - 20 - p * (R1.x - 20 - 110)))
        choke.setAttribute('cy', String(R1.y - 34 - p * (s2.y + 14 - 40 - (R1.y - 34)) * -1 + p * (s2.y - R1.y + 20)))
        chokeTag.setAttribute('opacity', '1')
      } else {
        choke.setAttribute('opacity', '0')
        chokeTag.setAttribute('opacity', '0')
      }
      if (status) {
        status.textContent = full ? 'R1 buffer full — tail drop' : slowed ? 'choke sent — sources back off' : 'offered load rising'
      }
    }

    if (mq.matches) {
      draw(5.2)
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
    <div className="hero-topo">
      <svg ref={svgRef} viewBox="0 0 520 320" role="img" aria-label="Campus sources converge on router R1; its buffer fills, packets drop, a choke signal returns and sources slow down">
        <g stroke="var(--line)" strokeWidth="1">
          {SOURCES.map((s) => (
            <line key={`l-${s.id}`} x1="104" y1={s.y + 14} x2={R1.x - 24} y2={R1.y} />
          ))}
        </g>
        {SOURCES.map((s) => (
          <g key={s.id}>
            <rect x="24" y={s.y} width="80" height="28" fill="none" stroke="var(--ink)" strokeWidth="1.5" />
            <text x="32" y={s.y - 6} fill="var(--ink-dim)" fontSize="10" fontFamily="var(--font-mono)">{s.id}</text>
            <text x="32" y={s.y + 18} fill="var(--ink)" fontSize="10" fontFamily="var(--font-mono)">{s.label}</text>
          </g>
        ))}
        <circle cx={R1.x} cy={R1.y} r="26" fill="var(--bg)" stroke="var(--ink)" strokeWidth="2" />
        <g stroke="var(--flow)" strokeWidth="1.6" fill="none">
          <path d={`M${R1.x - 11} ${R1.y} h22 M${R1.x} ${R1.y - 11} v22`} />
          <circle cx={R1.x} cy={R1.y} r="14" />
        </g>
        <text x={R1.x - 10} y={R1.y + 42} fill="var(--ink)" fontSize="11" fontFamily="var(--font-mono)">R1</text>
        {/* buffer: 10 stacked slots */}
        <g>
          {Array.from({ length: SLOTS }).map((_, i) => (
            <rect key={i} data-slot x="306" y={70 + i * 18} width="28" height="14" fill="var(--flow)" opacity="0.18" />
          ))}
          <text x="306" y="60" fill="var(--ink-dim)" fontSize="10" fontFamily="var(--font-mono)">buffer</text>
        </g>
        <line x1="342" y1={R1.y} x2="438" y2={R1.y} stroke="var(--warn)" strokeWidth="3" />
        <line x1="342" y1={R1.y} x2="438" y2={R1.y} stroke="var(--line)" strokeWidth="5" opacity="0.35" />
        <text x="348" y={R1.y - 10} fill="var(--ink-dim)" fontSize="10" fontFamily="var(--font-mono)">10 Mbps</text>
        <rect x="438" y="138" width="66" height="44" fill="none" stroke="var(--ink)" strokeWidth="1.5" />
        <text x="446" y="164" fill="var(--ink)" fontSize="10" fontFamily="var(--font-mono)">Server</text>
        {Array.from({ length: IN }).map((_, i) => (
          <circle key={`in-${i}`} data-indot r="3.6" cx="104" cy="66" fill="var(--flow)" />
        ))}
        {Array.from({ length: 4 }).map((_, i) => (
          <circle key={`dd-${i}`} data-dropdot r="3.6" cx="250" cy="180" fill="var(--drop)" opacity="0" />
        ))}
        {Array.from({ length: OUT }).map((_, i) => (
          <circle key={`out-${i}`} data-outdot r="3" cx="342" cy={R1.y} fill="var(--flow)" opacity="0.9" />
        ))}
        <circle data-choke r="5" cx={R1.x} cy={R1.y} fill="var(--warn)" opacity="0" />
        <text data-choketag x="150" y="112" fill="var(--warn)" fontSize="10" fontFamily="var(--font-mono)" opacity="0">choke</text>
        <text data-status x="24" y="304" fill="var(--ink-dim)" fontSize="10" fontFamily="var(--font-mono)">offered load rising</text>
      </svg>
    </div>
  )
}
