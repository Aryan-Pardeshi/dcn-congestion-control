export default {
  id: 'leaky',
  name: 'Leaky bucket',
  category: 'Traffic shaping',
  short: 'Holds packets in a bucket and releases them at a steady rate to smooth bursts.',
  defaults: { bucketSize: 30, leakRate: 4 },
  createState(params = {}) {
    return {
      cfg: { bucketSize: 30, leakRate: 4, ...params },
      bucket: [],
      leakAcc: 0,
      level: 0,
    };
  },
  shape(arrivals, state, ctx) {
    const { bucketSize } = state.cfg;
    const dropped = [];
    for (const p of arrivals) {
      if (state.bucket.length < bucketSize) {
        state.bucket.push(p);
      } else {
        dropped.push(p);
        ctx.emit({ type: 'shape', text: `Leaky bucket full — packet from S${p.src + 1} dropped`, src: p.src });
      }
    }
    state.leakAcc += state.cfg.leakRate;
    let n = Math.floor(state.leakAcc);
    state.leakAcc -= n;
    // guard against float dust
    if (state.leakAcc < 0) state.leakAcc = 0;
    n = Math.min(n, state.bucket.length);
    const admitted = state.bucket.splice(0, n);
    state.level = state.bucket.length;
    return { admitted, dropped };
  },
  admit(packet, algoState, ctx) {
    return ctx.queueLength < ctx.bufferSize ? 'enqueue' : 'drop';
  },
  afterTick() {},
};
