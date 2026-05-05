import path from 'node:path';
import { unlink } from 'node:fs/promises';
import {
  listNamespacedMarkdown,
  loadNamespacedMarkdown
} from '../../Shared/Markdown/MarkdownLibrary.js';
import { sanitizeMarkdownFilename, sanitizePathSegment } from '../../Shared/Storage/SafePath.js';
import { readUserState, writeUserState, mergeUserStates } from '../../Shared/UserData/UserData.js';

const PROTECTED_PERSONAS = new Set(['Joanium/Joana.md']);
const DEFAULT_ACTIVE_PERSONA = { namespace: 'Joanium', filename: 'Joana.md' };

export function createPersonasStateManager({ rootDirectory }) {
  const personasDir = path.join(rootDirectory, 'Personas');

  async function listPersonas() {
    const personas = await listNamespacedMarkdown(personasDir, ({
      id,
      namespace,
      filename,
      frontmatter
    }) => ({
      id,
      namespace,
      filename,
      name: frontmatter.name || filename.replace(/\.md$/, ''),
      description: frontmatter.description || '',
      protected: PROTECTED_PERSONAS.has(id)
    }));

    return personas.sort((a, b) => {
      if (a.protected && !b.protected) return -1;
      if (!a.protected && b.protected) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  async function loadPersona(namespace, filename) {
    return loadNamespacedMarkdown(personasDir, namespace, filename, ({
      id,
      namespace: safeNamespace,
      filename: safeFilename,
      frontmatter,
      content
    }) => ({
      id,
      namespace: safeNamespace,
      filename: safeFilename,
      name: frontmatter.name || safeFilename.replace(/\.md$/, ''),
      description: frontmatter.description || '',
      protected: PROTECTED_PERSONAS.has(id),
      content
    }));
  }

  async function deletePersona(namespace, filename) {
    const safeNs = sanitizePathSegment(namespace);
    const safeFile = sanitizeMarkdownFilename(filename);
    const id = `${safeNs}/${safeFile}`;
    if (PROTECTED_PERSONAS.has(id)) {
      throw new Error('This persona is protected and cannot be deleted.');
    }

    await unlink(path.join(personasDir, safeNs, safeFile));
  }

  async function getActivePersona() {
    const state = await readUserState(rootDirectory);
    const ref   = state.activePersona ?? DEFAULT_ACTIVE_PERSONA;
    return loadPersona(ref.namespace, ref.filename);
  }

  async function setActivePersonaRef(namespace, filename) {
    const current = await readUserState(rootDirectory);
    const next    = mergeUserStates(current, { activePersona: { namespace, filename } });
    await writeUserState(rootDirectory, next);
  }

  return { listPersonas, loadPersona, deletePersona, getActivePersona, setActivePersonaRef };
}
