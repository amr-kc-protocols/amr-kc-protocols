/* Builds aemt/ch06-lifting-and-moving.json.  node aemt/src/ch06/build.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildChapter } from '../conform.mjs';
import { objectives, items, blocks } from './blocks.mjs';

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../ch06-lifting-and-moving.json');

buildChapter({
  chapter: 6, title: 'Lifting and Moving Patients',
  version: '1.0.0', schema_version: 2,
  review_status: 'released',
  notice: 'Two blocks set the taught position beside the measured one. 6.1 carries the Cochrane finding that manual handling training does not prevent back injury, against the before-and-after EMS evidence that powered stretchers do reduce it, with the design difference between the two stated. 6.7 carries the joint ACS-COT/ACEP/NAEMSP position on spinal motion restriction, including that there is no role for it in penetrating trauma, and the honest note that the practice itself lacks definitive evidence of benefit. 6.2, 6.3 and 6.7 are lab-gated: the psychomotor skill is checked in person and this module does not substitute for that.',
  sources: [
    'NHTSA National EMS Education Standards (2021) - Preparatory: Lifting and Moving Patients',
    'Verbeek JH, Martimo K-P, Karppinen J, et al. Manual material handling advice and assistive devices for preventing and treating back pain in workers. Cochrane Database Syst Rev 2011;(6):CD005958',
    'Pryce R, et al. The effect of power stretchers on occupational injury rates in an urban emergency medical services system. Am J Ind Med 2024; Armstrong DP, et al. Appl Ergon 2017',
    'Fischer PE, Perina DG, Delbridge TR, et al. Spinal motion restriction in the trauma patient - a joint position statement. Prehosp Emerg Care 2018;22(6):659-61',
    'NIOSH data on EMS occupational injury'
  ],
  objectives, blocks, items
}, OUT, fs);
