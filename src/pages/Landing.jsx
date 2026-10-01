import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import Footer from '../components/Footer'
import Reveal, { Stagger, StaggerItem } from '../components/Reveal'
import HeroTopology from '../components/HeroTopology'
import NetworkDiagram from '../components/NetworkDiagram'
import MechanismTabs from '../components/MechanismTabs'
import CountUp from '../components/anim/CountUp'
import { useQuiz } from '../components/QuizContext'
import { quizBank } from '../content/quizBank'
import {
  experiment,
  problemStatement,
  resources,
  theoryIntro,
  mechanisms,
  comparison,
  addressing,
  procedure,
} from '../content/theory'
import './Landing.css'

const SECTIONS = [
  { id: 'aim', num: '01', label: 'Aim' },
  { id: 'problem', num: '02', label: 'Problem statement' },
  { id: 'requirements', num: '03', label: 'Network requirements' },
  { id: 'resources', num: '04', label: 'Resources' },
  { id: 'theory', num: '05', label: 'Theory' },
  { id: 'design', num: '06', label: 'Network design' },
  { id: 'procedure', num: '07', label: 'Procedure' },
]

const STATS = [
  { value: mechanisms.length, label: 'Mechanisms compared' },
  { value: 3, label: 'Campus LANs' },
  { value: 10, suffix: ' Mbps', label: 'Bottleneck WAN link' },
  { value: quizBank.length, label: 'Quiz questions' },
]

const HERO_WORDS = ['Congestion', 'control', 'algorithms']
const EASE = [0.16, 1, 0.3, 1]

function categoryClass(cat) {
  if (cat === 'Traffic shaping') return 'mech-badge mech-badge-shaping'
  if (cat === 'Feedback congestion control') return 'mech-badge mech-badge-feedback'
  if (cat === 'Active queue management') return 'mech-badge mech-badge-aqm'
  return 'mech-badge mech-badge-base'
}

function Section({ id, num, title, children }) {
  return (
    <section id={id} className="lab-section" aria-labelledby={`${id}-h`}>
      <Reveal>
        <header className="sec-head">
          <span className="sec-num mono">{num}</span>
          <h2 id={`${id}-h`}>{title}</h2>
        </header>
      </Reveal>
      {children}
    </section>
  )
}

function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  )
}

