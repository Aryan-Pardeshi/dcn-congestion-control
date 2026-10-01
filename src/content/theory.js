export const experiment = {
  title: 'Implementation of congestion control algorithms',
  module: 'Module 4 — The Network Layer',
  unit: 'Unit 4.2 — The Network Layer in the Internet',
  aim: 'Network design using simulation: state a network requirement, design the network diagram, and simulate congestion control mechanisms on the bottleneck router using a custom web-based simulator.',
};

export const problemStatement = {
  scenario: [
    'A college campus has three departmental LANs: CS Lab (192.168.10.0/24, about 40 PCs), Admin office (192.168.20.0/24, about 15 PCs) and Library (192.168.30.0/24, about 20 PCs). Each LAN connects at 100 Mbps through an access switch (SW1, SW2, SW3) to the gateway router R1.',
    'R1 reaches the college data centre and ISP router R2 over a single 10 Mbps WAN link, which is the bottleneck of the network. During peak hours such as online exams, result day and lab software downloads, the combined offered load reaches about 25 Mbps in bursts.',
    'The output buffer of R1 fills up, packets are tail-dropped, queuing delay rises and retransmissions add even more load, with a risk of congestion collapse. Bursty departments can also starve the quieter ones of their fair share of the link.',
  ],
  requirements: [
    'Design a hierarchical campus network with addressing for the three LANs, the WAN link and the server network.',
    'Identify the bottleneck link and explain why it congests under peak load.',
    'Apply a congestion control mechanism at R1 and at the network entry.',
    'Keep the R1 output queue bounded and avoid persistent overflow.',
    'Reduce the packet drop rate compared with no control.',
    'Keep link utilisation high so bottleneck capacity is not wasted.',
    'Smooth bursty traffic so short bursts do not cause heavy loss.',
    'Compare mechanisms quantitatively using simulation runs on identical traffic.',
  ],
  objectives: [
    { metric: 'Packet drop rate', target: 'Lower than the no-control baseline' },
    { metric: 'Average queue length', target: 'Well below buffer size' },
    { metric: 'Average queuing delay', target: 'Bounded and stable' },
    { metric: 'Throughput / link utilisation', target: 'Close to bottleneck capacity' },
    { metric: 'Burst handling', target: 'Bursts smoothed or admitted in a controlled way' },
  ],
};

export const resources = {
  hardware: [
    'PC or laptop, 4 GB RAM',
    'Any display',
  ],
  software: [
    'Node.js 18+ and npm',
    'Vite + React 19',
    'HTML5 Canvas',
    'Chrome or Edge',
    'VS Code',
  ],
  references: [
    'Tanenbaum — Computer Networks, 5th ed., Ch. 5',
    'Forouzan — Data Communications and Networking, 5th ed.',
    'Floyd and Jacobson — Random Early Detection Gateways, 1993',
    'RFC 2309 — Queue management and congestion avoidance',
  ],
};

export const theoryIntro = [
  {
    heading: 'What is congestion?',
    body: [
      'Congestion happens when the traffic offered to some part of the network exceeds what that part can carry. Router buffers fill up, packets wait longer in queues, and eventually packets have to be dropped.',
      'As load keeps rising, performance falls: delay grows, loss grows, and retransmitted packets add still more load. Beyond a point the useful delivered throughput actually drops even though offered load rises. This is called congestion collapse, because much of the capacity is spent carrying packets that will be dropped or duplicated.',
      'Adding ever more buffer memory does not fix congestion. Queued packets eventually time out at the sender and are retransmitted, so the network ends up storing duplicates. This observation is attributed to Nagle: unbounded buffers only turn loss into ever longer delay.',
    ],
  },
  {
    heading: 'Causes',
    body: [
      'Bursty traffic is a common cause: senders are quiet most of the time and then emit a burst that briefly exceeds link capacity.',
      'Many inputs converging on one output also cause congestion, for example three 100 Mbps LANs feeding a single 10 Mbps WAN link.',
      'Slow links or slow router processors cannot drain queues as fast as packets arrive.',
      'Insufficient buffers mean bursts overflow the queue; retransmissions after loss then raise the offered load further and deepen the problem.',
    ],
  },
  {
    heading: 'Congestion control vs flow control',
    body: [
      'Congestion control is a global issue: it is about making sure the network as a whole can carry the traffic offered to it. It may involve many senders, routers and links at once.',
      'Flow control is point-to-point: it matches one sender to one receiver so a fast sender does not overwhelm a slow receiver buffer. Receiver buffer fullness is a flow control matter, not congestion.',
    ],
  },
  {
    heading: 'Open-loop and closed-loop approaches',
    body: [
      'Open-loop approaches try to prevent congestion by good design and admission decisions made without looking at the current network state. Leaky bucket and token bucket traffic shaping are open-loop: they regulate traffic where it enters the network.',
      'Closed-loop approaches monitor the network, feed information back to the senders, and adjust behaviour. Choke packets are closed-loop: the router detects congestion and signals the source to slow down.',
      'Active queue management works inside the router queue and acts before the buffer is full. RED is the classic example: it drops or marks packets early and probabilistically to keep the average queue small.',
    ],
  },
  {
    heading: 'Approaches by time scale',
    body: [
      'Network provisioning: install enough capacity for the expected load, with spare headroom for growth.',
      'Traffic-aware routing: route around hotspots by adapting paths to the current load.',
      'Admission control: refuse or defer new sessions when the network is already heavily loaded.',
      'Traffic throttling: ask senders to reduce their rate when congestion is detected.',
      'Load shedding: when overload is unavoidable, drop packets selectively so the rest of the traffic still gets through.',
    ],
  },
];

