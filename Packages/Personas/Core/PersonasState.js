import path from 'node:path';
import { readFile, readdir, unlink } from 'node:fs/promises';

const PROTECTED_PERSONAS = new Set(['Joanium/Joana.md']);

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const result = {};
  for (const line of match[1].split(/\r?\n/)) {
    const colon = line.indexOf(':');
    if (colon < 1) continue;
    result[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
  }
  return result;
}

function stripFrontmatter(content) {
  return content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').trim();
}

export function createPersonasStateManager({ rootDirectory }) {
  const personasDir = path.join(rootDirectory, 'Personas');

  async function listPersonas() {
    let namespaces;
    try {
      namespaces = await readdir(personasDir, { withFileTypes: true });
    } catch {
      return [];
    }

    const personas = [];

    for (const ns of namespaces) {
      if (!ns.isDirectory()) continue;
      const nsPath = path.join(personasDir, ns.name);
      let files;
      try {
        files = await readdir(nsPath, { withFileTypes: true });
      } catch {
        continue;
      }

      for (const file of files) {
        if (!file.isFile() || !file.name.endsWith('.md')) continue;
        const filePath = path.join(nsPath, file.name);
        let content;
        try {
          content = await readFile(filePath, 'utf8');
        } catch {
          continue;
        }

        const fm      = parseFrontmatter(content);
        const id      = `${ns.name}/${file.name}`;
        personas.push({
          id,
          namespace:   ns.name,
          filename:    file.name,
          name:        fm.name        || file.name.replace(/\.md$/, ''),
          description: fm.description || '',
          protected:   PROTECTED_PERSONAS.has(id)
        });
      }
    }

    return personas.sort((a, b) => {
      if (a.protected && !b.protected) return -1;
      if (!a.protected && b.protected) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  async function loadPersona(namespace, filename) {
    const filePath = path.join(personasDir, namespace, filename);
    const content  = await readFile(filePath, 'utf8');
    const fm       = parseFrontmatter(content);
    const id       = `${namespace}/${filename}`;
    return {
      id,
      namespace,
      filename,
      name:        fm.name        || filename.replace(/\.md$/, ''),
      description: fm.description || '',
      protected:   PROTECTED_PERSONAS.has(id),
      content:     stripFrontmatter(content)
    };
  }

  async function deletePersona(namespace, filename) {
    const id = `${namespace}/${filename}`;
    if (PROTECTED_PERSONAS.has(id)) throw new Error('This persona is protected and cannot be deleted.');
    const safeNs   = String(namespace).replace(/[^a-zA-Z0-9_\- ]/g, '');
    const safeFile = String(filename).replace(/[^a-zA-Z0-9_\-. ]/g, '');
    const filePath = path.join(personasDir, safeNs, safeFile);
    await unlink(filePath);
  }

  return { listPersonas, loadPersona, deletePersona };
}
