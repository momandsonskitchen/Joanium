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

  const createPackage = async (packageName) => {
    const packageModule = await loadPackageModule(registry, packageName);

    if (typeof packageModule.createPackage !== 'function') {
      throw new Error(`Package "${packageName}" does not export createPackage().`);
    }

    return packageModule.createPackage({
      rootDirectory,
      packagesDirectory,
      registry
    });
  };

  let entryPackageName = 'Setup';

  if (typeof setupModule.resolveLaunchPackage === 'function') {
    const resolvedPackageName = await setupModule.resolveLaunchPackage({ rootDirectory });

    if (registry.has(resolvedPackageName)) {
      entryPackageName = resolvedPackageName;
    }
  }

  writeBootLog('bootstrapApplication:entry-package', entryPackageName);
  const entryPackage = await createPackage(entryPackageName);
  writeBootLog('bootstrapApplication:entry-package-created', entryPackage.id);

  // Merge IPC handlers from companion packages declared by the entry package.
  // This keeps cross-package coupling out of individual package modules —
  // neither Chat nor Templates import each other; the boot layer composes them.
  const companions = entryPackage.ipcCompanions ?? [];
  for (const companionId of companions) {
    writeBootLog('bootstrapApplication:companion-start', companionId);
    const companion = await createPackage(companionId);
    entryPackage.ipcHandlers = [
      ...(entryPackage.ipcHandlers ?? []),
      ...(companion.ipcHandlers ?? [])
    ];
    writeBootLog('bootstrapApplication:companion-merged', companionId);
  }
  delete entryPackage.ipcCompanions;

  await electronModule.bootElectron({
    rootDirectory,
    entryPackage,
    loadPackage: createPackage
  });
  writeBootLog('bootstrapApplication:bootElectron-resolved');
}
