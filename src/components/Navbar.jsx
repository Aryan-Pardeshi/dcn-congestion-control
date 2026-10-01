import { Link, NavLink } from 'react-router-dom'
import { useQuiz } from './QuizContext'
import ThemeToggle from './ThemeToggle'
import './Navbar.css'

export default function Navbar() {
  const { openQuiz } = useQuiz()

  return (
    <header className="navbar">
      <div className="wrap navbar-inner">
        <Link className="navbar-brand" to="/" aria-label="Congestion Control Lab home">
          <svg
            className="navbar-logo"
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            stroke="var(--flow)"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M4 6 H13 L22 14" />
            <path d="M4 14 H13" />
            <path d="M4 22 H13 L22 14" />
          </svg>
          <span className="navbar-title">Congestion Control Lab</span>
        </Link>
        <nav className="navbar-links" aria-label="Primary">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'navbar-link is-active' : 'navbar-link')}>
            Experiment
          </NavLink>
          <NavLink to="/simulator" className={({ isActive }) => (isActive ? 'navbar-link is-active' : 'navbar-link')}>
            Simulator
          </NavLink>
          <button type="button" className="btn-ghost navbar-quiz" onClick={openQuiz}>
            Take quiz
          </button>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}
