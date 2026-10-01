import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Icon } from './ui.jsx';
import { InfoTip } from './InfoTip.jsx';
import { HELP } from './help.js';
import './EventLog.css';

const TONE = {
  drop: '--drop',
  overflow: '--drop',
  choke: '--warn',
  red: '--warn',
  shape: '--token',
  info: '--ink-dim',
};

// Events carry no id, so derive a stable key from tick + type + occurrence so lines keep identity as the window slides.
function keyed(events) {
  const seen = new Map();
  return events.map((e) => {
    const base = `${e.tick}-${e.type}`;
    const n = (seen.get(base) || 0) + 1;
    seen.set(base, n);
    return { ...e, key: `${base}-${n}` };
  });
}

export default function EventLog({ events }) {
  const boxRef = useRef(null);
  const stickRef = useRef(true);
  const [away, setAway] = useState(false);
  const [open, setOpen] = useState(false);
  const rows = useMemo(() => keyed(events || []), [events]);

  useEffect(() => {
    const el = boxRef.current;
    if (el && stickRef.current && open) el.scrollTop = el.scrollHeight;
  }, [rows, open]);

  const onScroll = () => {
    const el = boxRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
    stickRef.current = atBottom;
    setAway(!atBottom);
  };

  const jump = useCallback(() => {
    const el = boxRef.current;
    if (!el) return;
    stickRef.current = true;
    setAway(false);
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, []);

  return (
    <section className="elog panel" aria-label="Event log">
      <button type="button" className="elog-disclosure" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="panel-title">Event log <InfoTip tip={HELP.eventLog} thing="event log" /></span>
        <span className="elog-right">
          <span className="elog-count tnum">{rows.length} {rows.length === 1 ? 'event' : 'events'}</span>
          <svg className={`elog-chev${open ? ' open' : ''}`} width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m4 6 4 4 4-4" />
          </svg>
          <span className="elog-toggle">{open ? 'Hide' : 'Show event log'}</span>
        </span>
      </button>
      {open && (
        <div className="elog-wrap">
          <div ref={boxRef} className="elog-box" role="log" aria-live="off" onScroll={onScroll} tabIndex={0} data-lenis-prevent>
            {rows.length === 0 && <p className="elog-empty">No events yet. Press Play to start the run.</p>}
            {rows.map((e) => (
              <p key={e.key} className="elog-line">
                <i className="elog-dot" style={{ background: `var(${TONE[e.type] || TONE.info})`, color: `var(${TONE[e.type] || TONE.info})` }} />
                <span className="elog-tick">{String(e.tick).padStart(4, '0')}</span>
                <span className="elog-text">{e.text}</span>
              </p>
            ))}
          </div>
          <AnimatePresence>
            {away && (
              <motion.button
                type="button"
                className="elog-jump"
                onClick={jump}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.16 }}
              >
                <Icon name="arrow-down" size={12} />
                Latest
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}
