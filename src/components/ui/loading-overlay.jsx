// loading-overlay — session preloader (see components/ui/README.md).
import { useEffect, useRef, useState } from 'react'

export function LoadingOverlay({ onComplete, children }) {
  const [percentage, setPercentage] = useState(0)
  const [isClipping, setIsClipping] = useState(false)
  const [showContent, setShowContent] = useState(false)
  // After the reveal transition ends the wrapper div is dropped (plain fragment)
  // so its opacity/transform can't trap `position: fixed` descendants.
  const [revealDone, setRevealDone] = useState(false)
  const completedRef = useRef(false)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  // Reduced motion: skip the overlay entirely, render children immediately.
  const [reduced] = useState(() =>
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    if (reduced) {
      setShowContent(true)
      setRevealDone(true)
      if (!completedRef.current) {
        completedRef.current = true
        onCompleteRef.current?.()
      }
      return undefined
    }

    // Lock page scroll while the overlay is visible.
    const prevOverflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'

    let rafId = 0
    let t1 = 0
    let t2 = 0
    let t3 = 0
    let cancelled = false
    const duration = 2500
    const startTime = Date.now()
    const animatePercentage = () => {
      if (cancelled) return
      const elapsed = Date.now() - startTime
      const t = Math.min(elapsed / duration, 1)
      const progress = 1 - Math.pow(1 - t, 3)
      setPercentage(t >= 1 ? 100 : Math.round(progress * 100))
      if (t < 1) {
        rafId = requestAnimationFrame(animatePercentage)
      } else {
        t1 = window.setTimeout(() => {
          if (cancelled) return
          setIsClipping(true)
          // Restore scroll as soon as the overlay starts clipping away.
          document.documentElement.style.overflow = prevOverflow
          t2 = window.setTimeout(() => {
            if (cancelled) return
            setShowContent(true)
            if (!completedRef.current) {
              completedRef.current = true
              onCompleteRef.current?.()
            }
            // Drop the reveal wrapper once its 0.6s transition finishes.
            t3 = window.setTimeout(() => {
              if (!cancelled) setRevealDone(true)
            }, 650)
          }, 400)
        }, 100)
      }
    }
    rafId = requestAnimationFrame(animatePercentage)

    // Cleanup cancels rAF + timers so StrictMode's double-mount can't run the animation twice.
    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
      document.documentElement.style.overflow = prevOverflow
    }
  }, [reduced])

  // Keep the same wrapper element in every state: swapping it for a fragment would remount the app.
  const settled = reduced || revealDone

  return (
    <>
      {!settled && (
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage}
        aria-label="Loading"
        aria-hidden={isClipping ? 'true' : undefined}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1000, // Above the sticky navbar (z-index 50).
          background: 'var(--bg)', // Original had no background and would be invisible.
          color: 'var(--ink)',
          clipPath: isClipping ? 'inset(0 0 100% 0)' : 'inset(0 0 0% 0)',
          pointerEvents: isClipping ? 'none' : 'auto',
          transition: 'clip-path 0.4s ease-in-out',
        }}
      >
        {/* Small label, bottom-left. */}
        <div
          style={{
            position: 'absolute',
            left: 'clamp(1rem, 2vw, 3rem)',
            bottom: 'clamp(1rem, 2vw, 3rem)',
            fontSize: '14px',
            color: 'var(--ink-dim)',
          }}
        >
          Congestion Control Lab
        </div>
        <div
          style={{
            position: 'absolute',
            right: 'clamp(1rem, 2vw, 3rem)',
            bottom: 'clamp(1rem, 2vw, 3rem)',
            fontSize: 'clamp(3rem, 8vw, 12rem)',
            fontFamily: 'var(--font-sans)',
            fontWeight: 600,
            letterSpacing: '-0.05em',
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {percentage}%
        </div>
        {/* Thin progress line along the bottom edge. */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            bottom: 0,
            height: '2px',
            width: `${percentage}%`,
            background: 'var(--flow)',
          }}
        />
      </div>
      )}
      <div
        style={
          settled
            ? undefined
            : {
                opacity: showContent ? 1 : 0,
                // "none" instead of "translateY(0)": any non-none transform traps fixed children.
                transform: showContent ? 'none' : 'translateY(100px)',
                transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
              }
        }
      >
        {children}
      </div>
    </>
  )
}

export default LoadingOverlay
