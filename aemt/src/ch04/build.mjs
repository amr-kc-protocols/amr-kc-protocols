/* Builds aemt/ch04-communications-documentation.json.  node aemt/src/ch04/build.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildChapter } from '../conform.mjs';
import { objectives, items, blocks } from './blocks.mjs';

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)),
  '../../ch04-communications-documentation.json');

buildChapter({
  chapter: 4, title: 'Communications and Documentation',
  version: '1.0.0', schema_version: 2,
  review_status: 'unreviewed',
  notice: 'The handover block teaches the structure every named format encodes, rather than mandating one: structured handover reduces information loss, and the evidence that any particular tool beats another is weak. Which format this service uses is a local-overlay decision and has not been set here. Not yet reviewed by a second credentialed instructor.',
  sources: [
    'NHTSA National EMS Education Standards (2021) - Preparatory: Communications and Documentation',
    'Dawson S, King L, Grantham H. Improving the hospital clinical handover between paramedics and emergency department staff. Emerg Med Australas 2013;25:393-405',
    'Flores G. The impact of medical interpreter services on the quality of health care: a systematic review. Med Care Res Rev 2005;62:255-99',
    'Americans with Disabilities Act, 28 CFR 35.160 - effective communication and auxiliary aids',
    'NEMSIS version 3 data dictionary',
    'FEMA National Incident Management System - common terminology and plain language'
  ],
  objectives, blocks, items
}, OUT, fs);
