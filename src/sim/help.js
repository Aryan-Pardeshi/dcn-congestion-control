/* Central help text for the simulator. Plain English, 1-2 sentences each. */

export const HELP = {
  mechanism:
    'A mechanism is the rule the network uses to deal with too many packets at once. Pick one on the left and press Play to see how it behaves.',
  mech_none:
    'No control. Packets queue up at router R1, and when the buffer is full the extra packets are lost.',
  mech_leaky:
    'Leaky bucket. Packets wait in a bucket that releases them at a steady rate, so bursts are smoothed out.',
  mech_token:
    'Token bucket. The bucket collects tokens when quiet and spends them to let a short burst through at once.',
  mech_choke:
    'Choke packet. When the router queue gets too full, R1 sends a warning message and the source slows down.',
  mech_red:
    'Random early detection. The router drops a few packets early, before the queue is full, to keep waiting times short.',
  play: 'Play or pause the simulation (Space). Watch packets travel from the labs to the server.',
  pause: 'Pause the simulation (Space). The picture freezes so you can look closely.',
  step: 'Move forward one time step (S). Use this to watch slowly, one step at a time. A tick is one time step.',
  reset: 'Start over from step 0 with the same settings (R). The counters go back to zero.',
  speed: 'How fast the simulation runs. It does not change the result, only how quickly you watch it.',
  burst: 'Suddenly send a big batch of packets from one source (B). Use it to see how the router copes with a shock.',
  runComparison:
    'Run every mechanism on exactly the same traffic so you can compare them fairly. It takes a moment.',
  downloadCsv:
    'Download the comparison table as a CSV file. You can open it in a spreadsheet.',
  sourceRate:
    'How many packets this lab sends per time step, on average. Higher means more load on the router.',
  pattern:
    'Constant sends evenly. Bursty sends in clumps. Random sends unpredictably. Bursty traffic is hardest for the router.',
  offeredMeter:
    'Offered load is all packets the labs send per step. Capacity is what the link can carry per step. If offered is higher, a queue builds up.',
  bufferSize:
    'How many packets router R1 can hold while waiting for the slow link. Bigger means fewer lost packets but longer waits.',
  linkCapacity:
    'How many packets the bottleneck link can send per time step. This link is slow on purpose, so it is where the queue forms.',
  'param_leaky_bucketSize':
    'Bucket size. How many packets the bucket can hold before extra packets are lost.',
  'param_leaky_leakRate':
    'Leak rate. How many packets the bucket releases per step, at a steady pace.',
  'param_token_tokenRate':
    'Token rate. How many tokens arrive per step. One token lets one packet through.',
  'param_token_bucketCapacity':
    'Bucket capacity. How many tokens can be saved up. More saved tokens means a bigger burst can pass.',
  'param_token_queueSize':
    'Queue size. How many packets can wait for a token before extra packets are lost.',
  'param_choke_threshold':
    'Threshold. How full the queue must get before R1 sends a choke warning message.',
  'param_choke_reduceFactor':
    'Reduce factor. How much a source slows down after a choke message. Smaller means it slows down more.',
  'param_choke_recoveryStep':
    'Recovery step. How quickly a slowed source speeds back up after each step.',
  'param_choke_holdTicks':
    'Hold time. How many steps a source stays slow before it starts speeding up again.',
  'param_red_minTh':
    'Minimum threshold. Below this average queue length the router drops nothing.',
  'param_red_maxTh':
    'Maximum threshold. Above this average queue length the router drops every new packet.',
  'param_red_maxP':
    'Maximum drop chance. How likely an early drop is when the queue is close to full.',
  'param_red_weight':
    'Weight. How quickly the average queue follows the real queue. Small means slow and smooth.',
  seed: 'Same seed means same traffic, so comparisons are fair. Change it for fresh random traffic.',
  statDelivered:
    'Packets that reached the server so far. Higher is better.',
  statLost:
    'Packets lost because a queue or bucket was full, or dropped early on purpose by RED. Lower is better.',
  statQueue:
    'Packets waiting at router R1 right now, out of how many it can hold. When it is full, new packets are lost.',
  statWait:
    'Average time a delivered packet waited, in steps. Shorter means less delay.',
  statThroughput:
    'Delivered packets per step, on average. Close to the link capacity means the link is well used.',
  statLinkUse:
    'Share of the link capacity that is used. High means the link is busy.',
  statAvgQueue:
    'Average number of packets waiting at the router over the whole run.',
  statSent:
    'All packets the labs created, including lost ones.',
  chartQueue:
    'Packets waiting at router R1 over time. When the line touches the dashed top line, the router is full and packets are lost.',
  chartPackets:
    'Packets per step. Delivered is what reached the server. Lost is what was dropped. The dashed line is the most the link can carry.',
  eventLog:
    'A line-by-line diary of interesting moments, like drops and choke messages. For advanced users.',
  compare:
    'Runs every mechanism on exactly the same traffic so you can see which loses fewer packets and which keeps the queue short.',
  compareDropRate:
    'Share of packets lost. Lower is better.',
  compareAvgQueue:
    'Average packets waiting at the router. Lower means shorter waits.',
  compareAvgDelay:
    'Average waiting time in steps. Lower is better.',
  compareThroughput:
    'Delivered packets per step. Higher is better.',
  tick: 'One time step of the simulation. Each tick, labs send packets and the link forwards some.',
};

export default HELP;
