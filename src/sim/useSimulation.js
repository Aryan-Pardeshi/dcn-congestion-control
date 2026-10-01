import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_CONFIG, createSimulation, step, metrics } from './engine.js';

function snapshotOf(sim) {
  const m = metrics(sim);
  const st = sim.algoState || {};
  const algoState = {};
  if (typeof st.level === 'number') algoState.level = st.level;
  if (st.cfg) algoState.cfg = { ...st.cfg };
  if (typeof st.tokens === 'number') algoState.tokens = st.tokens;
  if (Array.isArray(st.waiting)) algoState.waiting = st.waiting.length;
  if (typeof st.chokesSent === 'number') algoState.chokesSent = st.chokesSent;
  if (Array.isArray(st.chokePackets)) algoState.chokePackets = st.chokePackets.slice(-20);
  if (typeof st.avg === 'number') algoState.avg = st.avg;
  if (typeof st.lastP === 'number') algoState.lastP = st.lastP;
  return {
    tick: sim.tick,
    metrics: m,
    queueLength: sim.queue.length,
    bufferSize: sim.config.bufferSize,
    linkCapacity: sim.config.linkCapacity,
    algorithm: sim.config.algorithm,
    algoState,
    sources: sim.sources.map((s) => ({ id: s.id, rate: s.rate, pattern: s.pattern, rateFactor: s.rateFactor ?? 1 })),
    history: sim.history.slice(-200),
    events: sim.events.slice(-60),
  };
}

export function useSimulation(initialConfig) {
  const [config, setConfigState] = useState(() => ({ ...DEFAULT_CONFIG, ...(initialConfig || {}) }));
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const simRef = useRef(null);
  if (simRef.current === null) {
    simRef.current = createSimulation(config);
  }
  const [snapshot, setSnapshot] = useState(() => snapshotOf(simRef.current));
  const runningRef = useRef(running);
  runningRef.current = running;
  const speedRef = useRef(speed);
  speedRef.current = speed;

  const pushSnapshot = useCallback(() => {
    if (simRef.current) setSnapshot(snapshotOf(simRef.current));
  }, []);

  const resetSim = useCallback((cfg) => {
    simRef.current = createSimulation(cfg);
    setSnapshot(snapshotOf(simRef.current));
  }, []);

  const setConfig = useCallback((partialOrUpdater) => {
    setConfigState((prev) => {
      const next = typeof partialOrUpdater === 'function' ? partialOrUpdater(prev) : { ...prev, ...partialOrUpdater };
      resetSim(next);
      return next;
    });
  }, [resetSim]);

  const updateParam = useCallback((algoId, key, value) => {
    setConfigState((prev) => {
      const next = { ...prev, params: { ...prev.params, [algoId]: { ...prev.params[algoId], [key]: value } } };
      resetSim(next);
      return next;
    });
  }, [resetSim]);

  const updateSource = useCallback((i, patch) => {
    setConfigState((prev) => {
      const sources = prev.sources.map((s, idx) => (idx === i ? { ...s, ...patch } : s));
      const next = { ...prev, sources };
      // live update without reset
      const sim = simRef.current;
      if (sim && sim.sources[i]) {
        if (patch.rate !== undefined) sim.sources[i].rate = patch.rate;
        if (patch.pattern !== undefined) sim.sources[i].pattern = patch.pattern;
        sim.config.sources = sources.map((s) => ({ ...s }));
      }
      pushSnapshot();
      return next;
    });
  }, [pushSnapshot]);

  const play = useCallback(() => setRunning(true), []);
  const pause = useCallback(() => setRunning(false), []);
  const toggle = useCallback(() => setRunning((r) => !r), []);

  const stepOnce = useCallback(() => {
    if (simRef.current) {
      step(simRef.current);
      pushSnapshot();
    }
  }, [pushSnapshot]);

  const reset = useCallback(() => {
    setConfigState((prev) => {
      resetSim(prev);
      return prev;
    });
  }, [resetSim]);

  const injectBurst = useCallback((srcIndex, count = 12) => {
    const sim = simRef.current;
    if (!sim) return;
    const idx = srcIndex ?? Math.floor(Math.random() * sim.sources.length);
    sim.injectBurst(idx, count);
    pushSnapshot();
  }, [pushSnapshot]);

  // rAF loop: 8 ticks/s x speed, snapshot at most ~10/s
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let lastSnap = 0;
    const frame = (now) => {
      const dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      if (runningRef.current && simRef.current && !document.hidden) {
        acc += dt * 8 * speedRef.current;
        let n = Math.floor(acc);
        acc -= n;
        if (n > 64) { n = 64; acc = 0; }
        for (let i = 0; i < n; i += 1) step(simRef.current);
        if (n > 0 && now - lastSnap > 100) {
          lastSnap = now;
          setSnapshot(snapshotOf(simRef.current));
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    const onVis = () => { last = performance.now(); acc = 0; };
    document.addEventListener('visibilitychange', onVis);
    return () => { cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', onVis); };
  }, []);

  return {
    config, setConfig, updateParam, updateSource,
    play, pause, toggle, stepOnce, reset, setSpeed, injectBurst,
    snapshot, simRef, running, speed,
  };
}
