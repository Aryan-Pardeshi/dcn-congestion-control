import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { compareAll } from './engine.js';
import BarChart from './BarChart.jsx';
import { Icon, Segmented } from './ui.jsx';
import { InfoTip, Hint } from './InfoTip.jsx';
import { HELP } from './help.js';
import './CompareView.css';

const CAT_COLOR = {
  Baseline: '--ink-dim',
  'Traffic shaping': '--token',
  'Feedback congestion control': '--warn',
  'Active queue management': '--flow',
};

const SHORT = { none: 'None', leaky: 'Leaky', token: 'Token', choke: 'Choke', red: 'RED' };
const TICK_OPTIONS = [300, 500, 1000].map((t) => ({ value: t, label: String(t) }));

// Only columns where "best" has a meaning. Generated is the same for every mechanism, so it is never highlighted.
const COLUMNS = [
  { key: 'delivered', label: 'Delivered', dir: 'high', fmt: (r) => r.delivered },
  { key: 'dropped', label: 'Lost', dir: 'low', fmt: (r) => r.dropped },
  { key: 'dropRate', label: 'Lost %', dir: 'low', fmt: (r) => (r.dropRate * 100).toFixed(1) },
  { key: 'avgQueue', label: 'Avg queue', dir: 'low', fmt: (r) => r.avgQueue.toFixed(1) },
  { key: 'avgDelay', label: 'Avg wait', dir: 'low', fmt: (r) => r.avgDelay.toFixed(2) },
  { key: 'throughput', label: 'Throughput', dir: 'high', fmt: (r) => r.throughput.toFixed(2) },
  { key: 'utilization', label: 'Link use %', dir: 'high', fmt: (r) => (r.utilization * 100).toFixed(1) },
];

function bestIds(rows, key, dir) {
  const vals = rows.map((r) => r[key]);
  const target = dir === 'low' ? Math.min(...vals) : Math.max(...vals);
  const ids = new Set(rows.filter((r) => Math.abs(r[key] - target) < 1e-9).map((r) => r.id));
  // if every mechanism ties there is nothing to highlight
  return ids.size === rows.length ? new Set() : ids;
}

const configKey = (c) => JSON.stringify({ s: c.seed, sources: c.sources, b: c.bufferSize, l: c.linkCapacity, p: c.params });

