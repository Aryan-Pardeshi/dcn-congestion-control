import { Link } from 'react-router-dom'
import { useQuiz } from './QuizContext'
import './Footer.css'

/* Minimal footer. Owns its own quiz button, so pages need not pass children. */
export default function Footer() {
  const { openQuiz } = useQuiz()
  return (
    <footer className="footer">
      <div className="wrap footer-inner">
        <div className="footer-brand">
          <p className="footer-name">Congestion Control Lab</p>
          <p className="footer-text">Data Communication &amp; Networks lab — Module 4.2, The Network Layer in the Internet</p>
        </div>
        <div className="footer-credit">
          <p className="footer-credit-name">Aryan Pardeshi</p>
          <p className="footer-credit-line">KJ Somaiya College of Engineering</p>
          <p className="footer-credit-roll">Roll no: 16010425080</p>
        </div>
        <div className="footer-actions">
          <Link className="footer-link" to="/simulator">
            Simulator
          </Link>
          <button type="button" className="btn-ghost" onClick={openQuiz}>
            Take the quiz
          </button>
        </div>
      </div>
    </footer>
  )
}
