import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../rng.js';
import { generate } from '../traffic.js';

describe('traffic patterns', () => {
  it('constant rate 0.5 produces exactly 50 packets in 100 ticks', () => {
    const rng = mulberry32(7);
    const acc = { frac: 0, burstOn: false, burstLeft: 0 };
    const source = { pattern: 'constant' };
    let total = 0;
    for (let t = 1; t <= 100; t += 1) {
      total += generate(source, 0.5, t, rng, acc);
    }
    expect(total).toBe(50);
  });

  it('bursty is deterministic for a given seed', () => {
    const run = (seed) => {
      const rng = mulberry32(seed);
      const acc = { frac: 0, burstOn: false, burstLeft: 0 };
      const out = [];
      for (let t = 1; t <= 60; t += 1) out.push(generate({ pattern: 'bursty' }, 1.5, t, rng, acc));
      return out;
    };
    expect(run(99)).toEqual(run(99));
  });
});
