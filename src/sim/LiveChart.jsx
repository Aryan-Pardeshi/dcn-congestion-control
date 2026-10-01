import { useCallback, useEffect, useRef } from 'react';
import './LiveChart.css';

const MONO = '"Geist Mono", ui-monospace, "SFMono-Regular", Consolas, monospace';
const SANS = '"Geist", ui-sans-serif, system-ui, sans-serif';
const WINDOW = 200;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function withAlpha(color, a) {
  const c = color.trim();
  if (c.startsWith('#')) {
    let h = c.slice(1);
    if (h.length === 3) h = h.split('').map((x) => x + x).join('');
    const n = parseInt(h.slice(0, 6), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const [r, g, b] = m[1].split(',').map((x) => parseFloat(x));
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  return c;
}

// Monotone cubic interpolation: smooth, and never overshoots the data.
function traceSmooth(ctx, pts) {
  const n = pts.length;
  if (n === 0) return;
  ctx.moveTo(pts[0].x, pts[0].y);
  if (n === 1) return;
  if (n === 2) { ctx.lineTo(pts[1].x, pts[1].y); return; }
  const dx = [];
  const m = [];
  for (let i = 0; i < n - 1; i += 1) {
    dx.push(pts[i + 1].x - pts[i].x || 1e-6);
    m.push((pts[i + 1].y - pts[i].y) / dx[i]);
  }
  const t = [m[0]];
  for (let i = 1; i < n - 1; i += 1) t.push(m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2);
  t.push(m[n - 2]);
  for (let i = 0; i < n - 1; i += 1) {
    if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
    const a = t[i] / m[i];
    const b = t[i + 1] / m[i];
    const s = a * a + b * b;
    if (s > 9) {
      const k = 3 / Math.sqrt(s);
      t[i] = k * a * m[i];
      t[i + 1] = k * b * m[i];
    }
  }
  for (let i = 0; i < n - 1; i += 1) {
    const h = dx[i] / 3;
    ctx.bezierCurveTo(pts[i].x + h, pts[i].y + t[i] * h, pts[i + 1].x - h, pts[i + 1].y - t[i + 1] * h, pts[i + 1].x, pts[i + 1].y);
  }
}

function niceMax(v) {
  if (v <= 1) return 1;
  const pow = 10 ** Math.floor(Math.log10(v));
  const f = v / pow;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * pow;
}

/**
 * series: [{ label, color: '--flow', values: number[], area?: boolean, width?: number }]
 * refs:   [{ value, label, color, dashed? }]   labels sit at the left, inside the plot
 */
export default function LiveChart({ title, hint, tip, series, yMax, refs = [], endTick = 0, height = 176, decimals = 1 }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const propsRef = useRef({});
  const dirtyRef = useRef(true);
  const hoverRef = useRef(null);
  const scaleRef = useRef({ max: null });

  propsRef.current = { series, yMax, refs, endTick, height, decimals };
  useEffect(() => { dirtyRef.current = true; });

  const onMove = useCallback((e) => {
    if (typeof window !== 'undefined' && window.innerWidth < 640) return;
    if (e.pointerType === 'touch') return;
    const rect = canvasRef.current.getBoundingClientRect();
    hoverRef.current = { x: e.clientX - rect.left };
    dirtyRef.current = true;
  }, []);
  const onLeave = useCallback(() => { hoverRef.current = null; dirtyRef.current = true; }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return undefined;
    const ctx = canvas.getContext('2d');
    let raf = 0;
    let size = { W: 0, H: 0, dpr: 0 };
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mo = new MutationObserver(() => { dirtyRef.current = true; });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    document.fonts?.ready?.then(() => { dirtyRef.current = true; });

    const frame = () => {
      raf = requestAnimationFrame(frame);
      const { series: S, yMax: yM, refs: R, endTick: endT, height: H, decimals: dec } = propsRef.current;
      const W = Math.max(160, Math.round(wrap.clientWidth));
      const dpr = window.devicePixelRatio || 1;
      const changed = W !== size.W || H !== size.H || dpr !== size.dpr;

      // y scale target, tweened so a rescale glides instead of jumping
      let target = yM;
      if (target == null) {
        target = 1;
        S.forEach((s) => (s.values || []).forEach((v) => { if (v > target) target = v; }));
        R.forEach((r) => { if (r.value > target) target = r.value; });
        target = niceMax(target * 1.08);
      }
      const sc = scaleRef.current;
      if (sc.max == null || mq.matches) sc.max = target;
      let animating = false;
      if (Math.abs(sc.max - target) > 0.002 * target) { sc.max += (target - sc.max) * 0.2; animating = true; } else sc.max = target;

      if (!changed && !dirtyRef.current && !animating) return;
      dirtyRef.current = false;
      if (changed) {
        size = { W, H, dpr };
        canvas.style.height = `${H}px`;
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      const max = sc.max;
      const padL = 30;
      const padR = 40;
      const padT = 10;
      const padB = 20;
      const iw = W - padL - padR;
      const ih = H - padT - padB;
      const yOf = (v) => padT + ih - (ih * clamp(v, 0, max)) / max;
      const colors = {};
      const colorOf = (v) => (colors[v] ??= cssVar(v) || '#888');
      const inkDim = colorOf('--ink-dim');
      const inkFaint = colorOf('--ink-faint');
      const lineC = colorOf('--line');

      // grid + y labels (3 ticks, large readable labels)
      ctx.font = `12px ${MONO}`;
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 1;
      const steps = 3;
      for (let i = 0; i <= steps; i += 1) {
        const y = Math.round(padT + ih - (ih * i) / steps) + 0.5;
        ctx.strokeStyle = lineC;
        ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + iw, y); ctx.stroke();
        ctx.fillStyle = inkFaint;
        ctx.textAlign = 'right';
        const v = (max * i) / steps;
        ctx.fillText(Number.isInteger(v) ? String(v) : v.toFixed(1), padL - 6, y);
      }
      // x labels: tick numbers at both ends of the window
      const len = Math.max(...S.map((s) => (s.values || []).length), 0);
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = inkFaint;
      ctx.textAlign = 'left';
      ctx.fillText(len > 0 ? `t ${Math.max(0, endT - len + 1)}` : 't 0', padL, H - 5);
      ctx.textAlign = 'right';
      ctx.fillText(`t ${endT}`, padL + iw, H - 5);

      const xOf = (i) => padL + (iw * i) / (WINDOW - 1);

      // series (area first, then lines)
      const plotted = S.map((s) => {
        const vals = (s.values || []).slice(-WINDOW);
        const pts = vals.map((v, i) => ({ x: xOf(i), y: yOf(v), v }));
        return { s, pts, vals };
      });
      plotted.forEach(({ s, pts }) => {
        if (pts.length < 2 || !s.area) return;
        const c = colorOf(s.color);
        const grad = ctx.createLinearGradient(0, padT, 0, padT + ih);
        grad.addColorStop(0, withAlpha(c, 0.28));
        grad.addColorStop(1, withAlpha(c, 0));
        ctx.beginPath();
        traceSmooth(ctx, pts);
        ctx.lineTo(pts[pts.length - 1].x, padT + ih);
        ctx.lineTo(pts[0].x, padT + ih);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
      });

      // reference lines with labels at the left inside the plot
      const placed = [];
      [...R].sort((a, b) => b.value - a.value).forEach((r) => {
        const c = colorOf(r.color);
        const y = Math.round(yOf(r.value)) + 0.5;
        ctx.strokeStyle = c;
        ctx.globalAlpha = r.dashed === false ? 0.9 : 0.75;
        ctx.setLineDash(r.dashed === false ? [] : [5, 4]);
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + iw, y); ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
        if (r.label) {
          let ly = y - 7;
          if (ly < padT + 5) ly = y + 8;
          while (placed.some((p) => Math.abs(p - ly) < 11) && ly < padT + ih - 4) ly += 11;
          placed.push(ly);
          ctx.font = `500 12px ${MONO}`;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          const tw = ctx.measureText(r.label).width;
          ctx.fillStyle = colorOf('--bg-2');
          ctx.globalAlpha = 0.82;
          ctx.beginPath(); ctx.roundRect(padL + 3, ly - 7, tw + 8, 14, 4); ctx.fill();
          ctx.globalAlpha = 1;
          ctx.fillStyle = c;
          ctx.fillText(r.label, padL + 7, ly);
        }
      });

      plotted.forEach(({ s, pts }) => {
        if (pts.length < 2) return;
        ctx.beginPath();
        traceSmooth(ctx, pts);
        ctx.strokeStyle = colorOf(s.color);
        ctx.lineWidth = s.width || 1.6;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.stroke();
      });

      // last-value labels in the right gutter, nudged apart so they never collide
      const lasts = plotted
        .filter(({ pts }) => pts.length > 0)
        .map(({ s, pts }) => ({ s, p: pts[pts.length - 1], y: pts[pts.length - 1].y }))
        .sort((a, b) => a.y - b.y);
      for (let i = 1; i < lasts.length; i += 1) if (lasts[i].y - lasts[i - 1].y < 11) lasts[i].y = lasts[i - 1].y + 11;
      ctx.font = `500 12px ${MONO}`;
      ctx.textBaseline = 'middle';
      lasts.forEach(({ s, p, y }) => {
        const c = colorOf(s.color);
        ctx.fillStyle = c;
        ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.textAlign = 'left';
        ctx.fillText(Number(p.v).toFixed(dec), padL + iw + 8, y);
      });

      // hover crosshair + tooltip (hidden on small screens to avoid clutter)
      const smallScreen = typeof window !== 'undefined' && window.innerWidth < 640;
      const hv = smallScreen ? null : hoverRef.current;
      if (hv && len > 1) {
        const idx = clamp(Math.round(((hv.x - padL) / iw) * (WINDOW - 1)), 0, len - 1);
        const x = xOf(idx);
        ctx.strokeStyle = colorOf('--line-strong');
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(Math.round(x) + 0.5, padT); ctx.lineTo(Math.round(x) + 0.5, padT + ih); ctx.stroke();
        const rows = plotted.filter(({ vals }) => vals[idx] != null).map(({ s, vals }) => ({ label: s.label, c: colorOf(s.color), v: vals[idx] }));
        rows.forEach((r) => {
          ctx.fillStyle = colorOf('--bg');
          ctx.strokeStyle = r.c;
          ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(x, yOf(r.v), 3.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        });
        const tickNo = Math.max(0, endT - len + 1) + idx;
        ctx.font = `10.5px ${MONO}`;
        const lines = [`t ${tickNo}`, ...rows.map((r) => `${r.label} ${Number(r.v).toFixed(dec)}`)];
        const tw = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 16;
        const th = lines.length * 14 + 8;
        let bx = x + 10;
        if (bx + tw > padL + iw) bx = x - 10 - tw;
        const by = padT + 4;
        ctx.fillStyle = colorOf('--bg');
        ctx.strokeStyle = colorOf('--line-strong');
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(bx, by, tw, th, 6); ctx.fill(); ctx.stroke();
        ctx.textAlign = 'left';
        lines.forEach((l, i) => {
          ctx.fillStyle = i === 0 ? inkDim : rows[i - 1].c;
          ctx.fillText(l, bx + 8, by + 11 + i * 14);
        });
      }
      ctx.font = `12px ${SANS}`;
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); mo.disconnect(); };
  }, []);

  return (
    <figure className="chart">
      <figcaption className="chart-head">
        <span className="chart-title">{title} {tip}</span>
        {hint && <span className="chart-hint mono">{hint}</span>}
      </figcaption>
      <div ref={wrapRef} className="chart-body">
        <canvas
          ref={canvasRef}
          onPointerMove={onMove}
          onPointerLeave={onLeave}
          role="img"
          aria-label={`${title} chart`}
        />
      </div>
      <div className="chart-legend">
        {series.map((s) => (
          <span key={s.label} className="chip">
            <i style={{ background: `var(${s.color})` }} />{s.label}
          </span>
        ))}
        {refs.filter((r) => r.legend).map((r) => (
          <span key={r.label} className="chip">
            <i className="dash" style={{ borderColor: `var(${r.color})` }} />{r.legend}
          </span>
        ))}
      </div>
    </figure>
  );
}
