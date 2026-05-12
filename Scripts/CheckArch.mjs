/**
 * CheckArch.mjs — Validates the Joanium package architecture.
 *
 * Rules enforced:
 *   1. Every directory inside Packages/ must have an Index.js entry file.
 *   2. No package (except Shared and Boot) may import from another package.
 *
 * Usage:
 *   node Scripts/CheckArch.mjs
 *
 * Exit code 0 = clean. Exit code 1 = violations found.
 */

import path from 'node:path';
import { readdir, readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGES_DIR = path.join(ROOT, 'Packages');
const ALLOWED_CROSS_IMPORTS = new Set(['Shared', 'Boot']);

let violations = 0;

function fail(message) {
  console.error(`  ✗ ${message}`);
  violations++;
}

function pass(message) {
  console.log(`  ✓ ${message}`);
}

// ─── Rule 1: Every package directory must have an Index.js ───────────────────
async function checkIndexFiles(packages) {
  console.log('\n[CheckArch] Rule 1 — Every package must have an Index.js\n');

  for (const pkg of packages) {
    const indexPath = path.join(PACKAGES_DIR, pkg, 'Index.js');
    try {
      const stats = await stat(indexPath);
      if (stats.isFile() && stats.size > 0) {
        pass(`${pkg}/Index.js`);
      } else {
        fail(`${pkg}/Index.js exists but is empty`);
      }
    } catch {
      fail(`${pkg}/Index.js is MISSING`);
    }
  }
}

// ─── Rule 2: No cross-package imports ────────────────────────────────────────
async function getAllJsFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await getAllJsFiles(full)));
    } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.mjs'))) {
      files.push(full);
    }
  }

  return files;
}

async function checkCrossPackageImports(packages) {
  console.log('\n[CheckArch] Rule 2 — No cross-package imports\n');

  const importPattern = /^\s*import\s+.*?from\s+['"]([^'"]+)['"]/gm;

  for (const pkg of packages) {
    if (ALLOWED_CROSS_IMPORTS.has(pkg)) {
      continue;
    }

    const pkgDir = path.join(PACKAGES_DIR, pkg);
    const files = await getAllJsFiles(pkgDir);

    for (const file of files) {
      const content = await readFile(file, 'utf8');
      const relativePath = path.relative(ROOT, file);
      let match;

      importPattern.lastIndex = 0;

      while ((match = importPattern.exec(content)) !== null) {
        const importSource = match[1];
        if (!importSource.startsWith('.')) {
          continue;
        }

        const fileDir = path.dirname(file);
        const resolved = path.resolve(fileDir, importSource).replace(/\\/g, '/');
        const importedMatch = resolved.match(/\/Packages\/([^/]+)\//);

        if (!importedMatch) {
          continue;
        }

        const importedPkg = importedMatch[1];

        if (importedPkg !== pkg && !ALLOWED_CROSS_IMPORTS.has(importedPkg)) {
          fail(
            `${relativePath}\n    imports from '${importedPkg}' — move shared code to Packages/Shared`,
          );
        }
      }
    }
  }
}

// ─── Runner ───────────────────────────────────────────────────────────────────
async function run() {
  console.log('[CheckArch] Scanning Packages/...');

  const entries = await readdir(PACKAGES_DIR, { withFileTypes: true });
  const packages = entries.filter((e) => e.isDirectory()).map((e) => e.name);

  console.log(`[CheckArch] Found ${packages.length} packages: ${packages.join(', ')}`);

  await checkIndexFiles(packages);
  await checkCrossPackageImports(packages);

  console.log('\n─────────────────────────────────────────────');

  if (violations === 0) {
    console.log('[CheckArch] ✓ All architecture rules passed.\n');
    process.exit(0);
  } else {
    console.error(`[CheckArch] ✗ ${violations} violation(s) found. Fix them before committing.\n`);
    process.exit(1);
  }
}

run().catch((error) => {
  console.error('[CheckArch] Fatal error:', error);
  process.exit(1);
});
