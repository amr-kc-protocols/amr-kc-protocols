/* Builds aemt/ch09-life-span-development.json.  node aemt/src/ch09/build.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildChapter } from '../conform.mjs';
import { objectives, items, blocks } from './blocks.mjs';

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)),
  '../../ch09-life-span-development.json');

buildChapter({
  chapter: 9, title: 'Life Span Development',
  version: '1.0.0', schema_version: 2,
  review_status: 'released',
  notice: 'Block 9.6 uses the measured centiles from Fleming 2011 for heart and respiratory rate, not the conventional course tables, and carries an evidence flag on the disagreement between them. The respiratory-rate arm of that review rests on far fewer children than the heart-rate arm and the block says so. Blood pressure thresholds come from the 2025 AHA/AAP guidelines, where they are unchanged. Consent ages and disclosure limits for minors are state law and belong in the local overlay.',
  sources: [
    'NHTSA National EMS Education Standards (2021) - Preparatory: Life Span Development',
    'Fleming S, Thompson M, Stevens R, et al. Normal ranges of heart rate and respiratory rate in children from birth to 18 years of age: a systematic review of observational studies. Lancet 2011;377:1011-18',
    'Part 8: Pediatric Advanced Life Support: 2025 American Heart Association and American Academy of Pediatrics Guidelines for CPR and ECC. Circulation, October 2025',
    'American Geriatrics Society Beers Criteria (2023 update)'
  ],
  objectives, blocks, items
}, OUT, fs);