export default function Landing() {
  const { openQuiz } = useQuiz()
  const reduce = useReducedMotion()
  const [current, setCurrent] = useState('aim')

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setCurrent(e.target.id)
        })
      },
      { rootMargin: '-30% 0px -60% 0px' },
    )
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) obs.observe(el)
    })
    return () => obs.disconnect()
  }, [])

  /* On narrow screens the index is a horizontal strip: keep the active chip in view inside the strip only. */
  useEffect(() => {
    const strip = document.querySelector('.section-index ol')
    const chip = strip?.querySelector('a[aria-current="true"]')
    if (!strip || !chip || strip.scrollWidth <= strip.clientWidth) return
    strip.scrollTo({ left: chip.offsetLeft - (strip.clientWidth - chip.offsetWidth) / 2, behavior: reduce ? 'auto' : 'smooth' })
  }, [current, reduce])

  const heroMotion = (delay, y = 14) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y, filter: 'blur(8px)' },
          animate: { opacity: 1, y: 0, filter: 'blur(0px)', transitionEnd: { filter: 'none' } },
          transition: { duration: 0.8, ease: EASE, delay },
        }

  return (
    <main className="landing">
      <section className="hero" aria-labelledby="hero-title">
        <div className="grid-bg" aria-hidden="true" />
        <div className="glow-bg hero-glow" aria-hidden="true" />
        <div className="wrap hero-inner">
          <h1 id="hero-title" className="hero-title" aria-label="Congestion control algorithms">
            {HERO_WORDS.map((w, i) => (
              <motion.span
                key={w}
                className="hero-word gradient-text"
                aria-hidden="true"
                {...(reduce
                  ? {}
                  : {
                      initial: { opacity: 0, y: 28, filter: 'blur(14px)' },
                      animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
                      transition: { duration: 0.9, ease: EASE, delay: 0.1 + i * 0.1 },
                    })}
              >
                {w}
              </motion.span>
            ))}
          </h1>
          <motion.p className="hero-lede" {...heroMotion(0.5)}>
            Read the theory, study the campus network design, then run a live
            simulation of leaky bucket, token bucket, choke packets and RED on
            a congested campus router.
          </motion.p>
          <motion.div className="hero-actions" {...heroMotion(0.62)}>
            <Link className="btn btn-lg" to="/simulator">
              Open the simulator
            </Link>
            <button type="button" className="btn-ghost btn-lg" onClick={openQuiz}>
              Take the quiz
            </button>
          </motion.div>
          <motion.div className="hero-visual" {...heroMotion(0.8, 40)}>
            <HeroTopology />
          </motion.div>
        </div>
      </section>

      <div className="wrap">
        <Stagger className="stats" stagger={0.08}>
          {STATS.map((s) => (
            <StaggerItem key={s.label} className="stat spot">
              <p className="stat-num">
                <CountUp to={s.value} />
                {s.suffix && <span className="stat-suffix">{s.suffix}</span>}
              </p>
              <p className="stat-label">{s.label}</p>
            </StaggerItem>
          ))}
        </Stagger>

        <div className="landing-cols">
          <nav className="section-index" aria-label="Experiment sections">
            <ol>
              {SECTIONS.map((s) => (
                <li key={s.id} className={current === s.id ? 'is-current' : ''}>
                  <a href={`#${s.id}`} aria-current={current === s.id ? 'true' : undefined}>
                    {current === s.id && (
                      <motion.span
                        layoutId="rail-indicator"
                        className="rail-ind"
                        transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                      />
                    )}
                    <span className="mono index-num">{s.num}</span>
                    <span className="index-label">{s.label}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="landing-content">
            <Section id="aim" num="01" title="Aim">
              <Reveal delay={0.05}>
                <p className="aim-text">{experiment.aim}</p>
              </Reveal>
            </Section>

            <Section id="problem" num="02" title="Problem statement">
              <Stagger className="prose-stack" stagger={0.1}>
                {problemStatement.scenario.map((p) => (
                  <StaggerItem key={p.slice(0, 24)} as="p" className="body-copy">
                    {p}
                  </StaggerItem>
                ))}
              </Stagger>
              <h3 className="sub-head">Objectives</h3>
              <Stagger className="objectives" stagger={0.07}>
                {problemStatement.objectives.map((o) => (
                  <StaggerItem key={o.metric} className="objective spot">
                    <p className="objective-metric">{o.metric}</p>
                    <p className="objective-target">{o.target}</p>
                  </StaggerItem>
                ))}
              </Stagger>
            </Section>

            <Section id="requirements" num="03" title="Network requirements">
              <Stagger as="ul" className="checklist" stagger={0.05}>
                {problemStatement.requirements.map((r) => (
                  <StaggerItem as="li" key={r.slice(0, 32)} className="check-item">
                    <span className="check-icon" aria-hidden="true">
                      <Check />
                    </span>
                    <span>{r}</span>
                  </StaggerItem>
                ))}
              </Stagger>
            </Section>

            <Section id="resources" num="04" title="Resources">
              <Stagger className="resource-cols" stagger={0.08}>
                <StaggerItem className="resource-card spot">
                  <h3>Hardware</h3>
                  <ul className="plain-list">
                    {resources.hardware.map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                </StaggerItem>
                <StaggerItem className="resource-card spot">
                  <h3>Software</h3>
                  <ul className="plain-list">
                    {resources.software.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </StaggerItem>
                <StaggerItem className="resource-card resource-wide spot">
                  <h3>References</h3>
                  <ol className="ref-list">
                    {resources.references.map((r) => (
                      <li key={r.slice(0, 32)}>{r}</li>
                    ))}
                  </ol>
                </StaggerItem>
              </Stagger>
            </Section>

            <Section id="theory" num="05" title="Theory">
              <div className="theory-blocks">
                {theoryIntro.map((t) => (
                  <Reveal key={t.heading} className="theory-block">
                    <h3>{t.heading}</h3>
                    <div className="theory-body">
                      {t.body.map((p) => (
                        <p key={p.slice(0, 32)}>{p}</p>
                      ))}
                    </div>
                  </Reveal>
                ))}
              </div>
              <Reveal>
                <h3 className="sub-head">Congestion control mechanisms</h3>
                <MechanismTabs />
              </Reveal>
              <Reveal>
                <h3 className="sub-head table-title">Mechanism comparison</h3>
                <div className="table-scroll" tabIndex={0} role="region" aria-label="Mechanism comparison table">
                  <table className="data-table">
                    <thead>
                      <tr>
                        {comparison.columns.map((c) => (
                          <th key={c} scope="col">{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {comparison.rows.map((row) => (
                        <tr key={row[0]}>
                          {row.map((cell, i) =>
                            i === 0 ? (
                              <th key={cell} scope="row">{cell}</th>
                            ) : (
                              <td key={`${row[0]}-${i}`}>
                                {i === 1 ? <span className={categoryClass(cell)}>{cell}</span> : cell}
                              </td>
                            ),
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Reveal>
            </Section>

            <Section id="design" num="06" title="Network design">
              <Reveal>
                <figure className="diagram-figure">
                  <div className="diagram-bar">
                    <span className="diagram-dots" aria-hidden="true">
                      <i />
                      <i />
                      <i />
                    </span>
                    <span className="mono diagram-file">network-diagram.svg</span>
                    <a className="diagram-dl" href="/network-diagram.svg" download>
                      Download SVG
                    </a>
                  </div>
                  <div className="diagram-scroll">
                    <div className="diagram-canvas">
                      <NetworkDiagram />
                    </div>
                  </div>
                  <figcaption>Figure 1 — Campus network with bottleneck WAN link at gateway router R1</figcaption>
                </figure>
              </Reveal>
              <Reveal>
                <h3 className="sub-head table-title">Addressing table</h3>
                <div className="table-scroll" tabIndex={0} role="region" aria-label="Addressing table">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th scope="col">Device</th>
                        <th scope="col">Interface</th>
                        <th scope="col">IP address</th>
                        <th scope="col">Subnet</th>
                        <th scope="col">Link</th>
                      </tr>
                    </thead>
                    <tbody>
                      {addressing.map((a) => (
                        <tr key={`${a.device}-${a.interface}`}>
                          <td>{a.device}</td>
                          <td className="mono">{a.interface}</td>
                          <td className="mono">{a.ip}</td>
                          <td className="mono">{a.subnet}</td>
                          <td>{a.link}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Reveal>
            </Section>

            <Section id="procedure" num="07" title="Procedure">
              <Stagger as="ol" className="procedure-list" stagger={0.06}>
                {procedure.map((p, i) => (
                  <StaggerItem as="li" key={p.slice(0, 32)} className="procedure-step">
                    <span className="step-num mono">{String(i + 1).padStart(2, '0')}</span>
                    <span>{p}</span>
                  </StaggerItem>
                ))}
              </Stagger>
            </Section>

            <Reveal>
              <section className="cta-band spot" aria-labelledby="cta-h">
                <div className="grid-bg cta-grid" aria-hidden="true" />
                <h2 id="cta-h" className="gradient-text">Run the experiment</h2>
                <p>Compare every mechanism on identical traffic and export the measurements.</p>
                <div className="cta-actions">
                  <Link className="btn btn-lg" to="/simulator">
                    Open the simulator
                  </Link>
                  <button type="button" className="btn-ghost btn-lg" onClick={openQuiz}>
                    Take the quiz
                  </button>
                </div>
              </section>
            </Reveal>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  )
}