export default function CompareView({ config }) {
  const [ticks, setTicks] = useState(500);
  const [result, setResult] = useState(null); // { rows, ticks, key, seed }
  const [busy, setBusy] = useState(false);
  const timer = useRef(0);

  useEffect(() => () => clearTimeout(timer.current), []);

  const run = () => {
    setBusy(true);
    clearTimeout(timer.current);
    // yield a frame so the busy state paints, then compute (headless runs are fast)
    timer.current = setTimeout(() => {
      const rows = compareAll(config, ticks);
      setResult({ rows, ticks, key: configKey(config), seed: config.seed, run: (result?.run ?? 0) + 1 });
      setBusy(false);
    }, 280);
  };

  const rows = result?.rows;
  const stale = result && result.key !== configKey(config);

  const download = () => {
    if (!rows) return;
    const head = 'mechanism,category,generated,delivered,dropped,dropRatePct,avgQueue,avgDelay,throughput,utilisationPct';
    const lines = rows.map((r) => [
      `"${r.name}"`, `"${r.category}"`, r.generated, r.delivered, r.dropped,
      (r.dropRate * 100).toFixed(2), r.avgQueue.toFixed(2), r.avgDelay.toFixed(2),
      r.throughput.toFixed(3), (r.utilization * 100).toFixed(2),
    ].join(','));
    const blob = new Blob([[head, ...lines].join('\n'), '\n'], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'congestion-comparison.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const best = useMemo(() => {
    if (!rows) return {};
    const out = {};
    COLUMNS.forEach((c) => { out[c.key] = bestIds(rows, c.key, c.dir); });
    return out;
  }, [rows]);

  let observation = null;
  if (rows) {
    const lowQ = rows.reduce((a, b) => (b.avgQueue < a.avgQueue ? b : a));
    const lowD = rows.reduce((a, b) => (b.dropRate < a.dropRate ? b : a));
    observation = { lowQ, lowD };
  }

  const bar = (key, scale = 1) => (rows || []).map((r) => ({
    label: SHORT[r.id],
    full: r.name,
    value: r[key] * scale,
    colorVar: CAT_COLOR[r.category] || '--flow',
    best: best[key]?.has(r.id),
  }));

  return (
    <section className="compare panel" aria-label="Compare all mechanisms">
      <header className="compare-head">
        <div>
          <h2 className="compare-title">Compare all mechanisms <InfoTip tip={HELP.compare} thing="compare section" /></h2>
          <p className="compare-sub">
            Runs every mechanism on exactly the same traffic so you can see which loses fewer packets and which keeps the queue short.
            Same seed, sources, buffer and link as the simulator above.
          </p>
        </div>
        <div className="compare-actions">
          <div className="compare-ticks">
            <span className="compare-ticks-label">Ticks</span>
            <Segmented size="sm" options={TICK_OPTIONS} value={ticks} onChange={setTicks} ariaLabel="Number of ticks to simulate" />
          </div>
          <Hint tip={HELP.runComparison} thing="run comparison">
            <button type="button" className="btn compare-run" onClick={run} disabled={busy}>
              {busy ? <span className="spinner" aria-hidden="true" /> : <Icon name="play" />}
              <span>{busy ? 'Running' : rows ? 'Run again' : 'Run comparison'}</span>
            </button>
          </Hint>
          {rows && (
            <Hint tip={HELP.downloadCsv} thing="download CSV">
              <button type="button" className="btn-ghost compare-dl" onClick={download}>
                <Icon name="download" />
                <span>Download CSV</span>
              </button>
            </Hint>
          )}
        </div>
      </header>

      {!rows && !busy && (
        <div className="compare-empty">
          <Icon name="spark" size={18} />
          <p>Run the comparison to see drop rate, queue, delay and throughput side by side.</p>
        </div>
      )}
      {busy && !rows && (
        <div className="compare-skeleton" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => <span key={i} className="shimmer" />)}
        </div>
      )}

      {rows && (
        <div className={`compare-results${busy ? ' is-busy' : ''}`}>
          {stale && <p className="compare-stale">Settings changed since this run. Run again to refresh.</p>}
          <div className="bar-grid" key={result.run}>
            <BarChart title="Lost packets" caption="lower is better" unit="%" rows={bar('dropRate', 100)} tip={HELP.compareDropRate} />
            <BarChart title="Avg queue" caption="packets, lower is better" rows={bar('avgQueue')} delay={0.05} tip={HELP.compareAvgQueue} />
            <BarChart title="Avg wait" caption="steps, lower is better" decimals={2} rows={bar('avgDelay')} delay={0.1} tip={HELP.compareAvgDelay} />
            <BarChart title="Throughput" caption="pkt/step, higher is better" decimals={2} rows={bar('throughput')} delay={0.15} tip={HELP.compareThroughput} />
          </div>

          <motion.p
            key={`obs-${result.run}`}
            className="compare-obs"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
          >
            <b>{observation.lowQ.name}</b> had the lowest average queue ({observation.lowQ.avgQueue.toFixed(1)} packets); <b>{observation.lowD.name}</b> had the lowest drop rate ({(observation.lowD.dropRate * 100).toFixed(1)}%).
          </motion.p>

          <div className="table-wrap" data-lenis-prevent>
            <table className="compare-table">
              <thead>
                <tr>
                  <th className="col-name">Mechanism</th>
                  <th className="col-type">Type</th>
                  <th className="col-num">Sent</th>
                  {COLUMNS.map((c) => <th key={c.key} className="col-num">{c.label}</th>)}
                </tr>
              </thead>
              <tbody key={result.run}>
                {rows.map((r, i) => (
                  <motion.tr
                    key={r.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 + i * 0.07, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <th scope="row" className="col-name">
                      <span className="mech-cell">
                        <i style={{ background: `var(${CAT_COLOR[r.category] || '--flow'})` }} />
                        <span className="mech-cell-name">{r.name}</span>
                      </span>
                    </th>
                    <td className="col-type">{r.category}</td>
                    <td className="col-num">{r.generated}</td>
                    {COLUMNS.map((c) => (
                      <td key={c.key} className={`col-num${best[c.key]?.has(r.id) ? ' best' : ''}`}>{c.fmt(r)}</td>
                    ))}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="compare-legend"><i /> Best value in each column, shown for the {result.ticks}-tick run with seed {result.seed}.</p>
        </div>
      )}
    </section>
  );
}
