import { useEffect, useId, useRef } from 'react';
import { animate, motion } from 'framer-motion';
import './ui.css';

const prefersReduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Number that glides to its new value. Renders once; subsequent updates are written straight to the DOM node. */
export function AnimatedNumber({ value, format = (v) => v.toFixed(0), className = '' }) {
  const ref = useRef(null);
  const current = useRef(value);
  const initial = useRef(format(value));
  useEffect(() => {
    if (prefersReduced()) {
      current.current = value;
      if (ref.current) ref.current.textContent = format(value);
      return undefined;
    }
    const controls = animate(current.current, value, {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        current.current = v;
        if (ref.current) ref.current.textContent = format(v);
      },
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return <span ref={ref} className={`tnum ${className}`}>{initial.current}</span>;
}

/** Thin range slider with the filled portion drawn in the accent colour. */
export function Slider({ id, label, hideLabel, value, min, max, step = 1, onChange, display, hint, tone }) {
  const auto = useId();
  const fid = id || auto;
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <div className="field">
      {hideLabel ? (
        <label htmlFor={fid} className="sr-only">{label}</label>
      ) : (
        <div className="field-row">
          <label htmlFor={fid}>{label}</label>
          <output htmlFor={fid} className="field-val tnum">{display ?? value}</output>
        </div>
      )}
      <input
        id={fid}
        className={`range${tone ? ` range-${tone}` : ''}`}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ '--p': `${clamp01(pct)}%` }}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}

const clamp01 = (v) => Math.max(0, Math.min(100, v));

/** Segmented control with a sliding highlight. */
export function Segmented({ options, value, onChange, ariaLabel, size = 'md', className = '' }) {
  const uid = useId();
  return (
    <div className={`seg seg-${size} ${className}`} role="radiogroup" aria-label={ariaLabel}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            className={`seg-btn${on ? ' on' : ''}`}
            onClick={() => onChange(o.value)}
          >
            {on && <motion.span layoutId={`seg-${uid}`} className="seg-hl" transition={{ type: 'spring', stiffness: 520, damping: 38 }} />}
            <span className="seg-label">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Sparkline({ values, color = '--flow', width = 96, height = 24, max }) {
  const v = values && values.length > 1 ? values : null;
  if (!v) return <svg className="spark" width={width} height={height} aria-hidden="true" />;
  const hi = max ?? Math.max(1e-9, ...v);
  const pts = v.map((y, i) => [(i / (v.length - 1)) * width, height - 2 - (Math.min(y, hi) / hi) * (height - 4)]);
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area = `${d} L${width} ${height} L0 ${height} Z`;
  const gid = `sg-${color.replace(/[^a-z]/g, '')}`;
  return (
    <svg className="spark" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={`var(${color})`} stopOpacity="0.3" />
          <stop offset="1" stopColor={`var(${color})`} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={d} fill="none" stroke={`var(${color})`} strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function Icon({ name, size = 14 }) {
  const common = { width: size, height: size, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
  switch (name) {
    case 'play': return <svg {...common} fill="currentColor" stroke="none"><path d="M4.5 2.8v10.4a.6.6 0 0 0 .92.5l8.1-5.2a.6.6 0 0 0 0-1L5.42 2.3a.6.6 0 0 0-.92.5Z" /></svg>;
    case 'pause': return <svg {...common} fill="currentColor" stroke="none"><rect x="3.5" y="2.5" width="3" height="11" rx="1" /><rect x="9.5" y="2.5" width="3" height="11" rx="1" /></svg>;
    case 'step': return <svg {...common}><path d="M3.5 3v10M7 3.5v9l6-4.5-6-4.5Z" /></svg>;
    case 'reset': return <svg {...common}><path d="M2.8 8a5.2 5.2 0 1 0 1.6-3.7" /><path d="M2.6 2.2v3h3" /></svg>;
    case 'bolt': return <svg {...common}><path d="M8.8 1.8 3.5 9h3.7l-.9 5.2L12.5 7H8.7l.1-5.2Z" /></svg>;
    case 'dice': return <svg {...common}><rect x="2.5" y="2.5" width="11" height="11" rx="2.5" /><circle cx="5.8" cy="5.8" r=".6" fill="currentColor" /><circle cx="10.2" cy="10.2" r=".6" fill="currentColor" /><circle cx="8" cy="8" r=".6" fill="currentColor" /></svg>;
    case 'download': return <svg {...common}><path d="M8 2.5v8M4.8 7.6 8 10.8l3.2-3.2M3 13.5h10" /></svg>;
    case 'check': return <svg {...common}><path d="m3.5 8.5 3 3 6-7" /></svg>;
    case 'arrow-down': return <svg {...common}><path d="M8 3v9M4.5 8.5 8 12l3.5-3.5" /></svg>;
    case 'spark': return <svg {...common}><path d="M8 2v3M8 11v3M2 8h3M11 8h3M4 4l2 2M10 10l2 2M12 4l-2 2M6 10l-2 2" /></svg>;
    default: return null;
  }
}

export function StatusPill({ tone = 'ok', pulse = false, children }) {
  return (
    <span className={`pill pill-${tone}`}>
      <i className={`pill-dot${pulse ? ' pulse' : ''}`} aria-hidden="true" />
      {children}
    </span>
  );
}
