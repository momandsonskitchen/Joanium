import path from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';
import { sanitizeMarkdownFilename, sanitizePathSegment } from '../../Shared/Storage/SafePath.js';
import { getWritableResourceDirectory } from '../../Shared/Storage/ResourcePaths.js';

// ---------------------------------------------------------------------------
// MarketplaceState — handles persisting installed items to disk.
// The renderer is responsible for fetching from the remote API;
// this module only handles writing files to the local Skills / Personas trees.
// ---------------------------------------------------------------------------

export function createMarketplaceStateManager({ rootDirectory }) {
  /**
   * Writes a downloaded marketplace item to the appropriate local directory.
   *
   * @param {object} params
   * @param {'skills'|'personas'} params.type
   * @param {string} params.publisher   Namespace / publisher name.
   * @param {string} params.filename    Markdown filename (e.g. "Translate.md").
   * @param {string} params.markdown    Full markdown content to write.
   * @returns {Promise<{ filePath: string }>}
   */
  async function installItem({ type, publisher, filename, markdown }) {
    const safePublisher = sanitizePathSegment(publisher);
    const safeFilename  = sanitizeMarkdownFilename(filename);

    if (!safePublisher) throw new Error('Invalid publisher name.');
    if (!safeFilename)  throw new Error('Invalid filename.');

    const root   = type === 'personas' ? 'Personas' : 'Skills';
    const dir    = path.join(getWritableResourceDirectory(rootDirectory, root), safePublisher);
    const filePath = path.join(dir, safeFilename);

    await mkdir(dir, { recursive: true });
    await writeFile(filePath, typeof markdown === 'string' ? markdown : '', 'utf8');

    return { filePath };
  }

  return { installItem };
}
