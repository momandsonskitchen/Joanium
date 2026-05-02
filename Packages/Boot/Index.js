import path from 'node:path';
import { access, readdir } from 'node:fs/promises';
import { appendFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

async function hasEntryFile(entryPath) {
  try {
    await access(entryPath);
    return true;
  } catch {
    return false;
  }
}

export async function discoverPackages(packagesDirectory) {
  const directoryEntries = await readdir(packagesDirectory, { withFileTypes: true });
  const registry = new Map();

  for (const entry of directoryEntries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const entryPath = path.join(packagesDirectory, entry.name, 'Index.js');

    if (!(await hasEntryFile(entryPath))) {
      continue;
    }

    registry.set(entry.name, {
      id: entry.name,
      entryPath
    });
  }

  return registry;
}

export async function loadPackageModule(registry, packageName) {
  const packageRecord = registry.get(packageName);

  if (!packageRecord) {
    throw new Error(`Package "${packageName}" was not discovered.`);
  }

  return import(pathToFileURL(packageRecord.entryPath).href);
}

export function createBootLogger(logFilePath) {
  return function writeBootLog(message, details = '') {
    try {
      mkdirSync(path.dirname(logFilePath), { recursive: true });
      const suffix = details ? ` ${details}` : '';
      appendFileSync(
        logFilePath,
        `[${new Date().toISOString()}] ${message}${suffix}\n`,
        'utf8'
      );
    } catch {
      // Ignore logging failures during boot diagnostics.
    }
  };
}
