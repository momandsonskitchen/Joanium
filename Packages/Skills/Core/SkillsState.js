import path from 'node:path';
import { unlink } from 'node:fs/promises';
import {
  createNamespacedMarkdownLibrary,
  mapNamespacedMarkdownResource,
} from '../../Shared/Markdown/NamespacedResourceLibrary.js';
import { sanitizeMarkdownFilename, sanitizePathSegment } from '../../Shared/Storage/SafePath.js';

export function createSkillsStateManager({ rootDirectory }) {
  const skillsLibrary = createNamespacedMarkdownLibrary({
    rootDirectory,
    resourceName: 'Skills',
  });
  const writableSkillsDir = skillsLibrary.writableDirectory;

  async function listSkills() {
    const skills = await skillsLibrary.listAll((entry, skillsDir) =>
      mapNamespacedMarkdownResource(entry, {
        includeTrigger: true,
        protectedValue: skillsLibrary.isBundledOnly(skillsDir),
      }),
    );
    return skills.sort((a, b) => a.name.localeCompare(b.name));
  }

  async function loadSkill(namespace, filename) {
    return skillsLibrary.load(
      namespace,
      filename,
      (entry) =>
        mapNamespacedMarkdownResource(entry, {
          includeContent: true,
          includeTrigger: true,
        }),
      'Skill not found.',
    );
  }

  async function deleteSkill(namespace, filename) {
    const safeNs = sanitizePathSegment(namespace);
    const safeFile = sanitizeMarkdownFilename(filename);
    await unlink(path.join(writableSkillsDir, safeNs, safeFile));
  }

  return { listSkills, loadSkill, deleteSkill };
}
