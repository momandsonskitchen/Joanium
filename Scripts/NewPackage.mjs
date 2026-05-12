/**
 * NewPackage.mjs — Scaffolds a new Joanium package.
 *
 * Creates the full standard package structure:
 *   Packages/<Name>/
 *   ├── Index.js
 *   ├── Core/
 *   │   └── <Name>Core.js
 *   ├── UI/
 *   │   ├── <Name>.html
 *   │   ├── <Name>.js
 *   │   └── <Name>.css
 *   ├── IPC/
 *   │   └── <Name>IPC.js
 *   └── I18n/
 *       └── en.js
 *
 * Usage:
 *   node Scripts/NewPackage.mjs <PackageName>
 *
 * Example:
 *   node Scripts/NewPackage.mjs Notifications
 */

import path from 'node:path';
import { mkdir, writeFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGES_DIR = path.join(ROOT, 'Packages');

const name = process.argv[2]?.trim();

if (!name) {
  console.error('Usage: node Scripts/NewPackage.mjs <PackageName>');
  console.error('Example: node Scripts/NewPackage.mjs Notifications');
  process.exit(1);
}

if (!/^[A-Z][a-zA-Z0-9]+$/.test(name)) {
  console.error(`Invalid package name: "${name}"`);
  console.error('Package names must be PascalCase, e.g. "Notifications", "FeedReader".');
  process.exit(1);
}

const packageDir = path.join(PACKAGES_DIR, name);

try {
  await access(packageDir);
  console.error(`Package "${name}" already exists at ${packageDir}`);
  process.exit(1);
} catch {
  // Directory does not exist — good, continue.
}

const files = {
  // ── Index.js ──────────────────────────────────────────────────────────────
  'Index.js': `/**
 * ${name}/Index.js — Public entry point for the ${name} package.
 *
 * This is the ONLY file other packages or the bootstrap may import.
 * Do not import Core/, UI/, or IPC/ files from outside this package.
 */

export async function createPackage({ rootDirectory }) {
  return {
    id: '${name}',
    ipcHandlers: [
      // {
      //   channel: '${name.toLowerCase()}:example',
      //   handler: async (_event, payload) => {
      //     return null;
      //   },
      // },
    ],
  };
}
`,

  // ── Core ──────────────────────────────────────────────────────────────────
  [`Core/${name}Core.js`]: `/**
 * ${name}/Core/${name}Core.js — Core business logic for the ${name} package.
 */

export function create${name}Core({ rootDirectory }) {
  return {
    // Add core logic here.
  };
}
`,

  // ── IPC ───────────────────────────────────────────────────────────────────
  [`IPC/${name}IPC.js`]: `/**
 * ${name}/IPC/${name}IPC.js — IPC handler definitions for the ${name} package.
 *
 * Export an array of { channel, handler } objects.
 * Consumed by Index.js — never imported from outside this package.
 */

export function create${name}Handlers(core) {
  return [
    // {
    //   channel: '${name.toLowerCase()}:example',
    //   handler: async (_event, payload) => core.example(payload),
    // },
  ];
}
`,

  // ── UI ────────────────────────────────────────────────────────────────────
  [`UI/${name}.html`]: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="${name}.css" />
    <script type="module" src="${name}.js"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`,

  [`UI/${name}.js`]: `/**
 * ${name}/UI/${name}.js — Renderer entry point for the ${name} package.
 */

import { t } from '../I18n/Index.js';

function init() {
  const root = document.getElementById('root');
  root.textContent = t('title');
}

init();
`,

  [`UI/${name}.css`]: `/* ${name} styles */

#root {
  display: flex;
  flex-direction: column;
  height: 100%;
}
`,

  // ── I18n ──────────────────────────────────────────────────────────────────
  'I18n/en.js': `/**
 * ${name}/I18n/en.js — English strings for the ${name} package.
 * All user-facing text must come from here. Never hardcode strings in JS or HTML.
 */

export const en = {
  title: '${name}',
};
`,

  'I18n/Index.js': `/**
 * ${name}/I18n/Index.js — I18n entry point for the ${name} package.
 */

import { en } from './en.js';

const strings = en;

export function t(key) {
  return strings[key] ?? key;
}
`,
};

async function scaffold() {
  console.log(`\n[NewPackage] Scaffolding "${name}"...\n`);

  const dirs = ['Core', 'UI', 'IPC', 'I18n'];

  for (const dir of dirs) {
    await mkdir(path.join(packageDir, dir), { recursive: true });
  }

  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = path.join(packageDir, filePath);
    await writeFile(fullPath, content, 'utf8');
    console.log(`  created  Packages/${name}/${filePath}`);
  }

  console.log(`
[NewPackage] ✓ Package "${name}" created at Packages/${name}/

Next steps:
  1. Add your logic to Core/${name}Core.js
  2. Wire IPC handlers in IPC/${name}IPC.js and register them in Index.js
  3. Build your UI in UI/${name}.html and UI/${name}.js
  4. Add all user-facing strings to I18n/en.js
  5. Run: npm run check:arch
`);
}

scaffold().catch((error) => {
  console.error('[NewPackage] Fatal error:', error);
  process.exit(1);
});
