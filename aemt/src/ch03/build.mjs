/* Builds aemt/ch03-medical-legal-ethical.json.  node aemt/src/ch03/build.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildChapter } from '../conform.mjs';
import { objectives, items, blocks } from './blocks.mjs';

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../ch03-medical-legal-ethical.json');

buildChapter({
  chapter: 3, title: 'Medical, Legal, and Ethical Issues',
  version: '1.0.0', schema_version: 2,
  review_status: 'unreviewed',
  notice: 'State law does most of the work in this chapter and a portable module cannot assert it. Consent ages, mandatory reporting lists, who may revoke a portable medical order, custody rules and permitted disclosures to law enforcement are all marked for the local overlay rather than guessed at. The frameworks that do travel - the four elements of negligence, the four abilities of capacity, and the blank-section default on a portable order - are taught here. Not yet reviewed by a second credentialed instructor.',
  sources: [
    'NHTSA National EMS Education Standards (2021) - Preparatory: Medical/Legal and Ethical Issues',
    'Appelbaum PS. Assessment of patients’ competence to consent to treatment. N Engl J Med 2007;357:1834-40',
    'HIPAA Privacy Rule, 45 CFR Parts 160 and 164',
    'National POLST - portable medical orders: form structure and completion standards',
    'Emergency Medical Treatment and Labor Act, 42 U.S.C. §1395dd; 42 CFR 489.24'
  ],
  objectives, blocks, items
}, OUT, fs);
