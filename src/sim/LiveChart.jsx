import { useEffect, useRef } from 'react';

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export default function LiveChart({ title, series, yMax, refs = [], height = 140 }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const W = Math.max(200, rect.width);
    const H = height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);

    let max = yMax;
    if (max == null) {
      max = 1;
      series.forEach((s) => (s.values || []).forEach((v) => { if (v > max) max = v; }));
      refs.forEach((r) => { if (r.value > max) max = r.value; });
      max = Math.ceil(max * 1.1);
    }
    const padL = 34;
    const padB = 16;
    const padT = 8;
    const padR = 44;
    const iw = W - padL - padR;
    const ih = H - padT - padB;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const inkDim = cssVar('--ink-dim') || '#93A9BE';
    const line = cssVar('--line') || '#2C5072';

    // grid
    ctx.strokeStyle = line;
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 1;
    const steps = 4;
    ctx.fillStyle = inkDim;
    ctx.font = '10px "Martian Mono", monospace';
    for (let i = 0; i <= steps; i += 1) {
      const v = (max * i) / steps;
      const y = padT + ih - (ih * i) / steps;
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + iw, y); ctx.stroke();
      ctx.fillText(String(Math.round(v)), 4, y + 3);
    }
    ctx.globalAlpha = 1;

    // reference lines
    refs.forEach((r) => {
      const y = padT + ih - (ih * r.value) / max;
      ctx.strokeStyle = cssVar(r.color) || r.color;
      ctx.setLineDash(r.dashed === false ? [] : [5, 4]);
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + iw, y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = cssVar(r.color) || r.color;
      if (r.label) ctx.fillText(r.label, padL + iw + 4, y + 3);
    });

    // series
    series.forEach((s) => {
      const vals = s.values || [];
      if (vals.length < 2) return;
      ctx.strokeStyle = cssVar(s.color) || s.color;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      vals.forEach((v, i) => {
        const x = padL + (iw * i) / Math.max(1, vals.length - 1);
        const y = padT + ih - (ih * Math.min(v, max)) / max;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.lineWidth = 1;
      // last value label
      const last = vals[vals.length - 1];
      if (last != null) {
        ctx.fillStyle = cssVar(s.color) || s.color;
        const y = padT + ih - (ih * Math.min(last, max)) / max;
        ctx.fillText(String(Number(last).toFixed(1)), padL + iw + 4, y + 3);
      }
    });
  });

  return (
    <figure className="live-chart">
      <figcaption>{title}</figcaption>
      <canvas ref={ref} style={{ width: '100%', height }} role="img" aria-label={title} />
      <div className="live-legend mono">
        {series.map((s) => (
          <span key={s.label}><i style={{ background: `var(${s.color})` }} />{s.label}</span>
        ))}
      </div>
    </figure>
  );
}
