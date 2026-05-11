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

export function createSkillsStateManager({ rootDirectory }) {
  const bundledSkillsDir = getBundledResourceDirectory(rootDirectory, 'Skills');
  const writableSkillsDir = getWritableResourceDirectory(rootDirectory, 'Skills');
  const skillsDirs = [...new Set([
    path.resolve(bundledSkillsDir),
    path.resolve(writableSkillsDir)
  ])];

  async function listSkillsFrom(skillsDir) {
    const bundledOnly = path.resolve(skillsDir) === path.resolve(bundledSkillsDir)
      && path.resolve(bundledSkillsDir) !== path.resolve(writableSkillsDir);

    return listNamespacedMarkdown(skillsDir, ({
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
      trigger: frontmatter.trigger || '',
      protected: bundledOnly
    }));
  }

  async function listSkills() {
    const skillsById = new Map();
    for (const skillsDir of skillsDirs) {
      for (const skill of await listSkillsFrom(skillsDir)) {
        skillsById.set(skill.id, skill);
      }
    }

    const skills = [...skillsById.values()];

    return skills.sort((a, b) => a.name.localeCompare(b.name));
  }

  async function loadSkill(namespace, filename) {
    let lastError;
    for (const skillsDir of [...new Set([path.resolve(writableSkillsDir), path.resolve(bundledSkillsDir)])]) {
      try {
        return await loadNamespacedMarkdown(skillsDir, namespace, filename, ({
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
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError ?? new Error('Skill not found.');
  }

  async function deleteSkill(namespace, filename) {
    const safeNs = sanitizePathSegment(namespace);
    const safeFile = sanitizeMarkdownFilename(filename);
    await unlink(path.join(writableSkillsDir, safeNs, safeFile));
  }

  return { listSkills, loadSkill, deleteSkill };
}
