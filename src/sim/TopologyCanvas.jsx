import { useEffect, useRef } from 'react';
import { ALGORITHMS } from './algorithms/index.js';
import './TopologyCanvas.css';

const SANS = '"Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
const MONO = '"Geist Mono", ui-monospace, "SFMono-Regular", Consolas, monospace';
const MAX_DOTS = 500;
const TAU = Math.PI * 2;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = (p) => (p < 0.5 ? 2 * p * p : 1 - ((-2 * p + 2) ** 2) / 2);

const VARS = ['--flow', '--warn', '--drop', '--token', '--ok', '--ink', '--ink-dim', '--ink-faint', '--line', '--line-strong', '--bg', '--bg-2'];
function readPalette() {
  const cs = getComputedStyle(document.documentElement);
  const pal = {};
  VARS.forEach((v) => { pal[v] = cs.getPropertyValue(v).trim() || '#888'; });
  return pal;
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function setFont(ctx, size, weight = 400, mono = false) {
  ctx.font = `${weight} ${size}px ${mono ? MONO : SANS}`;
}

// First candidate that fits in maxW at the given font; '' when nothing fits (caller skips drawing).
function fit(ctx, size, weight, mono, alts, maxW) {
  setFont(ctx, size, weight, mono);
  for (const a of alts) if (a && ctx.measureText(a).width <= maxW) return a;
  return '';
}

function text(ctx, str, x, y, color, size, { weight = 400, mono = false, align = 'left', alpha = 1 } = {}) {
  if (!str) return;
  setFont(ctx, size, weight, mono);
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
  ctx.globalAlpha = 1;
}

function bezierPoints(x0, y0, x1, y1, n = 14) {
  const mx = (x0 + x1) / 2;
  const pts = [];
  for (let i = 0; i <= n; i += 1) {
    const t = i / n;
    const u = 1 - t;
    pts.push({
      x: u * u * u * x0 + 3 * u * u * t * mx + 3 * u * t * t * mx + t * t * t * x1,
      y: u * u * u * y0 + 3 * u * u * t * y0 + 3 * u * t * t * y1 + t * t * t * y1,
    });
  }
  return pts;
}

function makePath(pts) {
  const lens = [0];
  for (let i = 1; i < pts.length; i += 1) lens.push(lens[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  return { pts, lens, total: lens[lens.length - 1] || 1 };
}

const _pos = { x: 0, y: 0 };
function pathAt(path, p) {
  const d = clamp(p, 0, 1) * path.total;
  const { pts, lens } = path;
  let i = 1;
  while (i < lens.length - 1 && lens[i] < d) i += 1;
  const seg = lens[i] - lens[i - 1] || 1;
  const t = (d - lens[i - 1]) / seg;
  _pos.x = lerp(pts[i - 1].x, pts[i].x, t);
  _pos.y = lerp(pts[i - 1].y, pts[i].y, t);
  return _pos;
}

function buildSourceBox(tier, s, eff, factor, choked) {
  const f = factor.toFixed(2);
  if (tier === 0) {
    const rows = [
      [{ t: s.id, weight: 600, c: '--ink' }, { t: `  ${s.label || ''}`, c: '--ink-dim' }],
      [{ t: `${eff} pkt/t`, mono: true, c: choked ? '--ink' : '--ink-dim' }],
    ];
    if (choked) rows.push([{ t: `×${f}`, mono: true, c: '--warn' }]);
    return rows;
  }
  if (tier === 1) {
    const rows = [[{ t: s.id, weight: 600, c: '--ink' }], [{ t: `${eff} pkt/t`, mono: true, c: choked ? '--ink' : '--ink-dim' }]];
    if (choked) rows.push([{ t: `×${f}`, mono: true, c: '--warn' }]);
    return rows;
  }
  const rows = [[{ t: s.id, weight: 600, c: '--ink' }], [{ t: eff, mono: true, c: choked ? '--ink' : '--ink-dim' }]];
  if (choked) rows.push([{ t: `×${Number(f)}`, mono: true, c: '--warn' }]);
  return rows;
}

export default function TopologyCanvas({ simRef, snapshot }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const dirtyRef = useRef(true);

  useEffect(() => { dirtyRef.current = true; }, [snapshot]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return undefined;
    const ctx = canvas.getContext('2d');
    let raf = 0;
    let disposed = false;

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reduced = mq.matches;
    const onMq = () => { reduced = mq.matches; dirtyRef.current = true; };
    mq.addEventListener?.('change', onMq);

    let pal = readPalette();
    const mo = new MutationObserver(() => { pal = readPalette(); dirtyRef.current = true; });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    // fonts load asynchronously; redraw once they are ready so text metrics are right
    document.fonts?.ready?.then(() => { dirtyRef.current = true; });

    const st = {
      sim: null,
      dots: [],
      rings: [],
      chokeSeen: 0,
      lastTick: -1,
      lastTickAt: 0,
      tickMs: 125,
      shapeDropsPrev: 0,
      emaGen: [0, 0, 0],
      emaAdmit: 0,
      emaDel: 0,
      disp: { q: 0, level: 0, tokens: 0 },
      phase: { src: [0, 0, 0], trunk: 0, out: 0, link: 0 },
      lastFrame: performance.now(),
      deliverFlashAt: 0,
      W: 0,
      H: 0,
      dpr: 0,
    };

    const resetFor = (sim) => {
      st.sim = sim;
      st.dots = [];
      st.rings = [];
      st.chokeSeen = (sim.algoState?.chokePackets || []).length;
      st.lastTick = sim.tick;
      st.shapeDropsPrev = sim.stats.droppedByReason.shape;
      st.emaGen = [0, 0, 0];
      st.emaAdmit = 0;
      st.emaDel = 0;
      const a = sim.algoState || {};
      st.disp = { q: sim.queue.length, level: a.level ?? 0, tokens: a.tokens ?? 0 };
    };

    const spawn = (sim, now) => {
      const lt = sim.lastTick || {};
      const algoId = sim.config.algorithm;
      const shaper = algoId === 'leaky' || algoId === 'token';
      const D = clamp(st.tickMs * 3.2, 380, 1100);
      const spread = Math.min(st.tickMs * 0.9, 320);
      const rnd = Math.random;
      const add = (d) => st.dots.push(d);

      const genDur = shaper ? D * 0.7 : D * 0.85;
      (lt.generated || []).forEach((arr, si) => {
        const n = Math.min((arr || []).length, 16);
        for (let k = 0; k < n; k += 1) add({ k: 'gen', i: si, t0: now + rnd() * spread, dur: genDur * (0.92 + rnd() * 0.16) });
      });

      const shapeNow = sim.stats.droppedByReason.shape;
      const shapeDelta = Math.max(0, shapeNow - st.shapeDropsPrev);
      st.shapeDropsPrev = shapeNow;
      const dropped = lt.dropped || [];
      const shapeDrops = Math.min(shapeDelta, dropped.length);
      const bufDrops = dropped.length - shapeDrops;
      const admitted = (lt.admitted || []).length;

      if (shaper) {
        const exitN = Math.min(admitted + bufDrops, 20);
        for (let k = 0; k < exitN; k += 1) add({ k: 'exit', t0: now + genDur + rnd() * spread * 0.6, dur: D * 0.3 });
      }
      const routerT = shaper ? D * 1.0 : D * 0.85;
      for (let k = 0; k < Math.min(admitted, 20); k += 1) add({ k: 'enq', t0: now + routerT + rnd() * spread * 0.6, dur: D * 0.25 });
      for (let k = 0; k < Math.min(shapeDrops, 12); k += 1) {
        add({ k: 'drop', at: 'gauge', t0: now + genDur + rnd() * spread * 0.5, dur: 650, vx: 8 + rnd() * 10 });
      }
      for (let k = 0; k < Math.min(bufDrops, 12); k += 1) {
        add({ k: 'drop', at: 'buf', t0: now + routerT + rnd() * spread * 0.5, dur: 650, vx: -12 + rnd() * 14 });
      }
      const delN = Math.min((lt.delivered || []).length, 20);
      for (let k = 0; k < delN; k += 1) add({ k: 'del', t0: now + rnd() * spread, dur: D * 0.8 });
      if (delN > 0) st.deliverFlashAt = now + D * 0.7;
      if (st.dots.length > MAX_DOTS) st.dots.splice(0, st.dots.length - MAX_DOTS);
    };

    const render = (now) => {
      raf = requestAnimationFrame(render);
      if (disposed) return;
      const sim = simRef.current;
      if (!sim) return;
      if (st.sim !== sim) { resetFor(sim); dirtyRef.current = true; }

      const dt = Math.min(0.1, (now - st.lastFrame) / 1000);
      st.lastFrame = now;

      // --- tick bookkeeping: spawn packets for every new tick
      if (sim.tick !== st.lastTick) {
        const dTick = sim.tick - st.lastTick;
        if (dTick < 0) { st.dots = []; st.rings = []; st.chokeSeen = 0; }
        if (dTick > 0) {
          if (st.lastTickAt && now - st.lastTickAt < 1500) {
            st.tickMs = lerp(st.tickMs, clamp((now - st.lastTickAt) / dTick, 16, 1000), 0.2);
          }
          const lt = sim.lastTick || {};
          (lt.generated || []).forEach((arr, i) => { st.emaGen[i] = lerp(st.emaGen[i], (arr || []).length, 0.25); });
          st.emaAdmit = lerp(st.emaAdmit, (lt.admitted || []).length, 0.25);
          st.emaDel = lerp(st.emaDel, (lt.delivered || []).length, 0.25);
          if (!reduced) spawn(sim, now);
          const cp = sim.algoState?.chokePackets || [];
          for (let i = st.chokeSeen; i < cp.length; i += 1) {
            const D = clamp(st.tickMs * 3.2, 380, 1100);
            if (!reduced) {
              st.dots.push({ k: 'choke', i: cp[i].src, t0: now, dur: Math.max(750, D * 1.4) });
              st.rings.push({ t0: now, dur: 650 });
            }
          }
          st.chokeSeen = cp.length;
          st.lastTickAt = now;
        }
        st.lastTick = sim.tick;
        dirtyRef.current = true;
      }
      const active = now - st.lastTickAt < 600;

      // --- tween displayed values
      const a = sim.algoState || {};
      const target = { q: sim.queue.length, level: a.level ?? 0, tokens: a.tokens ?? 0 };
      let converged = true;
      const k = 1 - Math.exp(-dt * 14);
      Object.keys(target).forEach((key) => {
        const diff = target[key] - st.disp[key];
        if (Math.abs(diff) > 0.01) { st.disp[key] += reduced ? diff : diff * k; converged = false; } else st.disp[key] = target[key];
      });

      // --- decide whether to draw this frame
      const W = Math.max(280, Math.round(wrap.clientWidth));
      const H = Math.round(clamp(W * 0.5, 320, 460));
      const dpr = window.devicePixelRatio || 1;
      const sizeChanged = W !== st.W || H !== st.H || dpr !== st.dpr;
      const animating = st.dots.length > 0 || st.rings.length > 0 || (active && !reduced) || !converged;
      const hot = sim.queue.length / Math.max(1, sim.config.bufferSize) > 0.9;
      if (!sizeChanged && !dirtyRef.current && !animating && !(hot && !reduced)) return;
      dirtyRef.current = false;

      if (sizeChanged) {
        st.W = W; st.H = H; st.dpr = dpr;
        canvas.style.height = `${H}px`;
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      const speedMul = clamp(125 / st.tickMs, 0.5, 4);
      const motion = active && !reduced ? 1 : 0;
      st.phase.src.forEach((_, i) => { st.phase.src[i] += dt * motion * (8 + 16 * st.emaGen[i]) * speedMul; });
      st.phase.trunk += dt * motion * (8 + 10 * (st.emaGen[0] + st.emaGen[1] + st.emaGen[2])) * speedMul;
      st.phase.out += dt * motion * (8 + 14 * st.emaAdmit) * speedMul;
      st.phase.link += dt * motion * (10 + 16 * st.emaDel) * speedMul;

      draw(ctx, sim, now, W, H, pal, st, reduced);
    };

    raf = requestAnimationFrame(render);
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      mo.disconnect();
      mq.removeEventListener?.('change', onMq);
    };
  }, [simRef]);

  const algo = ALGORITHMS[snapshot?.algorithm ?? 'none'];
  return (
    <div className="topo" ref={wrapRef}>
      <canvas
        ref={canvasRef}
        className="topo-canvas"
        role="img"
        aria-label={`Network topology at tick ${snapshot?.tick ?? 0}, ${algo?.name ?? ''}, buffer ${snapshot?.queueLength ?? 0} of ${snapshot?.bufferSize ?? 0}`}
      />
    </div>
  );
}

function draw(ctx, sim, now, W, H, pal, st, reduced) {
  const col = (v) => pal[v];
  const algoId = sim.config.algorithm;
  const algo = ALGORITHMS[algoId];
  const shaper = algoId === 'leaky' || algoId === 'token';
  const tiny = W < 440;
  const fs = clamp(W / 85, 9.5, 12.5);
  const sm = Math.max(9, fs - 1);
  const yc = H * 0.5;
  const buf = sim.config.bufferSize;
  const q = st.disp.q;
  const ratio = buf > 0 ? q / buf : 0;
  const fillVar = ratio > 0.9 ? '--drop' : ratio >= 0.6 ? '--warn' : '--flow';
  const hot = ratio > 0.9;
  const pulse = reduced ? 0.7 : 0.55 + 0.45 * Math.sin(now / 160);

  // ------------------------------------------------------------------ layout
  const srcLeft = W * 0.03;
  const srcMaxW = W * 0.17;
  const pad = tiny ? 5 : 8;
  const lh = fs * 1.5;
  const srcYs = [H * 0.22, H * 0.5, H * 0.78];

  // choose the richest source-box tier that fits in the column
  const eff = sim.sources.map((s) => (s.rate * (s.rateFactor ?? 1)).toFixed(1));
  let tier = 0;
  let boxes = null;
  for (tier = 0; tier < 3; tier += 1) {
    boxes = sim.sources.map((s, i) => buildSourceBox(tier, s, eff[i], s.rateFactor ?? 1, (s.rateFactor ?? 1) < 0.995));
    let widest = 0;
    boxes.forEach((rows) => rows.forEach((row) => {
      let w = 0;
      row.forEach((seg) => { setFont(ctx, fs, seg.weight || 400, seg.mono); w += ctx.measureText(seg.t).width; });
      widest = Math.max(widest, w);
    }));
    boxes.widest = widest;
    if (widest + pad * 2 <= srcMaxW) break;
  }
  if (tier === 3) tier = 2;
  const srcW = Math.min(srcMaxW, Math.max(boxes.widest + pad * 2, 38));
  const srcRight = srcLeft + srcW;

  const jx = W * 0.235;
  const gaugeCx = W * 0.30;
  const gw = clamp(W * 0.04, 16, 32);
  const gh = H * 0.34;
  const gx0 = gaugeCx - gw / 2;
  const gx1 = gaugeCx + gw / 2;
  const gy0 = yc - gh / 2;

  const rr = clamp(W * 0.026, 15, 24);
  const rx = W * 0.42;
  const rxL = rx - rr;
  const rxR = rx + rr;

  const bx0 = W * 0.48;
  const bx1 = W * 0.70;
  const bw = bx1 - bx0;
  const bh = clamp(H * 0.07, 16, 26);

  const sw = clamp(W * 0.11, 38, 118);
  const sh = tiny ? 44 : 54;
  const sx1 = W * 0.97;
  const sx0 = sx1 - sw;

  // packet paths
  const curves = srcYs.map((y) => bezierPoints(srcRight, y, jx, yc));
  const gaugeLeft = { x: gx0, y: yc };
  const routerLeft = { x: rxL, y: yc };
  const genPaths = curves.map((c) => makePath([...c, shaper ? gaugeLeft : routerLeft]));
  const chokePaths = curves.map((c) => makePath([routerLeft, ...[...c].reverse()]));
  const exitPath = makePath([{ x: gx1, y: yc }, routerLeft]);
  const enqPath = makePath([{ x: rxR, y: yc }, { x: bx0, y: yc }]);
  const delPath = makePath([{ x: bx1, y: yc }, { x: sx0, y: yc }]);

  // ------------------------------------------------------------------ links
  const dashLink = (pathFn, color, width, phase, alpha) => {
    if (reduced) return;
    ctx.save();
    ctx.setLineDash([3, 8]);
    ctx.lineDashOffset = -phase;
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    pathFn();
    ctx.stroke();
    ctx.restore();
  };

  ctx.lineWidth = 1.25;
  ctx.strokeStyle = col('--line-strong');
  curves.forEach((c, i) => {
    const trace = () => {
      ctx.beginPath();
      c.forEach((p, j) => (j === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    };
    ctx.globalAlpha = 0.7;
    trace();
    ctx.stroke();
    ctx.globalAlpha = 1;
    if ((sim.sources[i]?.rate ?? 0) > 0) dashLink(trace, col('--flow'), 1.4, st.phase.src[i], 0.55);
  });

  const line = (x0, x1, y = yc) => () => { ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); };
  ctx.lineWidth = 1.25;
  ctx.globalAlpha = 0.7;
  ctx.strokeStyle = col('--line-strong');
  line(jx, shaper ? gx0 : rxL)();
  ctx.stroke();
  if (shaper) { line(gx1, rxL)(); ctx.stroke(); }
  line(rxR, bx0)();
  ctx.stroke();
  ctx.globalAlpha = 1;
  dashLink(line(jx, shaper ? gx0 : rxL), col('--flow'), 1.4, st.phase.trunk, 0.55);
  if (shaper) dashLink(line(gx1, rxL), col('--flow'), 1.4, st.phase.out, 0.55);

  // bottleneck link: thickness scales with capacity so a small pipe looks small
  const linkW = 2 + sim.config.linkCapacity * 0.45;
  ctx.lineCap = 'butt';
  ctx.lineWidth = linkW;
  ctx.strokeStyle = col('--line-strong');
  ctx.globalAlpha = 0.8;
  line(bx1, sx0)();
  ctx.stroke();
  ctx.globalAlpha = 1;
  dashLink(line(bx1, sx0), col('--flow'), Math.max(1.6, linkW * 0.45), st.phase.link, 0.85);
  ctx.lineCap = 'butt';

  // ------------------------------------------------------------------ dropped packets (under nodes)
  const flowGlow = st.dots.length < 160 && !reduced;
  const dropFall = H * 0.08 + 14;
  st.dots = st.dots.filter((d) => now < d.t0 + d.dur);
  st.dots.forEach((d) => {
    if (d.k !== 'drop' || now < d.t0) return;
    const p = (now - d.t0) / d.dur;
    const ox = d.at === 'gauge' ? gx1 : bx0;
    const oy = d.at === 'gauge' ? gy0 + 6 : yc - bh / 2;
    const x = ox + d.vx * p;
    const y = oy + (-20 * p + (20 + dropFall) * p * p);
    ctx.globalAlpha = 1 - p * p;
    ctx.fillStyle = col('--drop');
    if (flowGlow) { ctx.shadowColor = col('--drop'); ctx.shadowBlur = 8; }
    ctx.beginPath();
    ctx.arc(x, y, 2.6, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  });

  // ------------------------------------------------------------------ nodes
  const nodeFill = col('--bg');
  const nodeStroke = col('--line-strong');

  // sources
  sim.sources.forEach((s, i) => {
    const rows = boxes[i];
    const h = rows.length * lh + pad * 1.4;
    const y = srcYs[i];
    const factor = s.rateFactor ?? 1;
    const choked = factor < 0.995;
    ctx.fillStyle = nodeFill;
    ctx.strokeStyle = choked ? col('--warn') : nodeStroke;
    ctx.lineWidth = 1;
    roundRect(ctx, srcLeft, y - h / 2, srcW, h, 8);
    ctx.fill();
    ctx.globalAlpha = choked ? 0.9 : 1;
    ctx.stroke();
    ctx.globalAlpha = 1;
    rows.forEach((row, r) => {
      let x = srcLeft + pad;
      const ty = y - h / 2 + pad * 0.7 + lh * (r + 0.5);
      row.forEach((seg) => {
        if (!seg.t) return;
        setFont(ctx, fs, seg.weight || 400, seg.mono);
        text(ctx, seg.t, x, ty, col(seg.c), fs, { weight: seg.weight || 400, mono: seg.mono });
        x += ctx.measureText(seg.t).width;
      });
    });
  });

  // shaping gauge
  if (shaper && as.cfg) {
    const isLeaky = algoId === 'leaky';
    const cap = isLeaky ? (as.cfg.bucketSize || 1) : (as.cfg.bucketCapacity || 1);
    const val = isLeaky ? st.disp.level : st.disp.tokens;
    const frac = clamp(val / cap, 0, 1);
    const gc = isLeaky ? (frac > 0.9 ? '--drop' : frac > 0.6 ? '--warn' : '--flow') : '--token';
    ctx.save();
    roundRect(ctx, gx0, gy0, gw, gh, 6);
    ctx.fillStyle = nodeFill;
    ctx.fill();
    ctx.clip();
    const fh = gh * frac;
    if (fh > 0) {
      const grad = ctx.createLinearGradient(0, gy0 + gh - fh, 0, gy0 + gh);
      grad.addColorStop(0, col(gc));
      grad.addColorStop(1, col(gc));
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = grad;
      ctx.fillRect(gx0, gy0 + gh - fh, gw, fh);
      ctx.globalAlpha = 1;
      ctx.fillStyle = col(gc);
      ctx.fillRect(gx0, gy0 + gh - fh, gw, 1.5);
    }
    ctx.restore();
    ctx.strokeStyle = nodeStroke;
    ctx.lineWidth = 1;
    roundRect(ctx, gx0, gy0, gw, gh, 6);
    ctx.stroke();

    const lw = W * 0.14;
    const ly = gy0 + gh + 12;
    const title = fit(ctx, fs, 600, false, [isLeaky ? 'Leaky bucket' : 'Token bucket', isLeaky ? 'Leaky' : 'Token'], lw);
    text(ctx, title, gaugeCx, ly, col('--ink'), fs, { weight: 600, align: 'center' });
    const count = isLeaky ? `${Math.round(val)}/${cap}` : `${val.toFixed(1)}/${cap}`;
    const countStr = fit(ctx, sm, 400, true, [count, `${Math.round(val)}`], lw);
    text(ctx, countStr, gaugeCx, ly + sm * 1.5, col(gc), sm, { mono: true, align: 'center' });
    const extra = isLeaky ? `leak r = ${as.cfg.leakRate}` : `waiting ${as.waiting ?? 0}`;
    const extraStr = fit(ctx, sm, 400, true, isLeaky ? [extra, `r = ${as.cfg.leakRate}`] : [extra, `wait ${as.waiting ?? 0}`], lw);
    text(ctx, extraStr, gaugeCx, ly + sm * 3, col('--ink-dim'), sm, { mono: true, align: 'center' });
  } else {
    // plain junction where the three sources merge
    ctx.fillStyle = col('--line-strong');
    ctx.beginPath();
    ctx.arc(jx, yc, 2.5, 0, TAU);
    ctx.fill();
  }

  // router
  const ringVar = fillVar;
  if (!reduced || hot) {
    ctx.save();
    ctx.globalAlpha = hot ? 0.35 + 0.4 * pulse : 0.28;
    ctx.shadowColor = col(ringVar);
    ctx.shadowBlur = 16;
    ctx.strokeStyle = col(ringVar);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(rx, yc, rr, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle = nodeFill;
  ctx.strokeStyle = col(ringVar);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(rx, yc, rr, 0, TAU);
  ctx.fill();
  ctx.stroke();
  text(ctx, 'R1', rx, yc + 0.5, col('--ink'), clamp(rr * 0.62, 9.5, 14), { weight: 700, align: 'center' });
  if (W >= 720) text(ctx, 'gateway router', rx, yc + rr + 14, col('--ink-faint'), sm, { align: 'center' });

  // choke acknowledgement rings
  st.rings = st.rings.filter((r) => now < r.t0 + r.dur);
  st.rings.forEach((r) => {
    const p = (now - r.t0) / r.dur;
    ctx.globalAlpha = (1 - p) * 0.7;
    ctx.strokeStyle = col('--warn');
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(rx, yc, rr + 2 + p * 16, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 1;
  });

  // buffer bar (fills from the link end, so the queue backs up toward the router)
  ctx.fillStyle = nodeFill;
  ctx.strokeStyle = hot ? col('--drop') : nodeStroke;
  ctx.lineWidth = 1;
  roundRect(ctx, bx0, yc - bh / 2, bw, bh, 5);
  ctx.fill();
  ctx.globalAlpha = hot ? 0.4 + 0.6 * pulse : 1;
  ctx.stroke();
  ctx.globalAlpha = 1;
  const inset = 2;
  const innerW = bw - inset * 2;
  const innerH = bh - inset * 2;
  const slotted = innerW / buf >= 3.2;
  ctx.fillStyle = col(fillVar);
  if (slotted) {
    const slotW = innerW / buf;
    const gap = slotW > 5 ? 1 : 0.6;
    for (let j = 0; j < buf; j += 1) {
      const f = clamp(q - j, 0, 1);
      if (f <= 0) continue;
      ctx.globalAlpha = 0.25 + 0.75 * f;
      ctx.fillRect(bx1 - inset - (j + 1) * slotW + gap / 2, yc - innerH / 2, slotW - gap, innerH);
    }
    ctx.globalAlpha = 1;
  } else {
    const fw = innerW * clamp(ratio, 0, 1);
    if (fw > 0.5) {
      ctx.globalAlpha = 0.9;
      roundRect(ctx, bx1 - inset - fw, yc - innerH / 2, fw, innerH, 3);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  const bufCount = `${sim.queue.length}/${buf}`;
  let labelY = yc + bh / 2 + sm + 3;

  // RED markers: thresholds, running average and drop probability
  if (algoId === 'red' && as.cfg) {
    const { minTh, maxTh } = as.cfg;
    const xAt = (v) => bx1 - inset - (clamp(v, 0, buf) / buf) * innerW;
    [[minTh, '--warn', 'min'], [maxTh, '--drop', 'max']].forEach(([v, c]) => {
      const x = xAt(v);
      ctx.strokeStyle = col(c);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, yc - bh / 2 - 5);
      ctx.lineTo(x, yc + bh / 2 + 5);
      ctx.stroke();
    });
    const avg = as.avg ?? 0;
    const ax = xAt(avg);
    ctx.fillStyle = col('--token');
    ctx.beginPath();
    ctx.moveTo(ax, yc - bh / 2 - 1);
    ctx.lineTo(ax - 4, yc - bh / 2 - 8);
    ctx.lineTo(ax + 4, yc - bh / 2 - 8);
    ctx.closePath();
    ctx.fill();
    const pStr = `p = ${(as.lastP ?? 0).toFixed(3)}`;
    const top = fit(ctx, sm, 400, true, [`avg ${avg.toFixed(1)}   ${pStr}`, pStr, `p ${(as.lastP ?? 0).toFixed(2)}`], bw + W * 0.02);
    text(ctx, top, bx0, yc - bh / 2 - 17, col('--ink-dim'), sm, { mono: true });
    const minL = fit(ctx, sm - 0.5, 400, true, [`min ${minTh}`, `${minTh}`], bw);
    const maxL = fit(ctx, sm - 0.5, 400, true, [`max ${maxTh}`, `${maxTh}`], bw);
    setFont(ctx, sm - 0.5, 400, true);
    const wMin = ctx.measureText(minL).width;
    const wMax = ctx.measureText(maxL).width;
    if (Math.abs(xAt(minTh) - xAt(maxTh)) > (wMin + wMax) / 2 + 6) {
      text(ctx, minL, xAt(minTh), labelY, col('--warn'), sm - 0.5, { mono: true, align: 'center' });
      text(ctx, maxL, xAt(maxTh), labelY, col('--drop'), sm - 0.5, { mono: true, align: 'center' });
      labelY += sm + 3;
    }
  }
  const bufStr = fit(ctx, sm, 400, true, [`buffer ${bufCount}`, bufCount], bw + W * 0.02);
  text(ctx, bufStr, (bx0 + bx1) / 2, labelY + 3, col(fillVar), sm, { mono: true, align: 'center' });

  // bottleneck link label above the line
  const linkMid = (bx1 + sx0) / 2;
  const linkMax = Math.max(24, sx0 - bx1 - 6);
  const l1 = fit(ctx, sm, 500, false, ['Bottleneck link', 'Bottleneck', 'Link'], linkMax);
  const cap = sim.config.linkCapacity;
  const l2 = fit(ctx, sm, 400, true, [`${cap} pkt/tick`, `${cap} pkt/t`, `${cap}/t`], linkMax);
  text(ctx, l2, linkMid, yc - linkW / 2 - 8, col('--flow'), sm, { mono: true, align: 'center' });
  text(ctx, l1, linkMid, yc - linkW / 2 - 8 - sm * 1.45, col('--ink-dim'), sm, { weight: 500, align: 'center' });

  // server
  ctx.fillStyle = nodeFill;
  ctx.strokeStyle = nodeStroke;
  ctx.lineWidth = 1;
  roundRect(ctx, sx0, yc - sh / 2, sw, sh, 8);
  ctx.fill();
  ctx.stroke();
  const flash = clamp(1 - (now - st.deliverFlashAt) / 450, 0, 1);
  if (flash > 0 && now >= st.deliverFlashAt && !reduced) {
    ctx.globalAlpha = flash;
    ctx.strokeStyle = col('--ok');
    ctx.lineWidth = 1.5;
    roundRect(ctx, sx0, yc - sh / 2, sw, sh, 8);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  const sName = fit(ctx, fs, 600, false, ['Server', 'Srv'], sw - 8);
  const rcv = String(sim.stats.delivered);
  const sCount = fit(ctx, sm, 400, true, [`${rcv} rcvd`, rcv], sw - 8);
  text(ctx, sName, sx0 + sw / 2, yc - (sCount ? sm * 0.7 : 0), col('--ink'), fs, { weight: 600, align: 'center' });
  text(ctx, sCount, sx0 + sw / 2, yc + fs * 0.8, col('--ok'), sm, { mono: true, align: 'center' });

  // ------------------------------------------------------------------ flowing packets
  const dotR = clamp(W / 330, 2.2, 3.4);
  const flow = col('--flow');
  const drawDots = (kinds, color, radius) => {
    ctx.fillStyle = color;
    if (flowGlow) { ctx.shadowColor = color; ctx.shadowBlur = 8; }
    st.dots.forEach((d) => {
      if (now < d.t0 || !kinds.includes(d.k)) return;
      const p = (now - d.t0) / d.dur;
      const path = d.k === 'gen' ? genPaths[d.i] || genPaths[0] : d.k === 'exit' ? exitPath : d.k === 'enq' ? enqPath : delPath;
      const pos = pathAt(path, easeInOut(p));
      ctx.globalAlpha = clamp(Math.min(p * 8, (1 - p) * 6), 0, 1);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, TAU);
      ctx.fill();
    });
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  };
  if (!reduced) {
    drawDots(['gen', 'exit', 'enq', 'del'], flow, dotR);

    // choke packets travel back from R1 to the offending source
    const warn = col('--warn');
    ctx.fillStyle = warn;
    if (flowGlow) { ctx.shadowColor = warn; ctx.shadowBlur = 10; }
    st.dots.forEach((d) => {
      if (d.k !== 'choke' || now < d.t0) return;
      const p = (now - d.t0) / d.dur;
      const pos = pathAt(chokePaths[d.i] || chokePaths[0], easeInOut(p));
      const r = dotR + 2.2;
      ctx.globalAlpha = clamp(Math.min(p * 8, (1 - p) * 6), 0, 1);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y - r);
      ctx.lineTo(pos.x + r, pos.y);
      ctx.lineTo(pos.x, pos.y + r);
      ctx.lineTo(pos.x - r, pos.y);
      ctx.closePath();
      ctx.fill();
    });
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  // ------------------------------------------------------------------ overlay
  text(ctx, `t = ${sim.tick}`, 14, 18, col('--ink'), 12.5, { weight: 600, mono: true });
  const mech = fit(ctx, fs, 400, false, [algo?.name || ''], W - 28);
  text(ctx, mech, 14, 35, col('--ink-dim'), fs);
}
