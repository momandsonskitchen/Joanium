import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { serializeJson } from './JsonFileStore.js';

/**
 * Creates a read/write helper for a single JSON state file.
 *
 * Handles the common pattern of:
 *   1. Reading a JSON file, parsing it, merging with defaults
 *   2. Writing normalized data back atomically
 *
 * @param {string} filePath - Absolute path to the JSON file
 * @param {object} defaults - Default state to merge with
 * @returns {{ read: () => Promise<object>, write: (data: object) => Promise<object> }}
 */
export function createSingleFileState(filePath, defaults = {}) {
  async function read() {
    try {
      const raw = await readFile(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      return { ...defaults, ...parsed };
    } catch {
      return { ...defaults };
    }
  }

  async function write(data) {
    const normalized = { ...defaults, ...data };
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, serializeJson(normalized), 'utf8');
    return normalized;
  }

  return { read, write };
}
