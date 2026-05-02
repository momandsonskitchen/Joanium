import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { appendFileSync, mkdirSync } from 'node:fs';
import { discoverPackages, loadPackageModule } from './Boot/Index.js';

const packagesDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(packagesDirectory, '..');

function writeBootLog(message, details = '') {
  try {
    const logDirectory = path.join(rootDirectory, 'Build', 'Logs');
    mkdirSync(logDirectory, { recursive: true });
    const suffix = details ? ` ${details}` : '';
    appendFileSync(
      path.join(logDirectory, 'electron-boot.log'),
      `[${new Date().toISOString()}] ${message}${suffix}\n`,
      'utf8'
    );
  } catch {
    // Ignore logging failures during boot diagnostics.
  }
}

export async function bootstrapApplication() {
  writeBootLog('bootstrapApplication:start');
  const registry = await discoverPackages(packagesDirectory);
  writeBootLog('bootstrapApplication:registry-ready', String(registry.size));
  const electronModule = await loadPackageModule(registry, 'Electron');
  writeBootLog('bootstrapApplication:electron-loaded');
  const setupModule = await loadPackageModule(registry, 'Setup');
  writeBootLog('bootstrapApplication:setup-loaded');
  const setupPackage = await setupModule.createPackage({
    rootDirectory,
    packagesDirectory,
    registry
  });
  writeBootLog('bootstrapApplication:setup-package-created');

  await electronModule.bootElectron({
    rootDirectory,
    entryPackage: setupPackage
  });
  writeBootLog('bootstrapApplication:bootElectron-resolved');
}
