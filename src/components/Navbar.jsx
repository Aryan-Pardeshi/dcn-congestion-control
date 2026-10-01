import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { motion, useScroll, useSpring, useReducedMotion } from 'framer-motion'
import { useQuiz } from './QuizContext'
import ThemeToggle from './ThemeToggle'
import './Navbar.css'

const LINKS = [
  { to: '/', label: 'Experiment', end: true },
  { to: '/simulator', label: 'Simulator' },
]

function LogoMark() {
  return (
    <svg className="navbar-logo" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="0.5" y="0.5" width="23" height="23" rx="6" fill="var(--ink)" />
      <g stroke="var(--bg)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 7.5h4.5L16 12" />
        <path d="M6 12h4.5" />
        <path d="M6 16.5h4.5L16 12" />
      </g>
      <circle cx="17.5" cy="12" r="1.8" fill="var(--flow)" />
    </svg>
  )
}

export default function Navbar() {
  const { openQuiz } = useQuiz()
  const [scrolled, setScrolled] = useState(false)
  const [hover, setHover] = useState(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.4 })

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={scrolled ? 'navbar is-scrolled' : 'navbar'}>
      <div className="wrap navbar-inner">
        <Link className="navbar-brand" to="/" aria-label="Congestion Control Lab home">
          <LogoMark />
          <span className="navbar-title">Congestion Control Lab</span>
        </Link>
        <nav className="navbar-links" aria-label="Primary" onMouseLeave={() => setHover(null)}>
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => (isActive ? 'navbar-link is-active' : 'navbar-link')}
              onMouseEnter={() => setHover(l.to)}
              onFocus={() => setHover(l.to)}
              onBlur={() => setHover(null)}
            >
              {hover === l.to && (
                <motion.span
                  layoutId="nav-hover"
                  className="navbar-hover"
                  transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 38 }}
                />
              )}
              <span className="navbar-link-label">{l.label}</span>
            </NavLink>
          ))}
          <button type="button" className="btn-ghost navbar-quiz" onClick={openQuiz}>
            Take quiz
          </button>
          <ThemeToggle />
        </nav>
      </div>
      {!reduce && <motion.div className="navbar-progress" style={{ scaleX: progress }} aria-hidden="true" />}
    </header>
  )
}
