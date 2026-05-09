/**
 * SetVersionByDate.mjs — Stamps package.json with a date-based version.
 *
 * Version format: YYYY.MMDD.patch
 *   - YYYY      — full year
 *   - MMDD      — month × 100 + day  (e.g. April 6 → 406)
 *   - patch     — 0 on first build of the day, preserved if same day
 *
 * Stdout: the 2-part base version (e.g. "2026.406") so the CI workflow
 * can read it and append its own counter before building.
 *
 * Usage:
 *   node Scripts/SetVersionByDate.mjs
 */

import fs from 'fs';
import path from 'path';

function dateBase(date) {
  const year  = date.getFullYear();
  const month = date.getMonth() + 1;
  const day   = date.getDate();
  return `${year}.${month * 100 + day}`;
}

const repoRoot    = process.cwd();
const manifestPath = path.join(repoRoot, 'package.json');

// Open via descriptor to avoid a TOCTOU race (CWE-367).
let fd;
try {
  fd = fs.openSync(manifestPath, 'r+');
} catch (e) {
  if (e.code === 'ENOENT') {
    console.error(`Could not find package.json at ${manifestPath}`);
    process.exit(1);
  }
  throw e;
}

const base = dateBase(new Date()); // e.g. "2026.406"

try {
  const manifestRaw = fs.readFileSync(fd, 'utf8');
  const manifest    = JSON.parse(manifestRaw);
  const prevVersion = manifest.version ?? ''; // e.g. "2026.406.0"

  // Same day → keep existing patch (idempotent local builds).
  // New day  → reset patch to 0.
  let patch = 0;
  const prefix = `${base}.`;
  if (prevVersion.startsWith(prefix)) {
    const prevPatch = parseInt(prevVersion.slice(prefix.length), 10);
    if (!Number.isNaN(prevPatch)) patch = prevPatch;
  }

  const fullVersion = `${base}.${patch}`; // e.g. "2026.406.0"

  if (prevVersion !== fullVersion) {
    manifest.version = fullVersion;
    const newContent = `${JSON.stringify(manifest, null, 2)}\n`;
    fs.ftruncateSync(fd, 0);
    fs.writeSync(fd, newContent, 0, 'utf8');
  }
} finally {
  fs.closeSync(fd);
}

// CI reads this from stdout to form the release tag.
process.stdout.write(`${base}\n`);
