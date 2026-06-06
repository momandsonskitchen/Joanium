import path from 'node:path';
import { listNamespacedMarkdown, loadNamespacedMarkdown } from './MarkdownLibrary.js';
import {
  getBundledResourceDirectory,
  getWritableResourceDirectory,
} from '../Storage/ResourcePaths.js';

function uniqueResolved(paths) {
  return [...new Set(paths.map((entry) => path.resolve(entry)))];
}

export function mapNamespacedMarkdownResource(
  { id, namespace, filename, frontmatter, content },
  { includeContent = false, includeTrigger = false, protectedValue } = {},
) {
  return {
    id,
    namespace,
    filename,
    name: frontmatter.name || filename.replace(/\.md$/i, ''),
    description: frontmatter.description || '',
    ...(includeTrigger ? { trigger: frontmatter.trigger || '' } : {}),
    ...(protectedValue === undefined ? {} : { protected: protectedValue }),
    ...(includeContent ? { content } : {}),
  };
}

export function createNamespacedMarkdownLibrary({ rootDirectory, resourceName }) {
  const bundledDirectory = getBundledResourceDirectory(rootDirectory, resourceName);
  const writableDirectory = getWritableResourceDirectory(rootDirectory, resourceName);
  const directories = uniqueResolved([bundledDirectory, writableDirectory]);
  const loadDirectories = uniqueResolved([writableDirectory, bundledDirectory]);

  function isBundledOnly(directory) {
    return (
      path.resolve(directory) === path.resolve(bundledDirectory) &&
      path.resolve(bundledDirectory) !== path.resolve(writableDirectory)
    );
  }

  async function listFrom(directory, mapItem) {
    return listNamespacedMarkdown(directory, (entry) => mapItem(entry, directory));
  }

  async function listAll(mapItem) {
    const itemsById = new Map();
    for (const directory of directories) {
      for (const item of await listFrom(directory, mapItem)) {
        itemsById.set(item.id, item);
      }
    }
    return [...itemsById.values()];
  }

  async function load(namespace, filename, mapItem, notFoundMessage = 'Resource not found.') {
    let lastError;
    for (const directory of loadDirectories) {
      try {
        return await loadNamespacedMarkdown(directory, namespace, filename, mapItem);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError ?? new Error(notFoundMessage);
  }

  return Object.freeze({
    bundledDirectory,
    writableDirectory,
    directories,
    loadDirectories,
    isBundledOnly,
    listFrom,
    listAll,
    load,
  });
}
