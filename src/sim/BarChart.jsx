export default function BarChart({ title, rows, unit = '', format }) {
  const max = Math.max(1e-9, ...rows.map((r) => r.value));
  const fmt = format || ((v) => `${Number(v).toFixed(1)}${unit}`);
  return (
    <figure className="bar-chart">
      <figcaption>{title}</figcaption>
      <svg viewBox={`0 0 260 ${rows.length * 34 + 8}`} role="img" aria-label={title}>
        <title>{title}</title>
        {rows.map((r, i) => {
          const w = Math.max(2, (r.value / max) * 150);
          const y = 8 + i * 34;
          return (
            <g key={r.label}>
              <title>{`${r.label}: ${fmt(r.value)}`}</title>
              <text x={0} y={y + 11} fontSize={10} fill="var(--ink-dim)" fontFamily="Archivo, sans-serif">{r.label}</text>
              <rect x={86} y={y} width={w} height={14} rx={3} fill={`var(${r.colorVar})`} />
              <text x={88 + w} y={y + 11} fontSize={10} fill="var(--ink)" fontFamily="'Martian Mono', monospace">{fmt(r.value)}</text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
