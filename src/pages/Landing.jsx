import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Footer from '../components/Footer'
import Reveal from '../components/Reveal'
import HeroTopology from '../components/HeroTopology'
import NetworkDiagram from '../components/NetworkDiagram'
import MechanismTabs from '../components/MechanismTabs'
import { useQuiz } from '../components/QuizContext'
import {
  experiment,
  problemStatement,
  resources,
  theoryIntro,
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

export default function Landing() {
  const { openQuiz } = useQuiz()
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

  return (
    <main className="landing">
      <div className="wrap">
        <section className="hero">
          <div className="hero-text">
            <p className="hero-module">{experiment.module}</p>
            <p className="hero-module">{experiment.unit}</p>
            <h1 className="hero-title">Congestion control algorithms</h1>
            <p className="hero-lede">
              Read the theory, study the campus network design, then run a live
              simulation of leaky bucket, token bucket, choke packets and RED on
              a congested campus router.
            </p>
            <p className="hero-actions">
              <Link className="btn" to="/simulator">
                Open the simulator
              </Link>
              <button type="button" className="btn-ghost" onClick={openQuiz}>
                Take the quiz
              </button>
            </p>
          </div>
          <div className="hero-diagram">
            <HeroTopology />
          </div>
        </section>

        <div className="landing-cols">
          <nav className="section-index" aria-label="Experiment sections">
            <ol>
              {SECTIONS.map((s) => (
                <li key={s.id} className={current === s.id ? 'is-current' : ''}>
                  <a href={`#${s.id}`} aria-current={current === s.id ? 'true' : undefined}>
                    <span className="mono index-num">{s.num}</span> {s.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="landing-content">
            <section id="aim" className="lab-section" aria-labelledby="aim-h">
              <h2 id="aim-h"><span className="mono sec-num">01</span> Aim</h2>
              <p>{experiment.aim}</p>
            </section>

            <section id="problem" className="lab-section" aria-labelledby="problem-h">
              <h2 id="problem-h"><span className="mono sec-num">02</span> Problem statement</h2>
              {problemStatement.scenario.map((p) => (
                <p key={p.slice(0, 24)}>{p}</p>
              ))}
              <dl className="objectives">
                {problemStatement.objectives.map((o) => (
                  <div key={o.metric}>
                    <dt>{o.metric}</dt>
                    <dd>{o.target}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section id="requirements" className="lab-section" aria-labelledby="req-h">
              <h2 id="req-h"><span className="mono sec-num">03</span> Network requirements</h2>
              <ul className="checklist">
                {problemStatement.requirements.map((r) => (
                  <li key={r.slice(0, 32)}>{r}</li>
                ))}
              </ul>
            </section>

            <section id="resources" className="lab-section" aria-labelledby="res-h">
              <h2 id="res-h"><span className="mono sec-num">04</span> Resources</h2>
              <div className="resource-cols">
                <div>
                  <h3>Hardware</h3>
                  <ul className="plain-list">
                    {resources.hardware.map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3>Software</h3>
                  <ul className="plain-list">
                    {resources.software.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3>References</h3>
                  <ol className="ref-list">
                    {resources.references.map((r) => (
                      <li key={r.slice(0, 32)}>{r}</li>
                    ))}
                  </ol>
                </div>
              </div>
            </section>

            <section id="theory" className="lab-section" aria-labelledby="theory-h">
              <h2 id="theory-h"><span className="mono sec-num">05</span> Theory</h2>
              {theoryIntro.map((t) => (
                <div key={t.heading} className="theory-block">
                  <h3>{t.heading}</h3>
                  {t.body.map((p) => (
                    <p key={p.slice(0, 32)}>{p}</p>
                  ))}
                </div>
              ))}
              <MechanismTabs />
              <h3 className="table-title">Mechanism comparison</h3>
              <div className="table-scroll">
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
                        {row.map((cell, i) => (
                          i === 0 ? <th key={cell} scope="row">{cell}</th> : <td key={`${row[0]}-${i}`}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section id="design" className="lab-section" aria-labelledby="design-h">
              <h2 id="design-h"><span className="mono sec-num">06</span> Network design</h2>
              <Reveal>
                <figure className="diagram-figure">
                  <NetworkDiagram />
                  <figcaption>Figure 1 — Campus network with bottleneck WAN link at gateway router R1</figcaption>
                </figure>
              </Reveal>
              <p>
                <a href="/network-diagram.svg" download>
                  Download diagram (SVG)
                </a>
              </p>
              <div className="table-scroll">
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
            </section>

            <section id="procedure" className="lab-section" aria-labelledby="proc-h">
              <h2 id="proc-h"><span className="mono sec-num">07</span> Procedure</h2>
              <ol className="procedure-list">
                {procedure.map((p) => (
                  <li key={p.slice(0, 32)}>{p}</li>
                ))}
              </ol>
            </section>

            <Reveal>
              <section className="cta-band" aria-labelledby="cta-h">
                <h2 id="cta-h">Run the experiment</h2>
                <p>Compare every mechanism on identical traffic and export the measurements.</p>
                <Link className="btn" to="/simulator">
                  Open the simulator
                </Link>
              </section>
            </Reveal>
          </div>
        </div>
      </div>
      <Footer>
        <button type="button" className="btn-ghost" onClick={openQuiz}>
          Take the quiz
        </button>
      </Footer>
    </main>
  )
}
