import path from 'node:path';
import { readFile } from 'node:fs/promises';

export async function readBundledPromptFile(rootDirectory, filename) {
  return (await readFile(path.join(rootDirectory, 'Prompts', filename), 'utf8')).trim();
}

export function formatPromptTemplate(template, values = {}) {
  return String(template ?? '').replace(/\{\{(\w+)\}\}/g, (_match, key) => values[key] ?? '');
}
