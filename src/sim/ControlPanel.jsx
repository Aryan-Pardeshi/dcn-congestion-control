import { useEffect } from 'react';
import { ALGORITHMS, ALGORITHM_GROUPS } from './algorithms/index.js';
import { mechanisms } from '../content/theory.js';

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

function labelFor(algoId, key) {
  const m = mechanisms.find((x) => x.id === algoId);
  const p = m?.simParams?.find((x) => x.key === key);
  return p ? { label: p.label, meaning: p.meaning } : { label: key, meaning: '' };
}

export default function ControlPanel({
  config, setConfig, updateParam, updateSource,
  running, toggle, stepOnce, reset, speed, setSpeed, injectBurst,
}) {
  const algo = ALGORITHMS[config.algorithm];

  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return;
      if (e.code === 'Space') { e.preventDefault(); toggle(); }
      else if (e.key === 's' || e.key === 'S') stepOnce();
      else if (e.key === 'r' || e.key === 'R') reset();
      else if (e.key === 'b' || e.key === 'B') injectBurst();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle, stepOnce, reset, injectBurst]);

  const offered = config.sources.reduce((a, s) => a + Number(s.rate || 0), 0);
  const overloaded = offered > config.linkCapacity;

  return (
    <div className="ctrl">
      <fieldset>
        <legend>Mechanism</legend>
        <select
          value={config.algorithm}
          onChange={(e) => setConfig({ algorithm: e.target.value })}
          aria-label="Congestion control mechanism"
        >
          <option value="none">No control</option>
          {ALGORITHM_GROUPS.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.ids.filter((id) => id !== 'none').map((id) => (
                <option key={id} value={id}>{ALGORITHMS[id].name}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <p className="ctrl-hint">{algo?.short}</p>
      </fieldset>

      <fieldset>
        <legend>Run controls</legend>
        <div className="ctrl-row">
          <button type="button" className="btn" onClick={toggle}>{running ? 'Pause' : 'Play'}</button>
          <button type="button" className="btn-ghost" onClick={stepOnce}>Step</button>
          <button type="button" className="btn-ghost" onClick={reset}>Reset</button>
        </div>
        <div className="seg" role="group" aria-label="Speed">
          {[0.5, 1, 2, 4].map((s) => (
            <button key={s} type="button" className={speed === s ? 'on' : ''} onClick={() => setSpeed(s)} aria-pressed={speed === s}>
              {s}×
            </button>
          ))}
        </div>
        <button type="button" className="btn-ghost burst" onClick={() => injectBurst()}>Inject burst</button>
        <p className="ctrl-hint mono">Space play/pause · S step · R reset · B burst</p>
      </fieldset>

      <fieldset>
        <legend>Traffic sources</legend>
        {config.sources.map((s, i) => (
          <div key={s.id || i} className="src">
            <div className="src-head">
              <span>{s.id}</span>
              <span className="mono">{Number(s.rate).toFixed(1)} pkt/t</span>
            </div>
            <label>Rate
              <input type="range" min={0} max={5} step={0.1} value={s.rate}
                onChange={(e) => updateSource(i, { rate: Number(e.target.value) })} aria-label={`${s.id} rate`} />
            </label>
            <label>Pattern
              <select value={s.pattern} onChange={(e) => updateSource(i, { pattern: e.target.value })} aria-label={`${s.id} pattern`}>
                <option value="constant">constant</option>
                <option value="bursty">bursty</option>
                <option value="random">random</option>
              </select>
            </label>
          </div>
        ))}
        <p className={overloaded ? 'offered over mono' : 'offered mono'}>
          Offered {offered.toFixed(1)} pkt/t vs capacity {Number(config.linkCapacity).toFixed(1)} pkt/t
        </p>
      </fieldset>

      <fieldset>
        <legend>Router and link</legend>
        <label>Buffer size <span className="mono">{config.bufferSize}</span>
          <input type="range" min={10} max={100} step={1} value={config.bufferSize}
            onChange={(e) => setConfig({ bufferSize: Number(e.target.value) })} aria-label="Buffer size" />
        </label>
        <label>Link capacity <span className="mono">{config.linkCapacity} pkt/t</span>
          <input type="range" min={1} max={10} step={1} value={config.linkCapacity}
            onChange={(e) => setConfig({ linkCapacity: Number(e.target.value) })} aria-label="Link capacity" />
        </label>
      </fieldset>

      <fieldset>
        <legend>Mechanism parameters</legend>
        {config.algorithm === 'none' ? (
          <p className="ctrl-hint">No parameters — packets are tail-dropped when the buffer is full.</p>
        ) : (
          (RANGES[config.algorithm] || []).map((r) => {
            const { label, meaning } = labelFor(config.algorithm, r.key);
            const val = config.params?.[config.algorithm]?.[r.key];
            let { min, max } = r;
            if (config.algorithm === 'red' && r.key === 'minTh') max = Math.max(min, (config.params.red.maxTh ?? 24) - 1);
            if (config.algorithm === 'red' && r.key === 'maxTh') min = Math.min(max, (config.params.red.minTh ?? 8) + 1);
            return (
              <label key={r.key} title={meaning}>{label} <span className="mono">{val}</span>
                <input type="range" min={min} max={max} step={r.step} value={val}
                  onChange={(e) => updateParam(config.algorithm, r.key, Number(e.target.value))}
                  aria-label={label} />
              </label>
            );
          })
        )}
      </fieldset>

      <fieldset>
        <legend>Seed</legend>
        <div className="ctrl-row">
          <input type="number" value={config.seed} onChange={(e) => setConfig({ seed: Number(e.target.value) })} aria-label="Random seed" />
          <button type="button" className="btn-ghost" onClick={() => setConfig({ seed: Math.floor(Math.random() * 100000) })}>Randomise</button>
        </div>
      </fieldset>
    </div>
  );
}
