import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

export async function readJsonDirectory(directory, mapRecord = (record) => record) {
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
      records.push(mapRecord(JSON.parse(raw)));
    } catch {
      // Skip corrupt or unreadable files.
    }
  }

  return records;
}
