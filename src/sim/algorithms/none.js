export default {
  id: 'none',
  name: 'No control',
  category: 'Baseline',
  short: 'Sends everything immediately with no control; the router drops whatever does not fit.',
  defaults: {},
  createState() {
    return {};
  },
  shape(arrivals) {
    return { admitted: arrivals, dropped: [] };
  },
  admit(packet, algoState, ctx) {
    return ctx.queueLength < ctx.bufferSize ? 'enqueue' : 'drop';
  },
  afterTick() {},
};
