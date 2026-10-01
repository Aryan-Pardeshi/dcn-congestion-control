import { AnimatePresence, motion } from 'framer-motion';
import { ALGORITHMS, ALGORITHM_GROUPS } from './algorithms/index.js';
import { mechanisms } from '../content/theory.js';
import { Icon, Segmented, Slider } from './ui.jsx';
import './ControlPanel.css';

const RANGES = {
  leaky: [
    { key: 'bucketSize', min: 5, max: 80, step: 1 },
    { key: 'leakRate', min: 0.5, max: 8, step: 0.5 },
  ],
  token: [
    { key: 'tokenRate', min: 0.5, max: 8, step: 0.5 },
    { key: 'bucketCapacity', min: 5, max: 60, step: 1 },
    { key: 'queueSize', min: 5, max: 80, step: 1 },
  ],
  choke: [
    { key: 'threshold', min: 0.3, max: 0.95, step: 0.05 },
    { key: 'reduceFactor', min: 0.2, max: 0.9, step: 0.05 },
    { key: 'recoveryStep', min: 0.01, max: 0.2, step: 0.01 },
    { key: 'holdTicks', min: 1, max: 30, step: 1 },
  ],
  red: [
    { key: 'minTh', min: 1, max: 39, step: 1 },
    { key: 'maxTh', min: 2, max: 100, step: 1 },
    { key: 'maxP', min: 0.01, max: 0.5, step: 0.01 },
    { key: 'weight', min: 0.01, max: 1, step: 0.01 },
  ],
};

const DECIMALS = { threshold: 2, reduceFactor: 2, recoveryStep: 2, maxP: 2, weight: 2, leakRate: 1, tokenRate: 1 };

const CAT_TONE = {
  Baseline: 'base',
  'Traffic shaping': 'shape',
  'Feedback congestion control': 'feedback',
  'Active queue management': 'aqm',
};

const PATTERNS = [
  { value: 'constant', label: 'constant' },
  { value: 'bursty', label: 'bursty' },
  { value: 'random', label: 'random' },
];

const SPEEDS = [0.5, 1, 2, 4].map((s) => ({ value: s, label: `${s}×` }));

function labelFor(algoId, key) {
  const m = mechanisms.find((x) => x.id === algoId);
  const p = m?.simParams?.find((x) => x.key === key);
  return p ? { label: p.label, meaning: p.meaning } : { label: key, meaning: '' };
}

function Section({ title, children }) {
  return (
    <section className="cp-sec">
      <header className="cp-sec-head">
        <h3>{title}</h3>
      </header>
      {children}
    </section>
  );
}

function OfferedMeter({ offered, capacity }) {
  const over = offered > capacity;
  const scale = Math.max(offered, capacity, 0.1) * 1.2;
  return (
    <div className={`meter${over ? ' over' : ''}`}>
      <div className="meter-text">
        Offered <b className="tnum">{offered.toFixed(1)}</b> vs capacity <b className="tnum">{capacity.toFixed(1)}</b> pkt/tick
      </div>
      <div className="meter-track" role="img" aria-label={`Offered load ${offered.toFixed(1)} against capacity ${capacity.toFixed(1)} packets per tick`}>
        <div className="meter-fill" style={{ width: `${(offered / scale) * 100}%` }} />
        <div className="meter-cap" style={{ left: `${(capacity / scale) * 100}%` }} />
      </div>
      <p className="meter-note">{over ? 'Offered load exceeds the link, so a queue will build.' : 'The link can carry the offered load.'}</p>
    </div>
  );
}

