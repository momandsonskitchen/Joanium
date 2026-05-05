import path from 'node:path';
import { readFile, readdir } from 'node:fs/promises';
import { parseFrontmatter, stripFrontmatter } from './Frontmatter.js';
import { sanitizeMarkdownFilename, sanitizePathSegment } from '../Storage/SafePath.js';

export async function listNamespacedMarkdown(baseDirectory, mapItem) {
  let namespaces;
  try {
    namespaces = await readdir(baseDirectory, { withFileTypes: true });
  } catch {
    return [];
  }

  const items = [];

  for (const namespace of namespaces) {
    if (!namespace.isDirectory()) continue;

    const namespacePath = path.join(baseDirectory, namespace.name);
    let files;
    try {
      files = await readdir(namespacePath, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const file of files) {
      if (!file.isFile() || !file.name.endsWith('.md')) continue;

      const filePath = path.join(namespacePath, file.name);
      let content;
      try {
        content = await readFile(filePath, 'utf8');
      } catch {
        continue;
      }

      const id = `${namespace.name}/${file.name}`;
      items.push(mapItem({
        id,
        namespace: namespace.name,
        filename: file.name,
        frontmatter: parseFrontmatter(content),
        content
      }));
    }
  }

  return items;
}

export async function loadNamespacedMarkdown(baseDirectory, namespace, filename, mapItem) {
  const safeNamespace = sanitizePathSegment(namespace);
  const safeFilename = sanitizeMarkdownFilename(filename);
  const filePath = path.join(baseDirectory, safeNamespace, safeFilename);
  const content = await readFile(filePath, 'utf8');
  const id = `${safeNamespace}/${safeFilename}`;

  return mapItem({
    id,
    namespace: safeNamespace,
    filename: safeFilename,
    frontmatter: parseFrontmatter(content),
    content: stripFrontmatter(content)
  });
}
