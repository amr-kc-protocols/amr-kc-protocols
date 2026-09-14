/* Builds aemt/ch02-workforce-safety.json.  node aemt/src/ch02/build.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildChapter } from '../conform.mjs';
import { objectives, items, blocks } from './blocks.mjs';

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../ch02-workforce-safety.json');

buildChapter({
  chapter: 2, title: 'Workforce Safety and Wellness',
  version: '1.0.0', schema_version: 2,
  review_status: 'released',
  notice: 'Written from OSHA, CDC/HICPAC, NIOSH, the Education Standards and the primary literature. Two blocks deliberately set the traditionally taught position beside the current evidence: 2.5 (the stage model of grief) and 2.8 (single-session debriefing). Kansas and AMR KC specifics belong in the local overlay.',
  sources: [
    'OSHA Bloodborne Pathogens Standard, 29 CFR 1910.1030',
    'CDC/HICPAC Guideline for Isolation Precautions (2007, with subsequent updates)',
    'CDC/USPHS occupational post-exposure management guidance (HBV, HCV, HIV)',
    'Ryan White HIV/AIDS Treatment Extension Act of 2009, Part G',
    'NIOSH and NHTSA data on EMS worker fatalities; 23 CFR 634',
    'Patterson PD et al., Evidence-Based Guidelines for Fatigue Risk Management in EMS. Prehosp Emerg Care 2018;22(sup1):89-101',
    'Rose S et al., Psychological debriefing for preventing PTSD (Cochrane, 2002); NICE NG116 (2018)',
    'Jabre P et al., Family presence during cardiopulmonary resuscitation. N Engl J Med 2013;368:1008-18',
    'IARC Monographs Volume 124 (2020) - night shift work',
    'NHTSA National EMS Education Standards (2021) - Preparatory: Workforce Safety and Wellness'
  ],
  objectives, blocks, items
}, OUT, fs);
