export default {
  id: 'token',
  name: 'Token bucket',
  category: 'Traffic shaping',
  short: 'Packets wait for tokens; spare tokens let bursts through while capping the average rate.',
  defaults: { tokenRate: 4, bucketCapacity: 20, queueSize: 30 },
  createState(params = {}) {
    const cfg = { tokenRate: 4, bucketCapacity: 20, queueSize: 30, ...params };
    return {
      cfg,
      tokens: cfg.bucketCapacity,
      waiting: [],
    };
  },
  shape(arrivals, state, ctx) {
    const dropped = [];
    for (const p of arrivals) {
      if (state.waiting.length < state.cfg.queueSize) {
        state.waiting.push(p);
      } else {
        dropped.push(p);
        ctx.emit({ type: 'shape', text: `Token queue full — packet from S${p.src + 1} dropped`, src: p.src });
      }
    }
    state.tokens = Math.min(state.cfg.bucketCapacity, state.tokens + state.cfg.tokenRate);
    const n = Math.min(Math.floor(state.tokens), state.waiting.length);
    const admitted = state.waiting.splice(0, n);
    state.tokens -= n;
    return { admitted, dropped };
  },
  admit(packet, algoState, ctx) {
    return ctx.queueLength < ctx.bufferSize ? 'enqueue' : 'drop';
  },
  afterTick() {},
};