export const mechanisms = [
  {
    id: 'leaky',
    name: 'Leaky bucket',
    category: 'Traffic shaping',
    loop: 'Open loop',
    where: 'At the host / network entry (between source and router)',
    summary:
      'A bucket of size B accepts arriving packets and drains at a constant rate r. It converts bursty input into a smooth constant-rate stream, discarding arrivals when the bucket is full.',
    howItWorks: [
      'Each arriving packet is placed into a bucket that holds at most B packets.',
      'The bucket drains at a constant rate of r packets per tick, regardless of how bursty the arrivals are.',
      'If a packet arrives while the bucket is full, it is discarded.',
      'The output stream therefore has a fixed rate, and bursts are clipped at the entry.',
      'Smoothing protects the downstream bottleneck link from sudden bursts.',
    ],
    formula: 'Output rate = r packets/tick (constant), bucket size = B',
    pseudocode:
      'bucket = empty, capacity B\non each packet arrival:\n  if bucket not full:\n    add packet to bucket\n  else:\n    discard packet\non each tick:\n  if bucket not empty:\n    send up to r packets',
    pros: [
      'Produces a smooth and predictable output rate.',
      'Simple to understand and implement.',
      'Strictly bounds how bursty the admitted traffic can be.',
    ],
    cons: [
      'Rigid: cannot send faster during bursts even when the network is idle.',
      'Idle bandwidth cannot be saved for later use.',
      'Drops packets when the bucket overflows, even if the network itself is idle.',
    ],
    simParams: [
      { key: 'bucketSize', label: 'Bucket size B', meaning: 'Maximum packets the bucket can hold' },
      { key: 'leakRate', label: 'Leak rate r', meaning: 'Packets released per tick at constant rate' },
    ],
  },
  {
    id: 'token',
    name: 'Token bucket',
    category: 'Traffic shaping',
    loop: 'Open loop',
    where: 'At the host / network entry (between source and router)',
    summary:
      'Tokens accumulate at rate r up to a capacity C, and each packet needs one token to be sent. Idle periods save up permission so bounded bursts can pass at once, while the long-term rate stays controlled.',
    howItWorks: [
      'Tokens are generated at rate r per tick into a bucket of capacity C.',
      'Each packet needs one token before it can be sent.',
      'If tokens are available, a burst of up to C packets can be sent immediately.',
      'If no token is available, packets wait in a queue instead of being sent.',
      'Packets are lost only if that waiting queue itself overflows.',
      'Maximum burst duration is S = C / (M - r), where M is the maximum output rate.',
    ],
    formula: 'Token rate = r tokens/tick, bucket capacity = C, burst duration S = C / (M - r)',
    pseudocode:
      'tokens = C (start full)\non each tick:\n  tokens = min(C, tokens + r)\non each packet arrival:\n  if tokens >= 1:\n    tokens = tokens - 1\n    send packet\n  else:\n    place packet in waiting queue',
    pros: [
      'Allows bounded bursts instead of forcing a rigid rate.',
      'Saves up permission while idle for later bursts.',
      'More flexible than the leaky bucket for bursty applications.',
    ],
    cons: [
      'Bursts can still momentarily load the network.',
      'Needs careful tuning of the token rate r and capacity C.',
    ],
    simParams: [
      { key: 'tokenRate', label: 'Token rate r', meaning: 'Tokens generated per tick' },
      { key: 'bucketCapacity', label: 'Bucket capacity C', meaning: 'Maximum tokens (and burst size)' },
      { key: 'queueSize', label: 'Waiting queue size', meaning: 'Packets that can wait for a token' },
    ],
  },
  {
    id: 'choke',
    name: 'Choke packet',
    category: 'Feedback congestion control',
    loop: 'Closed loop',
    where: 'Router R1 monitors its output queue and signals the sources',
    summary:
      'The router watches its queue and sends a choke packet to the source when congestion is detected. The source cuts its rate and recovers gradually, so load is reduced at its origin.',
    howItWorks: [
      'Router R1 monitors its output queue length or link utilisation.',
      'When the queue passes a threshold, R1 sends a choke packet back to the source of the arriving packet.',
      'On receiving a choke, the source reduces its sending rate by a fraction, for example 50 percent.',
      'Further chokes are ignored for a short hold interval to avoid overreacting.',
      'If no more chokes arrive, the source increases its rate gradually back towards normal.',
      'A hop-by-hop variant applies the same signal at each router along the path (backpressure).',
    ],
    formula: 'On choke: rate = rate x reduceFactor; else rate = rate + recoveryStep per tick',
    pseudocode:
      'router: if queue length > threshold:\n  send choke packet to source\nsource on choke:\n  rate = rate x reduceFactor\n  ignore chokes for holdTicks\nsource each tick without choke:\n  rate = rate + recoveryStep',
    pros: [
      'Reacts to actual measured congestion in the router.',
      'Reduces load at the source, so wasted transit capacity is saved.',
      'Simple to add: only congested routers send extra packets. (ECN is a related idea that marks packets instead of sending a separate one.)',
    ],
    cons: [
      'Feedback arrives late on long paths, so the source reacts slowly.',
      'Choke packets add extra control traffic exactly when the network is busy.',
      'Only works if sources obey the signal and slow down.',
    ],
    simParams: [
      { key: 'threshold', label: 'Queue threshold', meaning: 'Queue length that triggers a choke packet' },
      { key: 'reduceFactor', label: 'Rate reduction factor', meaning: 'Fraction of rate kept after a choke' },
      { key: 'recoveryStep', label: 'Recovery step', meaning: 'Rate added per tick without chokes' },
      { key: 'holdTicks', label: 'Hold interval', meaning: 'Ticks during which further chokes are ignored' },
    ],
  },
  {
    id: 'red',
    name: 'Random early detection (RED)',
    category: 'Active queue management',
    loop: 'Router queue (AQM)',
    where: 'Inside router R1 output queue',
    summary:
      'RED keeps an average queue length and drops or marks packets early with a probability that grows with that average. Early random drops warn senders before the buffer fills and avoid global synchronisation.',
    howItWorks: [
      'The router maintains an exponentially weighted moving average of the queue length.',
      'If the average is below minTh, arriving packets are enqueued normally.',
      'If the average is between minTh and maxTh, arrivals are dropped (or marked) with probability p that rises linearly with the average.',
      'If the average reaches maxTh, all arriving packets are dropped.',
      'Early random drops signal TCP-like senders to slow down before the queue is full.',
      'Randomness desynchronises senders so they do not all back off and resume together.',
    ],
    formula: 'avg = (1 - w) x avg + w x q; p = maxP x (avg - minTh) / (maxTh - minTh)',
    pseudocode:
      'avg = 0\non each arrival with queue length q:\n  avg = (1 - w) x avg + w x q\n  if avg < minTh:\n    enqueue packet\n  else if avg < maxTh:\n    drop with probability p\n  else:\n    drop packet',
    pros: [
      'Keeps the average queue and queuing delay low.',
      'Avoids global synchronisation and lock-out of bursty flows.',
      'Absorbs short bursts while still signalling persistent overload early.',
    ],
    cons: [
      'Parameters (minTh, maxTh, maxP, w) are hard to tune.',
      'Drops packets even when the buffer still has free space.',
      'Benefit depends on sources reacting to loss, as TCP does.',
    ],
    simParams: [
      { key: 'minTh', label: 'Minimum threshold', meaning: 'Average queue below which all packets are kept' },
      { key: 'maxTh', label: 'Maximum threshold', meaning: 'Average queue above which all arrivals are dropped' },
      { key: 'maxP', label: 'Maximum drop probability', meaning: 'Drop probability when average reaches maxTh' },
      { key: 'weight', label: 'Averaging weight w', meaning: 'Weight given to the current queue sample' },
    ],
  },
];

