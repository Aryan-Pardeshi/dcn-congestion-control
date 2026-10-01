import { useEffect, useRef } from 'react'
import './HeroTopology.css'

const SOURCES = [
  { id: 'S1', label: 'CS Lab', y: 52 },
  { id: 'S2', label: 'Admin', y: 132 },
  { id: 'S3', label: 'Library', y: 212 },
]
const SRC_W = 104
const SRC_H = 36
const SRC_RIGHT = 24 + SRC_W
const R1 = { x: 400, y: 150 }
const BUF_X = 440
const WAN_X1 = 480
const WAN_X2 = 640
const IN = 12
const OUT = 5
const SLOTS = 10
const MONO = 'var(--font-mono)'

const cy = (s) => s.y + SRC_H / 2

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
    const chokeLine = svg.querySelector('[data-chokeline]')
    const status = svg.querySelector('[data-status]')
    const statusDot = svg.querySelector('[data-statusdot]')
    const pct = svg.querySelector('[data-pct]')
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    let raf = 0
    let visible = true
    const io = new IntersectionObserver((es) => {
      visible = es[0].isIntersecting
    })
    io.observe(svg)

    const targetX = R1.x - 28
    const pathX = (p) => SRC_RIGHT + (targetX - SRC_RIGHT) * p
    const pathY = (sy, p) => sy + (R1.y - sy) * p

    const draw = (t) => {
      const cyc = t % 8
      const fill = cyc < 4 ? 0.15 + (cyc / 4) * 0.85 : cyc < 6 ? 1 : Math.max(0.15, 1 - ((cyc - 6) / 2) * 0.85)
      const slowed = cyc >= 5.6
      const full = fill >= 0.99
      const nFilled = Math.round(fill * SLOTS)
      const level = full ? 'var(--drop)' : fill > 0.6 ? 'var(--warn)' : 'var(--flow)'
      slots.forEach((s, i) => {
        const fromBottom = SLOTS - 1 - i
        const on = fromBottom < nFilled
        s.setAttribute('opacity', on ? '1' : '0.16')
        s.setAttribute('fill', on ? level : 'var(--ink-faint)')
      })
      pct.textContent = `${Math.round(fill * 100)}%`
      pct.setAttribute('fill', level)
      const speed = slowed ? 0.09 : 0.22
      inDots.forEach((d, i) => {
        const src = SOURCES[i % 3]
        const p = (t * speed + i * 0.083) % 1
        const near = p > 0.86
        if (full && near) {
          d.setAttribute('opacity', '0')
          const dd = dropDots[i % dropDots.length]
          dd.setAttribute('opacity', '1')
          dd.setAttribute('cx', String(pathX(p)))
          dd.setAttribute('cy', String(pathY(cy(src), 0.95) + (p - 0.86) * 340))
        } else {
          d.setAttribute('opacity', String(p > 0.97 ? 1 - (p - 0.97) / 0.03 : 1))
          d.setAttribute('cx', String(pathX(p)))
          d.setAttribute('cy', String(pathY(cy(src), p)))
          d.setAttribute('fill', slowed ? 'var(--warn)' : 'var(--flow)')
        }
      })
      if (!full) dropDots.forEach((dd) => dd.setAttribute('opacity', '0'))
      outDots.forEach((d, i) => {
        const p = (t * 0.16 + i / OUT) % 1
        d.setAttribute('cx', String(WAN_X1 + p * (WAN_X2 - WAN_X1)))
        d.setAttribute('cy', String(R1.y))
      })
      const s2 = SOURCES[1]
      if (cyc >= 5 && cyc < 6.6) {
        const p = (cyc - 5) / 1.6
        const x = R1.x - 30 - p * (R1.x - 30 - (SRC_RIGHT + 8))
        const y = R1.y + 24 + p * (cy(s2) + 24 - (R1.y + 24))
        choke.setAttribute('opacity', '1')
        choke.setAttribute('cx', String(x))
        choke.setAttribute('cy', String(y))
        chokeTag.setAttribute('opacity', '1')
        chokeLine.setAttribute('opacity', '0.7')
      } else {
        choke.setAttribute('opacity', '0')
        chokeTag.setAttribute('opacity', '0')
        chokeLine.setAttribute('opacity', '0')
      }
      status.textContent = full ? 'r1 buffer full, tail drop' : slowed ? 'choke sent, sources back off' : 'offered load rising'
      statusDot.setAttribute('fill', full ? 'var(--drop)' : slowed ? 'var(--warn)' : 'var(--flow)')
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
    <div className="hero-window">
      <div className="hero-window-bar">
        <span className="hero-window-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="mono hero-window-title">r1-gateway — live</span>
      </div>
      <div className="hero-window-body">
        <svg
          ref={svgRef}
          viewBox="0 0 760 300"
          role="img"
          aria-label="Campus sources converge on router R1; its buffer fills, packets drop, a choke signal returns and sources slow down"
        >
          <g stroke="var(--line-strong)" strokeWidth="1">
            {SOURCES.map((s) => (
              <line key={`l-${s.id}`} x1={SRC_RIGHT} y1={cy(s)} x2={R1.x - 26} y2={R1.y} />
            ))}
          </g>
          <line data-chokeline x1={R1.x - 30} y1={R1.y + 24} x2={SRC_RIGHT + 8} y2={cy(SOURCES[1]) + 24} stroke="var(--warn)" strokeWidth="1" strokeDasharray="4 4" opacity="0" />
          {SOURCES.map((s) => (
            <g key={s.id}>
              <rect x="24" y={s.y} width={SRC_W} height={SRC_H} rx="6" fill="var(--bg-2)" stroke="var(--line-strong)" strokeWidth="1" />
              <text x="38" y={s.y + 22} fill="var(--ink)" fontSize="12.5" fontFamily={MONO}>{s.label}</text>
              <text x={24 + SRC_W - 12} y={s.y + 22} fill="var(--ink-faint)" fontSize="11" fontFamily={MONO} textAnchor="end">{s.id}</text>
            </g>
          ))}
          <circle cx={R1.x} cy={R1.y} r="28" fill="var(--bg-2)" stroke="var(--line-strong)" strokeWidth="1" />
          <g stroke="var(--flow)" strokeWidth="1.6" fill="none" strokeLinecap="round">
            <path d={`M${R1.x - 12} ${R1.y} h24 M${R1.x} ${R1.y - 12} v24`} />
            <circle cx={R1.x} cy={R1.y} r="15" />
          </g>
          <text x={R1.x} y={R1.y + 48} fill="var(--ink)" fontSize="12.5" fontFamily={MONO} textAnchor="middle">R1</text>
          {/* buffer: 10 stacked slots */}
          <g>
            {Array.from({ length: SLOTS }).map((_, i) => (
              <rect key={i} data-slot x={BUF_X} y={62 + i * 18} width="30" height="14" rx="2" fill="var(--flow)" opacity="0.16" />
            ))}
            <text x={BUF_X + 15} y="46" fill="var(--ink-dim)" fontSize="11" fontFamily={MONO} textAnchor="middle">buffer</text>
            <text data-pct x={BUF_X + 15} y="266" fill="var(--flow)" fontSize="12" fontFamily={MONO} textAnchor="middle">15%</text>
          </g>
          <line x1={WAN_X1} y1={R1.y} x2={WAN_X2} y2={R1.y} stroke="var(--warn)" strokeWidth="2" opacity="0.55" />
          <text x={(WAN_X1 + WAN_X2) / 2} y={R1.y - 14} fill="var(--ink-dim)" fontSize="12" fontFamily={MONO} textAnchor="middle">10 Mbps bottleneck</text>
          <rect x={WAN_X2} y="122" width="96" height="56" rx="6" fill="var(--bg-2)" stroke="var(--line-strong)" strokeWidth="1" />
          <text x={WAN_X2 + 48} y="155" fill="var(--ink)" fontSize="12.5" fontFamily={MONO} textAnchor="middle">Server</text>
          {Array.from({ length: IN }).map((_, i) => (
            <circle key={`in-${i}`} data-indot r="3.8" cx={SRC_RIGHT} cy="70" fill="var(--flow)" />
          ))}
          {Array.from({ length: 4 }).map((_, i) => (
            <circle key={`dd-${i}`} data-dropdot r="3.8" cx="300" cy="180" fill="var(--drop)" opacity="0" />
          ))}
          {Array.from({ length: OUT }).map((_, i) => (
            <circle key={`out-${i}`} data-outdot r="3.4" cx={WAN_X1} cy={R1.y} fill="var(--flow)" />
          ))}
          <circle data-choke r="5.5" cx={R1.x} cy={R1.y} fill="var(--warn)" opacity="0" />
          <text data-choketag x={SRC_RIGHT + 90} y={cy(SOURCES[1]) + 52} fill="var(--warn)" fontSize="11.5" fontFamily={MONO} opacity="0">choke packet</text>
          <circle data-statusdot cx="30" cy="283" r="4" fill="var(--flow)" />
          <text data-status x="42" y="287" fill="var(--ink-dim)" fontSize="12" fontFamily={MONO}>offered load rising</text>
        </svg>
      </div>
    </div>
  )
}
