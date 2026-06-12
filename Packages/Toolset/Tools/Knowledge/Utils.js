import path from 'node:path';
import { readFile } from 'node:fs/promises';
import {
  createNamespacedMarkdownLibrary,
  mapNamespacedMarkdownResource,
} from '../../../Shared/Markdown/NamespacedResourceLibrary.js';
import { getBundledResourceDirectory } from '../../../Shared/Storage/ResourcePaths.js';
import { clampInteger } from '../../../Shared/Utils/ValueUtils.js';
import { formatText } from '../../../Shared/Utils/DomUtils.js';

const PRODUCT_KNOWLEDGE_FILENAMES = Object.freeze(['ProductKnowledge.md', 'productknowledge.md']);

function normalizeLimit(value, fallback = 30) {
  return clampInteger(value, fallback, 1, 100);
}

function skillLibrary(rootDirectory) {
  return createNamespacedMarkdownLibrary({ rootDirectory, resourceName: 'Skills' });
}

function promptDirectory(rootDirectory) {
  return getBundledResourceDirectory(rootDirectory, 'Prompts');
}

function mapSkill({ id, namespace, filename, frontmatter }) {
  return mapNamespacedMarkdownResource(
    { id, namespace, filename, frontmatter },
    {
      includeTrigger: true,
    },
  );
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
  const library = skillLibrary(rootDirectory);
  const skills = await library.listAll(mapSkill);

  return skills
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

  return skillLibrary(rootDirectory).load(
    safeNamespace,
    safeFilename,
    (entry) =>
      mapNamespacedMarkdownResource(entry, {
        includeContent: true,
        includeTrigger: true,
      }),
    'Skill not found.',
  );
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
