import { useState } from 'react';
import { AnimatedNumber } from './ui.jsx';
import { InfoTip } from './InfoTip.jsx';
import { HELP } from './help.js';
import './StatsPanel.css';

export function statusOf(snapshot) {
  const ratio = snapshot.bufferSize > 0 ? snapshot.queueLength / snapshot.bufferSize : 0;
  if (ratio > 0.9) return { label: 'Congested', tone: 'drop' };
  if (ratio > 0.6) return { label: 'Building up', tone: 'warn' };
  return { label: 'Stable', tone: 'ok' };
}

const STATUS_SENTENCE = {
  ok: 'All good — the router keeps up.',
  warn: 'Queue is building up — the link is busy.',
  drop: 'Congested — the queue is full and packets are being lost.',
};

const int = (v) => Math.round(v).toLocaleString('en-US');

function BigStat({ label, tip, children }) {
  return (
    <div className="bigstat">
      <dt className="bigstat-label">{label} <InfoTip tip={tip} thing={label} /></dt>
      <dd className="bigstat-val">{children}</dd>
    </div>
  );
}

function DetailRow({ label, tip, children }) {
  return (
    <div className="detail-row">
      <dt>{label} <InfoTip tip={tip} thing={label} /></dt>
      <dd className="tnum">{children}</dd>
    </div>
  );
}

export default function StatsPanel({ snapshot }) {
  const m = snapshot.metrics;
  const status = statusOf(snapshot);
  const key = status.tone === 'drop' ? 'drop' : status.tone === 'warn' ? 'warn' : 'ok';
  const dropPct = m.dropRate * 100;
  const dropBad = dropPct > 5;
  const qRatio = snapshot.bufferSize > 0 ? snapshot.queueLength / snapshot.bufferSize : 0;
  const qColor = qRatio > 0.9 ? 'var(--drop)' : qRatio >= 0.6 ? 'var(--warn)' : 'var(--flow)';
  const [moreOpen, setMoreOpen] = useState(false);
  const utilPct = (m.utilization * 100).toFixed(1);

  return (
    <section className="sstats panel" aria-label="Live statistics">
      <header className="panel-head">
        <h2 className="panel-title">Live statistics</h2>
      </header>
      <p className={`status-line status-${key}`} role="status">{STATUS_SENTENCE[key]}</p>
      <dl className="bigstats">
        <BigStat label="Packets delivered" tip={HELP.statDelivered}>
          <AnimatedNumber value={m.delivered} format={int} />
        </BigStat>
        <BigStat label="Packets lost" tip={HELP.statLost}>
          <span className={dropBad ? 'lost-bad' : undefined}>
            <AnimatedNumber value={m.dropped} format={int} />
          </span>
          <span className={`drop-pct tnum${dropBad ? ' bad' : ''}`}>{dropPct.toFixed(1)}% lost</span>
        </BigStat>
        <BigStat label="Router queue" tip={HELP.statQueue}>
          <span className="tnum">{snapshot.queueLength} / {snapshot.bufferSize}</span>
          <span className="qbar" role="img" aria-label={`Router queue ${snapshot.queueLength} of ${snapshot.bufferSize}`}>
            <i style={{ width: `${Math.min(100, Math.max(0, qRatio * 100))}%`, background: qColor }} />
          </span>
        </BigStat>
        <BigStat label="Average wait" tip={HELP.statWait}>
          <span className="tnum">{m.avgDelay.toFixed(1)} steps</span>
        </BigStat>
      </dl>
      <div className="more">
        <button type="button" className="more-head" onClick={() => setMoreOpen((v) => !v)} aria-expanded={moreOpen}>
          <span>More details</span>
          <svg className={`more-chev${moreOpen ? ' open' : ''}`} width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m4 6 4 4 4-4" />
          </svg>
        </button>
        {moreOpen && (
          <dl className="details">
            <DetailRow label="Sent" tip={HELP.statSent}>{int(m.generated)}</DetailRow>
            <DetailRow label="Throughput" tip={HELP.statThroughput}>{m.throughput.toFixed(2)} pkt/step</DetailRow>
            <DetailRow label="Link use" tip={HELP.statLinkUse}>{utilPct}%</DetailRow>
            <DetailRow label="Average queue" tip={HELP.statAvgQueue}>{m.avgQueue.toFixed(1)} packets</DetailRow>
          </dl>
        )}
      </div>
    </section>
  );
}
