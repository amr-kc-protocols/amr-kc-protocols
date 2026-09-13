/* Builds aemt/ch01-ems-systems.json.  node aemt/src/ch01/build.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildChapter } from '../conform.mjs';
import { objectives, items, blocks } from './blocks.mjs';

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../ch01-ems-systems.json');

buildChapter({
  chapter: 1, title: 'EMS Systems',
  version: '1.0.0', schema_version: 2,
  review_status: 'released',
  notice: 'Written from the National EMS Scope of Practice Model and the Education Standards. Kansas scope and AMR KC standing orders are not included — they belong in the local overlay.',
  sources: [
    'National EMS Scope of Practice Model (NHTSA, 2019; 2021 update)',
    'NHTSA National EMS Education Standards (2021) — Preparatory: EMS Systems',
    'NREMT Advanced EMT Examination Specifications, effective 1 July 2024'
  ],
  objectives, blocks, items
}, OUT, fs);
