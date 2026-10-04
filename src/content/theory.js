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
      'Congestion happens when the traffic offered to part of the network exceeds what it can carry. Router buffers fill, delay grows and packets are dropped. Retransmissions then add even more load, which can lead to congestion collapse.',
    ],
  },
  {
    heading: 'Open loop vs closed loop',
    body: [
      'Open-loop control prevents congestion by regulating traffic at the network entry, without looking at the current network state. Leaky bucket and token bucket do this.',
      'Closed-loop control feeds congestion information back to the senders so they can slow down. Choke packets do this. Active queue management (RED) works inside the router queue and drops packets early.',
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
      'Arriving packets go into a bucket of size B.',
      'The bucket drains at a constant rate r, however bursty the input.',
      'If the bucket is full, new packets are dropped.',
    ],
    formula: 'Output rate = r packets/tick (constant), bucket size = B',
    pros: [
      'Smooth, predictable output rate.',
      'Simple to implement.',
    ],
    cons: [
      'Rigid: cannot use idle bandwidth for bursts.',
      'Drops packets on overflow.',
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
      'Tokens are added at rate r, up to capacity C.',
      'Each packet needs one token to be sent.',
      'Saved tokens let a burst of up to C packets pass at once; other packets wait in a queue.',
    ],
    formula: 'Token rate = r tokens/tick, bucket capacity = C, burst duration S = C / (M - r)',
    pros: [
      'Allows bounded bursts.',
      'More flexible than leaky bucket.',
    ],
    cons: [
      'Bursts can still load the network.',
      'Needs tuning of r and C.',
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
      'R1 watches its output queue.',
      'Above the threshold, R1 sends a choke packet to the source.',
      'The source cuts its rate (for example by 50%), then recovers gradually.',
    ],
    formula: 'On choke: rate = rate x reduceFactor; else rate = rate + recoveryStep per tick',
    pros: [
      'Reacts to measured congestion.',
      'Reduces load at the source.',
    ],
    cons: [
      'Feedback is delayed on long paths.',
      'Needs sources to obey the signal.',
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
      'The router keeps an average queue length.',
      'Below minTh: keep all packets. Between minTh and maxTh: drop with a probability that rises with the average.',
      'At maxTh or above: drop all arrivals.',
    ],
    formula: 'avg = (1 - w) x avg + w x q; p = maxP x (avg - minTh) / (maxTh - minTh)',
    pros: [
      'Keeps average queue and delay low.',
      'Avoids global synchronisation.',
    ],
    cons: [
      'Parameters are hard to tune.',
      'Drops packets before the buffer is full.',
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
  columns: ['Mechanism', 'Category', 'Acts at', 'Burst handling'],
  rows: [
    ['No control (FIFO tail drop)', 'Baseline', 'Router queue', 'Absorbs until buffer full, then drops'],
    ['Leaky bucket', 'Traffic shaping', 'Network entry', 'Clips bursts to a constant rate'],
    ['Token bucket', 'Traffic shaping', 'Network entry', 'Admits bounded bursts'],
    ['Choke packet', 'Feedback congestion control', 'Router signals source', 'Admits bursts, then cuts source rate'],
    ['RED', 'Active queue management', 'Inside router queue', 'Absorbs short bursts, drops early on persistent load'],
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
