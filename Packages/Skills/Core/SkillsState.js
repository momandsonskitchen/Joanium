import path from 'node:path';
import { readFile, readdir, unlink } from 'node:fs/promises';

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

export function createSkillsStateManager({ rootDirectory }) {
  const skillsDir = path.join(rootDirectory, 'Skills');

  async function listSkills() {
    let namespaces;
    try {
      namespaces = await readdir(skillsDir, { withFileTypes: true });
    } catch {
      return [];
    }

    const skills = [];

    for (const ns of namespaces) {
      if (!ns.isDirectory()) continue;
      const nsPath = path.join(skillsDir, ns.name);
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

        const fm = parseFrontmatter(content);
        skills.push({
          id:        `${ns.name}/${file.name}`,
          namespace: ns.name,
          filename:  file.name,
          name:        fm.name        || file.name.replace(/\.md$/, ''),
          description: fm.description || '',
          trigger:     fm.trigger     || ''
        });
      }
    }

    return skills.sort((a, b) => a.name.localeCompare(b.name));
  }

  async function loadSkill(namespace, filename) {
    const filePath = path.join(skillsDir, namespace, filename);
    const content  = await readFile(filePath, 'utf8');
    const fm       = parseFrontmatter(content);
    return {
      id:          `${namespace}/${filename}`,
      namespace,
      filename,
      name:        fm.name        || filename.replace(/\.md$/, ''),
      description: fm.description || '',
      trigger:     fm.trigger     || '',
      content:     stripFrontmatter(content)
    };
  }

  async function deleteSkill(namespace, filename) {
    const safeNs   = String(namespace).replace(/[^a-zA-Z0-9_\- ]/g, '');
    const safeFile = String(filename).replace(/[^a-zA-Z0-9_\-. ]/g, '');
    const filePath = path.join(skillsDir, safeNs, safeFile);
    await unlink(filePath);
  }

  return { listSkills, loadSkill, deleteSkill };
}
