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
  const packages = [];

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (!entry.isDirectory() || NON_PACKAGE_DIRECTORIES.has(entry.name)) {
      continue;
    }

    const packageIndex = path.join(toolsDirectory, entry.name, 'Index.js');
    const hasIndex = await access(packageIndex)
      .then(() => true)
      .catch(() => false);
    if (!hasIndex) {
      continue;
    }

    const toolPackage = await loadToolPackage(packageIndex, { rootDirectory });
    if (toolPackage) {
      packages.push(toolPackage);
    }
  }

  return packages;
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
  const packages = [];

  for (const packageId of packageIds) {
    const packageRecord = registry.get(packageId);
    if (!packageRecord?.entryPath) {
      continue;
    }

    const toolPackage = await loadToolPackage(packageRecord.entryPath, { rootDirectory });
    if (toolPackage) {
      packages.push(toolPackage);
    }
  }

  return packages;
}

export async function discoverToolPackages({
  rootDirectory,
  registry,
  externalPackageIds = [],
} = {}) {
  const packages = [
    ...(await discoverLocalToolPackages({ rootDirectory })),
    ...(await discoverExternalToolPackages({ rootDirectory, registry, externalPackageIds })),
  ];

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