export const comparison = {
  columns: ['Mechanism', 'Category', 'Loop', 'Acts at', 'Burst handling', 'Main drawback'],
  rows: [
    [
      'No control (FIFO tail drop)',
      'Baseline',
      '—',
      'Router queue',
      'Absorbs until buffer full, then drops everything',
      'Large delay, heavy loss, global synchronisation',
    ],
    [
      'Leaky bucket',
      'Traffic shaping',
      'Open loop',
      'Network entry',
      'Clips bursts to a constant rate',
      'Wastes capacity when bursts could be served',
    ],
    [
      'Token bucket',
      'Traffic shaping',
      'Open loop',
      'Network entry',
      'Admits bounded bursts up to bucket capacity',
      'Bursts can still briefly load the network',
    ],
    [
      'Choke packet',
      'Feedback congestion control',
      'Closed loop',
      'Router signals source',
      'Bursts admitted, then source rate is cut',
      'Feedback delay on long paths',
    ],
    [
      'RED',
      'Active queue management',
      'Router queue (AQM)',
      'Inside router queue',
      'Absorbs short bursts, drops early on persistent load',
      'Hard to tune; drops before buffer is full',
    ],
  ],
};

export const addressing = [
  { device: 'R1', interface: 'Gi0/0', ip: '192.168.10.1', subnet: '/24', link: 'CS Lab LAN via SW1, 100 Mbps' },
  { device: 'R1', interface: 'Gi0/1', ip: '192.168.20.1', subnet: '/24', link: 'Admin LAN via SW2, 100 Mbps' },
  { device: 'R1', interface: 'Gi0/2', ip: '192.168.30.1', subnet: '/24', link: 'Library LAN via SW3, 100 Mbps' },
  { device: 'R1', interface: 'Se0/0/0', ip: '10.0.0.1', subnet: '/30', link: 'WAN to R2, 10 Mbps (bottleneck)' },
  { device: 'R2', interface: 'Se0/0/0', ip: '10.0.0.2', subnet: '/30', link: 'WAN to R1, 10 Mbps (bottleneck)' },
  { device: 'R2', interface: 'Gi0/0', ip: '172.16.0.1', subnet: '/24', link: 'Server network, 1 Gbps' },
  { device: 'Server', interface: 'eth0', ip: '172.16.0.10', subnet: '/24', link: 'Behind R2, 1 Gbps' },
  { device: 'CS Lab hosts', interface: 'via SW1', ip: '192.168.10.10 - 192.168.10.50', subnet: '/24', link: '100 Mbps access' },
  { device: 'Admin hosts', interface: 'via SW2', ip: '192.168.20.10 - 192.168.20.25', subnet: '/24', link: '100 Mbps access' },
  { device: 'Library hosts', interface: 'via SW3', ip: '192.168.30.10 - 192.168.30.30', subnet: '/24', link: '100 Mbps access' },
];

