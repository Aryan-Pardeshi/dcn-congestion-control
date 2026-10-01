import { useMemo } from 'react';
import { AnimatedNumber, Sparkline, StatusPill } from './ui.jsx';
import './StatsPanel.css';

export function statusOf(snapshot) {
  const ratio = snapshot.bufferSize > 0 ? snapshot.queueLength / snapshot.bufferSize : 0;
  if (ratio > 0.9) return { label: 'Congested', tone: 'drop' };
  if (ratio > 0.6) return { label: 'Building up', tone: 'warn' };
  return { label: 'Stable', tone: 'ok' };
}

const int = (v) => Math.round(v).toLocaleString('en-US');
const f1 = (v) => v.toFixed(1);
const f2 = (v) => v.toFixed(2);

function Stat({ label, value, format, unit, color, spark, sparkColor, sparkMax, bar, barColor }) {
  return (
    <div className="sstat">
      <dt>{label}</dt>
      <dd>
        <span className="sstat-num" style={color ? { color: `var(${color})` } : undefined}>
          <AnimatedNumber value={value} format={format} />
        </span>
        {unit && <span className="sstat-unit">{unit}</span>}
      </dd>
      {spark && <div className="sstat-viz"><Sparkline values={spark} color={sparkColor} max={sparkMax} width={120} height={22} /></div>}
      {bar != null && (
        <div className="sstat-viz">
          <div className="sstat-bar"><i style={{ width: `${Math.min(100, Math.max(0, bar))}%`, background: `var(${barColor})` }} /></div>
        </div>
      )}
    </div>
  );
}

export default function StatsPanel({ snapshot }) {
  const m = snapshot.metrics;
  const status = statusOf(snapshot);
  const dropPct = m.dropRate * 100;
  const dropColor = dropPct > 10 ? '--drop' : dropPct > 2 ? '--warn' : '--flow';
  const utilPct = m.utilization * 100;
  const cap = snapshot.linkCapacity;

  const series = useMemo(() => {
    const h = (snapshot.history || []).slice(-60);
    return {
      offered: h.map((x) => x.offered),
      delivered: h.map((x) => x.throughput),
      dropped: h.map((x) => x.dropped),
      queue: h.map((x) => x.queue),
    };
  }, [snapshot.history]);

  return (
    <section className="sstats panel" aria-label="Live statistics">
      <header className="panel-head">
        <h2 className="panel-title">Live statistics</h2>
        <StatusPill tone={status.tone} pulse={status.tone !== 'ok'}>{status.label}</StatusPill>
      </header>
      <dl className="sstats-grid">
        <Stat label="Generated" value={m.generated} format={int} spark={series.offered} sparkColor="--ink-dim" />
        <Stat label="Delivered" value={m.delivered} format={int} spark={series.delivered} sparkColor="--flow" sparkMax={cap} />
        <Stat label="Dropped" value={m.dropped} format={int} color={m.dropped > 0 ? '--drop' : undefined} spark={series.dropped} sparkColor="--drop" />
        <Stat label="Drop rate" value={dropPct} format={f1} unit="%" color={dropColor} bar={dropPct * 2} barColor={dropColor} />
        <Stat label="Throughput" value={m.throughput} format={f2} unit="pkt/tick" spark={series.delivered} sparkColor="--flow" sparkMax={cap} />
        <Stat label="Link utilisation" value={utilPct} format={f1} unit="%" bar={utilPct} barColor="--ok" />
        <Stat label="Avg queue" value={m.avgQueue} format={f1} unit="pkt" spark={series.queue} sparkColor="--warn" sparkMax={snapshot.bufferSize} />
        <Stat label="Avg delay" value={m.avgDelay} format={f2} unit="ticks" />
      </dl>
    </section>
  );
}
