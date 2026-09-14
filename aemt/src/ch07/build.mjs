/* Builds aemt/ch07-the-human-body.json.  node aemt/src/ch07/build.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildChapter } from '../conform.mjs';
import { objectives, items, blocks } from './blocks.mjs';

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../ch07-the-human-body.json');

buildChapter({
  chapter: 7, title: 'The Human Body',
  version: '1.0.0', schema_version: 2,
  review_status: 'released',
  notice: 'Anatomy is instrumental here, never terminal: every objective names the decision it enables, and detail that reaches no prehospital decision is tagged reference rather than drilled. 7.3 is context tier and 7.8 is reference tier, so neither is queued for spaced repetition. Two original schematics carry the spatial content - body cavities and the upper airway - both drawn for this module and licensed as such.',
  sources: [
    'NHTSA National EMS Education Standards (2021) - Preparatory: Anatomy and Physiology',
    'NHTSA National EMS Education Standards (2021) - Airway Management, Respiration and Artificial Ventilation'
  ],
  objectives, blocks, items
}, OUT, fs);
