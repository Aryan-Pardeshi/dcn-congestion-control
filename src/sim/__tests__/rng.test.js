import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../rng.js';

describe('mulberry32', () => {
  it('deterministic: same seed produces same first 5 numbers', () => {
    const a = mulberry32(1);
    const b = mulberry32(1);
    const sa = [a(), a(), a(), a(), a()];
    const sb = [b(), b(), b(), b(), b()];
    expect(sb).toEqual(sa);
    for (const v of sa) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
