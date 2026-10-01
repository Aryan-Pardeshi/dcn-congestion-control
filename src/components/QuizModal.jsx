import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { quizBank } from '../content/quizBank'
import { useQuiz } from './QuizContext'
import { useSmoothScroll } from './SmoothScroll'
import CountUp from './anim/CountUp'
import './QuizModal.css'

const QUIZ_LENGTH = 10
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']
const EASE = [0.16, 1, 0.3, 1]

/* Fisher–Yates shuffle (returns a new array). */
function shuffle(list) {
  const a = list.slice()
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/* Pick 10 random questions and shuffle each question's options, tracking the correct index. */
function buildQuiz() {
  return shuffle(quizBank)
    .slice(0, QUIZ_LENGTH)
    .map((q) => {
      const options = shuffle(q.options.map((text, i) => ({ text, correct: i === q.answer })))
      return {
        id: q.id,
        question: q.question,
        explanation: q.explanation,
        options: options.map((o) => o.text),
        correctIndex: options.findIndex((o) => o.correct),
      }
    })
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  )
}

function CrossIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

function ScoreRing({ score, total }) {
  const R = 68
  const C = 2 * Math.PI * R
  const ratio = total ? score / total : 0
  const color = ratio >= 0.7 ? 'var(--ok)' : ratio >= 0.4 ? 'var(--warn)' : 'var(--drop)'
  return (
    <div className="quiz-ring" role="img" aria-label={`Score: ${score} out of ${total}`}>
      <svg viewBox="0 0 160 160" width="168" height="168">
        <circle cx="80" cy="80" r={R} fill="none" stroke="var(--line-strong)" strokeWidth="9" />
        <motion.circle
          cx="80"
          cy="80"
          r={R}
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: C * (1 - ratio) }}
          transition={{ duration: 1.3, ease: EASE, delay: 0.25 }}
          transform="rotate(-90 80 80)"
          style={{ filter: `drop-shadow(0 0 8px ${color})` }}
        />
      </svg>
      <div className="quiz-ring-label">
        <span className="quiz-ring-num">
          <CountUp to={score} duration={1.2} delay={0.25} immediate />
        </span>
        <span className="quiz-ring-of">out of {total}</span>
      </div>
    </div>
  )
}

function verdict(score, total) {
  const r = total ? score / total : 0
  if (r === 1) return 'Perfect score. You know congestion control well.'
  if (r >= 0.8) return 'Excellent. You are ready for the viva.'
  if (r >= 0.6) return 'Good work. Review the questions you missed and try again.'
  if (r >= 0.4) return 'Getting there. Re-read the theory section, then retry.'
  return 'Start with the theory section, then take the quiz again.'
}

const FOCUSABLE = 'button:not([disabled]), a[href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'

