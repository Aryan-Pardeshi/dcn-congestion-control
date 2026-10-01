import { mulberry32 } from './rng.js';
import { generate } from './traffic.js';
import { ALGORITHMS } from './algorithms/index.js';

export const DEFAULT_CONFIG = {
  seed: 42,
  algorithm: 'none',
  linkCapacity: 4,
  bufferSize: 40,
  sources: [
    { id: 'S1', label: 'CS Lab', rate: 2.0, pattern: 'constant' },
    { id: 'S2', label: 'Admin', rate: 1.5, pattern: 'bursty' },
    { id: 'S3', label: 'Library', rate: 1.5, pattern: 'random' },
  ],
  params: {
    leaky: { bucketSize: 30, leakRate: 4 },
    token: { tokenRate: 4, bucketCapacity: 20, queueSize: 30 },
    choke: { threshold: 0.6, reduceFactor: 0.5, recoveryStep: 0.05, holdTicks: 8 },
    red: { minTh: 8, maxTh: 24, maxP: 0.2, weight: 0.1 },
  },
};

function mergeConfig(user = {}) {
  const cfg = {
    seed: user.seed ?? DEFAULT_CONFIG.seed,
    algorithm: user.algorithm ?? DEFAULT_CONFIG.algorithm,
    linkCapacity: user.linkCapacity ?? DEFAULT_CONFIG.linkCapacity,
    bufferSize: user.bufferSize ?? DEFAULT_CONFIG.bufferSize,
    sources: (user.sources ?? DEFAULT_CONFIG.sources).map((s) => ({ ...s })),
    params: {
      leaky: { ...DEFAULT_CONFIG.params.leaky, ...(user.params?.leaky ?? {}) },
      token: { ...DEFAULT_CONFIG.params.token, ...(user.params?.token ?? {}) },
      choke: { ...DEFAULT_CONFIG.params.choke, ...(user.params?.choke ?? {}) },
      red: { ...DEFAULT_CONFIG.params.red, ...(user.params?.red ?? {}) },
    },
  };
  return cfg;
}

export function createSimulation(userConfig = {}) {
  const config = mergeConfig(userConfig);
  const rng = mulberry32(config.seed);
  const algo = ALGORITHMS[config.algorithm] ?? ALGORITHMS.none;
  const algoState = algo.createState(config.params[algo.id] ?? {});

  const sources = config.sources.map((s) => ({
    ...s,
    rateFactor: 1,
    acc: { frac: 0, burstOn: false, burstLeft: 0 },
    pending: 0,
  }));

  const sim = {
    config,
    tick: 0,
    rng,
    queue: [],
    sources,
    algo,
    algoState,
    nextId: 1,
    lastOverflowEmit: -100,
    stats: {
      generated: 0,
      delivered: 0,
      dropped: 0,
      droppedByReason: { shape: 0, red: 0, overflow: 0 },
      totalDelay: 0,
      queueSum: 0,
      ticks: 0,
    },
    history: [],
    events: [],
    lastTick: { generated: [[], [], []], admitted: [], dropped: [], delivered: [] },
    injectBurst(srcIndex, count) {
      if (srcIndex >= 0 && srcIndex < this.sources.length) {
        this.sources[srcIndex].pending += count;
      }
    },
  };
  return sim;
}

function pushEvent(sim, e) {
  // Collapse repeated same-type events within one tick so per-packet drops don't flood the log.
  const last = sim.events[sim.events.length - 1];
  if (last && last.tick === sim.tick && last.type === e.type && (e.type === 'red' || e.type === 'shape')) {
    last.repeat = (last.repeat || 1) + 1;
    last.text = `${last.baseText ?? last.text} (×${last.repeat})`;
    return;
  }
  sim.events.push({ tick: sim.tick, ...e, baseText: e.text });
  if (sim.events.length > 200) sim.events.splice(0, sim.events.length - 200);
}

