import path from 'node:path';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { app } from 'electron';

const EXTRA_RESOURCE_ROOTS = new Set(['Data', 'Personas', 'Skills']);

const RESOURCE_ALIASES = new Map([
  ['asset', 'Assets'],
  ['assets', 'Assets'],
  ['config', 'Config'],
  ['configs', 'Config'],
  ['data', 'Data'],
  ['datasets', 'Datasets'],
  ['dataset', 'Datasets'],
  ['persona', 'Personas'],
  ['personas', 'Personas'],
  ['prompt', 'Prompts'],
  ['prompts', 'Prompts'],
  ['skill', 'Skills'],
  ['skills', 'Skills'],
]);

function normalizeResourceName(resourceName) {
  const rawName = String(resourceName ?? '').trim();
  if (!rawName) {
    throw new Error('A resource root is required.');
  }

  const normalized = RESOURCE_ALIASES.get(rawName.toLowerCase()) ?? rawName;
  if (normalized.includes('/') || normalized.includes('\\') || normalized === '..') {
    throw new Error(`Invalid resource root: ${rawName}`);
  }

  return normalized;
}

function splitOptions(values) {
  const parts = [...values];
  const last = parts[parts.length - 1];

  if (
    last &&
    typeof last === 'object' &&
    !Array.isArray(last) &&
    !(last instanceof String) &&
    !(last instanceof Date)
  ) {
    return { segments: parts.slice(0, -1), options: last };
  }

  return { segments: parts, options: {} };
}

function normalizeSegments(segments) {
  return segments
    .flatMap((segment) => (Array.isArray(segment) ? segment : [segment]))
    .map((segment) => String(segment ?? '').trim())
    .filter(Boolean);
}

function assertInsideDirectory(directory, filePath) {
  const root = path.resolve(directory);
  const target = path.resolve(filePath);

  if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Resolved resource path escapes ${root}.`);
  }
}

function getUserResourceDirectory(rootDirectory) {
  return app.isPackaged ? app.getPath('userData') : rootDirectory;
}

export function getWritableDataDirectory(rootDirectory) {
  return app.isPackaged ? app.getPath('userData') : path.join(rootDirectory, 'Data');
}

export function getWritableResourceDirectory(rootDirectory, resourceName) {
  const name = normalizeResourceName(resourceName);
  if (name === 'Data') return getWritableDataDirectory(rootDirectory);
  return path.join(getUserResourceDirectory(rootDirectory), name);
}

export function getBundledResourceDirectory(rootDirectory, resourceName) {
  const name = normalizeResourceName(resourceName);

  if (app.isPackaged && EXTRA_RESOURCE_ROOTS.has(name)) {
    return path.join(process.resourcesPath, name);
  }

  return path.join(rootDirectory, name);
}

export function getResourceDirectory(rootDirectory, resourceName, { writable = false } = {}) {
  return writable
    ? getWritableResourceDirectory(rootDirectory, resourceName)
    : getBundledResourceDirectory(rootDirectory, resourceName);
}

export function getReadableResourceDirectories(rootDirectory, resourceName) {
  return [
    ...new Set([
      path.resolve(getWritableResourceDirectory(rootDirectory, resourceName)),
      path.resolve(getBundledResourceDirectory(rootDirectory, resourceName)),
    ]),
  ];
}

export function getResourcePath(rootDirectory, resourceName, ...segmentsAndOptions) {
  const { segments, options } = splitOptions(segmentsAndOptions);
  const directory = getResourceDirectory(rootDirectory, resourceName, options);
  const filePath = path.join(directory, ...normalizeSegments(segments));
  assertInsideDirectory(directory, filePath);
  return filePath;
}

export function resolveResourcePath(rootDirectory, fileName, resourceName, options = {}) {
  return getResourcePath(rootDirectory, resourceName, fileName, options);
}

export function getResourceFileUrl(rootDirectory, resourceName, ...segmentsAndOptions) {
  return pathToFileURL(getResourcePath(rootDirectory, resourceName, ...segmentsAndOptions)).href;
}

export function resolveResourceFileUrl(rootDirectory, fileName, resourceName, options = {}) {
  return pathToFileURL(resolveResourcePath(rootDirectory, fileName, resourceName, options)).href;
}

export async function readTextResource(rootDirectory, resourceName, ...segmentsAndOptions) {
  const { segments, options } = splitOptions(segmentsAndOptions);
  const filePath = getResourcePath(rootDirectory, resourceName, ...segments, options);
  const contents = await readFile(filePath, options.encoding ?? 'utf8');
  return options.trim === false ? contents : contents.trim();
}

export async function readJsonResource(rootDirectory, resourceName, ...segmentsAndOptions) {
  const { segments, options } = splitOptions(segmentsAndOptions);

  try {
    const contents = await readTextResource(rootDirectory, resourceName, ...segments, {
      ...options,
      trim: false,
    });

    if (!String(contents).trim()) {
      return options.defaultValue ?? null;
    }

    return JSON.parse(contents);
  } catch (error) {
    if (options.optional) {
      return options.defaultValue ?? null;
    }

    throw error;
  }
}

export async function readJsonFile(rootDirectory, fileName, resourceName, options = {}) {
  return readJsonResource(rootDirectory, resourceName, fileName, options);
}

export async function writeJsonResource(rootDirectory, resourceName, fileName, data, options = {}) {
  const filePath = getResourcePath(rootDirectory, resourceName, fileName, {
    ...options,
    writable: options.writable ?? true,
  });
  const tempFilePath = `${filePath}.tmp`;

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(tempFilePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  await rename(tempFilePath, filePath);

  return filePath;
}

export async function writeJsonFile(rootDirectory, fileName, resourceName, data, options = {}) {
  return writeJsonResource(rootDirectory, resourceName, fileName, data, options);
}

export function getTrayIconPath(rootDirectory) {
  if (process.platform === 'win32') {
    return getResourcePath(rootDirectory, 'Assets', 'Logo', 'Logo.ico');
  }
  return getResourcePath(rootDirectory, 'Assets', 'Logo', 'Logo.png');
}
