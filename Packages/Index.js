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

  const createPackage = async (packageName, seenPackageIds = new Set()) => {
    if (seenPackageIds.has(packageName)) {
      throw new Error(`Circular package companion dependency detected for "${packageName}".`);
    }

    seenPackageIds.add(packageName);
    const packageModule = await loadPackageModule(registry, packageName);

    if (typeof packageModule.createPackage !== 'function') {
      throw new Error(`Package "${packageName}" does not export createPackage().`);
    }

    const packageInstance = await packageModule.createPackage({
      rootDirectory,
      packagesDirectory,
      registry
    });

    const companions = packageInstance.ipcCompanions ?? [];
    for (const companionId of companions) {
      writeBootLog('bootstrapApplication:companion-start', companionId);
      const companion = await createPackage(companionId, new Set(seenPackageIds));
      packageInstance.ipcHandlers = [
        ...(packageInstance.ipcHandlers ?? []),
        ...(companion.ipcHandlers ?? [])
      ];
      writeBootLog('bootstrapApplication:companion-merged', companionId);
    }
    delete packageInstance.ipcCompanions;

    return packageInstance;
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

  await electronModule.bootElectron({
    rootDirectory,
    entryPackage,
    loadPackage: createPackage
  });
  writeBootLog('bootstrapApplication:bootElectron-resolved');
}
