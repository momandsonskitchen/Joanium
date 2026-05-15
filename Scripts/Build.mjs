/**
 * Build.mjs — Production build for Joanium.
 *
 * Steps:
 *   1. Set version from date  (silent — captured for header display)
 *   2. Package with electron-builder
 *        ↳ packs source into app.asar
 *        ↳ runs Scripts/Fuses.cjs as afterSign hook
 *             → flips Electron V1 fuses in the binary:
 *               RunAsNode OFF · EnableCookieEncryption ON
 *               NodeOptions OFF · NodeCliInspect OFF
 *               AsarIntegrity ON · OnlyLoadAppFromAsar ON
 *
 * Usage:
 *   node Scripts/Build.mjs
 *
 * Requirement (first time):
 *   npm install --save-dev @electron/fuses
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── ANSI colours ─────────────────────────────────────────────────────────────

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  lav: '\x1b[38;5;183m', // lavender — main logo colour
  lavBold: '\x1b[1;38;5;183m', // lavender bold — version badge
  lavDeep: '\x1b[38;5;141m', // deeper lavender — accents
  green: '\x1b[38;5;114m', // soft green — success tick
  amber: '\x1b[38;5;221m', // amber — in-progress diamond
  gray: '\x1b[38;5;245m', // mid-gray — secondary text
  white: '\x1b[1;97m', // bold white — step labels
};

// ── ASCII logo (ANSI Shadow figlet — JOANIUM) ─────────────────────────────────

const LOGO = [
  '     ██╗  ██████╗  █████╗ ███╗   ██╗██╗██╗   ██╗███╗   ███╗',
  '     ██║ ██╔═══██╗██╔══██╗████╗  ██║██║██║   ██║████╗ ████║',
  '     ██║ ██║   ██║███████║██╔██╗ ██║██║██║   ██║██╔████╔██║',
  '     ██║ ██║   ██║██╔══██║██║╚██╗██║██║██║   ██║██║╚██╔╝██║',
  '██   ██║ ╚██████╔╝██║  ██║██║ ╚████║██║╚██████╔╝██║ ╚═╝ ██║',
  '╚█████╔╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝ ╚═════╝ ╚═╝     ╚═╝',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function printLogo() {
  process.stdout.write('\n');
  for (const line of LOGO) {
    process.stdout.write(`  ${C.lav}${line}${C.reset}\n`);
  }
  process.stdout.write('\n');
}

function printMeta(version) {
  const label = `${C.lavDeep}◈  Production Build${C.reset}`;
  const sep = `${C.gray}  ·  ${C.reset}`;
  const ver = `${C.lavBold}v${version}${C.reset}`;
  process.stdout.write(`  ${label}${sep}${ver}\n\n`);

  const divider = `${C.lavDeep}${'─'.repeat(60)}${C.reset}`;
  process.stdout.write(`  ${divider}\n\n`);
}

function stepStart(label, detail) {
  const d = detail ? `  ${C.dim}${C.gray}${detail}${C.reset}` : '';
  process.stdout.write(`  ${C.amber}◆${C.reset}  ${C.white}${label}${C.reset}${d}\n`);
}

function stepDone(label) {
  process.stdout.write(
    `  ${C.green}✔${C.reset}  ${C.white}${label}${C.reset}  ${C.dim}${C.gray}done${C.reset}\n\n`,
  );
}

function printProtectionSummary() {
  const rows = [
    ['ASAR packing', 'source tree archived into app.asar'],
    ['RunAsNode', 'OFF — binary cannot run as a bare Node process'],
    ['CookieEncryption', 'ON  — cookies encrypted via OS keychain / DPAPI'],
    ['NODE_OPTIONS', 'OFF — --require / --loader injection blocked'],
    ['--inspect flags', 'OFF — V8 debugger attach blocked'],
    ['ASAR integrity', 'ON  — hash verified at startup (macOS + notarization)'],
    ['OnlyLoadFromAsar', 'ON  — code outside ASAR refused at load time'],
  ];

  const divider = `${C.lavDeep}${'─'.repeat(60)}${C.reset}`;
  process.stdout.write(`  ${divider}\n\n`);
  process.stdout.write(`  ${C.lavDeep}◈  Protection applied${C.reset}\n\n`);

  for (const [key, value] of rows) {
    const k = `${C.lav}${key.padEnd(20)}${C.reset}`;
    const v = `${C.gray}${value}${C.reset}`;
    process.stdout.write(`     ${k}  ${v}\n`);
  }

  process.stdout.write('\n');
}

function run(label, cmd, detail = '') {
  stepStart(label, detail);
  execSync(cmd, { cwd: ROOT, stdio: 'inherit' });
  stepDone(label);
}

// ── Main ──────────────────────────────────────────────────────────────────────

// Run SetVersionByDate silently to stamp package.json and read the version.
const version = execSync('node ./Scripts/SetVersionByDate.mjs', {
  cwd: ROOT,
  encoding: 'utf8',
}).trim();

printLogo();
printMeta(version);

// electron-builder handles both ASAR packing and the afterSign fuse hook
// (Scripts/Fuses.cjs) automatically. No separate steps needed.
run('Package app', 'npx electron-builder', 'electron-builder → asar pack → fuses');

// ── Done ──────────────────────────────────────────────────────────────────────

printProtectionSummary();

const divider = `${C.lavDeep}${'─'.repeat(60)}${C.reset}`;
process.stdout.write(`  ${divider}\n\n`);
process.stdout.write(
  `  ${C.lav}✦${C.reset}  ${C.white}Build complete${C.reset}  ${C.dim}${C.gray}v${version}${C.reset}\n\n`,
);
