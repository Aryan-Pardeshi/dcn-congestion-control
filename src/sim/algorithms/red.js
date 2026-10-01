export default {
  id: 'red',
  name: 'Random early detection (RED)',
  category: 'Active queue management',
  short: 'Drops a few packets early at random so senders slow down before the queue overflows.',
  defaults: { minTh: 8, maxTh: 24, maxP: 0.2, weight: 0.1 },
  createState(params = {}) {
    return {
      cfg: { minTh: 8, maxTh: 24, maxP: 0.2, weight: 0.1, ...params },
      avg: 0,
      lastP: 0,
    };
  },
  shape(arrivals, state, ctx) {
    const w = state.cfg.weight;
    state.avg = (1 - w) * state.avg + w * ctx.queueLength;
    return { admitted: arrivals, dropped: [] };
  },
  admit(packet, state, ctx) {
    const { minTh, maxTh, maxP } = state.cfg;
    if (ctx.queueLength >= ctx.bufferSize) return 'drop';
    if (state.avg < minTh) {
      state.lastP = 0;
      return 'enqueue';
    }
    if (state.avg >= maxTh) {
      state.lastP = 1;
      ctx.emit({ type: 'red', text: `RED: avg ${state.avg.toFixed(1)} ≥ max — forced drop`, src: packet.src });
      return 'drop';
    }
    const p = (maxP * (state.avg - minTh)) / (maxTh - minTh);
    state.lastP = p;
    if (ctx.rng() < p) {
      ctx.emit({ type: 'red', text: `RED: early drop (avg ${state.avg.toFixed(1)}, p=${p.toFixed(3)})`, src: packet.src });
      return 'drop';
    }
    return 'enqueue';
  },
  afterTick() {},
};
