import path from 'node:path';
import {
  deleteJsonFile,
  jsonFilePath,
  listJsonDirectory,
  readJsonFile,
  writeJsonFile,
} from '../../Shared/Storage/JsonFileStore.js';
import { sortByDate } from '../../Shared/Utils/DateUtils.js';
import { getWritableDataDirectory } from '../../Shared/Storage/ResourcePaths.js';
import { sanitizeFileStem } from '../../Shared/Storage/SafePath.js';

// ---------------------------------------------------------------------------
// TemplateState — CRUD for user-defined prompt templates.
// Templates are stored as individual JSON files under Data/Templates/.
// Each template has: id, name, command, prompt, createdAt, updatedAt.
// ---------------------------------------------------------------------------

export function createTemplateStateManager({ rootDirectory }) {
  const templatesDirectory = path.join(getWritableDataDirectory(rootDirectory), 'Templates');

  return {
    async saveTemplate(template) {
      if (!template?.id) return null;
      const safeId = sanitizeFileStem(template.id);
      if (!safeId) return null;

      const now = new Date().toISOString();
      const record = {
        id: safeId,
        name: String(template.name ?? '').trim(),
        command: normalizeCommand(template.command),
        prompt: String(template.prompt ?? '').trim(),
        createdAt: template.createdAt ?? now,
        updatedAt: now,
      };

      const filePath = jsonFilePath(templatesDirectory, safeId);
      await writeJsonFile(filePath, record);
      return record;
    },

    async listTemplates() {
      const templates = await listJsonDirectory(templatesDirectory, (data) => ({
        id: data.id,
        name: data.name,
        command: data.command,
        prompt: data.prompt,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      }));

      return sortByDate(templates, 'updatedAt', 'createdAt');
    },

    async loadTemplate(id) {
      const safeId = sanitizeFileStem(id);
      if (!safeId) throw new Error('A valid template id is required.');
      const filePath = jsonFilePath(templatesDirectory, safeId);
      const template = await readJsonFile(filePath);
      if (!template) throw new Error('Template not found.');
      return template;
    },

    async deleteTemplate(id) {
      await deleteJsonFile(templatesDirectory, id);
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Ensures commands always start with a single "/" and contain no whitespace.
function normalizeCommand(raw) {
  const cleaned = String(raw ?? '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/^\/+/, '');
  return cleaned ? `/${cleaned}` : '';
}
