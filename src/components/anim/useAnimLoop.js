import { useEffect } from 'react'

/* Runs draw(t seconds) every frame while the svg is on screen. Under reduced motion draws one still frame at staticT. */
export default function useAnimLoop(ref, draw, staticT = 3) {
  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    let raf = 0
    let visible = true
    const io = new IntersectionObserver((es) => {
      visible = es[0].isIntersecting
    })
    io.observe(el)
    if (mq.matches) {
      draw(staticT)
      return () => io.disconnect()
    }
    const start = performance.now()
    const frame = (now) => {
      if (visible && ref.current) draw((now - start) / 1000)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
    }
    // draw is intentionally stable per component instance
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
