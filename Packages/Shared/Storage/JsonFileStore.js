import path from 'node:path';
import { mkdir, readFile, writeFile, readdir, unlink } from 'node:fs/promises';
import { sanitizeFileStem } from './SafePath.js';

/**
 * Serializes data to JSON with consistent formatting (2-space indent + trailing newline).
 */
export function serializeJson(data) {
  return `${JSON.stringify(data, null, 2)}\n`;
}

/**
 * Writes JSON data atomically to a file. Creates parent directories if needed.
 * Uses a temp file + rename for crash safety.
 */
export async function writeJsonFile(filePath, data) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp`;
  await writeFile(tempPath, serializeJson(data), 'utf8');
  const { rename } = await import('node:fs/promises');
  await rename(tempPath, filePath);
}

/**
 * Reads and parses a JSON file. Returns defaultValue if file doesn't exist or is invalid.
 */
export async function readJsonFile(filePath, { defaultValue = null } = {}) {
  try {
    const raw = await readFile(filePath, 'utf8');
    if (!raw.trim()) return defaultValue;
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

/**
 * Lists all JSON files in a directory, parses each, and maps them through an optional transform.
 * Skips corrupt/unreadable files silently.
 */
export async function listJsonDirectory(directory, mapRecord = (record) => record) {
  let files;
  try {
    files = await readdir(directory);
  } catch {
    return [];
  }

  const records = [];
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    try {
      const raw = await readFile(path.join(directory, file), 'utf8');
      records.push(mapRecord(JSON.parse(raw), file));
    } catch {
      // Skip corrupt or unreadable files.
    }
  }

  return records;
}

/**
 * Deletes a JSON file by id from a directory. The id is sanitized before use.
 */
export async function deleteJsonFile(directory, id) {
  const safeId = sanitizeFileStem(id);
  if (!safeId) throw new Error('A valid id is required.');
  await unlink(path.join(directory, `${safeId}.json`));
}

/**
 * Builds a safe file path for a JSON record inside a directory.
 * Returns null if the id is invalid after sanitization.
 */
export function jsonFilePath(directory, id) {
  const safeId = sanitizeFileStem(id);
  if (!safeId) return null;
  return path.join(directory, `${safeId}.json`);
}
