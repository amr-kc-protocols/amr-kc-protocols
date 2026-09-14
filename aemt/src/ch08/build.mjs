/* Builds aemt/ch08-pathophysiology.json.  node aemt/src/ch08/build.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildChapter } from '../conform.mjs';
import { objectives, items, blocks } from './blocks.mjs';

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../ch08-pathophysiology.json');

buildChapter({
  chapter: 8, title: 'Pathophysiology',
  version: '1.0.0', schema_version: 2,
  review_status: 'released',
  notice: 'One evidence flag, in 8.7: qSOFA is still taught and built into screening tools, and the 2021 Surviving Sepsis Campaign makes a strong recommendation against using it as a single screen on the grounds of low sensitivity. The block states the limit of that too - no prehospital screen rules sepsis out, and the named alternatives perform better only in that one respect. 8.2 gives capillary refill an honest note as an imperfect adult measure, and 8.6 is context tier because almost none of it changes an AEMT action on its own.',
  sources: [
    'NHTSA National EMS Education Standards (2021) - Preparatory: Pathophysiology',
    'Singer M, Deutschman CS, Seymour CW, et al. The Third International Consensus Definitions for Sepsis and Septic Shock (Sepsis-3). JAMA 2016;315:801-10',
    'Evans L, Rhodes A, Alhazzani W, et al. Surviving Sepsis Campaign: International Guidelines for Management of Sepsis and Septic Shock 2021. Crit Care Med 2021;49(11):e1063-e1143'
  ],
  objectives, blocks, items
}, OUT, fs);
