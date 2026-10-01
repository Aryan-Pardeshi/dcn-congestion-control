import { createContext, useContext, useEffect, useMemo, useRef } from 'react'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'

const SmoothScrollContext = createContext({
  stop: () => {},
  start: () => {},
  scrollTo: () => {},
  resetScroll: () => {},
})

export function useSmoothScroll() {
  return useContext(SmoothScrollContext)
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/* Lenis smooth scroll for the whole app. Disabled under prefers-reduced-motion. */
export default function SmoothScroll({ children }) {
  const lenisRef = useRef(null)

  useEffect(() => {
    if (prefersReducedMotion()) return undefined
    const lenis = new Lenis({
      lerp: 0.1,
      wheelMultiplier: 1,
      smoothWheel: true,
      allowNestedScroll: true,
    })
    lenisRef.current = lenis
    let raf = 0
    const tick = (time) => {
      lenis.raf(time)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      lenis.destroy()
      lenisRef.current = null
    }
  }, [])

  /* Anchor links: smooth scroll honouring each target's scroll-margin-top (header offset). */
  useEffect(() => {
    const onClick = (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = e.target.closest?.('a[href^="#"]')
      if (!a) return
      const id = decodeURIComponent(a.getAttribute('href').slice(1))
      if (!id) return
      const target = document.getElementById(id)
      if (!target) return
      e.preventDefault()
      const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0
      const reduce = prefersReducedMotion()
      if (lenisRef.current && !reduce) {
        // Lenis already honours the target's scroll-margin-top (header offset)
        lenisRef.current.scrollTo(target, { duration: 1.1 })
      } else {
        window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - margin, behavior: 'auto' })
      }
      history.replaceState(null, '', `#${id}`)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  const api = useMemo(
    () => ({
      stop: () => lenisRef.current?.stop(),
      start: () => lenisRef.current?.start(),
      /* Called by the router shell once the old page has faded out. */
      resetScroll: () => {
        lenisRef.current?.scrollTo(0, { immediate: true, force: true })
        window.scrollTo(0, 0)
      },
      scrollTo: (target, opts) => {
        if (lenisRef.current) lenisRef.current.scrollTo(target, opts)
        else if (typeof target === 'number') window.scrollTo(0, target)
      },
    }),
    [],
  )

  return <SmoothScrollContext.Provider value={api}>{children}</SmoothScrollContext.Provider>
}
