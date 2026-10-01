import { useEffect, useRef } from 'react';
import { ALGORITHMS } from './algorithms/index.js';

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export default function TopologyCanvas({ simRef, snapshot }) {
  const canvasRef = useRef(null);
  const dotsRef = useRef([]);
  const lastTickRef = useRef(0);
  const chokeAnimRef = useRef([]);
  const seenChokeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf = 0;
    let ro = null;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(280, rect.width);
      const h = Math.max(300, (rect.width * 9) / 16);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    };
    resize();
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(resize);
      ro.observe(canvas);
    }

    const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const render = () => {
      raf = requestAnimationFrame(render);
      const sim = simRef.current;
      if (!sim) return;
      const dpr = window.devicePixelRatio || 1;
      const W = canvas.width / dpr;
      const H = canvas.height / dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const flow = cssVar('--flow') || '#4FD1C5';
      const warn = cssVar('--warn') || '#F5B841';
      const drop = cssVar('--drop') || '#F2545B';
      const tokenC = cssVar('--token') || '#B69CFF';
      const ink = cssVar('--ink') || '#E6EEF5';
      const inkDim = cssVar('--ink-dim') || '#93A9BE';
      const line = cssVar('--line') || '#2C5072';
      const bg2 = cssVar('--bg-2') || '#13304A';

      ctx.clearRect(0, 0, W, H);

      const narrow = W < 560;
      // layout points
      const srcX = 86;
      const srcYs = narrow ? [86, 132, 178] : [H * 0.3, H * 0.52, H * 0.74];
      const r1x = narrow ? W * 0.52 : W * 0.42;
      const r1y = narrow ? 132 : H * 0.52;
      const srvX = W - 70;
      const srvY = r1y;
      const bufX = r1x + 34;
      const gaugeY = narrow ? 232 : H - 44;

      // spawn dots on new tick
      if (sim.tick !== lastTickRef.current) {
        lastTickRef.current = sim.tick;
        if (!reduced() && dotsRef.current.length < 400) {
          const lt = sim.lastTick || {};
          (lt.generated || []).forEach((arr, si) => {
            (arr || []).slice(0, 12).forEach(() => {
              dotsRef.current.push({ kind: 'gen', src: si, t0: performance.now(), dur: 700 });
            });
          });
          (lt.delivered || []).slice(0, 20).forEach(() => {
            dotsRef.current.push({ kind: 'del', t0: performance.now(), dur: 600 });
          });
          (lt.dropped || []).slice(0, 20).forEach(() => {
            dotsRef.current.push({ kind: 'drop', t0: performance.now(), dur: 800 });
          });
          if (dotsRef.current.length > 400) dotsRef.current.splice(0, dotsRef.current.length - 400);
        }
        // choke animations
        const cp = sim.algoState?.chokePackets || [];
        for (let i = seenChokeRef.current; i < cp.length; i += 1) {
          chokeAnimRef.current.push({ ...cp[i], t0: performance.now() });
        }
        seenChokeRef.current = cp.length;
      }

      // links: sources -> R1
      ctx.strokeStyle = line;
      ctx.lineWidth = 1.5;
      srcYs.forEach((y) => {
        ctx.beginPath();
        ctx.moveTo(srcX + 44, y);
        ctx.lineTo(r1x - 20, r1y);
        ctx.stroke();
      });

      // bottleneck link R1 -> server
      ctx.strokeStyle = flow;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(r1x + 22, r1y);
      ctx.lineTo(srvX - 34, srvY);
      ctx.stroke();
      ctx.lineWidth = 1.5;
      ctx.fillStyle = inkDim;
      ctx.font = '11px "Martian Mono", monospace';
      ctx.fillText(`Bottleneck link — ${sim.config.linkCapacity} pkt/t`, (r1x + srvX) / 2 - 70, r1y - 10);

      // sources
      sim.sources.forEach((s, i) => {
        const y = srcYs[i] ?? r1y;
        ctx.fillStyle = bg2;
        ctx.strokeStyle = line;
        roundRect(ctx, srcX - 44, y - 24, 88, 48, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = ink;
        ctx.font = '600 12px Archivo, sans-serif';
        ctx.fillText(s.id || `S${i + 1}`, srcX - 34, y - 4);
        ctx.fillStyle = inkDim;
        ctx.font = '11px Archivo, sans-serif';
        ctx.fillText(s.label || '', srcX - 34, y + 10);
        const eff = (s.rate * (s.rateFactor ?? 1)).toFixed(1);
        ctx.font = '11px "Martian Mono", monospace';
        if ((s.rateFactor ?? 1) < 1) {
          ctx.fillStyle = warn;
          ctx.fillText(`${eff} pkt/t ×${Number(s.rateFactor).toFixed(2)}`, srcX - 34, y + (narrow ? 22 : 22));
        } else {
          ctx.fillStyle = inkDim;
          ctx.fillText(`${eff} pkt/t`, srcX - 34, y + 22);
        }
      });

      // R1 router
      ctx.fillStyle = bg2;
      ctx.strokeStyle = flow;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(r1x, r1y, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = ink;
      ctx.font = '700 13px Archivo, sans-serif';
      ctx.fillText('R1', r1x - 9, r1y + 5);
      ctx.lineWidth = 1.5;

      // server
      ctx.fillStyle = bg2;
      ctx.strokeStyle = line;
      roundRect(ctx, srvX - 34, srvY - 24, 68, 48, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = ink;
      ctx.font = '600 12px Archivo, sans-serif';
      ctx.fillText('Server', srvX - 26, srvY + 4);

      // buffer slots to right of R1
      const buf = sim.config.bufferSize;
      const q = sim.queue.length;
      const ratio = buf > 0 ? q / buf : 0;
      const bufColor = ratio > 0.9 ? drop : ratio >= 0.6 ? warn : flow;
      const bw = Math.min(200, W - bufX - 110);
      if (buf > 40) {
        ctx.fillStyle = bg2;
        ctx.strokeStyle = line;
        roundRect(ctx, bufX, r1y - 12, bw, 24, 6);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = bufColor;
        const fw = Math.max(0, Math.min(1, ratio)) * (bw - 4);
        if (fw > 0) { roundRect(ctx, bufX + 2, r1y - 10, fw, 20, 4); ctx.fill(); }
      } else {
        const slotW = Math.max(4, Math.min(10, (bw - buf) / buf));
        for (let i = 0; i < buf; i += 1) {
          ctx.fillStyle = i < q ? bufColor : bg2;
          ctx.strokeStyle = line;
          const x = bufX + i * (slotW + 1);
          ctx.fillRect(x, r1y - 12, slotW, 24);
          ctx.strokeRect(x, r1y - 12, slotW, 24);
        }
      }
      ctx.fillStyle = inkDim;
      ctx.font = '11px "Martian Mono", monospace';
      ctx.fillText(`buffer ${q}/${buf}`, bufX, r1y + 30);

      // RED markers
      const st = sim.algoState || {};
      if (sim.config.algorithm === 'red' && st.cfg) {
        const { minTh, maxTh } = st.cfg;
        const mx = (v) => bufX + 2 + (Math.min(v, buf) / buf) * (bw - 4);
        ctx.strokeStyle = warn;
        [[minTh, 'min'], [maxTh, 'max']].forEach(([v]) => {
          ctx.beginPath(); ctx.moveTo(mx(v), r1y - 16); ctx.lineTo(mx(v), r1y + 16); ctx.stroke();
        });
        ctx.fillStyle = tokenC;
        const ax = mx(st.avg || 0);
        ctx.beginPath(); ctx.moveTo(ax, r1y - 20); ctx.lineTo(ax - 4, r1y - 28); ctx.lineTo(ax + 4, r1y - 28); ctx.closePath(); ctx.fill();
        ctx.fillStyle = inkDim;
        ctx.fillText(`avg ${(st.avg ?? 0).toFixed(1)}  p=${(st.lastP ?? 0).toFixed(3)}`, bufX, r1y + 44);
      }

      // shaping gauges
      ctx.fillStyle = ink;
      ctx.font = '600 12px Archivo, sans-serif';
      if (sim.config.algorithm === 'leaky' && st.cfg) {
        const lvl = st.level ?? 0;
        const bs = st.cfg.bucketSize || 1;
        ctx.fillText(`Leaky bucket  r = ${st.cfg.leakRate}`, 12, gaugeY - 26);
        ctx.fillStyle = bg2;
        roundRect(ctx, 12, gaugeY - 18, 180, 16, 6);
        ctx.fill();
        ctx.fillStyle = lvl / bs > 0.9 ? drop : flow;
        const fw = Math.min(1, lvl / bs) * 176;
        if (fw > 0) { roundRect(ctx, 14, gaugeY - 16, fw, 12, 4); ctx.fill(); }
        ctx.fillStyle = inkDim;
        ctx.font = '11px "Martian Mono", monospace';
        ctx.fillText(`${lvl}/${bs}`, 198, gaugeY - 5);
      } else if (sim.config.algorithm === 'token' && st.cfg) {
        const tw = st.tokens ?? 0;
        const cap = st.cfg.bucketCapacity || 1;
        ctx.fillText('Token bucket', 12, gaugeY - 26);
        for (let i = 0; i < Math.min(cap, 30); i += 1) {
          ctx.fillStyle = i < Math.floor(tw) ? tokenC : bg2;
          ctx.beginPath();
          ctx.arc(20 + i * 12, gaugeY - 10, 4.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = inkDim;
        ctx.font = '11px "Martian Mono", monospace';
        ctx.fillText(`tokens ${Number(tw).toFixed(1)}/${cap}  waiting ${st.waiting ?? 0}`, 12, gaugeY + 12);
      }

      // packet dots
      if (!reduced()) {
        const now = performance.now();
        dotsRef.current = dotsRef.current.filter((d) => now - d.t0 < d.dur + 100);
        dotsRef.current.forEach((d) => {
          const p = Math.min(1, (now - d.t0) / d.dur);
          if (d.kind === 'gen') {
            const y0 = srcYs[d.src] ?? r1y;
            const x = srcX + 44 + (r1x - 20 - (srcX + 44)) * p;
            const y = y0 + (r1y - y0) * p;
            ctx.fillStyle = flow;
            ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
          } else if (d.kind === 'del') {
            const x = r1x + 22 + (srvX - 34 - (r1x + 22)) * p;
            ctx.fillStyle = flow;
            ctx.beginPath(); ctx.arc(x, r1y, 3, 0, Math.PI * 2); ctx.fill();
          } else {
            const x = r1x + (Math.random() - 0.5) * 2;
            const y = r1y + 24 + p * 40;
            ctx.globalAlpha = 1 - p;
            ctx.fillStyle = drop;
            ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1;
          }
        });
        // choke packets R1 -> source
        chokeAnimRef.current = chokeAnimRef.current.filter((c) => now - c.t0 < 800);
        chokeAnimRef.current.forEach((c) => {
          const p = Math.min(1, (now - c.t0) / 800);
          const y0 = srcYs[c.src] ?? r1y;
          const x = r1x - 20 + (srcX + 44 - (r1x - 20)) * p;
          const y = r1y + (y0 - r1y) * p;
          ctx.fillStyle = warn;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(Math.PI / 4);
          ctx.fillRect(-4, -4, 8, 8);
          ctx.restore();
        });
      }

      // overlay
      const algo = ALGORITHMS[sim.config.algorithm];
      ctx.fillStyle = ink;
      ctx.font = '600 12px Archivo, sans-serif';
      ctx.fillText(`t = ${sim.tick}`, 12, 20);
      ctx.fillStyle = inkDim;
      ctx.font = '11px Archivo, sans-serif';
      ctx.fillText(algo ? `${algo.name} · ${algo.category}` : '', 12, 36);
    };

    raf = requestAnimationFrame(render);
    return () => { cancelAnimationFrame(raf); if (ro) ro.disconnect(); };
  }, [simRef]);

  const algo = ALGORITHMS[snapshot?.algorithm ?? 'none'];
  return (
    <div className="topo-wrap">
      <canvas ref={canvasRef} className="topo-canvas" role="img" aria-label={`Network topology, tick ${snapshot?.tick ?? 0}, ${algo?.name ?? ''}`} />
    </div>
  );
}
