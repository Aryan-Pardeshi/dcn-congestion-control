import { useEffect } from 'react'

/* One delegated listener: any element with class "spot" gets --mx / --my set to the pointer position. */
export default function useSpotlight() {
  useEffect(() => {
    let raf = 0
    let last = null
    const apply = () => {
      raf = 0
      if (!last) return
      const { target, x, y } = last
      const el = target.closest?.('.spot')
      if (!el) return
      const r = el.getBoundingClientRect()
      el.style.setProperty('--mx', `${x - r.left}px`)
      el.style.setProperty('--my', `${y - r.top}px`)
    }
    const onMove = (e) => {
      last = { target: e.target, x: e.clientX, y: e.clientY }
      if (!raf) raf = requestAnimationFrame(apply)
    }
    document.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      document.removeEventListener('pointermove', onMove)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])
}
