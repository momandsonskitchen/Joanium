import path from 'node:path';
import { mkdir, readFile, writeFile, readdir, unlink } from 'node:fs/promises';

// ---------------------------------------------------------------------------
// TemplateState — CRUD for user-defined prompt templates.
// Templates are stored as individual JSON files under Data/Templates/.
// Each template has: id, name, command, prompt, createdAt, updatedAt.
// ---------------------------------------------------------------------------

export function createTemplateStateManager({ rootDirectory }) {
  const templatesDirectory = path.join(rootDirectory, 'Data', 'Templates');

  return {
    async saveTemplate(template) {
      if (!template?.id) return null;
      await mkdir(templatesDirectory, { recursive: true });
      const filePath = path.join(templatesDirectory, `${sanitizeId(template.id)}.json`);
      const now = new Date().toISOString();
      const record = {
        id:        template.id,
        name:      String(template.name ?? '').trim(),
        command:   normalizeCommand(template.command),
        prompt:    String(template.prompt ?? '').trim(),
        createdAt: template.createdAt ?? now,
        updatedAt: now
      };
      await writeFile(filePath, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
      return record;
    },

    async listTemplates() {
      let files;
      try {
        files = await readdir(templatesDirectory);
      } catch {
        return [];
      }

      const templates = [];

      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        try {
          const raw = await readFile(path.join(templatesDirectory, file), 'utf8');
          const template = JSON.parse(raw);
          templates.push({
            id:        template.id,
            name:      template.name,
            command:   template.command,
            prompt:    template.prompt,
            createdAt: template.createdAt,
            updatedAt: template.updatedAt
          });
        } catch {
          // Skip corrupt or unreadable files silently.
        }
      }

      return templates.sort(
        (a, b) => new Date(b.updatedAt ?? b.createdAt ?? 0) - new Date(a.updatedAt ?? a.createdAt ?? 0)
      );
    },

    async loadTemplate(id) {
      const filePath = path.join(templatesDirectory, `${sanitizeId(id)}.json`);
      const raw = await readFile(filePath, 'utf8');
      return JSON.parse(raw);
    },

    async deleteTemplate(id) {
      const filePath = path.join(templatesDirectory, `${sanitizeId(id)}.json`);
      await unlink(filePath);
    }
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sanitizeId(id) {
  return String(id).replace(/[^a-zA-Z0-9_\-]/g, '');
}

// Ensures commands always start with a single "/" and contain no whitespace.
function normalizeCommand(raw) {
  const cleaned = String(raw ?? '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/^\/+/, '');
  return cleaned ? `/${cleaned}` : '';
}
