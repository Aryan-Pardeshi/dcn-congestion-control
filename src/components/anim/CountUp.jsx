import { useEffect, useRef } from 'react'
import { animate, useInView, useReducedMotion } from 'framer-motion'

/* Number that counts up from 0 when it scrolls into view (or immediately with `immediate`). */
export default function CountUp({ to, duration = 1.4, decimals = 0, immediate = false, className, delay = 0 }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -10% 0px' })
  const reduce = useReducedMotion()

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const fmt = (v) => v.toFixed(decimals)
    if (reduce) {
      el.textContent = fmt(to)
      return undefined
    }
    if (!immediate && !inView) {
      el.textContent = fmt(0)
      return undefined
    }
    const controls = animate(0, to, {
      duration,
      delay,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        el.textContent = fmt(v)
      },
    })
    return () => controls.stop()
  }, [to, duration, decimals, immediate, inView, reduce, delay])

  return (
    <span ref={ref} className={className}>
      {to.toFixed(decimals)}
    </span>
  )
}
