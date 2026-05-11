import path from 'node:path';
import { unlink } from 'node:fs/promises';
import {
  listNamespacedMarkdown,
  loadNamespacedMarkdown
} from '../../Shared/Markdown/MarkdownLibrary.js';
import { sanitizeMarkdownFilename, sanitizePathSegment } from '../../Shared/Storage/SafePath.js';
import {
  getBundledResourceDirectory,
  getWritableResourceDirectory
} from '../../Shared/Storage/ResourcePaths.js';
import { readUserState, writeUserState, mergeUserStates } from '../../Shared/UserData/UserData.js';

const PROTECTED_PERSONAS = new Set(['Joanium/Joana.md']);
const DEFAULT_ACTIVE_PERSONA = { namespace: 'Joanium', filename: 'Joana.md' };

export function createPersonasStateManager({ rootDirectory }) {
  const bundledPersonasDir = getBundledResourceDirectory(rootDirectory, 'Personas');
  const writablePersonasDir = getWritableResourceDirectory(rootDirectory, 'Personas');
  const personaDirs = [...new Set([
    path.resolve(bundledPersonasDir),
    path.resolve(writablePersonasDir)
  ])];

  async function listPersonasFrom(personasDir) {
    const bundledOnly = path.resolve(personasDir) === path.resolve(bundledPersonasDir)
      && path.resolve(bundledPersonasDir) !== path.resolve(writablePersonasDir);

    return listNamespacedMarkdown(personasDir, ({
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
      protected: PROTECTED_PERSONAS.has(id) || bundledOnly
    }));
  }

  async function listPersonas() {
    const personasById = new Map();
    for (const personasDir of personaDirs) {
      for (const persona of await listPersonasFrom(personasDir)) {
        personasById.set(persona.id, persona);
      }
    }

    const personas = [...personasById.values()];

    return personas.sort((a, b) => {
      if (a.protected && !b.protected) return -1;
      if (!a.protected && b.protected) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  async function loadPersona(namespace, filename) {
    let lastError;
    for (const personasDir of [...new Set([path.resolve(writablePersonasDir), path.resolve(bundledPersonasDir)])]) {
      try {
        return await loadNamespacedMarkdown(personasDir, namespace, filename, ({
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
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError ?? new Error('Persona not found.');
  }

  async function deletePersona(namespace, filename) {
    const safeNs = sanitizePathSegment(namespace);
    const safeFile = sanitizeMarkdownFilename(filename);
    const id = `${safeNs}/${safeFile}`;
    if (PROTECTED_PERSONAS.has(id)) {
      throw new Error('This persona is protected and cannot be deleted.');
    }

    await unlink(path.join(writablePersonasDir, safeNs, safeFile));
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
