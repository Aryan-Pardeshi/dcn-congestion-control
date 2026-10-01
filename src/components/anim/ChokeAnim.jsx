import { useEffect, useRef } from 'react'

const N = 8

/* Choke packet: queue crosses threshold, amber signal returns, source slows, queue drains. */
export default function ChokeAnim() {
  const svgRef = useRef(null)

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return undefined
    const pktEls = Array.from(svg.querySelectorAll('[data-pkt]'))
    const queueFill = svg.querySelector('[data-qfill]')
    const choke = svg.querySelector('[data-choke]')
    const chokeLabel = svg.querySelector('[data-chokelabel]')
    const srcLabel = svg.querySelector('[data-src-state]')
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    let raf = 0
    let visible = true
    const io = new IntersectionObserver((es) => {
      visible = es[0].isIntersecting
    })
    io.observe(svg)

    const draw = (t) => {
      const ph = t % 8
      const q = ph < 3 ? ph / 3 : ph < 5 ? 1 : Math.max(0, 1 - (ph - 5) / 3)
      const h = q * 74
      queueFill.setAttribute('y', String(150 - h))
      queueFill.setAttribute('height', String(h))
      queueFill.setAttribute('fill', q > 0.7 ? 'var(--warn)' : 'var(--flow)')
      const slowed = ph >= 4 && ph < 7
      const rate = slowed ? 0.12 : 0.35
      pktEls.forEach((el, i) => {
        const p = (t * rate + i / N) % 1
        el.setAttribute('cx', String(52 + p * 250))
        el.setAttribute('fill', 'var(--flow)')
      })
      const chokeOn = ph >= 3.4 && ph < 5.2
      if (chokeOn) {
        const p = (ph - 3.4) / 1.8
        choke.setAttribute('opacity', '1')
        choke.setAttribute('cx', String(196 - p * 130))
        chokeLabel.setAttribute('opacity', '1')
      } else {
        choke.setAttribute('opacity', '0')
        chokeLabel.setAttribute('opacity', '0')
      }
      srcLabel.textContent = slowed ? 'source: slowed x0.5' : 'source: full rate'
    }

    if (mq.matches) {
      draw(4.2)
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
    <svg viewBox="0 0 380 210" width="100%" role="img" aria-label="Choke packet animation: router queue fills past threshold, an amber choke packet returns to the source, the source slows and the queue drains" ref={svgRef}>
      <line x1="52" y1="80" x2="302" y2="80" stroke="var(--line)" strokeWidth="2" />
      <line x1="196" y1="96" x2="66" y2="96" stroke="var(--warn)" strokeWidth="1" strokeDasharray="4 3" opacity="0.7" />
      <rect x="8" y="60" width="58" height="40" fill="none" stroke="var(--ink)" strokeWidth="1.5" />
      <text x="14" y="77" fill="var(--ink)" fontSize="10" fontFamily="var(--font-mono)">Source</text>
      <text data-src-state x="8" y="116" fill="var(--ink-dim)" fontSize="9" fontFamily="var(--font-mono)">source: full rate</text>
      <rect x="172" y="60" width="58" height="40" fill="none" stroke="var(--ink)" strokeWidth="1.5" />
      <text x="182" y="77" fill="var(--ink)" fontSize="10" fontFamily="var(--font-mono)">Router</text>
      {/* queue bar */}
      <rect x="236" y="76" width="16" height="74" fill="none" stroke="var(--ink-dim)" strokeWidth="1" />
      <rect data-qfill x="237" y="150" width="14" height="0" fill="var(--flow)" />
      <line x1="234" y1="98" x2="254" y2="98" stroke="var(--warn)" strokeWidth="1.5" strokeDasharray="3 2" />
      <text x="258" y="101" fill="var(--ink-dim)" fontSize="9" fontFamily="var(--font-mono)">threshold</text>
      <rect x="296" y="60" width="58" height="40" fill="none" stroke="var(--ink)" strokeWidth="1.5" />
      <text x="310" y="77" fill="var(--ink)" fontSize="10" fontFamily="var(--font-mono)">Dest</text>
      {Array.from({ length: N }).map((_, i) => (
        <circle key={i} data-pkt r="5" cx="52" cy="80" fill="var(--flow)" />
      ))}
      <circle data-choke r="6" cx="196" cy="96" fill="var(--warn)" opacity="0" />
      <text data-chokelabel x="110" y="112" fill="var(--warn)" fontSize="10" fontFamily="var(--font-mono)" opacity="0">choke</text>
      <text x="8" y="180" fill="var(--ink-dim)" fontSize="10" fontFamily="var(--font-mono)">queue crosses threshold, source backs off, queue drains</text>
    </svg>
  )
}
