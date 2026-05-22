import { listSkills } from './Utils.js';

const PROMPT_STRINGS = {
  title: 'Joanium product knowledge and skills are available as tools.',
  productRule:
    'Use read_product_knowledge when the user asks about Joanium, app behavior, architecture, product decisions, or implementation rules.',
  skillRule:
    'Use read_skill before acting on a request that matches a skill trigger or description. If unsure which skill applies, call list_skills first.',
  knownSkills: 'Known skills:',
  noSkills: 'No skills are currently installed.',
  skillLine: '- {id} ({name}): {description}{trigger}',
};

function formatText(template, values = {}) {
  return String(template ?? '').replace(/\{(\w+)\}/g, (_match, key) => values[key] ?? '');
}

export async function buildKnowledgePromptSection(rootDirectory) {
  const skills = await listSkills(rootDirectory, { limit: 50 }).catch(() => []);
  const skillLines = skills.length
    ? skills.map((skill) =>
        formatText(PROMPT_STRINGS.skillLine, {
          id: skill.id,
          name: skill.name,
          description: skill.description || 'No description.',
          trigger: skill.trigger ? ` Trigger: ${skill.trigger}.` : '',
        }),
      )
    : [PROMPT_STRINGS.noSkills];

  return [
    PROMPT_STRINGS.title,
    PROMPT_STRINGS.productRule,
    PROMPT_STRINGS.skillRule,
    PROMPT_STRINGS.knownSkills,
    ...skillLines,
  ].join('\n');
}
