export default {
  id: 'choke',
  name: 'Choke packet',
  category: 'Feedback congestion control',
  short: 'The router warns busy senders to slow down when its queue fills up.',
  defaults: { threshold: 0.6, reduceFactor: 0.5, recoveryStep: 0.05, holdTicks: 8 },
  createState(params = {}) {
    return {
      cfg: { threshold: 0.6, reduceFactor: 0.5, recoveryStep: 0.05, holdTicks: 8, ...params },
      chokesSent: 0,
      chokePackets: [],
      holds: [0, 0, 0],
      lastCounts: [0, 0, 0],
    };
  },
  shape(arrivals, state) {
    const counts = [0, 0, 0];
    for (const p of arrivals) {
      if (p.src >= 0 && p.src < 3) counts[p.src] += 1;
    }
    state.lastCounts = counts;
    return { admitted: arrivals, dropped: [] };
  },
  admit(packet, algoState, ctx) {
    return ctx.queueLength < ctx.bufferSize ? 'enqueue' : 'drop';
  },
  afterTick(state, ctx) {
    const { threshold, reduceFactor, recoveryStep, holdTicks } = state.cfg;
    const ratio = ctx.bufferSize > 0 ? ctx.queueLength / ctx.bufferSize : 0;
    const congested = ratio >= threshold;
    // ensure holds array covers all sources
    while (state.holds.length < ctx.sources.length) state.holds.push(0);

    if (congested) {
      const pct = Math.round(ratio * 100);
      for (let i = 0; i < ctx.sources.length; i += 1) {
        if ((state.lastCounts[i] || 0) <= 0) continue;
        if (state.holds[i] > 0) continue;
        const src = ctx.sources[i];
        src.rateFactor = Math.max(0.1, (src.rateFactor ?? 1) * reduceFactor);
        state.holds[i] = holdTicks;
        state.chokesSent += 1;
        state.chokePackets.push({ src: i, sentAt: ctx.tick });
        ctx.emit({
          type: 'choke',
          src: i,
          text: `R1 queue ${pct}% — choke packet sent to ${src.id || `S${i + 1}`}`,
        });
      }
    } else {
      for (let i = 0; i < ctx.sources.length; i += 1) {
        if (state.holds[i] > 0) continue;
        const src = ctx.sources[i];
        if ((src.rateFactor ?? 1) < 1) {
          src.rateFactor = Math.min(1, (src.rateFactor ?? 1) + recoveryStep);
        }
      }
    }
    // decay holds every tick
    for (let i = 0; i < state.holds.length; i += 1) {
      if (state.holds[i] > 0) state.holds[i] -= 1;
    }
  },
};
