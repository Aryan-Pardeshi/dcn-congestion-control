import { useState } from 'react';
import { compareAll } from './engine.js';
import BarChart from './BarChart.jsx';

const CAT_COLOR = {
  Baseline: '--ink-dim',
  'Traffic shaping': '--token',
  'Feedback congestion control': '--warn',
  'Active queue management': '--flow',
};

function colorFor(cat) {
  return CAT_COLOR[cat] || '--flow';
}

export default function CompareView({ config }) {
  const [ticks, setTicks] = useState(500);
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(false);

  const run = () => {
    setBusy(true);
    setTimeout(() => {
      const res = compareAll(config, ticks);
      setRows(res);
      setBusy(false);
    }, 0);
  };

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

  const best = (key, cmp) => {
    if (!rows) return null;
    let b = rows[0];
    rows.forEach((r) => { if (cmp(r[key], b[key])) b = r; });
    return b.id;
  };
  const bestDrop = best('dropRate', (a, b) => a < b);
  const bestQueue = best('avgQueue', (a, b) => a < b);
  const bestDelay = best('avgDelay', (a, b) => a < b);
  const bestTput = best('throughput', (a, b) => a > b);
  const bestUtil = best('utilization', (a, b) => a > b);
  const bestDeliv = best('delivered', (a, b) => a > b);
  const bestGen = best('generated', (a, b) => a > b);
  const bestDropN = best('dropped', (a, b) => a < b);

  let observation = '';
  if (rows) {
    const lowQ = rows.reduce((a, b) => (b.avgQueue < a.avgQueue ? b : a));
    const lowD = rows.reduce((a, b) => (b.dropRate < a.dropRate ? b : a));
    observation = `${lowQ.name} had the lowest average queue (${lowQ.avgQueue.toFixed(1)} packets); ${lowD.name} had the lowest drop rate (${(lowD.dropRate * 100).toFixed(1)}%).`;
  }

  const barRows = (key) => (rows || []).map((r) => ({ label: r.name, value: r[key], colorVar: colorFor(r.category) }));

  return (
    <section className="compare" aria-label="Compare all mechanisms">
      <h2>Compare all mechanisms</h2>
      <p>Runs every mechanism headlessly for N ticks on identical traffic (same seed and sources).</p>
      <div className="compare-bar">
        <label>Ticks
          <select value={ticks} onChange={(e) => setTicks(Number(e.target.value))} aria-label="Comparison ticks">
            {[300, 500, 1000].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <button type="button" className="btn" onClick={run} disabled={busy}>{busy ? 'Running…' : 'Run comparison'}</button>
        {rows && <button type="button" className="btn-ghost" onClick={download}>Download CSV</button>}
      </div>
      {rows && (
        <>
          <div className="bar-grid">
            <BarChart title="Drop rate %" rows={barRows('dropRate').map((r) => ({ ...r, value: r.value * 100 }))} unit="%" />
            <BarChart title="Avg queue" rows={barRows('avgQueue')} />
            <BarChart title="Avg delay" rows={barRows('avgDelay')} />
            <BarChart title="Throughput" rows={barRows('throughput')} />
          </div>
          <p className="compare-obs">{observation}</p>
          <div className="table-wrap">
            <table className="compare-table mono">
              <thead>
                <tr>
                  <th>Mechanism</th><th>Category</th><th>Generated</th><th>Delivered</th><th>Dropped</th>
                  <th>Drop rate %</th><th>Avg queue</th><th>Avg delay</th><th>Throughput</th><th>Utilisation %</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td><td>{r.category}</td>
                    <td className={bestGen === r.id ? 'best' : ''}>{r.generated}</td>
                    <td className={bestDeliv === r.id ? 'best' : ''}>{r.delivered}</td>
                    <td className={bestDropN === r.id ? 'best' : ''}>{r.dropped}</td>
                    <td className={bestDrop === r.id ? 'best' : ''}>{(r.dropRate * 100).toFixed(1)}</td>
                    <td className={bestQueue === r.id ? 'best' : ''}>{r.avgQueue.toFixed(1)}</td>
                    <td className={bestDelay === r.id ? 'best' : ''}>{r.avgDelay.toFixed(2)}</td>
                    <td className={bestTput === r.id ? 'best' : ''}>{r.throughput.toFixed(2)}</td>
                    <td className={bestUtil === r.id ? 'best' : ''}>{(r.utilization * 100).toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
