import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverPackages, loadPackageModule, createBootLogger } from './Boot/Index.js';

const packagesDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(packagesDirectory, '..');

const writeBootLog = createBootLogger(
  path.join(rootDirectory, 'Build', 'Logs', 'electron-boot.log')
);

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