export default function ControlPanel({
  config, setConfig, updateParam, updateSource,
  running, toggle, stepOnce, reset, speed, setSpeed, injectBurst,
}) {
  const algo = ALGORITHMS[config.algorithm];
  const offered = config.sources.reduce((a, s) => a + Number(s.rate || 0), 0);

  return (
    <div className="cp">
      <Section title="Mechanism">
        <div className="mopt-list" role="radiogroup" aria-label="Congestion control mechanism">
          {ALGORITHM_GROUPS.flatMap((g) => g.ids).map((id) => {
            const a = ALGORITHMS[id];
            const on = config.algorithm === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={on}
                className={`mopt${on ? ' on' : ''}`}
                onClick={() => setConfig({ algorithm: id })}
              >
                {on && <motion.span layoutId="mopt-hl" className="mopt-hl" transition={{ type: 'spring', stiffness: 520, damping: 40 }} />}
                <span className="mopt-name">{a.name}</span>
                <span className={`cat cat-${CAT_TONE[a.category]}`}>{a.category}</span>
              </button>
            );
          })}
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={config.algorithm}
            className="cp-hint"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            {algo?.short}
          </motion.p>
        </AnimatePresence>
      </Section>

      <Section title="Run">
        <div className="run-row">
          <button type="button" className="btn run-primary" onClick={toggle} aria-pressed={running}>
            <Icon name={running ? 'pause' : 'play'} />
            <span>{running ? 'Pause' : 'Play'}</span>
          </button>
          <button type="button" className="btn-ghost run-sec" onClick={stepOnce} title="Advance one tick">
            <Icon name="step" />
            <span>Step</span>
          </button>
          <button type="button" className="btn-ghost run-sec" onClick={reset} title="Restart from tick 0">
            <Icon name="reset" />
            <span>Reset</span>
          </button>
        </div>
        <div className="cp-label-row">
          <span className="cp-label">Speed</span>
        </div>
        <Segmented options={SPEEDS} value={speed} onChange={setSpeed} ariaLabel="Simulation speed" />
        <button type="button" className="btn-ghost burst" onClick={() => injectBurst()}>
          <Icon name="bolt" />
          <span>Inject burst</span>
        </button>
        <ul className="shortcuts" aria-label="Keyboard shortcuts">
          <li><kbd className="kbd">Space</kbd> play or pause</li>
          <li><kbd className="kbd">S</kbd> step</li>
          <li><kbd className="kbd">R</kbd> reset</li>
          <li><kbd className="kbd">B</kbd> burst</li>
        </ul>
      </Section>

      <Section title="Traffic sources">
        {config.sources.map((s, i) => (
          <div key={s.id || i} className="src">
            <div className="src-head">
              <span className="src-id">{s.id}</span>
              <span className="src-name">{s.label}</span>
              <span className="src-rate tnum">{Number(s.rate).toFixed(1)} pkt/tick</span>
            </div>
            <Slider
              label={`${s.id} rate`}
              hideLabel
              value={s.rate}
              min={0}
              max={5}
              step={0.1}
              onChange={(v) => updateSource(i, { rate: v })}
            />
            <Segmented
              size="sm"
              options={PATTERNS}
              value={s.pattern}
              onChange={(v) => updateSource(i, { pattern: v })}
              ariaLabel={`${s.id} traffic pattern`}
            />
          </div>
        ))}
        <OfferedMeter offered={offered} capacity={Number(config.linkCapacity)} />
      </Section>

      <Section title="Router and link">
        <Slider label="Buffer size" value={config.bufferSize} min={10} max={100} step={1}
          display={`${config.bufferSize} pkt`} onChange={(v) => setConfig({ bufferSize: v })} />
        <Slider label="Link capacity" value={config.linkCapacity} min={1} max={10} step={1}
          display={`${config.linkCapacity} pkt/tick`} onChange={(v) => setConfig({ linkCapacity: v })} />
      </Section>

      <Section title="Mechanism parameters">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={config.algorithm}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {config.algorithm === 'none' ? (
              <p className="cp-hint cp-hint-flush">No parameters. Packets are tail-dropped when the buffer is full.</p>
            ) : (
              (RANGES[config.algorithm] || []).map((r) => {
                const { label, meaning } = labelFor(config.algorithm, r.key);
                const val = config.params?.[config.algorithm]?.[r.key];
                let { min, max } = r;
                if (config.algorithm === 'red' && r.key === 'minTh') max = Math.max(min, (config.params.red.maxTh ?? 24) - 1);
                if (config.algorithm === 'red' && r.key === 'maxTh') min = Math.min(max, (config.params.red.minTh ?? 8) + 1);
                const dec = DECIMALS[r.key] ?? 0;
                return (
                  <Slider
                    key={r.key}
                    label={label}
                    hint={meaning}
                    value={val}
                    min={min}
                    max={max}
                    step={r.step}
                    tone={config.algorithm === 'token' ? 'token' : config.algorithm === 'choke' ? 'warn' : undefined}
                    display={Number(val).toFixed(dec)}
                    onChange={(v) => updateParam(config.algorithm, r.key, v)}
                  />
                );
              })
            )}
          </motion.div>
        </AnimatePresence>
        <p className="cp-note">Changing a parameter restarts the run.</p>
      </Section>

      <Section title="Random seed">
        <div className="seed-row">
          <input
            className="seed-input tnum"
            type="number"
            inputMode="numeric"
            value={config.seed}
            onChange={(e) => setConfig({ seed: Number(e.target.value) || 0 })}
            aria-label="Random seed"
          />
          <button type="button" className="btn-ghost" onClick={() => setConfig({ seed: Math.floor(Math.random() * 100000) })}>
            <Icon name="dice" />
            <span>Randomise</span>
          </button>
        </div>
        <p className="cp-note">The same seed always produces the same traffic.</p>
      </Section>
    </div>
  );
}
