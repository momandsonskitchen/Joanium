/**
 * Fuses.cjs — Electron Fuse hardening applied as an afterSign hook.
 *
 * electron-builder calls this after signing each platform binary. It uses
 * @electron/fuses to flip V1 fuse bits directly in the Electron binary,
 * making several runtime bypass vectors inoperable in the distributed build.
 *
 * Fuses applied
 * ─────────────
 *   RunAsNode                          OFF  — disables ELECTRON_RUN_AS_NODE,
 *                                            which would otherwise let an
 *                                            attacker run arbitrary Node.js
 *                                            scripts through the app binary.
 *
 *   EnableCookieEncryption             ON   — encrypts session cookies at rest
 *                                            using the OS keychain / DPAPI.
 *
 *   EnableNodeOptionsEnvironmentVariable OFF — disables the NODE_OPTIONS env
 *                                            var so --require / --loader flags
 *                                            cannot inject code at startup.
 *
 *   EnableNodeCliInspectArguments      OFF  — disables --inspect / --inspect-brk
 *                                            so the V8 debugger cannot be
 *                                            attached to the main process.
 *
 *   EnableEmbeddedAsarIntegrityValidation ON — verifies the ASAR hash
 *                                            embedded at build time on macOS
 *                                            (requires notarization to enforce).
 *
 *   OnlyLoadAppFromAsar                ON   — prevents the main process from
 *                                            loading application code from
 *                                            outside the packed ASAR archive.
 *
 * Usage:
 *   Referenced automatically by electron-builder via the "afterSign" key in
 *   electron-builder.json. Do not invoke directly.
 *
 * Requirement:
 *   npm install --save-dev @electron/fuses
 */

'use strict';

const path = require('path');
const { flipFuses, FuseVersion, FuseV1Options } = require('@electron/fuses');

// ── Binary path resolution ────────────────────────────────────────────────────
// electron-builder passes the unpacked app output directory (appOutDir) and
// the current platform name. We derive the exact Electron binary from those.

function resolveElectronBinary(appOutDir, platform, productName) {
  switch (platform) {
    case 'win32':
      return path.join(appOutDir, `${productName}.exe`);

    case 'darwin':
      return path.join(appOutDir, `${productName}.app`, 'Contents', 'MacOS', productName);

    default:
      // Linux — AppImage unpacked dir uses the lowercase product name
      return path.join(appOutDir, productName);
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

module.exports = async function applyFuses(context) {
  const { electronPlatformName, appOutDir, packager } = context;

  // productName comes from electron-builder config (e.g. "Joanium")
  const productName = packager?.appInfo?.productName ?? 'Joanium';

  const binaryPath = resolveElectronBinary(appOutDir, electronPlatformName, productName);

  console.log(`\n  ◆  Applying Electron fuses`);
  console.log(`     Platform : ${electronPlatformName}`);
  console.log(`     Binary   : ${binaryPath}\n`);

  await flipFuses(binaryPath, {
    version: FuseVersion.V1,

    // Prevent using the Electron binary as a bare Node.js runner
    [FuseV1Options.RunAsNode]: false,

    // Encrypt session cookies at rest via OS keychain / DPAPI
    [FuseV1Options.EnableCookieEncryption]: true,

    // Block NODE_OPTIONS env var (--require, --loader injection)
    [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,

    // Block --inspect / --inspect-brk debugger attachment
    [FuseV1Options.EnableNodeCliInspectArguments]: false,

    // Verify ASAR hash at startup (enforced on macOS with notarization)
    [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,

    // Refuse to load app code from outside the ASAR archive
    [FuseV1Options.OnlyLoadAppFromAsar]: true,
  });

  console.log('  ✔  Fuses applied\n');
};
