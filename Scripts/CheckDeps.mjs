/**
 * CheckDeps.mjs — Validates dependency classification for Electron builds.
 *
 * electron-builder bundles ONLY `dependencies`, not `devDependencies`.
 * Any external package imported in Packages/ that lives in devDependencies
 * will be missing in production — a silent runtime crash.
 *
 * This script:
 *   1. Scans all JS files in Packages/ for external imports
 *   2. Checks every external import is in `dependencies` (not devDependencies)
 *   3. Checks `dependencies` has no packages that are only used in Scripts/
 *      (those should be devDependencies to keep the production bundle lean)
 *
 * Usage:
 *   node Scripts/CheckDeps.mjs
 *
 * Exit code 0 = clean. Exit code 1 = violations found.
 */

import path from 'node:path';
import { readdir, readFile } from 'node:fs/promises';
import { builtinModules } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGES_DIR = path.join(ROOT, 'Packages');
const SCRIPTS_DIR = path.join(ROOT, 'Scripts');
const MANIFEST_PATH = path.join(ROOT, 'package.json');

// Node built-ins and Electron — never in package.json
const NODE_BUILTIN_IMPORTS = new Set(
  builtinModules.flatMap((moduleName) => [moduleName, `node:${moduleName}`]),
);

const IGNORED_IMPORTS = new Set([
  'electron',
  'node:path',
  'node:fs',
  'node:fs/promises',
  'node:url',
  'node:os',
  'node:child_process',
  'node:crypto',
  'node:stream',
  'node:util',
  'node:events',
  'node:http',
  'node:https',
  'node:net',
  'node:buffer',
  'node:process',
  'node:module',
  'path',
  'fs',
  'url',
  'os',
  'crypto',
  'child_process',
  'stream',
  'util',
  'events',
  'http',
  'https',
]);

let violations = 0;

function fail(message) {
  console.error(`  ✗ ${message}`);
  violations++;
}

function pass(message) {
  console.log(`  ✓ ${message}`);
}

// ─── File scanner ─────────────────────────────────────────────────────────────

async function getAllJsFiles(dir) {
  let results = [];
  let entries;

  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(await getAllJsFiles(full));
    } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.mjs'))) {
      results.push(full);
    }
  }

  return results;
}

function extractExternalImports(source) {
  const imports = new Set();
  const pattern = /^\s*import\s+.*?from\s+['"]([^'"./][^'"]*)['"]/gm;
  let match;

  while ((match = pattern.exec(source)) !== null) {
    // Get the package name (first segment, handling scoped packages like @scope/pkg)
    const raw = match[1];
    const packageName = raw.startsWith('@')
      ? raw.split('/').slice(0, 2).join('/')
      : raw.split('/')[0];
    imports.add(packageName);
  }

  return imports;
}

// ─── Rules ────────────────────────────────────────────────────────────────────

async function checkRuntimeDepsAreDeclared(manifest) {
  console.log('\n[CheckDeps] Rule 1 — Runtime imports must be in dependencies\n');

  const runtimeDeps = new Set(Object.keys(manifest.dependencies ?? {}));
  const devDeps = new Set(Object.keys(manifest.devDependencies ?? {}));
  const files = await getAllJsFiles(PACKAGES_DIR);
  const allRuntimeImports = new Set();

  for (const file of files) {
    const source = await readFile(file, 'utf8');
    for (const pkg of extractExternalImports(source)) {
      allRuntimeImports.add(pkg);
    }
  }

  for (const pkg of allRuntimeImports) {
    if (IGNORED_IMPORTS.has(pkg) || NODE_BUILTIN_IMPORTS.has(pkg)) {
      continue;
    }

    if (runtimeDeps.has(pkg)) {
      pass(`${pkg} → dependencies ✓`);
    } else if (devDeps.has(pkg)) {
      fail(
        `${pkg} is imported in Packages/ but is in devDependencies — electron-builder will NOT bundle it`,
      );
    } else {
      fail(`${pkg} is imported in Packages/ but is not declared in package.json at all`);
    }
  }
}

async function checkDevOnlyDepsNotInDependencies(manifest) {
  console.log('\n[CheckDeps] Rule 2 — Build-only packages should not be in dependencies\n');

  const runtimeDeps = new Set(Object.keys(manifest.dependencies ?? {}));
  const files = await getAllJsFiles(SCRIPTS_DIR);
  const scriptImports = new Set();

  for (const file of files) {
    const source = await readFile(file, 'utf8');
    for (const pkg of extractExternalImports(source)) {
      scriptImports.add(pkg);
    }
  }

  // Also check files in Packages/ to find which deps are ONLY used in Scripts/
  const packageFiles = await getAllJsFiles(PACKAGES_DIR);
  const packageImports = new Set();

  for (const file of packageFiles) {
    const source = await readFile(file, 'utf8');
    for (const pkg of extractExternalImports(source)) {
      packageImports.add(pkg);
    }
  }

  for (const dep of runtimeDeps) {
    if (IGNORED_IMPORTS.has(dep) || NODE_BUILTIN_IMPORTS.has(dep)) {
      continue;
    }

    if (scriptImports.has(dep) && !packageImports.has(dep)) {
      fail(
        `${dep} is in dependencies but only used in Scripts/ — move to devDependencies to keep the production bundle lean`,
      );
    }
  }
}

// ─── Runner ───────────────────────────────────────────────────────────────────

async function run() {
  console.log('[CheckDeps] Reading package.json...');

  const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));

  console.log(`[CheckDeps] dependencies: ${Object.keys(manifest.dependencies ?? {}).length}`);
  console.log(`[CheckDeps] devDependencies: ${Object.keys(manifest.devDependencies ?? {}).length}`);

  await checkRuntimeDepsAreDeclared(manifest);
  await checkDevOnlyDepsNotInDependencies(manifest);

  console.log('\n─────────────────────────────────────────────');

  if (violations === 0) {
    console.log('[CheckDeps] ✓ All dependency rules passed.\n');
    process.exit(0);
  } else {
    console.error(`[CheckDeps] ✗ ${violations} violation(s) found.\n`);
    process.exit(1);
  }
}

run().catch((error) => {
  console.error('[CheckDeps] Fatal error:', error);
  process.exit(1);
});
