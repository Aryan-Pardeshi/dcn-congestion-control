export default function StatsPanel({ snapshot }) {
  const m = snapshot.metrics;
  const ratio = snapshot.bufferSize > 0 ? snapshot.queueLength / snapshot.bufferSize : 0;
  const status = ratio > 0.9 ? { t: 'Congested', c: 'var(--drop)' } : ratio > 0.6 ? { t: 'Building up', c: 'var(--warn)' } : { t: 'Stable', c: 'var(--flow)' };
  const dropPct = m.dropRate * 100;
  const dropColor = dropPct > 10 ? 'var(--drop)' : dropPct > 2 ? 'var(--warn)' : 'var(--flow)';
  const cells = [
    ['Generated', String(m.generated)],
    ['Delivered', String(m.delivered)],
    ['Dropped', String(m.dropped)],
    ['Drop rate %', dropPct.toFixed(1), dropColor],
    ['Throughput pkt/t', m.throughput.toFixed(2)],
    ['Link utilisation %', (m.utilization * 100).toFixed(1)],
    ['Avg queue', m.avgQueue.toFixed(1)],
    ['Avg delay (ticks)', m.avgDelay.toFixed(2)],
  ];
  return (
    <section className="stats" aria-label="Live statistics">
      <div className="stats-status">Status: <strong style={{ color: status.c }}>{status.t}</strong></div>
      <dl className="stats-grid">
        {cells.map(([label, value, color]) => (
          <div key={label} className="stat">
            <dt>{label}</dt>
            <dd className="mono" style={color ? { color } : undefined}>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
