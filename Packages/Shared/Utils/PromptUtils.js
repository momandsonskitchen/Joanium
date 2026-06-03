import { readTextResource } from '../Storage/ResourcePaths.js';

export async function readBundledPromptFile(rootDirectory, filename) {
  return readTextResource(rootDirectory, 'Prompts', filename);
}

export function formatPromptTemplate(template, values = {}) {
  return String(template ?? '').replace(/\{\{(\w+)\}\}/g, (_match, key) => values[key] ?? '');
}
