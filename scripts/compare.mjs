import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compareAll, DEFAULT_CONFIG } from '../src/sim/engine.js';

const here = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(here, '../../docs/observations.json');

const rows = compareAll(DEFAULT_CONFIG, 1000);
writeFileSync(outPath, JSON.stringify(rows, null, 2) + '\n');

const head = ['mechanism', 'generated', 'delivered', 'dropped', 'dropRate', 'avgQueue', 'avgDelay', 'throughput', 'utilisation'];
console.log(head.join('\t'));
for (const r of rows) {
  console.log(
    [r.name, r.generated, r.delivered, r.dropped, r.dropRate.toFixed(4), r.avgQueue.toFixed(3), r.avgDelay.toFixed(3), r.throughput.toFixed(3), r.utilization.toFixed(4)].join('\t'),
  );
}
console.log(`wrote ${outPath}`);
