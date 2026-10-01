import { useCallback, useRef, useState } from 'react'
import { mechanisms } from '../content/theory'
import LeakyBucketAnim from './anim/LeakyBucketAnim'
import TokenBucketAnim from './anim/TokenBucketAnim'
import ChokeAnim from './anim/ChokeAnim'
import RedCurve from './anim/RedCurve'
import './MechanismTabs.css'

const ANIMS = {
  leaky: LeakyBucketAnim,
  token: TokenBucketAnim,
  choke: ChokeAnim,
  red: RedCurve,
}

function badgeClass(category) {
  if (category === 'Traffic shaping') return 'mech-badge mech-badge-shaping'
  if (category === 'Feedback congestion control') return 'mech-badge mech-badge-feedback'
  return 'mech-badge mech-badge-aqm'
}

export default function MechanismTabs() {
  const [active, setActive] = useState(0)
  const tabRefs = useRef([])

  const onKeyDown = useCallback(
    (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End') return
      e.preventDefault()
      let next = active
      if (e.key === 'ArrowRight') next = (active + 1) % mechanisms.length
      if (e.key === 'ArrowLeft') next = (active - 1 + mechanisms.length) % mechanisms.length
      if (e.key === 'Home') next = 0
      if (e.key === 'End') next = mechanisms.length - 1
      setActive(next)
      tabRefs.current[next]?.focus()
    },
    [active],
  )

  const m = mechanisms[active]
  const Anim = ANIMS[m.id]

  return (
    <div className="mech">
      <div role="tablist" aria-label="Congestion control mechanisms" className="mech-tabs" onKeyDown={onKeyDown}>
        {mechanisms.map((mech, i) => (
          <button
            key={mech.id}
            ref={(el) => {
              tabRefs.current[i] = el
            }}
            role="tab"
            id={`mech-tab-${mech.id}`}
            aria-selected={i === active}
            aria-controls={`mech-panel-${mech.id}`}
            tabIndex={i === active ? 0 : -1}
            className={i === active ? 'mech-tab is-active' : 'mech-tab'}
            onClick={() => setActive(i)}
          >
            <span className="mech-tab-name">{mech.name}</span>
            <span className={badgeClass(mech.category)}>{mech.category}</span>
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`mech-panel-${m.id}`}
        aria-labelledby={`mech-tab-${m.id}`}
        className="mech-panel"
        key={m.id}
      >
        <div className="mech-info">
          <p className="mech-summary">{m.summary}</p>
          <dl className="mech-meta">
            <div>
              <dt>Category</dt>
              <dd>{m.category}</dd>
            </div>
            <div>
              <dt>Loop</dt>
              <dd>{m.loop}</dd>
            </div>
            <div>
              <dt>Acts at</dt>
              <dd>{m.where}</dd>
            </div>
          </dl>
          <h4>How it works</h4>
          <ol className="mech-steps">
            {m.howItWorks.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          <div className="mono mech-formula">{m.formula}</div>
          <pre className="mono mech-pseudo">{m.pseudocode}</pre>
          <div className="mech-proscons">
            <div>
              <h4>Strengths</h4>
              <ul>
                {m.pros.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4>Weaknesses</h4>
              <ul>
                {m.cons.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <div className="mech-anim">
          <Anim />
        </div>
      </div>
    </div>
  )
}