export default function QuizModal() {
  const { closeQuiz } = useQuiz()
  const { stop, start } = useSmoothScroll()
  const dialogRef = useRef(null)
  const questionRef = useRef(null)
  const nextRef = useRef(null)
  const firstRender = useRef(true)

  const [questions, setQuestions] = useState(buildQuiz)
  const [answers, setAnswers] = useState([])
  const [index, setIndex] = useState(0)
  const [done, setDone] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)

  const isMobile = useMemo(() => window.matchMedia('(max-width: 640px)').matches, [])
  const total = questions.length
  const q = questions[index]
  const picked = answers[index] ?? null
  const answered = picked !== null
  const score = answers.reduce((n, a, i) => n + (a === questions[i]?.correctIndex ? 1 : 0), 0)

  /* Scroll lock, Lenis stop, focus return. */
  useEffect(() => {
    const opener = document.activeElement
    const html = document.documentElement
    const prevOverflow = html.style.overflow
    html.style.overflow = 'hidden'
    stop()
    dialogRef.current?.focus({ preventScroll: true })
    return () => {
      html.style.overflow = prevOverflow
      start()
      if (opener && typeof opener.focus === 'function') opener.focus({ preventScroll: true })
    }
  }, [stop, start])

  const choose = useCallback(
    (i) => {
      if (answered || done) return
      setAnswers((prev) => {
        const next = prev.slice()
        next[index] = i
        return next
      })
    },
    [answered, done, index],
  )

  const next = useCallback(() => {
    if (!answered) return
    if (index < total - 1) setIndex(index + 1)
    else setDone(true)
  }, [answered, index, total])

  const restart = useCallback(() => {
    setQuestions(buildQuiz())
    setAnswers([])
    setIndex(0)
    setDone(false)
    setReviewOpen(false)
  }, [])

  /* Keyboard: Esc closes, 1-4 / A-D answer, Tab is trapped inside the dialog. */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeQuiz()
        return
      }
      if (e.key === 'Tab') {
        const root = dialogRef.current
        if (!root) return
        const nodes = Array.from(root.querySelectorAll(FOCUSABLE)).filter((n) => n.offsetParent !== null)
        if (!nodes.length) {
          e.preventDefault()
          root.focus()
          return
        }
        const first = nodes[0]
        const last = nodes[nodes.length - 1]
        const active = document.activeElement
        if (!root.contains(active)) {
          e.preventDefault()
          first.focus()
        } else if (e.shiftKey && (active === first || active === root)) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && active === last) {
          e.preventDefault()
          first.focus()
        }
        return
      }
      if (e.metaKey || e.ctrlKey || e.altKey || done || answered || !q) return
      const k = e.key.toLowerCase()
      let i = -1
      if (/^[1-9]$/.test(k)) i = Number(k) - 1
      else if (/^[a-f]$/.test(k)) i = k.charCodeAt(0) - 97
      if (i >= 0 && i < q.options.length) {
        e.preventDefault()
        choose(i)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [closeQuiz, choose, done, answered, q])

  /* Keep focus inside the dialog if something else grabs it. */
  useEffect(() => {
    const onFocusIn = (e) => {
      const root = dialogRef.current
      if (root && !root.contains(e.target)) root.focus({ preventScroll: true })
    }
    document.addEventListener('focusin', onFocusIn)
    return () => document.removeEventListener('focusin', onFocusIn)
  }, [])

  /* After answering, move focus to the next button; on a new question, to the question. */
  useEffect(() => {
    if (answered) nextRef.current?.focus({ preventScroll: true })
  }, [answered, index])

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    if (!answered) questionRef.current?.focus({ preventScroll: true })
  }, [index, done]) // eslint-disable-line react-hooks/exhaustive-deps

  const progress = done ? 1 : (index + (answered ? 1 : 0)) / total

  const dialogMotion = isMobile
    ? {
        initial: { y: '100%' },
        animate: { y: 0 },
        exit: { y: '100%' },
        transition: { type: 'spring', damping: 34, stiffness: 340 },
      }
    : {
        initial: { opacity: 0, scale: 0.95, y: 14 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.97, y: 8 },
        transition: { duration: 0.3, ease: EASE },
      }

  return (
    <motion.div
      className="quiz-root"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeQuiz()
      }}
    >
      <motion.div
        ref={dialogRef}
        className="quiz-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quiz-title"
        tabIndex={-1}
        {...dialogMotion}
      >
        <div className="quiz-grab" aria-hidden="true" />
        <header className="quiz-head">
          <div>
            <h2 id="quiz-title">Quiz: congestion control</h2>
            <p className="quiz-count mono" aria-live="polite">
              {done ? 'Results' : `Question ${index + 1} of ${total}`}
            </p>
          </div>
          <button type="button" className="quiz-close" onClick={closeQuiz} aria-label="Close quiz">
            <CrossIcon />
          </button>
        </header>
        <div className="quiz-progress" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={Math.round(progress * total)} aria-label="Quiz progress">
          <motion.span
            className="quiz-progress-bar"
            initial={false}
            animate={{ scaleX: progress }}
            transition={{ duration: 0.5, ease: EASE }}
          />
        </div>

        <div className="quiz-body" data-lenis-prevent>
          <AnimatePresence mode="wait" initial={false}>
            {!done && q ? (
              <motion.div
                key={`q-${q.id}-${index}`}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.25, ease: EASE }}
              >
                <p className="quiz-question" ref={questionRef} tabIndex={-1}>
                  {q.question}
                </p>
                <div className="quiz-options" role="group" aria-label="Answer options">
                  {q.options.map((text, i) => {
                    const isCorrect = answered && i === q.correctIndex
                    const isWrong = answered && i === picked && i !== q.correctIndex
                    const cls = ['quiz-option', isCorrect && 'is-correct', isWrong && 'is-wrong', answered && !isCorrect && !isWrong && 'is-dim']
                      .filter(Boolean)
                      .join(' ')
                    return (
                      <motion.button
                        key={text}
                        type="button"
                        className={cls}
                        aria-disabled={answered || undefined}
                        onClick={() => choose(i)}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, ease: EASE, delay: 0.05 + i * 0.05 }}
                        whileTap={answered ? undefined : { scale: 0.985 }}
                      >
                        <span className="quiz-letter mono">{LETTERS[i]}</span>
                        <span className="quiz-option-text">{text}</span>
                        <span className="quiz-mark" aria-hidden="true">
                          {isCorrect && <CheckIcon />}
                          {isWrong && <CrossIcon />}
                        </span>
                        {(isCorrect || isWrong) && <span className="sr-only">{isCorrect ? 'Correct answer' : 'Your answer, incorrect'}</span>}
                      </motion.button>
                    )
                  })}
                </div>
                <div role="status" aria-live="polite">
                  <AnimatePresence initial={false}>
                    {answered && (
                      <motion.div
                        key="explain"
                        className="quiz-explain-wrap"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease: EASE }}
                      >
                        <div className={picked === q.correctIndex ? 'quiz-explain is-ok' : 'quiz-explain is-bad'}>
                          <strong>{picked === q.correctIndex ? 'Correct.' : 'Not quite.'}</strong> {q.explanation}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="results"
                className="quiz-results"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: EASE }}
              >
                <ScoreRing score={score} total={total} />
                <p className="quiz-verdict" ref={questionRef} tabIndex={-1}>
                  {verdict(score, total)}
                </p>
                <p className="quiz-sub">
                  {score} correct, {total - score} missed.
                </p>
                <button
                  type="button"
                  className="quiz-review-toggle"
                  aria-expanded={reviewOpen}
                  aria-controls="quiz-review"
                  onClick={() => setReviewOpen((v) => !v)}
                >
                  <span>{reviewOpen ? 'Hide review' : 'Review all questions'}</span>
                  <motion.svg animate={{ rotate: reviewOpen ? 180 : 0 }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M6 9l6 6 6-6" />
                  </motion.svg>
                </button>
                <AnimatePresence initial={false}>
                  {reviewOpen && (
                    <motion.ol
                      id="quiz-review"
                      className="quiz-review"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.4, ease: EASE }}
                    >
                      {questions.map((item, i) => {
                        const a = answers[i]
                        const ok = a === item.correctIndex
                        return (
                          <li key={item.id} className={ok ? 'is-ok' : 'is-bad'}>
                            <span className="quiz-review-icon" aria-hidden="true">{ok ? <CheckIcon /> : <CrossIcon />}</span>
                            <div>
                              <p className="quiz-review-q">
                                <span className="mono">{i + 1}.</span> {item.question}
                              </p>
                              {!ok && (
                                <p className="quiz-review-a">
                                  Your answer: <span className="is-bad-text">{a != null ? item.options[a] : 'No answer'}</span>
                                </p>
                              )}
                              <p className="quiz-review-a">
                                Correct answer: <span className="is-ok-text">{item.options[item.correctIndex]}</span>
                              </p>
                              <p className="quiz-review-e">{item.explanation}</p>
                            </div>
                          </li>
                        )
                      })}
                    </motion.ol>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <footer className="quiz-foot">
          {done ? (
            <>
              <button type="button" className="btn-ghost" onClick={closeQuiz}>
                Close
              </button>
              <button type="button" className="btn" onClick={restart}>
                Try again
              </button>
            </>
          ) : (
            <>
              <p className="quiz-keys" aria-hidden="true">
                <span className="kbd">1</span>
                <span className="kbd">2</span>
                <span className="kbd">3</span>
                <span className="kbd">4</span>
                <span>to answer</span>
                <span className="kbd">Esc</span>
                <span>to close</span>
              </p>
              <button ref={nextRef} type="button" className="btn" onClick={next} disabled={!answered}>
                {index === total - 1 ? 'See results' : 'Next question'}
              </button>
            </>
          )}
        </footer>
      </motion.div>
    </motion.div>
  )
}
