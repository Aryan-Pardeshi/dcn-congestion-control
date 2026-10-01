import { useEffect, useRef } from 'react'

const TOKENS = 8
const PACKETS = 5

/* Token bucket: violet tokens accrue steadily; packets leave only with a token. */
export default function TokenBucketAnim() {
  const svgRef = useRef(null)

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return undefined
    const tokenEls = Array.from(svg.querySelectorAll('[data-token]'))
    const packetEls = Array.from(svg.querySelectorAll('[data-pkt]'))
    const dripEls = Array.from(svg.querySelectorAll('[data-drip]'))
    const burstLabel = svg.querySelector('[data-burst]')
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    let raf = 0
    let visible = true
    const io = new IntersectionObserver((es) => {
      visible = es[0].isIntersecting
    })
    io.observe(svg)

    const draw = (t) => {
      const ph = t % 9
      const held = ph < 2.5 ? Math.floor((ph / 2.5) * TOKENS) : ph < 4 ? Math.max(0, TOKENS - Math.floor(((ph - 2.5) / 1.5) * TOKENS)) : Math.min(TOKENS, Math.floor(((ph - 4) / 5) * TOKENS))
      tokenEls.forEach((el, i) => {
        el.setAttribute('opacity', i < held ? '1' : '0.15')
      })
      const fast = held >= 3
      const rate = fast ? 0.45 : 0.08
      packetEls.forEach((el, i) => {
        const p = (t * rate + i * 0.19) % 1
        el.setAttribute('cx', String(322 - p * 130))
        el.setAttribute('opacity', fast ? '1' : p > 0.25 ? '1' : '0.45')
        el.setAttribute('fill', fast ? 'var(--flow)' : 'var(--warn)')
      })
      dripEls.forEach((el, i) => {
        const p = (t * 0.8 + i / dripEls.length) % 1
        el.setAttribute('cy', String(8 + p * 34))
      })
      if (burstLabel) burstLabel.setAttribute('opacity', ph >= 2.5 && ph < 4 ? '1' : '0')
    }

    if (mq.matches) {
      draw(3.0)
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

  const tokenPos = (i) => ({ x: 62 + (i % 2) * 34, y: 128 - Math.floor(i / 2) * 24 })

  return (
    <svg viewBox="0 0 340 220" width="100%" role="img" aria-label="Token bucket animation: tokens accrue steadily, a burst of packets passes while tokens last, then packets wait" ref={svgRef}>
      {[0, 1, 2].map((i) => (
        <circle key={`d-${i}`} data-drip r="3.5" cx="79" cy="8" fill="var(--token)" />
      ))}
      <text x="92" y="30" fill="var(--ink-dim)" fontSize="10" fontFamily="var(--font-mono)">r</text>
      <rect x="40" y="56" width="108" height="118" fill="none" stroke="var(--ink)" strokeWidth="2" />
      {Array.from({ length: TOKENS }).map((_, i) => {
        const { x, y } = tokenPos(i)
        return <circle key={`t-${i}`} data-token r="9" cx={x} cy={y} fill="var(--token)" opacity="1" />
      })}
      <text x="152" y="120" fill="var(--ink)" fontSize="11" fontFamily="var(--font-mono)">C</text>
      <line x1="152" y1="62" x2="152" y2="168" stroke="var(--ink-dim)" strokeWidth="1" />
      {Array.from({ length: PACKETS }).map((_, i) => (
        <circle key={`p-${i}`} data-pkt r="7" cx={250} cy={60 + i * 26} fill="var(--flow)" stroke="var(--bg)" strokeWidth="1" />
      ))}
      <text x="196" y="200" fill="var(--ink-dim)" fontSize="10" fontFamily="var(--font-mono)">waiting packets</text>
      <text data-burst x="170" y="24" fill="var(--token)" fontSize="11" fontFamily="var(--font-mono)" opacity="0">burst passes on saved tokens</text>
      <text x="40" y="200" fill="var(--ink-dim)" fontSize="10" fontFamily="var(--font-mono)">tokens accrue at r, cap C</text>
    </svg>
  )
}