export function step(sim) {
  const { config } = sim;
  sim.tick += 1;
  const tick = sim.tick;

  const emit = (event) => pushEvent(sim, event);
  const ctxBase = {
    tick,
    bufferSize: config.bufferSize,
    linkCapacity: config.linkCapacity,
    rng: sim.rng,
    sources: sim.sources,
    emit,
    queueLength: sim.queue.length,
  };

  // 1. generate
  const allArrivals = [];
  const genPerSource = sim.sources.map(() => []);
  sim.sources.forEach((src, idx) => {
    const eff = src.rate * (src.rateFactor ?? 1);
    const n = generate(src, eff, tick, sim.rng, src.acc);
    const extra = src.pending || 0;
    src.pending = 0;
    const total = n + extra;
    for (let i = 0; i < total; i += 1) {
      const p = { id: sim.nextId++, src: idx, born: tick };
      allArrivals.push(p);
      genPerSource[idx].push(p);
    }
  });
  sim.stats.generated += allArrivals.length;

  // 2. shape
  ctxBase.queueLength = sim.queue.length;
  const { admitted, dropped } = sim.algo.shape(allArrivals, sim.algoState, { ...ctxBase });
  const shapeDropped = dropped || [];
  sim.stats.dropped += shapeDropped.length;
  sim.stats.droppedByReason.shape += shapeDropped.length;

  // 3. admit each
  const enqueued = [];
  const admitDropped = [];
  let tailDropsThisTick = 0;
  for (const p of admitted || []) {
    const decision = sim.algo.admit(p, sim.algoState, {
      ...ctxBase,
      queueLength: sim.queue.length,
    });
    if (sim.queue.length >= config.bufferSize) {
      admitDropped.push(p);
      sim.stats.dropped += 1;
      sim.stats.droppedByReason.overflow += 1;
      tailDropsThisTick += 1;
    } else if (decision === 'drop') {
      admitDropped.push(p);
      sim.stats.dropped += 1;
      if (sim.algo.id === 'red') {
        sim.stats.droppedByReason.red += 1;
      } else {
        sim.stats.droppedByReason.overflow += 1;
        tailDropsThisTick += 1;
      }
    } else {
      sim.queue.push(p);
      enqueued.push(p);
    }
  }

  // 4. link service
  const cap = config.linkCapacity;
  const delivered = [];
  for (let i = 0; i < cap && sim.queue.length > 0; i += 1) {
    const p = sim.queue.shift();
    delivered.push(p);
    sim.stats.delivered += 1;
    sim.stats.totalDelay += tick - p.born;
  }

  // 5. afterTick
  sim.algo.afterTick(sim.algoState, { ...ctxBase, queueLength: sim.queue.length });

  // overflow event throttled
  if (tailDropsThisTick > 0 && tick - sim.lastOverflowEmit >= 10) {
    sim.lastOverflowEmit = tick;
    pushEvent(sim, { type: 'overflow', text: `R1 buffer full — ${tailDropsThisTick} packet(s) tail-dropped` });
  }

  // 6. stats + history + lastTick
  sim.stats.queueSum += sim.queue.length;
  sim.stats.ticks += 1;

  const droppedThisTick = shapeDropped.length + admitDropped.length;
  const entry = {
    tick,
    queue: sim.queue.length,
    throughput: delivered.length,
    offered: allArrivals.length,
    dropped: droppedThisTick,
  };
  if (sim.algo.id === 'red') entry.avgRed = sim.algoState.avg;
  sim.history.push(entry);
  if (sim.history.length > 600) sim.history.splice(0, sim.history.length - 600);

  // pad generated arrays to 3 slots (sources length may vary but spec shows 3)
  const gen = [genPerSource[0] || [], genPerSource[1] || [], genPerSource[2] || []];
  sim.lastTick = {
    generated: gen,
    admitted: enqueued,
    dropped: [...shapeDropped, ...admitDropped],
    delivered,
  };

  return sim;
}

export function metrics(sim) {
  const { generated, delivered, dropped, totalDelay, queueSum, ticks } = sim.stats;
  const dropRate = generated > 0 ? dropped / generated : 0;
  const throughput = ticks > 0 ? delivered / ticks : 0;
  const utilization = sim.config.linkCapacity > 0 ? throughput / sim.config.linkCapacity : 0;
  const avgQueue = ticks > 0 ? queueSum / ticks : 0;
  const avgDelay = delivered > 0 ? totalDelay / delivered : 0;
  return { generated, delivered, dropped, dropRate, throughput, utilization, avgQueue, avgDelay };
}

export function runHeadless(config, ticks = 500) {
  const sim = createSimulation(config);
  for (let i = 0; i < ticks; i += 1) step(sim);
  return metrics(sim);
}

const ORDER = ['none', 'leaky', 'token', 'choke', 'red'];

export function compareAll(config, ticks = 500) {
  return ORDER.map((id) => {
    const algo = ALGORITHMS[id];
    const m = runHeadless({ ...config, algorithm: id }, ticks);
    return { id, name: algo.name, category: algo.category, ...m };
  });
}
