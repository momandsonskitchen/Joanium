import path from 'node:path';
import { unlink } from 'node:fs/promises';
import {
  listNamespacedMarkdown,
  loadNamespacedMarkdown
} from '../../Shared/Markdown/MarkdownLibrary.js';
import { sanitizeMarkdownFilename, sanitizePathSegment } from '../../Shared/Storage/SafePath.js';

export function createSkillsStateManager({ rootDirectory }) {
  const skillsDir = path.join(rootDirectory, 'Skills');

  async function listSkills() {
    const skills = await listNamespacedMarkdown(skillsDir, ({
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
      trigger: frontmatter.trigger || ''
    }));

    return skills.sort((a, b) => a.name.localeCompare(b.name));
  }

  async function loadSkill(namespace, filename) {
    return loadNamespacedMarkdown(skillsDir, namespace, filename, ({
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
      trigger: frontmatter.trigger || '',
      content
    }));
  }

  async function deleteSkill(namespace, filename) {
    const safeNs = sanitizePathSegment(namespace);
    const safeFile = sanitizeMarkdownFilename(filename);
    await unlink(path.join(skillsDir, safeNs, safeFile));
  }

  return { listSkills, loadSkill, deleteSkill };
}
