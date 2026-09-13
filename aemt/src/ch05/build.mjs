/*
 * Builds aemt/ch05-terminology.json from the sources beside it.
 *   node aemt/src/ch05/build.mjs
 * The conformance gate lives in ../conform.mjs and is shared by every chapter.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildChapter } from '../conform.mjs';
import { buildBank } from './bank.mjs';
import { objectives, items, blocks } from './blocks.mjs';

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../ch05-terminology.json');

buildChapter({
  chapter: 5, title: 'Medical Terminology',
  version: '1.0.0', schema_version: 2,
  review_status: 'unreviewed',
  notice: 'Written from the National EMS Education Standards and the published error-prone abbreviation lists. Not yet reviewed by a second credentialed instructor.',
  sources: [
    'NHTSA National EMS Education Standards (2021) — Preparatory: Medical Terminology',
    'The Joint Commission Official "Do Not Use" List',
    'ISMP List of Error-Prone Abbreviations, Symbols and Dose Designations'
  ],
  objectives, blocks, items, terms: buildBank()
}, OUT, fs);
