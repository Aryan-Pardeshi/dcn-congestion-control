import { motion } from 'framer-motion';
import './BarChart.css';

/**
 * rows: [{ label, full, value, colorVar, best }]
 * HTML bars (not SVG text) so value labels never clip and short labels never truncate.
 */
export default function BarChart({ title, caption, rows, unit = '', decimals = 1, delay = 0 }) {
  const max = Math.max(1e-9, ...rows.map((r) => r.value));
  const fmt = (v) => `${Number(v).toFixed(decimals)}${unit}`;
  return (
    <figure className="bars">
      <figcaption className="bars-head">
        <span className="bars-title">{title}</span>
        {caption && <span className="bars-cap">{caption}</span>}
      </figcaption>
      <ul className="bars-list" aria-label={title}>
        {rows.map((r, i) => {
          const pct = Math.max(r.value > 0 ? 2.5 : 0, (r.value / max) * 100);
          return (
            <li key={r.label} className={`bars-row${r.best ? ' best' : ''}`} title={`${r.full || r.label}: ${fmt(r.value)}`}>
              <span className="bars-label">{r.label}</span>
              <span className="bars-track">
                <motion.span
                  className="bars-fill"
                  style={{ background: `var(${r.colorVar})` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, delay: delay + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                />
              </span>
              <span className="bars-val tnum">{fmt(r.value)}</span>
            </li>
          );
        })}
      </ul>
    </figure>
  );
}
