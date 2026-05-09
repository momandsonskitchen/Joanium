import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const toolsDirectory = path.dirname(fileURLToPath(import.meta.url));

function normalizeConnector(connector = {}) {
  if (!connector.id) return null;
  return {
    optional: false,
    credentialKey: 'token',
    ...connector
  };
}

function normalizeToolPackage(toolPackage = {}) {
  return {
    id: toolPackage.id ?? '',
    toolDefinitions: Array.isArray(toolPackage.toolDefinitions) ? toolPackage.toolDefinitions : [],
    toolHandlers: toolPackage.toolHandlers && typeof toolPackage.toolHandlers === 'object'
      ? toolPackage.toolHandlers
      : {},
    connectors: Array.isArray(toolPackage.connectors)
      ? toolPackage.connectors.map(normalizeConnector).filter(Boolean)
      : []
  };
}

export async function discoverToolPackages({ rootDirectory } = {}) {
  const entries = await readdir(toolsDirectory, { withFileTypes: true }).catch(() => []);
  const packages = [];

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (!entry.isDirectory()) continue;

    const packageIndex = path.join(toolsDirectory, entry.name, 'Index.js');
    const imported = await import(pathToFileURL(packageIndex).href).catch(() => null);
    const createToolPackage = imported?.createToolPackage ?? imported?.default;
    if (typeof createToolPackage !== 'function') continue;

    packages.push(normalizeToolPackage(await createToolPackage({ rootDirectory })));
  }

  return {
    packages,
    toolDefinitions: packages.flatMap((toolPackage) => toolPackage.toolDefinitions),
    toolHandlers: packages.reduce((handlers, toolPackage) => ({
      ...handlers,
      ...toolPackage.toolHandlers
    }), {}),
    connectors: packages.flatMap((toolPackage) => toolPackage.connectors)
  };
}
