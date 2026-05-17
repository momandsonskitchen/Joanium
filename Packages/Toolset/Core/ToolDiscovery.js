import { access, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const toolsDirectory = path.resolve(currentDirectory, '..', 'Tools');
const NON_PACKAGE_DIRECTORIES = new Set(['Core']);

function normalizeConnector(connector = {}) {
  if (!connector.id) return null;
  return {
    optional: false,
    credentialKey: 'token',
    ...connector,
  };
}

function normalizeToolPackage(toolPackage = {}) {
  return {
    id: toolPackage.id ?? '',
    toolDefinitions: Array.isArray(toolPackage.toolDefinitions) ? toolPackage.toolDefinitions : [],
    toolHandlers:
      toolPackage.toolHandlers && typeof toolPackage.toolHandlers === 'object'
        ? toolPackage.toolHandlers
        : {},
    promptSections: Array.isArray(toolPackage.promptSections) ? toolPackage.promptSections : [],
    connectors: Array.isArray(toolPackage.connectors)
      ? toolPackage.connectors.map(normalizeConnector).filter(Boolean)
      : [],
    ipcHandlers: Array.isArray(toolPackage.ipcHandlers) ? toolPackage.ipcHandlers : [],
  };
}

async function loadToolPackage(packageIndex, { rootDirectory } = {}) {
  const imported = await import(pathToFileURL(packageIndex).href);
  const createToolPackage = imported?.createToolPackage ?? imported?.default;
  if (typeof createToolPackage !== 'function') {
    return null;
  }

  return normalizeToolPackage(await createToolPackage({ rootDirectory }));
}

async function discoverLocalToolPackages({ rootDirectory } = {}) {
  const entries = await readdir(toolsDirectory, { withFileTypes: true }).catch(() => []);
  const sorted = entries
    .filter((entry) => entry.isDirectory() && !NON_PACKAGE_DIRECTORIES.has(entry.name))
    .sort((left, right) => left.name.localeCompare(right.name));

  const results = await Promise.all(
    sorted.map(async (entry) => {
      const packageIndex = path.join(toolsDirectory, entry.name, 'Index.js');
      const hasIndex = await access(packageIndex)
        .then(() => true)
        .catch(() => false);
      if (!hasIndex) return null;
      return loadToolPackage(packageIndex, { rootDirectory });
    }),
  );

  return results.filter(Boolean);
}

async function discoverExternalToolPackages({
  rootDirectory,
  registry,
  externalPackageIds = [],
} = {}) {
  if (!registry || !(registry instanceof Map) || externalPackageIds.length === 0) {
    return [];
  }

  const packageIds = [...new Set(externalPackageIds)].sort((left, right) =>
    left.localeCompare(right),
  );

  const results = await Promise.all(
    packageIds.map(async (packageId) => {
      const packageRecord = registry.get(packageId);
      if (!packageRecord?.entryPath) return null;
      return loadToolPackage(packageRecord.entryPath, { rootDirectory });
    }),
  );

  return results.filter(Boolean);
}

export async function discoverToolPackages({
  rootDirectory,
  registry,
  externalPackageIds = [],
} = {}) {
  const [local, external] = await Promise.all([
    discoverLocalToolPackages({ rootDirectory }),
    discoverExternalToolPackages({ rootDirectory, registry, externalPackageIds }),
  ]);

  const packages = [...local, ...external];

  return {
    packages,
    toolDefinitions: packages.flatMap((toolPackage) => toolPackage.toolDefinitions),
    promptSections: packages.flatMap((toolPackage) => toolPackage.promptSections),
    ipcHandlers: packages.flatMap((toolPackage) => toolPackage.ipcHandlers),
    toolHandlers: packages.reduce(
      (handlers, toolPackage) => ({
        ...handlers,
        ...toolPackage.toolHandlers,
      }),
      {},
    ),
    connectors: packages.flatMap((toolPackage) => toolPackage.connectors),
  };
}
