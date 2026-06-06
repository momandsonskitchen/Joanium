import path from 'node:path';
import { unlink } from 'node:fs/promises';
import {
  createNamespacedMarkdownLibrary,
  mapNamespacedMarkdownResource,
} from '../../Shared/Markdown/NamespacedResourceLibrary.js';
import { sanitizeMarkdownFilename, sanitizePathSegment } from '../../Shared/Storage/SafePath.js';
import { readUserState, writeUserState, mergeUserStates } from '../../Shared/UserData/UserData.js';

const PROTECTED_PERSONAS = new Set(['Joanium/Joana.md']);
const DEFAULT_ACTIVE_PERSONA = { namespace: 'Joanium', filename: 'Joana.md' };

export function createPersonasStateManager({ rootDirectory }) {
  const personasLibrary = createNamespacedMarkdownLibrary({
    rootDirectory,
    resourceName: 'Personas',
  });
  const writablePersonasDir = personasLibrary.writableDirectory;

  function isProtectedPersona(entry, personasDir) {
    return PROTECTED_PERSONAS.has(entry.id) || personasLibrary.isBundledOnly(personasDir);
  }

  async function listPersonas() {
    const personas = await personasLibrary.listAll((entry, personasDir) =>
      mapNamespacedMarkdownResource(entry, {
        protectedValue: isProtectedPersona(entry, personasDir),
      }),
    );

    return personas.sort((a, b) => {
      if (a.protected && !b.protected) return -1;
      if (!a.protected && b.protected) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  async function loadPersona(namespace, filename) {
    return personasLibrary.load(
      namespace,
      filename,
      (entry) =>
        mapNamespacedMarkdownResource(entry, {
          includeContent: true,
          protectedValue: PROTECTED_PERSONAS.has(entry.id),
        }),
      'Persona not found.',
    );
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
    const ref = state.activePersona ?? DEFAULT_ACTIVE_PERSONA;
    return loadPersona(ref.namespace, ref.filename);
  }

  async function setActivePersonaRef(namespace, filename) {
    const current = await readUserState(rootDirectory);
    const next = mergeUserStates(current, { activePersona: { namespace, filename } });
    await writeUserState(rootDirectory, next);
  }

  return { listPersonas, loadPersona, deletePersona, getActivePersona, setActivePersonaRef };
}
