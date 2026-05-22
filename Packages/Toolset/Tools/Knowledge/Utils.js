import path from 'node:path';
import { readFile } from 'node:fs/promises';
import {
  listNamespacedMarkdown,
  loadNamespacedMarkdown,
} from '../../../Shared/Markdown/MarkdownLibrary.js';
import {
  getBundledResourceDirectory,
  getWritableResourceDirectory,
} from '../../../Shared/Storage/ResourcePaths.js';

const PRODUCT_KNOWLEDGE_FILENAMES = Object.freeze(['ProductKnowledge.md', 'productknowledge.md']);

function formatText(template, values = {}) {
  return String(template ?? '').replace(/\{(\w+)\}/g, (_match, key) => values[key] ?? '');
}

function normalizeLimit(value, fallback = 30) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.round(parsed), 1), 100);
}

function skillDirectories(rootDirectory) {
  const bundled = getBundledResourceDirectory(rootDirectory, 'Skills');
  const writable = getWritableResourceDirectory(rootDirectory, 'Skills');
  return [...new Set([path.resolve(bundled), path.resolve(writable)])];
}

function promptDirectory(rootDirectory) {
  return getBundledResourceDirectory(rootDirectory, 'Prompts');
}

function mapSkill({ id, namespace, filename, frontmatter }) {
  return {
    id,
    namespace,
    filename,
    name: frontmatter.name || filename.replace(/\.md$/i, ''),
    description: frontmatter.description || '',
    trigger: frontmatter.trigger || '',
  };
}

function skillMatchesQuery(skill, query) {
  const q = String(query ?? '')
    .trim()
    .toLowerCase();
  if (!q) return true;

  return [skill.id, skill.namespace, skill.filename, skill.name, skill.description, skill.trigger]
    .map((value) => String(value ?? '').toLowerCase())
    .some((value) => value.includes(q));
}

export async function readProductKnowledge(rootDirectory) {
  for (const filename of PRODUCT_KNOWLEDGE_FILENAMES) {
    try {
      const content = await readFile(path.join(promptDirectory(rootDirectory), filename), 'utf8');
      if (content.trim()) return content.trim();
    } catch {
      // Try the next supported filename.
    }
  }

  return '';
}

export async function listSkills(rootDirectory, { query = '', limit = 30 } = {}) {
  const skillsById = new Map();

  for (const directory of skillDirectories(rootDirectory)) {
    for (const skill of await listNamespacedMarkdown(directory, mapSkill)) {
      skillsById.set(skill.id, skill);
    }
  }

  return [...skillsById.values()]
    .filter((skill) => skillMatchesQuery(skill, query))
    .sort((left, right) => left.name.localeCompare(right.name))
    .slice(0, normalizeLimit(limit));
}

export async function readSkill(rootDirectory, { id = '', namespace = '', filename = '' } = {}) {
  let safeNamespace = String(namespace ?? '').trim();
  let safeFilename = String(filename ?? '').trim();
  const skillId = String(id ?? '').trim();

  if ((!safeNamespace || !safeFilename) && skillId.includes('/')) {
    const parts = skillId.split('/');
    safeNamespace = parts[0] ?? '';
    safeFilename = parts.slice(1).join('/');
  }

  if (!safeNamespace || !safeFilename) {
    throw new Error('Skill id or namespace and filename are required.');
  }

  let lastError = null;
  const directories = skillDirectories(rootDirectory).reverse();

  for (const directory of directories) {
    try {
      return await loadNamespacedMarkdown(
        directory,
        safeNamespace,
        safeFilename,
        ({
          id: loadedId,
          namespace: loadedNamespace,
          filename: loadedFilename,
          frontmatter,
          content,
        }) => ({
          id: loadedId,
          namespace: loadedNamespace,
          filename: loadedFilename,
          name: frontmatter.name || loadedFilename.replace(/\.md$/i, ''),
          description: frontmatter.description || '',
          trigger: frontmatter.trigger || '',
          content,
        }),
      );
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error('Skill not found.');
}

export function formatSkillList(skills, strings) {
  if (!skills.length) return strings.output.noSkills;

  return [
    strings.output.skillListHeader,
    '',
    ...skills.map((skill) =>
      formatText(strings.output.skillListItem, {
        id: skill.id,
        name: skill.name,
        description: skill.description || 'No description.',
        trigger: skill.trigger
          ? formatText(strings.output.triggerSuffix, { trigger: skill.trigger })
          : '',
      }),
    ),
  ].join('\n');
}

export function formatSkill(skill, strings) {
  return [
    formatText(strings.output.skillHeader, { name: skill.name }),
    formatText(strings.output.skillId, { id: skill.id }),
    skill.trigger ? formatText(strings.output.skillTrigger, { trigger: skill.trigger }) : '',
    skill.description
      ? formatText(strings.output.skillDescription, { description: skill.description })
      : '',
    '',
    skill.content,
  ]
    .filter(Boolean)
    .join('\n');
}

export function formatProductKnowledge(content, strings) {
  return [
    strings.output.productKnowledgeHeader,
    '',
    content.trim() || strings.output.noProductKnowledge,
  ].join('\n');
}
