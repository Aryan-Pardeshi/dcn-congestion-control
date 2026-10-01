import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_CONFIG, createSimulation, step, metrics } from './engine.js';

const TICKS_PER_SECOND = 8;
const SNAPSHOT_MS = 100;

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
    dropsByReason: { ...sim.stats.droppedByReason },
    sources: sim.sources.map((s) => ({ id: s.id, rate: s.rate, pattern: s.pattern, rateFactor: s.rateFactor ?? 1 })),
    history: sim.history.slice(-200),
    events: sim.events.slice(-60),
  };
}

export function useSimulation(initialConfig) {
  const [config, setConfigState] = useState(() => ({ ...DEFAULT_CONFIG, ...(initialConfig || {}) }));
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);

  // The simulation and the latest config live in refs; React state only receives throttled snapshots.
  const configRef = useRef(config);
  const simRef = useRef(null);
  if (simRef.current === null) simRef.current = createSimulation(config);
  const [snapshot, setSnapshot] = useState(() => snapshotOf(simRef.current));

  const runningRef = useRef(running);
  runningRef.current = running;
  const speedRef = useRef(speed);
  speedRef.current = speed;

  const pushSnapshot = useCallback(() => {
    if (simRef.current) setSnapshot(snapshotOf(simRef.current));
  }, []);

  // Apply a new config and rebuild the simulation (side effects live here, never inside state updaters).
  const commit = useCallback((next) => {
    configRef.current = next;
    setConfigState(next);
    simRef.current = createSimulation(next);
    setSnapshot(snapshotOf(simRef.current));
  }, []);

  const setConfig = useCallback((partialOrUpdater) => {
    const prev = configRef.current;
    const next = typeof partialOrUpdater === 'function' ? partialOrUpdater(prev) : { ...prev, ...partialOrUpdater };
    commit(next);
  }, [commit]);

  const updateParam = useCallback((algoId, key, value) => {
    const prev = configRef.current;
    commit({ ...prev, params: { ...prev.params, [algoId]: { ...prev.params[algoId], [key]: value } } });
  }, [commit]);

  const updateSource = useCallback((i, patch) => {
    const prev = configRef.current;
    const sources = prev.sources.map((s, idx) => (idx === i ? { ...s, ...patch } : s));
    const next = { ...prev, sources };
    configRef.current = next;
    setConfigState(next);
    // live update without a reset
    const sim = simRef.current;
    if (sim && sim.sources[i]) {
      if (patch.rate !== undefined) sim.sources[i].rate = patch.rate;
      if (patch.pattern !== undefined) sim.sources[i].pattern = patch.pattern;
      sim.config.sources = sources.map((s) => ({ ...s }));
    }
    pushSnapshot();
  }, [pushSnapshot]);

  // flush a final snapshot when pausing so the panels never lag behind the engine
  useEffect(() => { if (!running) pushSnapshot(); }, [running, pushSnapshot]);

  const play = useCallback(() => setRunning(true), []);
  const pause = useCallback(() => setRunning(false), []);
  const toggle = useCallback(() => setRunning((r) => !r), []);

  const stepOnce = useCallback(() => {
    if (simRef.current) {
      step(simRef.current);
      pushSnapshot();
    }
  }, [pushSnapshot]);

  const reset = useCallback(() => commit(configRef.current), [commit]);

  const injectBurst = useCallback((srcIndex, count = 12) => {
    const sim = simRef.current;
    if (!sim) return;
    const idx = srcIndex ?? Math.floor(Math.random() * sim.sources.length);
    sim.injectBurst(idx, count);
    pushSnapshot();
  }, [pushSnapshot]);

  // rAF loop: 8 ticks/s x speed, snapshot at most ~10/s; fully idle while the tab is hidden.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let lastSnap = 0;
    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      if (document.hidden || !runningRef.current || !simRef.current) return;
      acc += dt * TICKS_PER_SECOND * speedRef.current;
      let n = Math.floor(acc);
      acc -= n;
      if (n > 64) { n = 64; acc = 0; }
      for (let i = 0; i < n; i += 1) step(simRef.current);
      if (n > 0 && now - lastSnap > SNAPSHOT_MS) {
        lastSnap = now;
        setSnapshot(snapshotOf(simRef.current));
      }
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
