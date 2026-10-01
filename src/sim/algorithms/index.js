import none from './none.js';
import leaky from './leaky.js';
import token from './token.js';
import choke from './choke.js';
import red from './red.js';

export const ALGORITHMS = { none, leaky, token, choke, red };

export const ALGORITHM_GROUPS = [
  { label: 'Baseline', ids: ['none'] },
  { label: 'Traffic shaping', ids: ['leaky', 'token'] },
  { label: 'Feedback congestion control', ids: ['choke'] },
  { label: 'Active queue management', ids: ['red'] },
];
