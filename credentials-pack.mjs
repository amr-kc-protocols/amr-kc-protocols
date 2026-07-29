#!/usr/bin/env node
// ============================================================
// AMR KC — Credentials Expiration Log  →  encrypted data block
//
// Encrypts a roster JSON file so real names and expiration dates
// are never committed in plaintext. Produces two things:
//
//   ROSTER_BLOB  the whole roster, keyed by the staff password.
//   SELF_BLOBS   one record per person, each keyed by that
//                person's own last name + employee number, so a
//                provider can look up their own cards without
//                being able to open anyone else's.
//
//   node credentials-pack.mjs <password> roster.json
//   node credentials-pack.mjs <password> roster.json --write
//
// --write splices the result into credentials-log.html between
// the BEGIN/END GENERATED DATA markers. Without it, the block is
// printed to stdout.
//
// Formats (must stay in sync with credentials-log.html):
//   roster: base64( salt[16] || iv[12] || AES-256-GCM ct ),
//           key = PBKDF2-SHA256(password, salt, 250000)
//   self:   base64( iv[12] || AES-256-GCM ct ), shared SELF_SALT,
//           key = PBKDF2-SHA256("lastname|empno", salt, 150000)
// ============================================================

import { webcrypto as crypto } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const PBKDF2_ITER = 250000;
const SELF_ITER = 150000;
const SELF_PAD = 1024;
const SELF_FIELDS = ['name', 'role', 'employeeNo', 'creds'];

const HERE = dirname(fileURLToPath(import.meta.url));
const PAGE = resolve(HERE, 'credentials-log.html');

const [, , password, rosterPath, ...rest] = process.argv;
if (!password || !rosterPath) {
  console.error('usage: node credentials-pack.mjs <password> <roster.json> [--write]');
  process.exit(1);
}
const write = rest.includes('--write');

const roster = JSON.parse(readFileSync(resolve(process.cwd(), rosterPath), 'utf8'));
if (!Array.isArray(roster)) {
  console.error('error: roster file must contain a JSON array');
  process.exit(1);
}
const unnamed = roster.filter((p) => !p || !p.name).length;
if (unnamed) {
  console.error(`error: ${unnamed} record(s) missing a "name"`);
  process.exit(1);
}

// "Doe, Jane" → "Doe";  "Jane Doe" → "Doe"
const lastNameOf = (name) => {
  const s = String(name ?? '').trim();
  if (s.includes(',')) return s.split(',')[0];
  const parts = s.split(/\s+/);
  return parts[parts.length - 1] || '';
};
const selfKeyInput = (lastName, empNo) => {
  const ln = String(lastName ?? '').toLowerCase().replace(/[^a-z]/g, '');
  const en = String(empNo ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return ln && en ? `${ln}|${en}` : '';
};

const deriveKey = async (password, salt, iters) => {
  const base = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: iters, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
  );
};

// ── whole roster, staff password ──────────────────────────
const rSalt = crypto.getRandomValues(new Uint8Array(16));
const rIv = crypto.getRandomValues(new Uint8Array(12));
const rKey = await deriveKey(password, rSalt, PBKDF2_ITER);
const rCt = await crypto.subtle.encrypt(
  { name: 'AES-GCM', iv: rIv }, rKey, new TextEncoder().encode(JSON.stringify(roster))
);
const rosterB64 = Buffer.concat([
  Buffer.from(rSalt), Buffer.from(rIv), Buffer.from(rCt)
]).toString('base64');

// ── per-person records, own name + employee number ────────
const sSalt = crypto.getRandomValues(new Uint8Array(16));
const people = roster.filter((p) => selfKeyInput(lastNameOf(p.name), p.employeeNo));
const skipped = roster.length - people.length;
const selfBlobs = [];

for (const [i, p] of people.entries()) {
  const rec = Object.fromEntries(SELF_FIELDS.map((k) => [k, p[k] ?? (k === 'creds' ? [] : '')]));
  let s = JSON.stringify(rec);
  s += ' '.repeat(SELF_PAD - (s.length % SELF_PAD)); // hide record length
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(selfKeyInput(lastNameOf(p.name), p.employeeNo), sSalt, SELF_ITER);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(s));
  selfBlobs.push(Buffer.concat([Buffer.from(iv), Buffer.from(ct)]).toString('base64'));
  if (!write) process.stderr.write(`\rencrypting personal records… ${i + 1}/${people.length}`);
}
if (!write && people.length) process.stderr.write('\n');

// Shuffle so record order carries no information.
for (let i = selfBlobs.length - 1; i > 0; i--) {
  const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
  [selfBlobs[i], selfBlobs[j]] = [selfBlobs[j], selfBlobs[i]];
}

// ── assemble ──────────────────────────────────────────────
const stamp = new Date().toISOString().slice(0, 10);
const wrap = (b64) => (b64.match(/.{1,76}/g) ?? [b64]).map((l) => `'${l}'`).join(' +\n');

const block = [
  '',
  '// Last time the data below was regenerated. Shown in the UI.',
  `var UPDATED = '${stamp}';`,
  '',
  '// base64( salt[16] || iv[12] || AES-GCM ciphertext )',
  'var ROSTER_BLOB =',
  `${wrap(rosterB64)};`,
  '',
  '// Shared PBKDF2 salt for the per-person records — one derivation',
  '// covers every candidate, so the lookup stays fast.',
  `var SELF_SALT = '${Buffer.from(sSalt).toString('base64')}';`,
  '',
  '// base64( iv[12] || AES-GCM ciphertext ), one per person, shuffled.',
  '// One line each, so a roster change shows up as a per-person diff.',
  'var SELF_BLOBS = [',
  selfBlobs.map((b) => `'${b}'`).join(',\n'),
  '];',
  ''
].join('\n');

const summary = `${roster.length} record(s) encrypted; ${selfBlobs.length} with self-lookup` +
  (skipped ? ` (${skipped} skipped — no employee number)` : '') + '.';

if (!write) {
  console.log(block);
  console.error(`\n${summary}\nPaste between the BEGIN/END GENERATED DATA markers in credentials-log.html.`);
  process.exit(0);
}

const BEGIN = '/* ── BEGIN GENERATED DATA ─────────────────────────────── */';
const END = '/* ── END GENERATED DATA ───────────────────────────────── */';
let html = readFileSync(PAGE, 'utf8');
const from = html.indexOf(BEGIN);
const to = html.indexOf(END);
if (from === -1 || to === -1 || to < from) {
  console.error('error: could not find the BEGIN/END GENERATED DATA markers in credentials-log.html');
  process.exit(1);
}
html = html.slice(0, from + BEGIN.length) + block + html.slice(to);
writeFileSync(PAGE, html);
console.log(`credentials-log.html updated — ${summary} Stamped ${stamp}.`);
