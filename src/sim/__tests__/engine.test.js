import { describe, it, expect } from 'vitest';
import {
  createSimulation,
  step,
  runHeadless,
  compareAll,
  metrics,
  DEFAULT_CONFIG,
} from '../engine.js';

describe('engine determinism', () => {
  it('same config + seed -> runHeadless identical twice', () => {
    const a = runHeadless({ ...DEFAULT_CONFIG }, 500);
    const b = runHeadless({ ...DEFAULT_CONFIG }, 500);
    expect(b).toEqual(a);
  });
});

describe('baseline congestion', () => {
  it('none has dropRate > 0.05 and avgQueue > 0.5*bufferSize', () => {
    const m = runHeadless({ ...DEFAULT_CONFIG, algorithm: 'none' }, 500);
    expect(m.dropRate).toBeGreaterThan(0.05);
    expect(m.avgQueue).toBeGreaterThan(0.5 * DEFAULT_CONFIG.bufferSize);
  });
});

describe('leaky bucket', () => {
  it('packets entering R1 per tick never exceed leakRate over 300 ticks', () => {
    const sim = createSimulation({ ...DEFAULT_CONFIG, algorithm: 'leaky' });
    const leakRate = sim.config.params.leaky.leakRate;
    for (let i = 0; i < 300; i += 1) {
      step(sim);
      expect(sim.lastTick.admitted.length).toBeLessThanOrEqual(Math.ceil(leakRate));
    }
  });
});

describe('token bucket', () => {
  it('idle 20 ticks then burst of 15 admitted within same tick', () => {
    const sim = createSimulation({
      seed: 1,
      algorithm: 'token',
      linkCapacity: 4,
      bufferSize: 40,
      sources: [
        { id: 'S1', label: 'A', rate: 0, pattern: 'constant' },
        { id: 'S2', label: 'B', rate: 0, pattern: 'constant' },
        { id: 'S3', label: 'C', rate: 0, pattern: 'constant' },
      ],
    });
    for (let i = 0; i < 20; i += 1) step(sim);
    sim.injectBurst(0, 15);
    step(sim);
    expect(sim.lastTick.admitted.length).toBe(15);
  });
});

describe('choke packet', () => {
  it('sends chokes, throttles a source, lowers drops vs none', () => {
    const sim = createSimulation({ ...DEFAULT_CONFIG, algorithm: 'choke' });
    let sawThrottled = false;
    for (let i = 0; i < 500; i += 1) {
      step(sim);
      if (sim.sources.some((s) => s.rateFactor < 1)) sawThrottled = true;
    }
    expect(sim.algoState.chokesSent).toBeGreaterThan(0);
    expect(sawThrottled).toBe(true);
    const mChoke = metrics(sim);
    const mNone = runHeadless({ ...DEFAULT_CONFIG, algorithm: 'none' }, 500);
    expect(mChoke.dropRate).toBeLessThan(mNone.dropRate);
  });
});

describe('RED', () => {
  it('lowers avgQueue vs none and performs an early drop', () => {
    const redSim = createSimulation({ ...DEFAULT_CONFIG, algorithm: 'red' });
    for (let i = 0; i < 500; i += 1) step(redSim);
    const mRed = metrics(redSim);
    const mNone = runHeadless({ ...DEFAULT_CONFIG, algorithm: 'none' }, 500);
    expect(mRed.avgQueue).toBeLessThan(mNone.avgQueue);
    const redEvents = redSim.events.filter((e) => e.type === 'red');
    // events keep last 200; if overflowed out, check stats reason counter instead
    const earlyDrops = redSim.stats.droppedByReason.red;
    expect(earlyDrops).toBeGreaterThan(0);
    void redEvents;
  });
});

describe('compareAll', () => {
  it('returns 5 rows with ids in order none, leaky, token, choke, red', () => {
    const rows = compareAll({ ...DEFAULT_CONFIG }, 200);
    expect(rows.map((r) => r.id)).toEqual(['none', 'leaky', 'token', 'choke', 'red']);
    expect(rows).toHaveLength(5);
  });
});
