import { useEffect, useRef } from 'react';

const DOT = {
  drop: 'var(--drop)',
  overflow: 'var(--drop)',
  choke: 'var(--warn)',
  red: 'var(--warn)',
  shape: 'var(--token)',
  info: 'var(--ink-dim)',
};

function dotFor(type) {
  if (type === 'choke') return DOT.choke;
  if (type === 'red') return DOT.red;
  if (type === 'shape') return DOT.shape;
  if (type === 'overflow') return DOT.overflow;
  if (type === 'drop') return DOT.drop;
  return DOT.info;
}

export default function EventLog({ events }) {
  const boxRef = useRef(null);
  const stickRef = useRef(true);

  useEffect(() => {
    const el = boxRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [events]);

  const onScroll = () => {
    const el = boxRef.current;
    if (!el) return;
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
  };

  return (
    <section className="elog" aria-label="Event log">
      <h3>Event log</h3>
      <div ref={boxRef} className="elog-box mono" role="log" onScroll={onScroll} tabIndex={0}>
        {events.length === 0 && <p className="elog-empty">No events yet — press Play.</p>}
        {events.map((e, i) => (
          <p key={`${e.tick}-${i}`} className="elog-line">
            <i style={{ background: dotFor(e.type) }} />
            <span>t={String(e.tick).padStart(3, '0')}  {e.text}</span>
          </p>
        ))}
      </div>
    </section>
  );
}
