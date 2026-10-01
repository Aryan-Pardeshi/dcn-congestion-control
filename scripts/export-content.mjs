import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as theory from '../src/content/theory.js';
import { DEFAULT_CONFIG } from '../src/sim/engine.js';

const here = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(here, '../../docs/content.json');

const content = { ...theory, DEFAULT_CONFIG };
writeFileSync(outPath, JSON.stringify(content, null, 2) + '\n');
console.log(`wrote ${outPath} (${Object.keys(content).join(', ')})`);