export const procedure = [
  'Start the development server with npm run dev and open the simulator in the browser.',
  'Choose the "No control" baseline, keep the default traffic and seed, and press run.',
  'Observe the R1 queue length, packet drops and delay charts for the baseline.',
  'Inject a burst and note how the FIFO queue fills and tail-drops packets.',
  'Switch to leaky bucket, repeat with the same seed, and record the observation table.',
  'Repeat for token bucket, choke packet and RED using identical traffic and seed.',
  'Adjust each mechanism parameter slightly and note how the results change.',
  'Use "Compare all" to run every mechanism on identical traffic side by side.',
  'Export the results as CSV and record drop rate, queue length, delay and utilisation.',
  'Draw conclusions about which mechanism best suits smoothing, burst tolerance and low delay.',
];

export const conclusion = [
  'Without any control, the R1 queue saturates under peak load and the packet drop rate is high.',
  'Traffic shaping at the entry smooths the load: the leaky bucket gives a constant rate while the token bucket admits controlled bursts.',
  'Choke packets cut the source rate after congestion is detected, and the feedback delay is visible in the response.',
  'RED keeps the average queue low through early probabilistic drops, so the best choice depends on whether the goal is smoothing, burst tolerance or low delay.',
];

export const vivaQuestions = [
  'When does congestion occur in a packet-switched network?',
  'How does congestion control differ from flow control?',
  'Why is the leaky bucket called an open-loop mechanism?',
  'What advantage does the token bucket have over the leaky bucket?',
  'Who sends a choke packet, to whom, and what happens on receipt?',
  'What do the RED parameters minTh, maxTh, maxP and w control?',
  'Why does RED drop packets before the buffer is full?',
  'Where is the bottleneck in this experiment network, and why does it congest?',
];
